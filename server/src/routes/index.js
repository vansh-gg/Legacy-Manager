import authRoutes from './auth.js';
import assetRoutes from './assets.js';
import documentRoutes from './documents.js';
import letterRoutes from './letters.js';
import nomineeRoutes, { inviteRouter } from './nominees.js';

/** Central place where every API module is mounted. */
export function registerRoutes(app) {
  app.use('/api/auth', authRoutes);
  app.use('/api/assets', assetRoutes);
  app.use('/api/documents', documentRoutes);
  app.use('/api/letters', letterRoutes);
  app.use('/api/nominees', nomineeRoutes);
  app.use('/api/invites', inviteRouter);
}
