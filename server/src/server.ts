import { createApp } from './app';
import { ENV } from './config/env';
import { logger } from './utils/logger';

const app = createApp();

app.listen(ENV.PORT, () => {
  logger.info('server_started', { port: ENV.PORT, env: ENV.NODE_ENV });
});
