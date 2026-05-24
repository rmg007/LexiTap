type LogLevel = 'debug' | 'info' | 'warn' | 'error';

function emit(level: LogLevel, message: string, meta?: Record<string, unknown>): void {
  if (__DEV__) {
    const payload = meta ? ` ${JSON.stringify(meta)}` : '';
    // eslint-disable-next-line no-console
    console[level === 'debug' ? 'log' : level](`[lexitap:${level}] ${message}${payload}`);
  }
}

export const logger = {
  debug: (m: string, meta?: Record<string, unknown>) => emit('debug', m, meta),
  info: (m: string, meta?: Record<string, unknown>) => emit('info', m, meta),
  warn: (m: string, meta?: Record<string, unknown>) => emit('warn', m, meta),
  error: (m: string, meta?: Record<string, unknown>) => emit('error', m, meta),
};
