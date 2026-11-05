import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { app, client, registeredClient, uniqueEmail, lastEmailTo, tokenFromLink, prisma } from './helpers.js';

describe('Authentication', () => {
  test('TC-AUTH-01 registers a user and starts a session', async () => {
    const { c, user } = await registeredClient({ name: 'Ramesh Kumar' });
    assert.equal(user.name, 'Ramesh Kumar');
    assert.equal(user.legacyStatus, 'ACTIVE');
    assert.equal(user.passwordHash, undefined, 'password hash must never be returned');
    const me = await c.get('/api/auth/me');
    assert.equal(me.status, 200);
    assert.equal(me.body.user.id, user.id);
  });

  test('TC-AUTH-02 rejects weak passwords and invalid emails', async () => {
    const weak = await client().post('/api/auth/register').send({ name: 'A B', email: uniqueEmail(), password: 'short' });
    assert.equal(weak.status, 400);
    const noDigit = await client().post('/api/auth/register').send({ name: 'A B', email: uniqueEmail(), password: 'onlyletters' });
    assert.equal(noDigit.status, 400);
    const badEmail = await client().post('/api/auth/register').send({ name: 'A B', email: 'nope', password: 'Secret123' });
    assert.equal(badEmail.status, 400);
  });

  test('TC-AUTH-03 rejects duplicate email', async () => {
    const email = uniqueEmail();
    await client().post('/api/auth/register').send({ name: 'One', email, password: 'Secret123' });
    const dup = await client().post('/api/auth/register').send({ name: 'Two', email, password: 'Secret123' });
    assert.equal(dup.status, 409);
  });

  test('TC-AUTH-04 stores passwords as bcrypt hashes', async () => {
    const { user } = await registeredClient();
    const row = await prisma.user.findUnique({ where: { id: user.id } });
    assert.match(row.passwordHash, /^\$2[aby]\$12\$/);
  });

  test('TC-AUTH-05 login with wrong password gives a generic error', async () => {
    const { user } = await registeredClient();
    const res = await client().post('/api/auth/login').send({ email: user.email, password: 'Wrong1234' });
    assert.equal(res.status, 401);
    const unknown = await client().post('/api/auth/login').send({ email: uniqueEmail(), password: 'Wrong1234' });
    assert.equal(unknown.status, 401);
    assert.equal(res.body.error, unknown.body.error, 'must not reveal whether the email exists');
  });

  test('TC-AUTH-06 locks the account after 5 wrong passwords', async () => {
    const { user, password } = await registeredClient();
    for (let i = 0; i < 5; i++) {
      await client().post('/api/auth/login').send({ email: user.email, password: 'Wrong1234' });
    }
    const locked = await client().post('/api/auth/login').send({ email: user.email, password });
    assert.equal(locked.status, 423, 'even the right password is refused while locked');
  });

  test('TC-AUTH-07 protected routes need a session', async () => {
    const res = await client().get('/api/auth/me');
    assert.equal(res.status, 401);
  });

  test('TC-AUTH-08 state-changing requests without the CSRF header are blocked', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'x@example.com', password: 'x' });
    assert.equal(res.status, 403);
  });

  test('TC-AUTH-09 password reset flow works once and invalidates old sessions', async () => {
    const { c, user } = await registeredClient();
    await client().post('/api/auth/forgot-password').send({ email: user.email });
    const mail = await lastEmailTo(user.email);
    const token = tokenFromLink(mail.link);

    const reset = await client().post('/api/auth/reset-password').send({ token, password: 'NewSecret456' });
    assert.equal(reset.status, 200);
    const reuse = await client().post('/api/auth/reset-password').send({ token, password: 'Another789' });
    assert.equal(reuse.status, 400, 'token is single-use');

    assert.equal((await c.get('/api/auth/me')).status, 401, 'old session was revoked');
    const login = await client().post('/api/auth/login').send({ email: user.email, password: 'NewSecret456' });
    assert.equal(login.status, 200);
  });

  test('TC-AUTH-10 change password keeps current device, signs out others', async () => {
    const { c, user, password } = await registeredClient();
    const other = client();
    await other.post('/api/auth/login').send({ email: user.email, password });
    const res = await c.post('/api/auth/change-password').send({ currentPassword: password, newPassword: 'Changed999' });
    assert.equal(res.status, 200);
    assert.equal((await c.get('/api/auth/me')).status, 200);
    assert.equal((await other.get('/api/auth/me')).status, 401);
  });

  test('TC-AUTH-11 updates check-in settings with validation', async () => {
    const { c } = await registeredClient();
    const ok = await c.patch('/api/auth/me/check-in-settings').send({ checkInIntervalDays: 60, gracePeriodDays: 10 });
    assert.equal(ok.status, 200);
    assert.equal(ok.body.user.checkInIntervalDays, 60);
    const bad = await c.patch('/api/auth/me/check-in-settings').send({ checkInIntervalDays: 2, gracePeriodDays: 10 });
    assert.equal(bad.status, 400);
  });
});
