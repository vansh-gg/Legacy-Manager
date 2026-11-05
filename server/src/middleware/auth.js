import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { prisma } from '../db.js';
import { unauthorized } from '../lib/http.js';

const COOKIE = 'dlm_session';

/** Issue a session as an HttpOnly cookie (JavaScript in the page can never read it). */
export function setSession(res, user) {
  const token = jwt.sign({ sub: user.id, tv: user.tokenVersion }, config.jwtSecret, {
    expiresIn: `${config.sessionHours}h`,
    algorithm: 'HS256',
  });
  res.cookie(COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: config.isProd,
    maxAge: config.sessionHours * 60 * 60 * 1000,
    path: '/',
  });
}

export function clearSession(res) {
  res.clearCookie(COOKIE, { path: '/', httpOnly: true, sameSite: 'lax', secure: config.isProd });
}

export async function requireAuth(req, res, next) {
  const token = req.cookies?.[COOKIE];
  if (!token) throw unauthorized();
  let payload;
  try {
    payload = jwt.verify(token, config.jwtSecret, { algorithms: ['HS256'] });
  } catch {
    clearSession(res);
    throw unauthorized('Your session has ended. Please log in again.');
  }
  const user = await prisma.user.findUnique({ where: { id: payload.sub } });
  // tokenVersion changes on password change / "log out everywhere".
  if (!user || user.tokenVersion !== payload.tv) {
    clearSession(res);
    throw unauthorized('Your session has ended. Please log in again.');
  }
  req.user = user;
  next();
}
