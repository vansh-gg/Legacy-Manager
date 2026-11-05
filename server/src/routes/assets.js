import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../db.js';
import { audit } from '../lib/audit.js';
import { badRequest } from '../lib/http.js';
import { encryptJson, decryptJson } from '../lib/crypto.js';
import { idList, optionalText } from '../lib/validation.js';
import { requireAuth } from '../middleware/auth.js';
import { revealLimiter } from '../middleware/security.js';
import { assertOwnNominees, findOwned } from '../services/vault.js';

export const ASSET_CATEGORIES = ['BANK', 'EMAIL', 'SOCIAL', 'INSURANCE', 'INVESTMENT', 'PROPERTY', 'DEVICE', 'OTHER'];

const secretSchema = z
  .object({
    username: optionalText(200, 'Username'),
    password: optionalText(500, 'Password'),
    notes: optionalText(4000, 'Private notes'),
  })
  .nullish();

const assetSchema = z.object({
  category: z.enum(ASSET_CATEGORIES, { errorMap: () => ({ message: 'Please choose what kind of item this is.' }) }),
  title: z.string({ required_error: 'Please give this item a name.' }).trim().min(2, 'Please give this item a name.').max(120),
  institution: optionalText(120, 'Bank / company name'),
  identifierHint: optionalText(40, 'Account hint').refine(
    (v) => v === null || !/\d{7,}/.test(v.replace(/[\s-]/g, '')),
    'For safety, only enter the last 4 digits (for example "ending 4321"), not the full number.',
  ),
  instructions: optionalText(2000, 'Instructions'),
  secret: secretSchema,
  nomineeIds: idList,
});

/** Encrypt only if at least one secret field has a value. */
function sealSecret(ownerId, secret) {
  if (!secret || !Object.values(secret).some(Boolean)) return null;
  return encryptJson(ownerId, secret);
}

export const assetDto = (a) => ({
  id: a.id,
  category: a.category,
  title: a.title,
  institution: a.institution,
  identifierHint: a.identifierHint,
  instructions: a.instructions,
  hasSecret: Boolean(a.secretEnc),
  nomineeIds: a.shares?.map((s) => s.nomineeId) ?? [],
  createdAt: a.createdAt,
  updatedAt: a.updatedAt,
});

const router = Router();
router.use(requireAuth);

router.get('/', async (req, res) => {
  const assets = await prisma.asset.findMany({
    where: { ownerId: req.user.id },
    include: { shares: true },
    orderBy: { createdAt: 'desc' },
  });
  res.json({ assets: assets.map(assetDto) });
});

router.post('/', async (req, res) => {
  const { secret, nomineeIds, ...data } = assetSchema.parse(req.body);
  const ids = await assertOwnNominees(req.user.id, nomineeIds);
  const asset = await prisma.asset.create({
    data: {
      ...data,
      ownerId: req.user.id,
      secretEnc: sealSecret(req.user.id, secret),
      shares: { create: ids.map((nomineeId) => ({ nomineeId })) },
    },
    include: { shares: true },
  });
  await audit(req.user.id, 'ASSET_ADDED', `You added "${asset.title}".`, req);
  res.status(201).json({ asset: assetDto(asset) });
});

router.put('/:id', async (req, res) => {
  const existing = await findOwned('asset', req.user.id, req.params.id);
  const { secret, nomineeIds, ...data } = assetSchema.parse(req.body);
  const ids = await assertOwnNominees(req.user.id, nomineeIds);
  // `secret` omitted → keep the stored one; null → remove it; object → replace it.
  const secretUpdate = secret === undefined ? {} : { secretEnc: sealSecret(req.user.id, secret) };
  const asset = await prisma.$transaction(async (tx) => {
    await tx.assetShare.deleteMany({ where: { assetId: existing.id } });
    return tx.asset.update({
      where: { id: existing.id },
      data: { ...data, ...secretUpdate, shares: { create: ids.map((nomineeId) => ({ nomineeId })) } },
      include: { shares: true },
    });
  });
  await audit(req.user.id, 'ASSET_UPDATED', `You updated "${asset.title}".`, req);
  res.json({ asset: assetDto(asset) });
});

router.delete('/:id', async (req, res) => {
  const asset = await findOwned('asset', req.user.id, req.params.id);
  await prisma.asset.delete({ where: { id: asset.id } });
  await audit(req.user.id, 'ASSET_REMOVED', `You removed "${asset.title}".`, req);
  res.json({ ok: true });
});

/** Show the private details — asks for the password again, every time. */
router.post('/:id/reveal', revealLimiter, async (req, res) => {
  const asset = await findOwned('asset', req.user.id, req.params.id);
  const { password } = z.object({ password: z.string().min(1, 'Please enter your password.') }).parse(req.body);
  if (!(await bcrypt.compare(password, req.user.passwordHash))) {
    await audit(req.user.id, 'SECRET_VIEW_DENIED', `Wrong password when opening "${asset.title}".`, req);
    throw badRequest('Your password is not correct.');
  }
  await audit(req.user.id, 'SECRET_VIEWED', `You viewed the private details of "${asset.title}".`, req);
  res.json({ secret: asset.secretEnc ? decryptJson(req.user.id, asset.secretEnc) : null });
});

export default router;
