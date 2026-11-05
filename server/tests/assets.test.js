import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { registeredClient, uniqueEmail, prisma } from './helpers.js';

const bankAccount = {
  category: 'BANK',
  title: 'SBI Savings Account',
  institution: 'State Bank of India',
  identifierHint: 'ending 4321',
  instructions: 'Transfer the balance to Priya.',
  secret: { username: 'ramesh_k', password: 'NetBanking@123', notes: 'Locker key is in the cupboard' },
};

describe('Asset vault', () => {
  test('TC-AST-01 creates an asset with encrypted private details', async () => {
    const { c } = await registeredClient();
    const res = await c.post('/api/assets').send(bankAccount);
    assert.equal(res.status, 201);
    assert.equal(res.body.asset.hasSecret, true);
    assert.equal(res.body.asset.secret, undefined, 'secrets are not returned in lists');

    const row = await prisma.asset.findUnique({ where: { id: res.body.asset.id } });
    assert.match(row.secretEnc, /^v1:/);
    assert.ok(!row.secretEnc.includes('NetBanking'), 'stored value must be ciphertext');
  });

  test('TC-AST-02 reveal requires the correct password', async () => {
    const { c, password } = await registeredClient();
    const { body } = await c.post('/api/assets').send(bankAccount);
    const wrong = await c.post(`/api/assets/${body.asset.id}/reveal`).send({ password: 'nope' });
    assert.equal(wrong.status, 400);
    const ok = await c.post(`/api/assets/${body.asset.id}/reveal`).send({ password });
    assert.equal(ok.status, 200);
    assert.equal(ok.body.secret.password, 'NetBanking@123');
  });

  test('TC-AST-03 rejects full account numbers in the hint field', async () => {
    const { c } = await registeredClient();
    const res = await c.post('/api/assets').send({ ...bankAccount, identifierHint: '12345678901' });
    assert.equal(res.status, 400);
    assert.match(res.body.error, /last 4 digits/);
  });

  test('TC-AST-04 updating without `secret` keeps the stored secret', async () => {
    const { c, password } = await registeredClient();
    const { body } = await c.post('/api/assets').send(bankAccount);
    const { secret, ...rest } = bankAccount;
    void secret;
    await c.put(`/api/assets/${body.asset.id}`).send({ ...rest, title: 'SBI Account (renamed)' });
    const revealed = await c.post(`/api/assets/${body.asset.id}/reveal`).send({ password });
    assert.equal(revealed.body.secret.username, 'ramesh_k');
  });

  test('TC-AST-05 assigns an asset only to the owner\'s own nominees', async () => {
    const owner = await registeredClient();
    const other = await registeredClient();
    const mine = await owner.c.post('/api/nominees').send({ name: 'Priya', email: uniqueEmail(), relationship: 'Daughter' });
    const theirs = await other.c.post('/api/nominees').send({ name: 'Xavier', email: uniqueEmail(), relationship: 'Son' });

    const ok = await owner.c.post('/api/assets').send({ ...bankAccount, nomineeIds: [mine.body.nominee.id] });
    assert.deepEqual(ok.body.asset.nomineeIds, [mine.body.nominee.id]);
    const bad = await owner.c.post('/api/assets').send({ ...bankAccount, nomineeIds: [theirs.body.nominee.id] });
    assert.equal(bad.status, 400);
  });

  test('TC-AST-06 another user cannot read, reveal or delete my asset', async () => {
    const owner = await registeredClient();
    const attacker = await registeredClient();
    const { body } = await owner.c.post('/api/assets').send(bankAccount);
    assert.equal((await attacker.c.post(`/api/assets/${body.asset.id}/reveal`).send({ password: attacker.password })).status, 404);
    assert.equal((await attacker.c.delete(`/api/assets/${body.asset.id}`)).status, 404);
    assert.equal((await attacker.c.get('/api/assets')).body.assets.length, 0);
  });
});
