import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db.js';
import { audit } from '../lib/audit.js';
import { sendMail, appLink } from '../lib/mailer.js';
import { HttpError, badRequest, forbidden } from '../lib/http.js';
import { createToken, findValidToken, consumeToken } from '../lib/tokens.js';
import { emailField, nameField, phoneField } from '../lib/validation.js';
import { requireAuth } from '../middleware/auth.js';
import { findOwned } from '../services/vault.js';

const INVITE_DAYS = 14;
const relationshipField = z
  .string({ required_error: 'Please say how this person is related to you.' })
  .trim()
  .min(2, 'Please say how this person is related to you.')
  .max(50);

const toDto = (n) => ({
  id: n.id,
  name: n.name,
  email: n.email,
  phone: n.phone,
  relationship: n.relationship,
  status: n.status,
  acceptedAt: n.acceptedAt,
  createdAt: n.createdAt,
  counts: n._count
    ? { assets: n._count.assetShares, documents: n._count.documentShares, letters: n._count.letters }
    : undefined,
});

const withCounts = { _count: { select: { assetShares: true, documentShares: true, letters: true } } };

async function sendInvite(nominee, owner) {
  // Any older invitation links for this person stop working.
  await prisma.actionToken.updateMany({
    where: { nomineeId: nominee.id, type: 'NOMINEE_INVITE', usedAt: null },
    data: { usedAt: new Date() },
  });
  const token = await createToken({ type: 'NOMINEE_INVITE', nomineeId: nominee.id, ttlMinutes: INVITE_DAYS * 24 * 60 });
  await sendMail({
    to: nominee.email,
    subject: `${owner.name} has chosen you as a trusted person`,
    heading: `${owner.name} trusts you`,
    text:
      `Dear ${nominee.name},\n\n${owner.name} is using Digital Legacy Manager to organise their important accounts and documents, ` +
      `and has chosen you as a trusted person (nominee).\n\n` +
      `Nothing is shared with you now. Only if ${owner.name} stops responding to regular check-ins for a long time ` +
      `will the items they chose for you be released to you.\n\nPlease accept within ${INVITE_DAYS} days.`,
    link: appLink(`/invite/${token}`),
    linkLabel: 'View the invitation',
  });
}

// ---------- Owner manages their nominees ----------
const router = Router();
router.use(requireAuth);

router.get('/', async (req, res) => {
  const nominees = await prisma.nominee.findMany({
    where: { ownerId: req.user.id },
    include: withCounts,
    orderBy: { createdAt: 'asc' },
  });
  res.json({ nominees: nominees.map(toDto) });
});

router.post('/', async (req, res) => {
  const data = z
    .object({ name: nameField, email: emailField, phone: phoneField, relationship: relationshipField })
    .parse(req.body);
  if (data.email === req.user.email) throw badRequest('You cannot add yourself as a nominee.');
  if (await prisma.nominee.findUnique({ where: { ownerId_email: { ownerId: req.user.id, email: data.email } } })) {
    throw new HttpError(409, 'This person is already in your list.');
  }
  const nominee = await prisma.nominee.create({ data: { ...data, ownerId: req.user.id }, include: withCounts });
  await sendInvite(nominee, req.user);
  await audit(req.user.id, 'NOMINEE_ADDED', `You added ${nominee.name} (${nominee.relationship}) and sent an invitation.`, req);
  res.status(201).json({ nominee: toDto(nominee) });
});

router.put('/:id', async (req, res) => {
  await findOwned('nominee', req.user.id, req.params.id);
  const data = z.object({ name: nameField, phone: phoneField, relationship: relationshipField }).parse(req.body);
  const nominee = await prisma.nominee.update({ where: { id: req.params.id }, data, include: withCounts });
  await audit(req.user.id, 'NOMINEE_UPDATED', `You updated details for ${nominee.name}.`, req);
  res.json({ nominee: toDto(nominee) });
});

router.post('/:id/resend', async (req, res) => {
  const nominee = await findOwned('nominee', req.user.id, req.params.id);
  if (nominee.status === 'ACCEPTED') throw badRequest(`${nominee.name} has already accepted.`);
  const updated = await prisma.nominee.update({ where: { id: nominee.id }, data: { status: 'INVITED' }, include: withCounts });
  await sendInvite(updated, req.user);
  await audit(req.user.id, 'NOMINEE_REINVITED', `You re-sent the invitation to ${nominee.name}.`, req);
  res.json({ nominee: toDto(updated) });
});

router.delete('/:id', async (req, res) => {
  const nominee = await findOwned('nominee', req.user.id, req.params.id);
  await prisma.nominee.delete({ where: { id: nominee.id } });
  await audit(req.user.id, 'NOMINEE_REMOVED', `You removed ${nominee.name} from your nominees.`, req);
  res.json({ ok: true });
});

export default router;

// ---------- Invitation links (opened by the nominee) ----------
export const inviteRouter = Router();

async function loadInvite(token) {
  const record = await findValidToken('NOMINEE_INVITE', token);
  if (!record?.nomineeId) throw badRequest('This invitation link has expired or was already used.');
  const nominee = await prisma.nominee.findUnique({ where: { id: record.nomineeId }, include: { owner: true } });
  if (!nominee) throw badRequest('This invitation is no longer valid.');
  return { record, nominee };
}

inviteRouter.get('/:token', async (req, res) => {
  const { nominee } = await loadInvite(req.params.token);
  res.json({
    invite: {
      ownerName: nominee.owner.name,
      nomineeName: nominee.name,
      email: nominee.email,
      relationship: nominee.relationship,
      status: nominee.status,
    },
  });
});

inviteRouter.post('/:token/accept', requireAuth, async (req, res) => {
  const { record, nominee } = await loadInvite(req.params.token);
  if (req.user.email !== nominee.email) {
    throw forbidden(`This invitation was sent to ${nominee.email}. Please log in with that email address to accept it.`);
  }
  if (req.user.id === nominee.ownerId) throw badRequest('You cannot accept your own invitation.');
  await prisma.nominee.update({
    where: { id: nominee.id },
    data: { status: 'ACCEPTED', userId: req.user.id, acceptedAt: new Date() },
  });
  await consumeToken(record.id);
  await audit(nominee.ownerId, 'NOMINEE_ACCEPTED', `${nominee.name} accepted your invitation.`, req);
  await audit(req.user.id, 'BECAME_NOMINEE', `You accepted ${nominee.owner.name}'s invitation.`, req);
  await sendMail({
    to: nominee.owner.email,
    subject: `${nominee.name} accepted your invitation`,
    text: `Dear ${nominee.owner.name},\n\n${nominee.name} has accepted being your trusted person.`,
    link: appLink('/app/nominees'),
    linkLabel: 'See my nominees',
  });
  res.json({ ok: true });
});

inviteRouter.post('/:token/decline', async (req, res) => {
  const { record, nominee } = await loadInvite(req.params.token);
  await prisma.nominee.update({ where: { id: nominee.id }, data: { status: 'DECLINED' } });
  await consumeToken(record.id);
  await audit(nominee.ownerId, 'NOMINEE_DECLINED', `${nominee.name} declined your invitation.`, req);
  await sendMail({
    to: nominee.owner.email,
    subject: `${nominee.name} declined your invitation`,
    text: `Dear ${nominee.owner.name},\n\n${nominee.name} has declined being your trusted person. You may want to choose someone else.`,
    link: appLink('/app/nominees'),
    linkLabel: 'See my nominees',
  });
  res.json({ ok: true });
});
