import { Router } from 'express';
import { prisma } from '../db.js';
import { badRequest } from '../lib/http.js';
import { findValidToken, consumeToken } from '../lib/tokens.js';
import { requireAuth } from '../middleware/auth.js';
import { publicUser, recordCheckIn } from '../services/legacy.js';

const router = Router();

/** The big "I am well" button on the home screen. */
router.post('/', requireAuth, async (req, res) => {
  const user = await recordCheckIn(req.user, 'pressed "I am well"', req);
  res.json({ user: publicUser(user) });
});

/** One-click link from a reminder email — works without logging in. */
async function loadLink(token) {
  const record = await findValidToken('CHECK_IN', token);
  if (!record?.userId) throw badRequest('This check-in link has expired or was already used. Please log in instead.');
  const user = await prisma.user.findUnique({ where: { id: record.userId } });
  if (!user) throw badRequest('This check-in link is no longer valid.');
  return { record, user };
}

router.get('/link/:token', async (req, res) => {
  const { user } = await loadLink(req.params.token);
  res.json({ name: user.name.split(' ')[0] });
});

router.post('/link/:token', async (req, res) => {
  const { record, user } = await loadLink(req.params.token);
  await recordCheckIn(user, 'clicked the email link', req);
  await consumeToken(record.id);
  res.json({ ok: true, name: user.name.split(' ')[0] });
});

export default router;
