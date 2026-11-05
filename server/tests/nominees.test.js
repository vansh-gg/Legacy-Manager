import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { client, registeredClient, uniqueEmail, lastEmailTo, tokenFromLink } from './helpers.js';

describe('Nominees & invitations', () => {
  test('TC-NOM-01 owner adds a nominee and an invitation email is sent', async () => {
    const { c } = await registeredClient({ name: 'Ramesh' });
    const email = uniqueEmail('priya');
    const res = await c.post('/api/nominees').send({ name: 'Priya', email, relationship: 'Daughter' });
    assert.equal(res.status, 201);
    assert.equal(res.body.nominee.status, 'INVITED');
    const mail = await lastEmailTo(email);
    assert.match(mail.subject, /Ramesh has chosen you/);
    assert.match(mail.link, /\/invite\//);
  });

  test('TC-NOM-02 cannot add yourself or the same person twice', async () => {
    const { c, user } = await registeredClient();
    assert.equal((await c.post('/api/nominees').send({ name: 'Me', email: user.email, relationship: 'Self' })).status, 400);
    const email = uniqueEmail();
    await c.post('/api/nominees').send({ name: 'Son', email, relationship: 'Son' });
    assert.equal((await c.post('/api/nominees').send({ name: 'Son', email, relationship: 'Son' })).status, 409);
  });

  test('TC-NOM-03 nominee accepts with the matching account only', async () => {
    const { c } = await registeredClient({ name: 'Owner' });
    const email = uniqueEmail('nominee');
    const { body } = await c.post('/api/nominees').send({ name: 'Nominee', email, relationship: 'Son' });
    const token = tokenFromLink((await lastEmailTo(email)).link);

    const info = await client().get(`/api/invites/${token}`);
    assert.equal(info.body.invite.ownerName, 'Owner');

    const stranger = await registeredClient();
    assert.equal((await stranger.c.post(`/api/invites/${token}/accept`)).status, 403);

    const nominee = await registeredClient({ email });
    assert.equal((await nominee.c.post(`/api/invites/${token}/accept`)).status, 200);
    const list = await c.get('/api/nominees');
    assert.equal(list.body.nominees.find((n) => n.id === body.nominee.id).status, 'ACCEPTED');
    assert.equal((await nominee.c.post(`/api/invites/${token}/accept`)).status, 400, 'link is single-use');
  });

  test('TC-NOM-04 owners cannot see or edit other owners\' nominees', async () => {
    const a = await registeredClient();
    const b = await registeredClient();
    const { body } = await a.c.post('/api/nominees').send({ name: 'Kid', email: uniqueEmail(), relationship: 'Son' });
    assert.equal((await b.c.put(`/api/nominees/${body.nominee.id}`).send({ name: 'Hacked', relationship: 'x' })).status, 404);
    assert.equal((await b.c.delete(`/api/nominees/${body.nominee.id}`)).status, 404);
    assert.equal((await b.c.get('/api/nominees')).body.nominees.length, 0);
  });

  test('TC-NOM-05 nominee can decline; resending creates a new link', async () => {
    const { c } = await registeredClient();
    const email = uniqueEmail();
    const { body } = await c.post('/api/nominees').send({ name: 'Friend', email, relationship: 'Friend' });
    const first = tokenFromLink((await lastEmailTo(email)).link);
    assert.equal((await client().post(`/api/invites/${first}/decline`)).status, 200);
    const resent = await c.post(`/api/nominees/${body.nominee.id}/resend`);
    assert.equal(resent.body.nominee.status, 'INVITED');
    const second = tokenFromLink((await lastEmailTo(email)).link);
    assert.notEqual(first, second);
    assert.equal((await client().get(`/api/invites/${first}`)).status, 400);
  });
});
