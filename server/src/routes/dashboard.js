import { Router } from 'express';
import { prisma } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { publicUser } from '../services/legacy.js';

const router = Router();
router.use(requireAuth);

/** Everything the home screen needs in one request. */
router.get('/dashboard', async (req, res) => {
  const ownerId = req.user.id;
  const [assets, unassignedAssets, documents, nominees, acceptedNominees, letters, sharedWithMe, recent] = await Promise.all([
    prisma.asset.count({ where: { ownerId } }),
    prisma.asset.count({ where: { ownerId, shares: { none: {} } } }),
    prisma.document.count({ where: { ownerId } }),
    prisma.nominee.count({ where: { ownerId } }),
    prisma.nominee.count({ where: { ownerId, status: 'ACCEPTED' } }),
    prisma.letter.count({ where: { ownerId } }),
    prisma.nominee.count({ where: { userId: ownerId, status: 'ACCEPTED' } }),
    prisma.auditLog.findMany({ where: { userId: ownerId }, orderBy: { createdAt: 'desc' }, take: 5 }),
  ]);

  const steps = [
    { key: 'asset', label: 'Add your first account or asset', done: assets > 0, to: '/app/assets' },
    { key: 'nominee', label: 'Choose a trusted person', done: nominees > 0, to: '/app/nominees' },
    { key: 'accepted', label: 'Your trusted person accepts the invitation', done: acceptedNominees > 0, to: '/app/nominees' },
    { key: 'assigned', label: 'Decide who receives each item', done: assets > 0 && unassignedAssets === 0, to: '/app/assets' },
    { key: 'document', label: 'Upload an important document (will, property papers)', done: documents > 0, to: '/app/documents' },
    { key: 'letter', label: 'Write a personal letter', done: letters > 0, to: '/app/letters' },
  ];

  res.json({
    user: publicUser(req.user),
    counts: { assets, unassignedAssets, documents, nominees, acceptedNominees, letters, sharedWithMe },
    steps,
    recentActivity: recent,
  });
});

router.get('/activity', async (req, res) => {
  const take = Math.min(Number(req.query.limit) || 100, 200);
  const logs = await prisma.auditLog.findMany({
    where: { userId: req.user.id },
    orderBy: { createdAt: 'desc' },
    take,
  });
  res.json({ activity: logs });
});

export default router;
