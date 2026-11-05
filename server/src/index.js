import { createApp } from './app.js';
import { config } from './config.js';

const app = createApp();

app.listen(config.port, () => {
  console.log(`Digital Legacy Manager API running on http://localhost:${config.port} (${config.env})`);
});
