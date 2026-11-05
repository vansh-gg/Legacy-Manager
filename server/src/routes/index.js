import { config } from '../config.js';
import authRoutes from './auth.js';
import assetRoutes from './assets.js';
import checkInRoutes from './checkin.js';
import dashboardRoutes from './dashboard.js';
import devRoutes from './dev.js';
import documentRoutes from './documents.js';
import letterRoutes from './letters.js';
import nomineeRoutes, { inviteRouter } from './nominees.js';
import sharedRoutes from './shared.js';

/** Central place where every API module is mounted. */
export function registerRoutes(app) {
  app.use('/api/auth', authRoutes);
  app.use('/api/assets', assetRoutes);
  app.use('/api/documents', documentRoutes);
  app.use('/api/letters', letterRoutes);
  app.use('/api/nominees', nomineeRoutes);
  app.use('/api/invites', inviteRouter);
  app.use('/api/check-in', checkInRoutes);
  app.use('/api/shared', sharedRoutes);
  app.get('/api/config', (req, res) => res.json({ devTools: config.devTools }));
  if (config.devTools) app.use('/api/dev', devRoutes);
  app.use('/api', dashboardRoutes);
}
