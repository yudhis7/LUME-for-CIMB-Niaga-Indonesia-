// Small structured logger (JSON lines) so API and workers log the same way and logs ship cleanly to the SIEM.
const LEVELS = { debug: 10, info: 20, warn: 30, error: 40 } as const;
type Level = keyof typeof LEVELS;
const min = LEVELS[(process.env.LOG_LEVEL as Level) || 'info'] ?? 20;

function write(level: Level, obj: Record<string, unknown> | string, msg?: string) {
  if (LEVELS[level] < min) return;
  const base: Record<string, unknown> = typeof obj === 'string' ? { msg: obj } : { ...obj, msg };
  if (base.err instanceof Error) base.err = { message: base.err.message, stack: base.err.stack };
  process.stdout.write(JSON.stringify({ t: new Date().toISOString(), level, svc: process.env.LUME_ROLE || 'engine', ...base }) + '\n');
}

export const log = {
  debug: (o: Record<string, unknown> | string, m?: string) => write('debug', o, m),
  info: (o: Record<string, unknown> | string, m?: string) => write('info', o, m),
  warn: (o: Record<string, unknown> | string, m?: string) => write('warn', o, m),
  error: (o: Record<string, unknown> | string, m?: string) => write('error', o, m)
};
