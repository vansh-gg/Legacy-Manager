/**
 * Demo data for presentations.   npm run seed
 *
 *   Owner   : ramesh@example.com / Demo@1234   (Ramesh Kumar, 72)
 *   Nominee : priya@example.com  / Demo@1234   (his daughter — accepted)
 *   Invited : arjun@example.com                (his son — invitation pending)
 *
 * Re-running the seed replaces only these demo accounts.
 */
import bcrypt from 'bcryptjs';
import { prisma } from '../src/db.js';
import { encryptJson, encryptText } from '../src/lib/crypto.js';
import { saveEncrypted } from '../src/lib/storage.js';

const PASSWORD = 'Demo@1234';
const emails = ['ramesh@example.com', 'priya@example.com', 'arjun@example.com'];

async function main() {
  await prisma.user.deleteMany({ where: { email: { in: emails } } });
  const hash = await bcrypt.hash(PASSWORD, 12);

  const ramesh = await prisma.user.create({
    data: { name: 'Ramesh Kumar', email: 'ramesh@example.com', phone: '+91 98765 43210', passwordHash: hash },
  });
  const priyaUser = await prisma.user.create({
    data: { name: 'Priya Kumar', email: 'priya@example.com', phone: '+91 91234 56780', passwordHash: hash },
  });

  const priya = await prisma.nominee.create({
    data: {
      ownerId: ramesh.id,
      userId: priyaUser.id,
      name: 'Priya Kumar',
      email: 'priya@example.com',
      phone: '+91 91234 56780',
      relationship: 'Daughter',
      status: 'ACCEPTED',
      acceptedAt: new Date(),
    },
  });
  const arjun = await prisma.nominee.create({
    data: { ownerId: ramesh.id, name: 'Arjun Kumar', email: 'arjun@example.com', relationship: 'Son' },
  });

  const assets = [
    {
      category: 'BANK',
      title: 'SBI Savings Account',
      institution: 'State Bank of India, Lajpat Nagar',
      identifierHint: 'ending 4321',
      instructions: 'Close the account and divide the money equally between Priya and Arjun.',
      secret: { username: 'ramesh.k1953', password: 'Sbi@Net2024', notes: 'Locker no. 112 at the same branch. Key is in the steel almirah.' },
      share: [priya.id, arjun.id],
    },
    {
      category: 'EMAIL',
      title: 'Gmail account',
      institution: 'Google',
      identifierHint: 'ramesh.k1953@gmail.com',
      instructions: 'Download the family photos from Google Photos, then close the account.',
      secret: { username: 'ramesh.k1953@gmail.com', password: 'Family#Photos53' },
      share: [priya.id],
    },
    {
      category: 'INSURANCE',
      title: 'LIC Jeevan Anand Policy',
      institution: 'Life Insurance Corporation of India',
      identifierHint: 'policy ending 7788',
      instructions: 'Priya is the nominee on the policy. Claim at the Saket LIC office with the death certificate.',
      secret: { notes: 'Agent: Mr. Sharma, 98100 11223' },
      share: [priya.id],
    },
    {
      category: 'PROPERTY',
      title: 'House — 12, Green Park',
      institution: 'Delhi Development Authority',
      instructions: 'The house goes to Arjun as per my registered will. Original papers are in the bank locker.',
      share: [arjun.id],
    },
    {
      category: 'SOCIAL',
      title: 'Facebook',
      institution: 'Meta',
      instructions: 'Please memorialise my profile.',
      secret: { username: 'ramesh.kumar.53' },
      share: [],
    },
  ];
  for (const a of assets) {
    const { secret, share, ...data } = a;
    await prisma.asset.create({
      data: {
        ...data,
        ownerId: ramesh.id,
        secretEnc: secret ? encryptJson(ramesh.id, secret) : null,
        shares: { create: share.map((nomineeId) => ({ nomineeId })) },
      },
    });
  }

  const pdf = Buffer.from(
    '%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n' +
      '3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 400 200]/Contents 4 0 R/Resources<</Font<</F1 5 0 R>>>>>>endobj\n' +
      '4 0 obj<</Length 66>>stream\nBT /F1 16 Tf 30 120 Td (Sample will of Ramesh Kumar - demo) Tj ET\nendstream endobj\n' +
      '5 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF',
  );
  await prisma.document.create({
    data: {
      ownerId: ramesh.id,
      title: 'My registered will (copy)',
      category: 'WILL',
      originalName: 'will-ramesh-kumar.pdf',
      mimeType: 'application/pdf',
      size: pdf.length,
      storageKey: await saveEncrypted(ramesh.id, pdf),
      shares: { create: [{ nomineeId: priya.id }, { nomineeId: arjun.id }] },
    },
  });

  await prisma.letter.create({
    data: {
      ownerId: ramesh.id,
      nomineeId: priya.id,
      subject: 'For my dear Priya',
      bodyEnc: encryptText(
        ramesh.id,
        'My dear Priya,\n\nIf you are reading this, I want you to know how proud I am of you. ' +
          'Please look after your mother and keep the family together.\n\nAll the important papers are listed here so you do not have to worry.\n\nWith all my love,\nPapa',
      ),
    },
  });

  await prisma.auditLog.createMany({
    data: [
      { userId: ramesh.id, action: 'ACCOUNT_CREATED', detail: 'Your secure vault was created.' },
      { userId: ramesh.id, action: 'NOMINEE_ACCEPTED', detail: 'Priya Kumar accepted your invitation.' },
      { userId: priyaUser.id, action: 'BECAME_NOMINEE', detail: "You accepted Ramesh Kumar's invitation." },
    ],
  });

  console.log('✔ Demo data ready.');
  console.log(`   Owner   : ramesh@example.com / ${PASSWORD}`);
  console.log(`   Nominee : priya@example.com  / ${PASSWORD}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
