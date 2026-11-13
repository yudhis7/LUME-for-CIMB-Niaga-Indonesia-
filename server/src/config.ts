// Engine configuration, read once from the environment. See .env.example for every setting.
import { z } from 'zod';

const bool = z.union([z.boolean(), z.string()]).transform(v => v === true || v === 'true' || v === '1');
const csv = z.string().default('').transform(s => s.split(',').map(x => x.trim()).filter(Boolean));

const Env = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  TZ: z.string().default('Asia/Jakarta'),
  PORT: z.coerce.number().default(8080),
  HOST: z.string().default('0.0.0.0'),
  PUBLIC_URL: z.string().default('http://localhost:8080'),
  WORKSPACE_ID: z.string().default('cimb-niaga'),

  DATABASE_URL: z.string().default('postgres://lume:lume@localhost:5432/lume'),
  DATABASE_SSL: bool.default(false),
  REDIS_URL: z.string().default('redis://localhost:6379'),

  // 32-byte key (base64) used to encrypt platform tokens at rest. In production this comes from KMS / a secrets manager.
  DATA_KEY: z.string().default(''),
  SESSION_HOURS: z.coerce.number().default(12),
  SESSION_REMEMBER_DAYS: z.coerce.number().default(7),
  LOGIN_MAX_FAILS: z.coerce.number().default(5),
  LOGIN_LOCK_SECONDS: z.coerce.number().default(30),
  COOKIE_SECURE: bool.default(false),

  // Pilot accounts: created on seed with this password. Production replaces them with CIMB Niaga SSO.
  PILOT_PASSWORD: z.string().default('lume2026'),
  // Demo features: reset button, simulated incoming messages, the advocate phone simulator writing task results.
  DEMO_MODE: bool.default(true),

  // sandbox = simulate every platform call (pilot / UAT); live = call the real platform APIs.
  CONNECTOR_MODE: z.enum(['sandbox', 'live']).default('sandbox'),
  META_APP_ID: z.string().default(''),
  META_APP_SECRET: z.string().default(''),
  META_VERIFY_TOKEN: z.string().default(''),
  META_GRAPH_VERSION: z.string().default('v26.0'),
  X_CONSUMER_SECRET: z.string().default(''),
  TIKTOK_CLIENT_KEY: z.string().default(''),
  TIKTOK_CLIENT_SECRET: z.string().default(''),
  WHATSAPP_PHONE_NUMBER_ID: z.string().default(''),
  WHATSAPP_TOKEN: z.string().default(''),
  WHATSAPP_TASK_TEMPLATE: z.string().default('lume_task_new'),

  // CIMB Niaga complaint management system (CMS). sandbox issues reference numbers locally.
  CMS_MODE: z.enum(['sandbox', 'http']).default('sandbox'),
  CMS_URL: z.string().default(''),
  CMS_TOKEN: z.string().default(''),

  // Internal alerts (fraud team, Corporate Comms, ticket owners, Compliance).
  SMTP_URL: z.string().default(''),
  MAIL_FROM: z.string().default('Lume <no-reply@lume.local>'),
  ALERT_WEBHOOK_URL: z.string().default(''),
  ALERT_EMAILS_FRAUD: csv,
  ALERT_EMAILS_COMMS: csv,
  ALERT_EMAILS_COMPLIANCE: csv,
  ALERT_EMAILS_CARE: csv,

  // Claude for captions, reply drafts and briefs. Empty key = approved templates only.
  ANTHROPIC_API_KEY: z.string().default(''),
  ANTHROPIC_BASE_URL: z.string().default('https://api.anthropic.com'),
  AI_MODEL: z.string().default('claude-sonnet-5-5'),
  AI_MAX_TOKENS: z.coerce.number().default(600),

  // Retention of raw webhook payloads (may contain personal data).
  RAW_EVENT_RETENTION_DAYS: z.coerce.number().default(30),
  SCAM_WAVE_THRESHOLD: z.coerce.number().default(3),
  SCAM_WAVE_WINDOW_MIN: z.coerce.number().default(60),

  WEB_DIST: z.string().default(''),
  WEB_SRC: z.string().default(''),
  LOG_LEVEL: z.string().default('info')
});

export const config = Env.parse(process.env);
export type Config = typeof config;

export function assertProductionSafe(): void {
  if (config.NODE_ENV !== 'production') return;
  const problems: string[] = [];
  if (!config.DATA_KEY) problems.push('DATA_KEY is not set');
  if (config.PILOT_PASSWORD === 'lume2026' || config.PILOT_PASSWORD.length < 10) problems.push('PILOT_PASSWORD must be set to a new password of at least 10 characters');
  if (!config.COOKIE_SECURE) problems.push('COOKIE_SECURE must be true behind HTTPS');
  if (config.DEMO_MODE && config.CONNECTOR_MODE === 'live') problems.push('DEMO_MODE must be false when connected to real accounts');
  if (config.CONNECTOR_MODE === 'live' && !config.META_APP_SECRET) problems.push('META_APP_SECRET is needed for live webhooks');
  if (problems.length) throw new Error('Unsafe production configuration: ' + problems.join('; '));
}
