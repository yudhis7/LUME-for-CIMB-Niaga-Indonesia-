import crypto from 'node:crypto';
import { config } from './config.js';

// Passwords: scrypt (N=2^15) with a per-user salt.
export function hashPassword(pw: string): string {
  const salt = crypto.randomBytes(16);
  const key = crypto.scryptSync(pw, salt, 32, { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 });
  return `scrypt$32768$${salt.toString('base64')}$${key.toString('base64')}`;
}
export function verifyPassword(pw: string, stored: string | null): boolean {
  if (!stored) return false;
  const [alg, n, salt, key] = stored.split('$');
  if (alg !== 'scrypt') return false;
  const want = Buffer.from(key, 'base64');
  const got = crypto.scryptSync(pw, Buffer.from(salt, 'base64'), want.length, { N: +n, r: 8, p: 1, maxmem: 64 * 1024 * 1024 });
  return crypto.timingSafeEqual(want, got);
}

export const randomToken = (bytes = 32) => crypto.randomBytes(bytes).toString('base64url');
export const sha256 = (s: string) => crypto.createHash('sha256').update(s).digest('hex');
export const hmac = (key: string, data: string | Buffer, enc: 'hex' | 'base64' = 'hex') => crypto.createHmac('sha256', key).update(data).digest(enc);
export function safeEqual(a: string, b: string): boolean {
  const x = Buffer.from(a), y = Buffer.from(b);
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

// Platform tokens at rest: AES-256-GCM with DATA_KEY (from KMS / secrets manager in production).
function dataKey(): Buffer {
  if (config.DATA_KEY) {
    const k = Buffer.from(config.DATA_KEY, 'base64');
    if (k.length !== 32) throw new Error('DATA_KEY must be 32 bytes, base64');
    return k;
  }
  return crypto.createHash('sha256').update('lume-dev-only-key').digest(); // development only; refused in production
}
export function seal(plain: string): string {
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv('aes-256-gcm', dataKey(), iv);
  const body = Buffer.concat([c.update(plain, 'utf8'), c.final()]);
  return ['v1', iv.toString('base64'), c.getAuthTag().toString('base64'), body.toString('base64')].join('.');
}
export function unseal(sealed: string): string {
  const [v, iv, tag, body] = sealed.split('.');
  if (v !== 'v1') throw new Error('unknown token format');
  const d = crypto.createDecipheriv('aes-256-gcm', dataKey(), Buffer.from(iv, 'base64'));
  d.setAuthTag(Buffer.from(tag, 'base64'));
  return Buffer.concat([d.update(Buffer.from(body, 'base64')), d.final()]).toString('utf8');
}
