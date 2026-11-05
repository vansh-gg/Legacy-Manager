import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { config } from '../src/config.js';
import { registeredClient, uniqueEmail, prisma } from './helpers.js';

const pdf = Buffer.from('%PDF-1.4\n% Sale deed for house no. 12, Green Park\n%%EOF');

describe('Documents & letters', () => {
  test('TC-DOC-01 uploads a PDF, stores it encrypted, downloads it back', async () => {
    const { c, user } = await registeredClient();
    const up = await c
      .post('/api/documents')
      .field('title', 'House sale deed')
      .field('category', 'PROPERTY')
      .attach('file', pdf, { filename: 'deed.pdf', contentType: 'application/pdf' });
    assert.equal(up.status, 201);
    const row = await prisma.document.findUnique({ where: { id: up.body.document.id } });
    const onDisk = await fs.readFile(path.join(config.storageDir, user.id, row.storageKey));
    assert.ok(!onDisk.includes(Buffer.from('Sale deed')), 'file must be encrypted at rest');

    const down = await c.get(`/api/documents/${up.body.document.id}/download`).buffer(true).parse((res, cb) => {
      const chunks = [];
      res.on('data', (d) => chunks.push(d));
      res.on('end', () => cb(null, Buffer.concat(chunks)));
    });
    assert.equal(down.status, 200);
    assert.ok(Buffer.compare(down.body, pdf) === 0);
    assert.match(down.headers['content-disposition'], /attachment/);
  });

  test('TC-DOC-02 rejects files whose content is not an allowed type', async () => {
    const { c } = await registeredClient();
    const fake = await c
      .post('/api/documents')
      .field('title', 'Not really a PDF')
      .field('category', 'OTHER')
      .attach('file', Buffer.from('MZ\x90\x00 fake exe'), { filename: 'virus.pdf', contentType: 'application/pdf' });
    assert.equal(fake.status, 400);
  });

  test('TC-DOC-03 other users cannot download my documents', async () => {
    const owner = await registeredClient();
    const other = await registeredClient();
    const up = await owner.c
      .post('/api/documents')
      .field('title', 'Will')
      .field('category', 'WILL')
      .attach('file', pdf, { filename: 'will.pdf', contentType: 'application/pdf' });
    assert.equal((await other.c.get(`/api/documents/${up.body.document.id}/download`)).status, 404);
  });

  test('TC-LET-01 letters are encrypted at rest and readable by the owner', async () => {
    const { c } = await registeredClient();
    const nom = await c.post('/api/nominees').send({ name: 'Priya', email: uniqueEmail(), relationship: 'Daughter' });
    const res = await c.post('/api/letters').send({
      nomineeId: nom.body.nominee.id,
      subject: 'For my dear Priya',
      body: 'I am so proud of you.',
    });
    assert.equal(res.status, 201);
    const row = await prisma.letter.findUnique({ where: { id: res.body.letter.id } });
    assert.ok(!row.bodyEnc.includes('proud'));
    const list = await c.get('/api/letters');
    assert.equal(list.body.letters[0].body, 'I am so proud of you.');
  });
});
