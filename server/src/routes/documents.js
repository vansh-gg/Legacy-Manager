import { Router } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { prisma } from '../db.js';
import { config } from '../config.js';
import { audit } from '../lib/audit.js';
import { badRequest } from '../lib/http.js';
import { idList } from '../lib/validation.js';
import { saveEncrypted, readDecrypted, removeFile, sniffMime } from '../lib/storage.js';
import { requireAuth } from '../middleware/auth.js';
import { assertOwnNominees, findOwned } from '../services/vault.js';

export const DOCUMENT_CATEGORIES = ['WILL', 'PROPERTY', 'INSURANCE', 'IDENTITY', 'FINANCE', 'MEDICAL', 'OTHER'];

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: config.maxUploadMb * 1024 * 1024, files: 1, fields: 10 },
});

const metaSchema = z.object({
  title: z.string({ required_error: 'Please give this document a name.' }).trim().min(2, 'Please give this document a name.').max(120),
  category: z.enum(DOCUMENT_CATEGORIES, { errorMap: () => ({ message: 'Please choose a document type.' }) }),
  nomineeIds: idList,
});

/** multipart forms send nomineeIds as a JSON string. */
const parseIds = (value) => {
  if (Array.isArray(value)) return value;
  if (!value) return [];
  try {
    return JSON.parse(value);
  } catch {
    throw badRequest('Invalid list of people.');
  }
};

export const documentDto = (d) => ({
  id: d.id,
  title: d.title,
  category: d.category,
  originalName: d.originalName,
  mimeType: d.mimeType,
  size: d.size,
  nomineeIds: d.shares?.map((s) => s.nomineeId) ?? [],
  createdAt: d.createdAt,
  updatedAt: d.updatedAt,
});

/** Send a decrypted file with safe headers. Shared with the nominee portal. */
export async function sendDocument(res, ownerId, doc) {
  const data = await readDecrypted(ownerId, doc.storageKey);
  const safeName = doc.originalName.replace(/[^\w.\- ]+/g, '_');
  res.set({
    'Content-Type': doc.mimeType,
    'Content-Length': data.length,
    'Content-Disposition': `attachment; filename="${safeName}"; filename*=UTF-8''${encodeURIComponent(doc.originalName)}`,
    'Cache-Control': 'no-store',
  });
  res.send(data);
}

const router = Router();
router.use(requireAuth);

router.get('/', async (req, res) => {
  const docs = await prisma.document.findMany({
    where: { ownerId: req.user.id },
    include: { shares: true },
    orderBy: { createdAt: 'desc' },
  });
  res.json({ documents: docs.map(documentDto) });
});

router.post('/', upload.single('file'), async (req, res) => {
  if (!req.file) throw badRequest('Please choose a file to upload.');
  const meta = metaSchema.parse({ ...req.body, nomineeIds: parseIds(req.body.nomineeIds) });
  const mimeType = sniffMime(req.file.buffer, req.file.mimetype);
  if (!mimeType) throw badRequest('Only PDF, photo (JPG, PNG, WEBP), Word (.docx) or text files can be uploaded.');
  const ids = await assertOwnNominees(req.user.id, meta.nomineeIds);

  const storageKey = await saveEncrypted(req.user.id, req.file.buffer);
  const doc = await prisma.document.create({
    data: {
      ownerId: req.user.id,
      title: meta.title,
      category: meta.category,
      originalName: req.file.originalname.slice(0, 200),
      mimeType,
      size: req.file.size,
      storageKey,
      shares: { create: ids.map((nomineeId) => ({ nomineeId })) },
    },
    include: { shares: true },
  });
  await audit(req.user.id, 'DOCUMENT_UPLOADED', `You uploaded "${doc.title}".`, req);
  res.status(201).json({ document: documentDto(doc) });
});

router.put('/:id', async (req, res) => {
  const existing = await findOwned('document', req.user.id, req.params.id);
  const meta = metaSchema.parse(req.body);
  const ids = await assertOwnNominees(req.user.id, meta.nomineeIds);
  const doc = await prisma.$transaction(async (tx) => {
    await tx.documentShare.deleteMany({ where: { documentId: existing.id } });
    return tx.document.update({
      where: { id: existing.id },
      data: { title: meta.title, category: meta.category, shares: { create: ids.map((nomineeId) => ({ nomineeId })) } },
      include: { shares: true },
    });
  });
  await audit(req.user.id, 'DOCUMENT_UPDATED', `You updated "${doc.title}".`, req);
  res.json({ document: documentDto(doc) });
});

router.get('/:id/download', async (req, res) => {
  const doc = await findOwned('document', req.user.id, req.params.id);
  await audit(req.user.id, 'DOCUMENT_OPENED', `You opened "${doc.title}".`, req);
  await sendDocument(res, req.user.id, doc);
});

router.delete('/:id', async (req, res) => {
  const doc = await findOwned('document', req.user.id, req.params.id);
  await prisma.document.delete({ where: { id: doc.id } });
  await removeFile(req.user.id, doc.storageKey);
  await audit(req.user.id, 'DOCUMENT_REMOVED', `You removed "${doc.title}".`, req);
  res.json({ ok: true });
});

export default router;
