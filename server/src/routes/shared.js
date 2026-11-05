/**
 * Nominee portal: what other people have chosen to leave for the signed-in user.
 * Nothing is visible until the owner's vault is RELEASED.
 */
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../db.js';
import { audit } from '../lib/audit.js';
import { sendMail } from '../lib/mailer.js';
import { badRequest, forbidden, notFound } from '../lib/http.js';
import { decryptJson } from '../lib/crypto.js';
import { optionalText } from '../lib/validation.js';
import { requireAuth } from '../middleware/auth.js';
import { revealLimiter } from '../middleware/security.js';
import { DAY_MS, enterGrace } from '../services/legacy.js';
import { assetDto } from './assets.js';
import { documentDto, sendDocument } from './documents.js';
import { letterDto } from './letters.js';

const router = Router();
router.use(requireAuth);

/** Owner status as the nominee should see it. REMINDED is private to the owner. */
const visibleStatus = (s) => (s === 'REMINDED' ? 'ACTIVE' : s);

async function loadMembership(req) {
  const nominee = await prisma.nominee.findFirst({
    where: { id: req.params.nomineeId, userId: req.user.id, status: 'ACCEPTED' },
    include: { owner: true },
  });
  if (!nominee) throw notFound();
  return nominee;
}

function requireReleased(nominee) {
  if (nominee.owner.legacyStatus !== 'RELEASED') {
    throw forbidden(`These items are private. They will only become available if ${nominee.owner.name} stops checking in.`);
  }
}

router.get('/', async (req, res) => {
  const memberships = await prisma.nominee.findMany({
    where: { userId: req.user.id, status: 'ACCEPTED' },
    include: { owner: true, _count: { select: { assetShares: true, documentShares: true, letters: true } } },
    orderBy: { acceptedAt: 'asc' },
  });
  res.json({
    vaults: memberships.map((m) => ({
      id: m.id,
      ownerName: m.owner.name,
      relationship: m.relationship,
      ownerStatus: visibleStatus(m.owner.legacyStatus),
      graceEndsAt: m.owner.legacyStatus === 'GRACE' ? m.owner.graceEndsAt : null,
      counts: { assets: m._count.assetShares, documents: m._count.documentShares, letters: m._count.letters },
    })),
  });
});

router.get('/:nomineeId', async (req, res) => {
  const nominee = await loadMembership(req);
  requireReleased(nominee);
  const [assets, documents, letters] = await Promise.all([
    prisma.asset.findMany({ where: { ownerId: nominee.ownerId, shares: { some: { nomineeId: nominee.id } } } }),
    prisma.document.findMany({ where: { ownerId: nominee.ownerId, shares: { some: { nomineeId: nominee.id } } } }),
    prisma.letter.findMany({ where: { ownerId: nominee.ownerId, nomineeId: nominee.id } }),
  ]);
  await audit(nominee.ownerId, 'NOMINEE_VIEWED', `${nominee.name} opened the items you left for them.`, req);
  res.json({
    ownerName: nominee.owner.name,
    assets: assets.map(({ ...a }) => ({ ...assetDto(a), nomineeIds: undefined })),
    documents: documents.map((d) => ({ ...documentDto(d), nomineeIds: undefined })),
    letters: letters.map((l) => ({ ...letterDto(nominee.ownerId, l), nomineeId: undefined })),
  });
});

router.post('/:nomineeId/assets/:assetId/reveal', revealLimiter, async (req, res) => {
  const nominee = await loadMembership(req);
  requireReleased(nominee);
  const { password } = z.object({ password: z.string().min(1, 'Please enter your password.') }).parse(req.body);
  if (!(await bcrypt.compare(password, req.user.passwordHash))) throw badRequest('Your password is not correct.');
  const asset = await prisma.asset.findFirst({
    where: { id: req.params.assetId, ownerId: nominee.ownerId, shares: { some: { nomineeId: nominee.id } } },
  });
  if (!asset) throw notFound();
  await audit(nominee.ownerId, 'NOMINEE_SECRET_VIEWED', `${nominee.name} viewed the private details of "${asset.title}".`, req);
  await audit(req.user.id, 'SHARED_SECRET_VIEWED', `You viewed "${asset.title}" left by ${nominee.owner.name}.`, req);
  res.json({ secret: asset.secretEnc ? decryptJson(nominee.ownerId, asset.secretEnc) : null });
});

router.get('/:nomineeId/documents/:documentId/download', async (req, res) => {
  const nominee = await loadMembership(req);
  requireReleased(nominee);
  const doc = await prisma.document.findFirst({
    where: { id: req.params.documentId, ownerId: nominee.ownerId, shares: { some: { nomineeId: nominee.id } } },
  });
  if (!doc) throw notFound();
  await audit(nominee.ownerId, 'NOMINEE_DOCUMENT_OPENED', `${nominee.name} opened "${doc.title}".`, req);
  await sendDocument(res, nominee.ownerId, doc);
});

/**
 * A nominee reports that the owner may have passed away. This does NOT release
 * anything immediately — it starts the grace period and urgently asks the owner
 * to confirm they are well, so a false report cannot expose the vault.
 */
router.post('/:nomineeId/report', async (req, res) => {
  const nominee = await loadMembership(req);
  const { note } = z.object({ note: optionalText(500, 'Note') }).parse(req.body ?? {});
  const owner = nominee.owner;
  if (owner.legacyStatus === 'ACTIVE' || owner.legacyStatus === 'REMINDED') {
    const graceEndsAt = new Date(Date.now() + owner.gracePeriodDays * DAY_MS);
    await enterGrace(owner, {
      graceEndsAt,
      reason: `${nominee.name} (${nominee.relationship}) told us they believe you may have passed away or are unwell.${note ? ` Their note: "${note}"` : ''}`,
    });
    await audit(req.user.id, 'REPORTED_OWNER', `You reported that ${owner.name} may have passed away.`, req);
  } else {
    await sendMail({
      to: owner.email,
      subject: 'Please confirm you are well',
      text: `Dear ${owner.name},\n\n${nominee.name} is concerned about you. Please log in if you are well.`,
    });
  }
  const fresh = await prisma.user.findUnique({ where: { id: owner.id } });
  res.json({ ownerStatus: visibleStatus(fresh.legacyStatus), graceEndsAt: fresh.graceEndsAt });
});

export default router;
