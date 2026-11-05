import rateLimit from 'express-rate-limit';
import { config } from '../config.js';

const limiter = (windowMinutes, limit, message) =>
  rateLimit({
    windowMs: windowMinutes * 60 * 1000,
    limit: config.isTest ? 10_000 : limit,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { error: message },
  });

/** General API limit. */
export const apiLimiter = limiter(15, 600, 'Too many requests. Please wait a few minutes and try again.');

/** Stricter limit for login / sign-up / password reset to slow down guessing. */
export const authLimiter = limiter(15, 30, 'Too many attempts. Please wait 15 minutes and try again.');

/** Revealing secrets requires the password again — limit guesses there too. */
export const revealLimiter = limiter(15, 20, 'Too many attempts. Please wait 15 minutes and try again.');

/**
 * CSRF protection. Session cookies are SameSite=Lax, and in addition every
 * state-changing request must carry a custom header. Browsers do not let other
 * websites set custom headers on cross-site requests without a CORS preflight,
 * which this API never approves.
 */
export function requireCsrfHeader(req, res, next) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  if (req.get('X-Requested-With') !== 'DLM') {
    return res.status(403).json({ error: 'Request blocked for your safety. Please refresh the page and try again.' });
  }
  next();
}
