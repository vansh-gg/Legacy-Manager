/**
 * Demonstration helpers — ONLY mounted when ENABLE_DEV_TOOLS is on
 * (default in development, off in production).
 *
 * - Mailbox: read every email the system "sent" without configuring SMTP.
 * - Time travel: pretend N days have passed for your own account, so the
 *   reminder → grace → release flow can be shown in a classroom demo.
 */
import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db.js';
import { audit } from '../lib/audit.js';
import { requireAuth } from '../middleware/auth.js';
import { DAY_MS, publicUser, runInactivitySweep } from '../services/legacy.js';

const router = Router();

router.get('/mailbox', async (req, res) => {
  const emails = await prisma.emailLog.findMany({ orderBy: { createdAt: 'desc' }, take: 50 });
  res.json({ emails });
});

router.post('/time-travel', requireAuth, async (req, res) => {
  const { days } = z.object({ days: z.number().int().min(1).max(400) }).parse(req.body);
  const shift = (d) => (d ? new Date(d.getTime() - days * DAY_MS) : d);
  await prisma.user.update({
    where: { id: req.user.id },
    data: { lastCheckInAt: shift(req.user.lastCheckInAt), graceEndsAt: shift(req.user.graceEndsAt) },
  });
  await audit(req.user.id, 'DEMO_TIME_TRAVEL', `Demo: moved ${days} days into the future.`, req);
  const summary = await runInactivitySweep();
  const user = await prisma.user.findUnique({ where: { id: req.user.id } });
  res.json({ user: publicUser(user), summary });
});

router.post('/sweep', async (req, res) => {
  res.json({ summary: await runInactivitySweep() });
});

export default router;
