/**
 * Vault encryption.
 *
 * - Every owner gets their own 256-bit data key, derived from the server's
 *   master key with HKDF-SHA256 and the owner's id. A leaked ciphertext from one
 *   vault can never be decrypted with another vault's key.
 * - Data is sealed with AES-256-GCM (authenticated encryption): any tampering
 *   with the stored bytes makes decryption fail instead of returning garbage.
 * - A fresh random 96-bit IV is used for every encryption.
 */
import crypto from 'node:crypto';
import { config } from '../config.js';

const MASTER_KEY = Buffer.from(config.encryptionKey, 'base64');
const VERSION = 'v1';
const IV_LEN = 12;
const TAG_LEN = 16;

function vaultKey(ownerId) {
  return Buffer.from(crypto.hkdfSync('sha256', MASTER_KEY, Buffer.from(ownerId), 'dlm-vault-key-v1', 32));
}

export function encryptBuffer(ownerId, plain) {
  const iv = crypto.randomBytes(IV_LEN);
  const cipher = crypto.createCipheriv('aes-256-gcm', vaultKey(ownerId), iv);
  const body = Buffer.concat([cipher.update(plain), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), body]);
}

export function decryptBuffer(ownerId, sealed) {
  const iv = sealed.subarray(0, IV_LEN);
  const tag = sealed.subarray(IV_LEN, IV_LEN + TAG_LEN);
  const body = sealed.subarray(IV_LEN + TAG_LEN);
  const decipher = crypto.createDecipheriv('aes-256-gcm', vaultKey(ownerId), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(body), decipher.final()]);
}

export function encryptText(ownerId, text) {
  return `${VERSION}:${encryptBuffer(ownerId, Buffer.from(text, 'utf8')).toString('base64')}`;
}

export function decryptText(ownerId, payload) {
  const [version, data] = payload.split(':');
  if (version !== VERSION) throw new Error('Unsupported ciphertext version');
  return decryptBuffer(ownerId, Buffer.from(data, 'base64')).toString('utf8');
}

export const encryptJson = (ownerId, obj) => encryptText(ownerId, JSON.stringify(obj));
export const decryptJson = (ownerId, payload) => JSON.parse(decryptText(ownerId, payload));

/** URL-safe random token for email links. */
export const randomToken = () => crypto.randomBytes(32).toString('base64url');

/** Tokens are stored only as SHA-256 hashes so a database leak cannot be replayed. */
export const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');
