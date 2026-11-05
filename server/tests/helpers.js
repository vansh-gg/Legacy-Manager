import request from 'supertest';
import { createApp } from '../src/app.js';
import { prisma } from '../src/db.js';

export const app = createApp();
export { prisma };

let counter = 0;
export const uniqueEmail = (prefix = 'user') => `${prefix}.${Date.now()}.${++counter}@example.com`;

/** A supertest agent that keeps cookies and sends the CSRF header automatically. */
export function client() {
  const agent = request.agent(app);
  const wrap = (method) => (url) => agent[method](url).set('X-Requested-With', 'DLM');
  return { get: wrap('get'), post: wrap('post'), put: wrap('put'), patch: wrap('patch'), delete: wrap('delete') };
}

export async function registeredClient(overrides = {}) {
  const c = client();
  const body = { name: 'Test Owner', email: uniqueEmail(), password: 'Secret123', ...overrides };
  const res = await c.post('/api/auth/register').send(body);
  if (res.status !== 201) throw new Error(`register failed: ${res.status} ${JSON.stringify(res.body)}`);
  return { c, user: res.body.user, password: body.password };
}

/** Last email sent to an address (from the email log). */
export const lastEmailTo = (to) => prisma.emailLog.findFirst({ where: { to }, orderBy: { createdAt: 'desc' } });

/** Pull the token out of a link such as http://host/invite/<token>. */
export const tokenFromLink = (link) => link.split('/').pop();
