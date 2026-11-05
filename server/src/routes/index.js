import authRoutes from './auth.js';
import assetRoutes from './assets.js';
import nomineeRoutes, { inviteRouter } from './nominees.js';

/** Central place where every API module is mounted. */
export function registerRoutes(app) {
  app.use('/api/auth', authRoutes);
  app.use('/api/assets', assetRoutes);
  app.use('/api/nominees', nomineeRoutes);
  app.use('/api/invites', inviteRouter);
}
