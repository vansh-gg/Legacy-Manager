import { prisma } from '../db.js';
import { clientIp } from './http.js';

/**
 * Record an event in a user's activity history.
 * Never put secrets (passwords, decrypted data) in `detail`.
 */
export async function audit(userId, action, detail = null, req = null) {
  try {
    await prisma.auditLog.create({
      data: { userId, action, detail, ip: req ? clientIp(req) : null },
    });
  } catch (err) {
    console.error('[audit] failed to write log', err.message);
  }
}
