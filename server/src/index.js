import cron from 'node-cron';
import { createApp } from './app.js';
import { config } from './config.js';
import { runInactivitySweep } from './services/legacy.js';

const app = createApp();

async function sweep() {
  try {
    const s = await runInactivitySweep();
    if (s.reminded || s.grace || s.released) console.log('[inactivity] sweep', s);
  } catch (err) {
    console.error('[inactivity] sweep failed', err);
  }
}

app.listen(config.port, () => {
  console.log(`Digital Legacy Manager API running on http://localhost:${config.port} (${config.env})`);
  if (config.devTools) console.log('Dev tools are ON (mailbox + time travel). Disable with ENABLE_DEV_TOOLS=false.');
  // Check every owner's check-in status at the start of every hour, and once at start-up.
  cron.schedule('0 * * * *', sweep);
  setTimeout(sweep, 5000);
});
