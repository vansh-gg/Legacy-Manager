import { prisma } from '../db.js';
import { hashToken, randomToken } from './crypto.js';

/** Create a single-use email token. Only its hash is stored. */
export async function createToken({ type, userId = null, nomineeId = null, ttlMinutes }) {
  const token = randomToken();
  await prisma.actionToken.create({
    data: {
      type,
      tokenHash: hashToken(token),
      userId,
      nomineeId,
      expiresAt: new Date(Date.now() + ttlMinutes * 60 * 1000),
    },
  });
  return token;
}

/** Returns the token record if it exists, matches the type, is unused and unexpired. */
export async function findValidToken(type, token) {
  if (typeof token !== 'string' || token.length < 20 || token.length > 200) return null;
  const record = await prisma.actionToken.findUnique({ where: { tokenHash: hashToken(token) } });
  if (!record || record.type !== type || record.usedAt || record.expiresAt < new Date()) return null;
  return record;
}

export const consumeToken = (id) => prisma.actionToken.update({ where: { id }, data: { usedAt: new Date() } });
