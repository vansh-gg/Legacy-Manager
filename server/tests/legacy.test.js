import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { client, registeredClient, uniqueEmail, lastEmailTo, tokenFromLink, prisma } from './helpers.js';
import { runInactivitySweep, DAY_MS } from '../src/services/legacy.js';

/** Owner with one accepted nominee and one shared asset + letter. */
async function familySetup() {
  const owner = await registeredClient({ name: 'Ramesh Kumar' });
  const nomineeEmail = uniqueEmail('priya');
  const nom = await owner.c.post('/api/nominees').send({ name: 'Priya Kumar', email: nomineeEmail, relationship: 'Daughter' });
  const nomineeId = nom.body.nominee.id;
  const token = tokenFromLink((await lastEmailTo(nomineeEmail)).link);
  const nominee = await registeredClient({ name: 'Priya Kumar', email: nomineeEmail, password: 'Daughter123' });
  await nominee.c.post(`/api/invites/${token}/accept`);

  const asset = await owner.c.post('/api/assets').send({
    category: 'BANK',
    title: 'SBI Savings',
    secret: { username: 'ramesh', password: 'Bank@999' },
    nomineeIds: [nomineeId],
  });
  await owner.c.post('/api/assets').send({ category: 'EMAIL', title: 'Private Gmail (not shared)' });
  await owner.c.post('/api/letters').send({ nomineeId, subject: 'For Priya', body: 'With love, Papa' });
  return { owner, nominee, nomineeId, nomineeEmail, assetId: asset.body.asset.id };
}

const setLastCheckIn = (userId, daysAgo) =>
  prisma.user.update({ where: { id: userId }, data: { lastCheckInAt: new Date(Date.now() - daysAgo * DAY_MS) } });
const status = async (userId) => (await prisma.user.findUnique({ where: { id: userId } })).legacyStatus;

describe('Check-in & release (dead man\'s switch)', () => {
  test('TC-LEG-01 full lifecycle: reminder → grace → release', async () => {
    const { owner, nomineeEmail } = await familySetup();
    const id = owner.user.id;

    await setLastCheckIn(id, 28); // 30-day interval, reminder 3 days before
    await runInactivitySweep();
    assert.equal(await status(id), 'REMINDED');
    assert.match((await lastEmailTo(owner.user.email)).subject, /reminder/i);

    await setLastCheckIn(id, 31);
    await runInactivitySweep();
    assert.equal(await status(id), 'GRACE');
    assert.match((await lastEmailTo(nomineeEmail)).subject, /trying to reach/);

    await prisma.user.update({ where: { id }, data: { graceEndsAt: new Date(Date.now() - 1000) } });
    await runInactivitySweep();
    assert.equal(await status(id), 'RELEASED');
    assert.match((await lastEmailTo(nomineeEmail)).subject, /left items for you/);
  });

  test('TC-LEG-02 nothing is visible to nominees before release', async () => {
    const { nominee, nomineeId, assetId } = await familySetup();
    const list = await nominee.c.get('/api/shared');
    assert.equal(list.body.vaults[0].ownerStatus, 'ACTIVE');
    assert.equal((await nominee.c.get(`/api/shared/${nomineeId}`)).status, 403);
    const reveal = await nominee.c.post(`/api/shared/${nomineeId}/assets/${assetId}/reveal`).send({ password: 'Daughter123' });
    assert.equal(reveal.status, 403);
  });

  test('TC-LEG-03 after release the nominee sees only items assigned to them', async () => {
    const { owner, nominee, nomineeId, assetId } = await familySetup();
    await prisma.user.update({ where: { id: owner.user.id }, data: { legacyStatus: 'RELEASED' } });

    const view = await nominee.c.get(`/api/shared/${nomineeId}`);
    assert.equal(view.status, 200);
    assert.deepEqual(view.body.assets.map((a) => a.title), ['SBI Savings']);
    assert.equal(view.body.letters[0].body, 'With love, Papa');

    const secret = await nominee.c.post(`/api/shared/${nomineeId}/assets/${assetId}/reveal`).send({ password: 'Daughter123' });
    assert.equal(secret.body.secret.password, 'Bank@999');
  });

  test('TC-LEG-04 a stranger cannot open someone else\'s shared vault', async () => {
    const { owner, nomineeId } = await familySetup();
    await prisma.user.update({ where: { id: owner.user.id }, data: { legacyStatus: 'RELEASED' } });
    const stranger = await registeredClient();
    assert.equal((await stranger.c.get(`/api/shared/${nomineeId}`)).status, 404);
  });

  test('TC-LEG-05 checking in cancels a release and locks the vault again', async () => {
    const { owner, nominee, nomineeId } = await familySetup();
    await prisma.user.update({ where: { id: owner.user.id }, data: { legacyStatus: 'RELEASED' } });
    await owner.c.post('/api/check-in');
    assert.equal(await status(owner.user.id), 'ACTIVE');
    assert.equal((await nominee.c.get(`/api/shared/${nomineeId}`)).status, 403);
  });

  test('TC-LEG-06 one-click email link checks the owner in without logging in', async () => {
    const { owner } = await familySetup();
    await setLastCheckIn(owner.user.id, 28);
    await runInactivitySweep();
    const token = tokenFromLink((await lastEmailTo(owner.user.email)).link);
    const res = await client().post(`/api/check-in/link/${token}`);
    assert.equal(res.status, 200);
    assert.equal(await status(owner.user.id), 'ACTIVE');
  });

  test('TC-LEG-07 a nominee report starts the grace period but never releases immediately', async () => {
    const { owner, nominee, nomineeId } = await familySetup();
    const res = await nominee.c.post(`/api/shared/${nomineeId}/report`).send({ note: 'Papa is in hospital' });
    assert.equal(res.body.ownerStatus, 'GRACE');
    assert.equal((await nominee.c.get(`/api/shared/${nomineeId}`)).status, 403);
    assert.match((await lastEmailTo(owner.user.email)).subject, /Urgent/);
  });

  test('TC-LEG-08 sweep is idempotent (no duplicate reminders)', async () => {
    const { owner } = await familySetup();
    await setLastCheckIn(owner.user.id, 28);
    await runInactivitySweep();
    const before = await prisma.emailLog.count({ where: { to: owner.user.email } });
    await runInactivitySweep();
    assert.equal(await prisma.emailLog.count({ where: { to: owner.user.email } }), before);
  });

  test('TC-LEG-09 dashboard reports readiness steps', async () => {
    const { owner } = await familySetup();
    const res = await owner.c.get('/api/dashboard');
    assert.equal(res.status, 200);
    assert.equal(res.body.counts.assets, 2);
    assert.equal(res.body.steps.find((s) => s.key === 'accepted').done, true);
    assert.equal(res.body.steps.find((s) => s.key === 'assigned').done, false, 'one asset is unassigned');
  });
});
