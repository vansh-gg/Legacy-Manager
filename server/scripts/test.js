/**
 * Runs the API test-suite against a throw-away SQLite database.
 *   npm test
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const env = {
  ...process.env,
  NODE_ENV: 'test',
  DATABASE_URL: 'file:./test.db',
  STORAGE_DIR: 'test-storage',
  JWT_SECRET: crypto.randomBytes(48).toString('base64url'),
  ENCRYPTION_KEY: crypto.randomBytes(32).toString('base64'),
  CLIENT_URL: 'http://localhost:5173',
  SMTP_HOST: '',
};

// Start from an empty, test-only database file (never touches dev.db).
const testDb = path.join(root, 'prisma', 'test.db');
for (const f of [testDb, `${testDb}-journal`]) fs.rmSync(f, { force: true });
fs.rmSync(path.join(root, 'test-storage'), { recursive: true, force: true });
execSync('npx prisma migrate deploy', { cwd: root, env, stdio: 'ignore' });
try {
  execSync('node --test --test-concurrency=1 --test-timeout=20000 --test-force-exit "tests/**/*.test.js"', { cwd: root, env, stdio: 'inherit' });
} finally {
  fs.rmSync(path.join(root, 'test-storage'), { recursive: true, force: true });
}
