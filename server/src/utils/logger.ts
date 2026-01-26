type Level = 'INFO' | 'WARN' | 'ERROR';

function fmt(level: Level, message: string, meta?: Record<string, any>) {
  return JSON.stringify({
    level,
    message,
    ...(meta ? { meta } : {}),
    ts: new Date().toISOString(),
  });
}

export const logger = {
  info(message: string, meta?: Record<string, any>) {
    // eslint-disable-next-line no-console
    console.log(fmt('INFO', message, meta));
  },
  warn(message: string, meta?: Record<string, any>) {
    // eslint-disable-next-line no-console
    console.warn(fmt('WARN', message, meta));
  },
  error(message: string, meta?: Record<string, any>) {
    // eslint-disable-next-line no-console
    console.error(fmt('ERROR', message, meta));
  },
};
