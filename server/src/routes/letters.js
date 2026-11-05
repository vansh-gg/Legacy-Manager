import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db.js';
import { audit } from '../lib/audit.js';
import { encryptText, decryptText } from '../lib/crypto.js';
import { requireAuth } from '../middleware/auth.js';
import { assertOwnNominees, findOwned } from '../services/vault.js';

const letterSchema = z.object({
  nomineeId: z.string({ required_error: 'Please choose who this letter is for.' }).min(1, 'Please choose who this letter is for.'),
  subject: z.string().trim().min(2, 'Please add a short title.').max(150),
  body: z.string().trim().min(1, 'Please write your message.').max(20000, 'This letter is too long.'),
});

export const letterDto = (ownerId, l) => ({
  id: l.id,
  nomineeId: l.nomineeId,
  nomineeName: l.nominee?.name,
  subject: l.subject,
  body: decryptText(ownerId, l.bodyEnc),
  createdAt: l.createdAt,
  updatedAt: l.updatedAt,
});

const router = Router();
router.use(requireAuth);

router.get('/', async (req, res) => {
  const letters = await prisma.letter.findMany({
    where: { ownerId: req.user.id },
    include: { nominee: true },
    orderBy: { updatedAt: 'desc' },
  });
  res.json({ letters: letters.map((l) => letterDto(req.user.id, l)) });
});

router.post('/', async (req, res) => {
  const data = letterSchema.parse(req.body);
  await assertOwnNominees(req.user.id, [data.nomineeId]);
  const letter = await prisma.letter.create({
    data: { ownerId: req.user.id, nomineeId: data.nomineeId, subject: data.subject, bodyEnc: encryptText(req.user.id, data.body) },
    include: { nominee: true },
  });
  await audit(req.user.id, 'LETTER_WRITTEN', `You wrote a letter for ${letter.nominee.name}.`, req);
  res.status(201).json({ letter: letterDto(req.user.id, letter) });
});

router.put('/:id', async (req, res) => {
  await findOwned('letter', req.user.id, req.params.id);
  const data = letterSchema.parse(req.body);
  await assertOwnNominees(req.user.id, [data.nomineeId]);
  const letter = await prisma.letter.update({
    where: { id: req.params.id },
    data: { nomineeId: data.nomineeId, subject: data.subject, bodyEnc: encryptText(req.user.id, data.body) },
    include: { nominee: true },
  });
  await audit(req.user.id, 'LETTER_UPDATED', `You edited your letter for ${letter.nominee.name}.`, req);
  res.json({ letter: letterDto(req.user.id, letter) });
});

router.delete('/:id', async (req, res) => {
  const letter = await findOwned('letter', req.user.id, req.params.id, { nominee: true });
  await prisma.letter.delete({ where: { id: letter.id } });
  await audit(req.user.id, 'LETTER_REMOVED', `You deleted a letter for ${letter.nominee.name}.`, req);
  res.json({ ok: true });
});

export default router;
