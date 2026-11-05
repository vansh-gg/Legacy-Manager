import { prisma } from '../db.js';
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
