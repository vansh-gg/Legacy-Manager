import fs from 'node:fs/promises';
import path from 'node:path';
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../db.js';
import { config } from '../config.js';
import { audit } from '../lib/audit.js';
import { sendMail, appLink } from '../lib/mailer.js';
import { HttpError, badRequest } from '../lib/http.js';
import { createToken, findValidToken, consumeToken } from '../lib/tokens.js';
import { emailField, nameField, passwordField, phoneField } from '../lib/validation.js';
import { authLimiter } from '../middleware/security.js';
import { requireAuth, setSession, clearSession } from '../middleware/auth.js';
import { publicUser, recordCheckIn } from '../services/legacy.js';

const router = Router();
const BCRYPT_ROUNDS = 12;
// Used to keep response time the same whether or not an email is registered.
const DUMMY_HASH = bcrypt.hashSync('timing-safe-dummy-password', BCRYPT_ROUNDS);

router.post('/register', authLimiter, async (req, res) => {
  const data = z
    .object({ name: nameField, email: emailField, password: passwordField, phone: phoneField })
    .parse(req.body);

  if (await prisma.user.findUnique({ where: { email: data.email } })) {
    throw new HttpError(409, 'An account with this email already exists. Please log in instead.');
  }
  const user = await prisma.user.create({
    data: {
      name: data.name,
      email: data.email,
      phone: data.phone,
      passwordHash: await bcrypt.hash(data.password, BCRYPT_ROUNDS),
    },
  });
  setSession(res, user);
  await audit(user.id, 'ACCOUNT_CREATED', 'Your secure vault was created.', req);
  await sendMail({
    to: user.email,
    subject: 'Welcome to Digital Legacy Manager',
    heading: `Welcome, ${user.name}`,
    text: 'Your secure vault is ready.\n\nTake your time — you can add your accounts, documents and the people you trust, one step at a time.',
    link: appLink('/app'),
    linkLabel: 'Open my vault',
  });
  res.status(201).json({ user: publicUser(user) });
});

router.post('/login', authLimiter, async (req, res) => {
  const { email, password } = z
    .object({ email: emailField, password: z.string().min(1, 'Please enter your password.').max(200) })
    .parse(req.body);

  const invalid = new HttpError(401, 'The email or password is not correct. Please try again.');
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    await bcrypt.compare(password, DUMMY_HASH);
    throw invalid;
  }

  if (user.lockedUntil && user.lockedUntil > new Date()) {
    const minutes = Math.ceil((user.lockedUntil - Date.now()) / 60000);
    throw new HttpError(
      423,
      `For your safety this account is locked for ${minutes} more minute${minutes === 1 ? '' : 's'} after too many wrong passwords.`,
    );
  }

  if (!(await bcrypt.compare(password, user.passwordHash))) {
    const failed = user.failedLogins + 1;
    const lock = failed >= config.maxFailedLogins;
    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedLogins: lock ? 0 : failed,
        lockedUntil: lock ? new Date(Date.now() + config.lockMinutes * 60 * 1000) : null,
      },
    });
    await audit(user.id, 'LOGIN_FAILED', 'Someone entered a wrong password for your account.', req);
    if (lock) {
      await audit(user.id, 'ACCOUNT_LOCKED', `Account locked for ${config.lockMinutes} minutes.`, req);
      await sendMail({
        to: user.email,
        subject: 'Your account was locked for your safety',
        text: `We noticed ${config.maxFailedLogins} wrong passwords in a row, so we locked your account for ${config.lockMinutes} minutes.\n\nIf this was not you, please reset your password.`,
        link: appLink('/forgot-password'),
        linkLabel: 'Reset my password',
      });
    }
    throw invalid;
  }

  await prisma.user.update({ where: { id: user.id }, data: { failedLogins: 0, lockedUntil: null } });
  // Logging in is proof of life — it resets the check-in timer.
  const updated = await recordCheckIn(user, 'logged in', req);
  setSession(res, updated);
  await audit(user.id, 'LOGIN', 'You logged in.', req);
  res.json({ user: publicUser(updated) });
});

router.post('/logout', (req, res) => {
  clearSession(res);
  res.json({ ok: true });
});

router.get('/me', requireAuth, (req, res) => {
  res.json({ user: publicUser(req.user) });
});

router.patch('/me', requireAuth, async (req, res) => {
  const data = z.object({ name: nameField, phone: phoneField }).parse(req.body);
  const user = await prisma.user.update({ where: { id: req.user.id }, data });
  await audit(user.id, 'PROFILE_UPDATED', 'You updated your profile.', req);
  res.json({ user: publicUser(user) });
});

router.patch('/me/check-in-settings', requireAuth, async (req, res) => {
  const data = z
    .object({
      checkInIntervalDays: z
        .number()
        .int()
        .refine((v) => [7, 14, 30, 60, 90, 180].includes(v), 'Please choose one of the offered options.'),
      gracePeriodDays: z.number().int().min(3, 'Minimum is 3 days.').max(30, 'Maximum is 30 days.'),
    })
    .parse(req.body);
  const user = await prisma.user.update({ where: { id: req.user.id }, data });
  await audit(
    user.id,
    'CHECK_IN_SETTINGS',
    `Check-in every ${data.checkInIntervalDays} days, then wait ${data.gracePeriodDays} more days before releasing.`,
    req,
  );
  res.json({ user: publicUser(user) });
});

router.post('/change-password', requireAuth, authLimiter, async (req, res) => {
  const { currentPassword, newPassword } = z
    .object({ currentPassword: z.string().min(1, 'Please enter your current password.'), newPassword: passwordField })
    .parse(req.body);
  if (!(await bcrypt.compare(currentPassword, req.user.passwordHash))) {
    throw badRequest('Your current password is not correct.');
  }
  const user = await prisma.user.update({
    where: { id: req.user.id },
    data: { passwordHash: await bcrypt.hash(newPassword, BCRYPT_ROUNDS), tokenVersion: { increment: 1 } },
  });
  setSession(res, user); // keep this device signed in, sign out all others
  await audit(user.id, 'PASSWORD_CHANGED', 'You changed your password. Other devices were signed out.', req);
  await sendMail({
    to: user.email,
    subject: 'Your password was changed',
    text: 'Your password was just changed. If this was not you, reset your password immediately.',
    link: appLink('/forgot-password'),
    linkLabel: 'Reset my password',
  });
  res.json({ ok: true });
});

router.post('/logout-everywhere', requireAuth, async (req, res) => {
  await prisma.user.update({ where: { id: req.user.id }, data: { tokenVersion: { increment: 1 } } });
  clearSession(res);
  await audit(req.user.id, 'LOGOUT_ALL', 'You signed out of all devices.', req);
  res.json({ ok: true });
});

router.post('/forgot-password', authLimiter, async (req, res) => {
  const { email } = z.object({ email: emailField }).parse(req.body);
  const user = await prisma.user.findUnique({ where: { email } });
  if (user) {
    const token = await createToken({ type: 'RESET_PASSWORD', userId: user.id, ttlMinutes: 60 });
    await sendMail({
      to: user.email,
      subject: 'Reset your password',
      heading: 'Reset your password',
      text: `Dear ${user.name},\n\nSomeone (hopefully you) asked to reset your password. This link works for 1 hour.\n\nIf you did not ask for this, you can ignore this email.`,
      link: appLink(`/reset-password/${token}`),
      linkLabel: 'Choose a new password',
    });
    await audit(user.id, 'PASSWORD_RESET_REQUESTED', 'A password reset link was emailed to you.', req);
  }
  // Same answer either way, so nobody can find out who has an account.
  res.json({ ok: true, message: 'If an account exists for that email, we have sent a reset link.' });
});

router.post('/reset-password', authLimiter, async (req, res) => {
  const { token, password } = z.object({ token: z.string(), password: passwordField }).parse(req.body);
  const record = await findValidToken('RESET_PASSWORD', token);
  if (!record?.userId) throw badRequest('This reset link has expired or was already used. Please ask for a new one.');
  await prisma.user.update({
    where: { id: record.userId },
    data: {
      passwordHash: await bcrypt.hash(password, BCRYPT_ROUNDS),
      tokenVersion: { increment: 1 },
      failedLogins: 0,
      lockedUntil: null,
    },
  });
  await consumeToken(record.id);
  await audit(record.userId, 'PASSWORD_RESET', 'Your password was reset using an email link.', req);
  res.json({ ok: true });
});

router.delete('/me', requireAuth, authLimiter, async (req, res) => {
  const { password } = z.object({ password: z.string().min(1, 'Please enter your password.') }).parse(req.body);
  if (!(await bcrypt.compare(password, req.user.passwordHash))) {
    throw badRequest('Your password is not correct.');
  }
  await prisma.user.delete({ where: { id: req.user.id } });
  await fs.rm(path.join(config.storageDir, req.user.id), { recursive: true, force: true });
  clearSession(res);
  res.json({ ok: true });
});

export default router;
