// People, sign-in and sessions. Pilot: user ID + password with lockout. Production: CIMB Niaga SSO
// (OIDC/SAML through the bank's identity provider) maps the directory group to a Lume team.
import type { FastifyReply, FastifyRequest } from 'fastify';
import { pool } from './db.js';
import { config } from './config.js';
import { hashPassword, verifyPassword, randomToken, sha256 } from './crypto.js';
import { kernel } from './kernel.js';
import type { Actor } from './store.js';

export const COOKIE = 'lume_sid';
export const PILOT_USERS = [
  { uid: 'dewi.anggraini', role: 'brand' },
  { uid: 'agus.firmansyah', role: 'care' },
  { uid: 'maria.tambunan', role: 'compliance' },
  { uid: 'fikri.ramadhan', role: 'km' },
  { uid: 'sinta.maharani', role: 'hr' },
  { uid: 'hasan.lubis', role: 'syariah' },
  { uid: 'whale.admin', role: 'brand', admin: true, name: 'Whale pilot admin', title: 'All roles (demo)' }
];

export interface SessionUser { id: number; uid: string; name: string; title: string; role: string; admin: boolean }
declare module 'fastify' {
  interface FastifyRequest { user?: SessionUser; sessionId?: string; sessionInfo?: { at: number; exp: number; remember: boolean } }
}

export async function seedUsers(ws: string): Promise<void> {
  const R = kernel().ROLES;
  for (const u of PILOT_USERS) {
    const name = (u as any).name || R[u.role].user;
    const title = (u as any).title || R[u.role].name;
    await pool.query(
      `insert into users(ws, uid, name, title, role, admin, password_hash) values ($1,$2,$3,$4,$5,$6,$7)
       on conflict (ws, uid) do update set name=excluded.name, title=excluded.title, role=excluded.role, admin=excluded.admin, password_hash=excluded.password_hash`,
      [ws, u.uid, name, title, u.role, !!(u as any).admin, hashPassword(config.PILOT_PASSWORD)]
    );
  }
}

export type LoginResult = { ok: true; user: SessionUser; token: string; exp: number } | { ok: false; status: number; error: string; retryIn?: number; left?: number };

export async function login(ws: string, uidRaw: string, password: string, remember: boolean, ip: string, ua: string): Promise<LoginResult> {
  const uid = String(uidRaw || '').trim().toLowerCase().split('@')[0];
  const key = `${uid}|${ip}`;
  const att = (await pool.query('select fails, locked_until from login_attempts where key=$1', [key])).rows[0];
  if (att?.locked_until && new Date(att.locked_until).getTime() > Date.now()) {
    return { ok: false, status: 429, error: 'Too many wrong attempts. Sign-in is paused for a moment.', retryIn: Math.ceil((new Date(att.locked_until).getTime() - Date.now()) / 1000) };
  }
  const u = (await pool.query('select * from users where ws=$1 and uid=$2 and not disabled', [ws, uid])).rows[0];
  if (!u || !verifyPassword(password, u.password_hash)) {
    const fails = (att?.fails || 0) + 1;
    const lock = fails >= config.LOGIN_MAX_FAILS;
    await pool.query(
      `insert into login_attempts(key, fails, locked_until) values ($1,$2,$3) on conflict (key) do update set fails=excluded.fails, locked_until=excluded.locked_until`,
      [key, lock ? 0 : fails, lock ? new Date(Date.now() + config.LOGIN_LOCK_SECONDS * 1000) : null]
    );
    if (lock) return { ok: false, status: 429, error: 'Too many wrong attempts. Sign-in is paused for a moment.', retryIn: config.LOGIN_LOCK_SECONDS };
    return { ok: false, status: 401, error: 'User ID or password is not right.', left: config.LOGIN_MAX_FAILS - fails };
  }
  await pool.query('delete from login_attempts where key=$1', [key]);
  const token = randomToken();
  const exp = Date.now() + (remember ? config.SESSION_REMEMBER_DAYS * 86400000 : config.SESSION_HOURS * 3600000);
  await pool.query('insert into sessions(id, user_id, expires_at, ip, user_agent, remember) values ($1,$2,$3,$4,$5,$6)', [sha256(token), u.id, new Date(exp), ip, ua.slice(0, 300), remember]);
  await pool.query('update users set last_login_at=now() where id=$1', [u.id]);
  return { ok: true, token, exp, user: toUser(u) };
}

const toUser = (u: any): SessionUser => ({ id: Number(u.id), uid: u.uid, name: u.name, title: u.title, role: u.role, admin: !!u.admin });

export async function logout(token: string | undefined): Promise<void> {
  if (token) await pool.query('delete from sessions where id=$1', [sha256(token)]);
}

export async function resolveSession(req: FastifyRequest): Promise<void> {
  const token = req.cookies?.[COOKIE];
  if (!token) return;
  const r = (await pool.query(
    `select s.id, s.created_at, s.expires_at, s.remember, u.* from sessions s join users u on u.id = s.user_id
     where s.id=$1 and s.expires_at > now() and not u.disabled and u.ws=$2`, [sha256(token), config.WORKSPACE_ID])).rows[0];
  if (!r) return;
  req.user = toUser(r);
  req.sessionId = r.id;
  req.sessionInfo = { at: new Date(r.created_at).getTime(), exp: r.remember ? new Date(r.expires_at).getTime() : 0, remember: r.remember };
  // sliding expiry for non-remembered sessions, at most once a minute
  if (!r.remember) pool.query(`update sessions set last_seen=now(), expires_at = greatest(expires_at, now() + make_interval(hours => $2)) where id=$1 and last_seen < now() - interval '1 minute'`, [r.id, config.SESSION_HOURS]).catch(() => undefined);
}

export function requireUser(req: FastifyRequest, reply: FastifyReply): SessionUser | null {
  if (!req.user) { reply.code(401).send({ error: 'Sign in first' }); return null; }
  return req.user;
}

/** The team a request acts as. Admins may view any team (the role switcher); everyone else is their own team. */
export function actorOf(req: FastifyRequest): Actor {
  const u = req.user!;
  const asked = String(req.headers['x-lume-role'] || '');
  const role = u.admin && kernel().ROLES[asked] ? asked : u.role;
  const name = u.admin ? kernel().ROLES[role].user : u.name;
  return { userId: u.id, uid: u.uid, name, role, admin: u.admin };
}

export function setSessionCookie(reply: FastifyReply, token: string, exp: number, remember: boolean): void {
  reply.setCookie(COOKIE, token, { httpOnly: true, sameSite: 'lax', secure: config.COOKIE_SECURE, path: '/', ...(remember ? { expires: new Date(exp) } : {}) });
}
