import { prisma } from '../db.js';
import { badRequest, notFound } from '../lib/http.js';

/** Make sure every nominee id belongs to this owner (prevents sharing into someone else's family list). */
export async function assertOwnNominees(ownerId, nomineeIds) {
  const unique = [...new Set(nomineeIds)];
  if (unique.length === 0) return [];
  const count = await prisma.nominee.count({ where: { ownerId, id: { in: unique } } });
  if (count !== unique.length) throw badRequest('One of the chosen people is not in your nominee list.');
  return unique;
}

/** Fetch a record only if it belongs to the owner; otherwise 404 (never reveal that it exists). */
export async function findOwned(model, ownerId, id, include) {
  const record = await prisma[model].findFirst({ where: { id, ownerId }, include });
  if (!record) throw notFound();
  return record;
}
