/**
 * Encrypted file storage. Files are written to disk only after AES-256-GCM
 * encryption with the owner's vault key, under random names, so neither the
 * file name nor the content is readable by someone who copies the disk.
 */
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { config } from '../config.js';
import { encryptBuffer, decryptBuffer } from './crypto.js';

const KEY_PATTERN = /^[0-9a-f-]{36}\.bin$/;

function filePath(ownerId, storageKey) {
  if (!KEY_PATTERN.test(storageKey) || !/^[a-z0-9]+$/i.test(ownerId)) throw new Error('Invalid storage key');
  return path.join(config.storageDir, ownerId, storageKey);
}

export async function saveEncrypted(ownerId, buffer) {
  const storageKey = `${crypto.randomUUID()}.bin`;
  const target = filePath(ownerId, storageKey);
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(target, encryptBuffer(ownerId, buffer), { mode: 0o600 });
  return storageKey;
}

export async function readDecrypted(ownerId, storageKey) {
  return decryptBuffer(ownerId, await fs.readFile(filePath(ownerId, storageKey)));
}

export async function removeFile(ownerId, storageKey) {
  await fs.rm(filePath(ownerId, storageKey), { force: true });
}

/**
 * Check the real file type from its first bytes instead of trusting the
 * browser-supplied MIME type. Returns the verified MIME type or null.
 */
export function sniffMime(buffer, claimed) {
  const head = buffer.subarray(0, 8);
  const starts = (...bytes) => bytes.every((b, i) => head[i] === b);
  if (starts(0x25, 0x50, 0x44, 0x46)) return 'application/pdf';
  if (starts(0xff, 0xd8, 0xff)) return 'image/jpeg';
  if (starts(0x89, 0x50, 0x4e, 0x47)) return 'image/png';
  if (starts(0x52, 0x49, 0x46, 0x46) && buffer.subarray(8, 12).toString() === 'WEBP') return 'image/webp';
  if (starts(0x50, 0x4b, 0x03, 0x04) && claimed === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    return claimed; // .docx is a zip container
  }
  if (claimed === 'text/plain' && !buffer.subarray(0, 4096).includes(0)) return 'text/plain';
  return null;
}
