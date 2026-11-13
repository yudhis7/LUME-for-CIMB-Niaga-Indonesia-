// Live updates. Every change (from a person, a worker or a webhook) is published on Redis;
// each API instance fans it out to its connected browsers over Server-Sent Events.
import { Redis } from 'ioredis';
import type { ServerResponse } from 'node:http';
import { config } from './config.js';
import { log } from './log.js';

export interface Change { col: string; id: string; op: 'put' | 'del'; data?: unknown; ver?: number; by?: string; pos?: number }
export interface WsEvent { type: 'changes' | 'reload' | 'notice'; changes?: Change[]; origin?: string; text?: string }

let pub: Redis | null = null;
let sub: Redis | null = null;
const clients = new Map<string, Set<{ res: ServerResponse; clientId: string }>>();

export function redis(): Redis {
  return (pub ||= new Redis(config.REDIS_URL, { maxRetriesPerRequest: null }));
}
const channel = (ws: string) => `lume:ws:${ws}`;

export async function publish(ws: string, ev: WsEvent): Promise<void> {
  await redis().publish(channel(ws), JSON.stringify(ev));
}

export async function startFanout(): Promise<void> {
  sub = new Redis(config.REDIS_URL, { maxRetriesPerRequest: null });
  await sub.psubscribe('lume:ws:*');
  sub.on('pmessage', (_p, ch, msg) => {
    const ws = ch.slice('lume:ws:'.length);
    const set = clients.get(ws); if (!set) return;
    const ev = JSON.parse(msg) as WsEvent;
    for (const c of set) {
      // the browser that made a change already has it; it only needs changes from others
      if (ev.origin && ev.origin === c.clientId && ev.type === 'changes') continue;
      c.res.write(`data: ${msg}\n\n`);
    }
  });
  setInterval(() => { for (const set of clients.values()) for (const c of set) c.res.write(': ping\n\n'); }, 25000).unref();
  log.info('live update fan-out started');
}

export function attach(ws: string, clientId: string, res: ServerResponse): () => void {
  const entry = { res, clientId };
  if (!clients.has(ws)) clients.set(ws, new Set());
  clients.get(ws)!.add(entry);
  return () => clients.get(ws)?.delete(entry);
}

export async function closeEvents(): Promise<void> {
  await sub?.quit().catch(() => undefined);
  await pub?.quit().catch(() => undefined);
  sub = pub = null;
}
