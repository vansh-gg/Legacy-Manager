import { prisma } from '../db.js';
import { config } from '../config.js';
import { createToken } from '../lib/tokens.js';
import { audit } from '../lib/audit.js';
import { sendMail, appLink } from '../lib/mailer.js';

export const DAY_MS = 24 * 60 * 60 * 1000;

export const checkInDueAt = (user) => new Date(user.lastCheckInAt.getTime() + user.checkInIntervalDays * DAY_MS);

/** Safe view of a user for the browser. */
export function publicUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    checkInIntervalDays: user.checkInIntervalDays,
    gracePeriodDays: user.gracePeriodDays,
    lastCheckInAt: user.lastCheckInAt,
    nextCheckInDue: checkInDueAt(user),
    legacyStatus: user.legacyStatus,
    graceEndsAt: user.graceEndsAt,
    statusReason: user.statusReason,
    createdAt: user.createdAt,
  };
}

/**
 * The owner has shown they are alive and well (logged in, pressed "I'm OK",
 * or clicked the check-in link in an email). Resets the inactivity timer and
 * cancels any pending or completed release.
 */
export async function recordCheckIn(user, via, req = null) {
  const previous = user.legacyStatus;
  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      lastCheckInAt: new Date(),
      legacyStatus: 'ACTIVE',
      graceEndsAt: null,
      statusReason: null,
      ...(previous !== 'ACTIVE' ? { statusChangedAt: new Date() } : {}),
    },
  });
  await audit(user.id, 'CHECK_IN', `You confirmed you are well (${via}).`, req);

  if (previous === 'GRACE' || previous === 'RELEASED') {
    const nominees = await prisma.nominee.findMany({ where: { ownerId: user.id, status: 'ACCEPTED' } });
    for (const n of nominees) {
      await sendMail({
        to: n.email,
        subject: `${user.name} has checked in`,
        heading: `Good news: ${user.name} has checked in`,
        text:
          previous === 'RELEASED'
            ? `Dear ${n.name},\n\n${user.name} has confirmed they are well. The items that were shared with you have been locked again.`
            : `Dear ${n.name},\n\n${user.name} has confirmed they are well. No action is needed from you.`,
      });
    }
    if (previous === 'RELEASED') {
      await audit(user.id, 'RELEASE_CANCELLED', 'You checked in after your vault was released. Access was locked again.', req);
    }
  }
  return updated;
}

export { appLink };

// ---------------------------------------------------------------------------
// Inactivity engine ("dead man's switch")
//
//   ACTIVE ──(3 days before due)──▶ REMINDED ──(due date passes)──▶ GRACE
//      ▲                                                          │
//      └──────────── owner checks in at any point ◀───────────────┤
//                                                                 ▼
//                                          (grace period ends)  RELEASED
// ---------------------------------------------------------------------------

async function sendCheckInEmail(user, { subject, heading, text }) {
  const token = await createToken({
    type: 'CHECK_IN',
    userId: user.id,
    ttlMinutes: (user.checkInIntervalDays + user.gracePeriodDays + 7) * 24 * 60,
  });
  await sendMail({ to: user.email, subject, heading, text, link: appLink(`/check-in/${token}`), linkLabel: 'Yes, I am well' });
}

const acceptedNominees = (ownerId) => prisma.nominee.findMany({ where: { ownerId, status: 'ACCEPTED' } });

export async function enterGrace(user, { graceEndsAt, reason }) {
  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { legacyStatus: 'GRACE', statusChangedAt: new Date(), graceEndsAt, statusReason: reason },
  });
  const until = graceEndsAt.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
  await sendCheckInEmail(updated, {
    subject: 'Urgent: please confirm you are well',
    heading: 'Please let us know you are well',
    text:
      `Dear ${user.name},\n\n${reason}\n\nIf we do not hear from you by ${until}, the items you chose will be shared with your nominees.\n\n` +
      'Please press the button below, or simply log in. It takes one click.',
  });
  for (const n of await acceptedNominees(user.id)) {
    await sendMail({
      to: n.email,
      subject: `We are trying to reach ${user.name}`,
      text:
        `Dear ${n.name},\n\nWe have not been able to reach ${user.name} recently. If you can, please check on them ` +
        `and remind them to log in to Digital Legacy Manager.\n\nNothing else is needed from you right now.`,
    });
  }
  await audit(user.id, 'GRACE_STARTED', `${reason} Release scheduled for ${until} unless you check in.`);
  return updated;
}

export async function releaseVault(user) {
  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { legacyStatus: 'RELEASED', statusChangedAt: new Date(), graceEndsAt: null },
  });
  for (const n of await acceptedNominees(user.id)) {
    await sendMail({
      to: n.email,
      subject: `${user.name} has left items for you`,
      heading: `Items left for you by ${user.name}`,
      text:
        `Dear ${n.name},\n\nWe are sorry that we could not reach ${user.name}. As they wished, the items and messages ` +
        `they chose for you are now available.\n\nPlease log in with your own account to see them.`,
      link: appLink('/app/shared'),
      linkLabel: 'See what was left for me',
    });
  }
  await sendMail({
    to: user.email,
    subject: 'Your vault has been released to your nominees',
    text: `Dear ${user.name},\n\nWe did not hear from you, so your nominees can now see what you left for them.\n\nIf you are well, simply log in and access will be locked again immediately.`,
    link: appLink('/login'),
    linkLabel: 'Log in',
  });
  await audit(user.id, 'VAULT_RELEASED', 'Your vault was released to your accepted nominees.');
  return updated;
}

/** Hourly job. Safe to run many times: each step happens only once. */
export async function runInactivitySweep(now = new Date()) {
  const summary = { reminded: 0, grace: 0, released: 0 };
  const users = await prisma.user.findMany({ where: { legacyStatus: { in: ['ACTIVE', 'REMINDED', 'GRACE'] } } });

  for (const user of users) {
    if (user.legacyStatus === 'GRACE') {
      if (user.graceEndsAt && now >= user.graceEndsAt) {
        await releaseVault(user);
        summary.released++;
      }
      continue;
    }
    const due = checkInDueAt(user);
    const reminderDays = Math.min(config.reminderDaysBefore, Math.floor(user.checkInIntervalDays / 2));
    const remindAt = new Date(due.getTime() - reminderDays * DAY_MS);

    if (now >= due) {
      // Always give at least one full day of warning, even if the server was offline for a while.
      const graceEndsAt = new Date(Math.max(due.getTime() + user.gracePeriodDays * DAY_MS, now.getTime() + DAY_MS));
      await enterGrace(user, { graceEndsAt, reason: `You have not checked in since ${user.lastCheckInAt.toDateString()}.` });
      summary.grace++;
    } else if (now >= remindAt && user.legacyStatus === 'ACTIVE') {
      await prisma.user.update({ where: { id: user.id }, data: { legacyStatus: 'REMINDED', statusChangedAt: now } });
      await sendCheckInEmail(user, {
        subject: 'Friendly reminder: please check in',
        heading: `Hello ${user.name}, how are you?`,
        text: `It is almost time for your regular check-in (due ${due.toDateString()}).\n\nPlease press the button below to tell us you are well. That is all you need to do.`,
      });
      await audit(user.id, 'REMINDER_SENT', 'A check-in reminder was emailed to you.');
      summary.reminded++;
    }
  }
  return summary;
}
