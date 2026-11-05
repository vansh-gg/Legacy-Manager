import authRoutes from './auth.js';

/** Central place where every API module is mounted. */
export function registerRoutes(app) {
  app.use('/api/auth', authRoutes);
}
