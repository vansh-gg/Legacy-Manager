import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const serverRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// Load server/.env (created by `npm run setup`). Real environment variables win.
try {
  process.loadEnvFile(path.join(serverRoot, '.env'));
} catch {
  /* no .env file — rely on the real environment */
}

function required(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing environment variable ${name}. Run "npm run setup" first.`);
  }
  return value;
}

const env = process.env.NODE_ENV || 'development';
const isProd = env === 'production';

export const config = {
  env,
  isProd,
  isTest: env === 'test',
  port: Number(process.env.PORT || 4000),
  jwtSecret: required('JWT_SECRET'),
  encryptionKey: required('ENCRYPTION_KEY'),
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  storageDir: path.resolve(serverRoot, process.env.STORAGE_DIR || 'storage'),
  sessionHours: 4,
  maxUploadMb: 10,
  /** Days before the check-in deadline that the first reminder is sent. */
  reminderDaysBefore: 3,
  /** Wrong passwords allowed before the account is locked for lockMinutes. */
  maxFailedLogins: 5,
  lockMinutes: 15,
  smtp: {
    host: process.env.SMTP_HOST || '',
    port: Number(process.env.SMTP_PORT || 587),
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.MAIL_FROM || 'Digital Legacy Manager <no-reply@dlm.local>',
  },
  /** Demo helpers (mailbox, time travel). Never enable on a real deployment. */
  devTools: process.env.ENABLE_DEV_TOOLS ? process.env.ENABLE_DEV_TOOLS === 'true' : !isProd,
};

if (Buffer.from(config.encryptionKey, 'base64').length !== 32) {
  throw new Error('ENCRYPTION_KEY must be 32 bytes, base64-encoded. Run "npm run setup" to generate one.');
}
if (config.jwtSecret.length < 32) {
  throw new Error('JWT_SECRET must be at least 32 characters long.');
}
