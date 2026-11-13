// The rules kernel: the web app's own rule code (triage classifier, PII masking, compliance check,
// auto-fix, OJK working-day clock, seed data) loaded into an isolated VM context. Browser and
// server therefore run the same rules, and the server re-checks everything a browser sends.
import vm from 'node:vm';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from './config.js';

const FILES = ['ui.js', 'data.js', 'engine.js', 'views1.js', 'views2.js', 'views3.js', 'views4.js', 'phone.js', 'server.js', 'signin.js', 'app.js'];

export type State = Record<string, any>;
export interface Check { verdict: 'ready' | 'route' | 'blocked'; res: { id: string; name: string; ok: boolean; detail: string; sev: string }[]; blocking: { name: string; detail: string }[]; }
export interface Kernel {
  freshState(): State;
  classify(raw: string, meta?: Record<string, unknown>): any;
  maskPII(text: string): { text: string; found: string[] };
  prepInbox(item: State): State;
  checkCompliance(rules: any[], text: string, ctx?: Record<string, unknown>): Check;
  autoFix(rules: any[], text: string, ctx?: Record<string, unknown>): string;
  clockOf(ticket: State): { state: string; used: number; total: number; left: number | null; dl?: number; label: string };
  replyFallback(rules: any[], msg: State): string;
  ROLES: Record<string, { name: string; short: string; user: string; publish: string[]; all: boolean }>;
  ACCOUNTS0: any[];
  TYPE_META: Record<string, { sla: number | 'same'; label: string }>;
  OWNERS: Record<string, string>;
  PRODUCTS: Record<string, any>;
  RULES0: any[];
  REPLY_LIB: Record<string, string>;
}

export function webSrcDir(): string {
  if (config.WEB_SRC) return config.WEB_SRC;
  const here = path.dirname(fileURLToPath(import.meta.url));
  for (const c of [path.resolve(here, '../../web/src'), path.resolve(here, '../web/src'), '/app/web/src']) if (fs.existsSync(path.join(c, 'engine.js'))) return c;
  throw new Error('Cannot find web/src (set WEB_SRC)');
}

function load(): Kernel {
  const dir = webSrcDir();
  const noop = () => undefined;
  const fakeEl = { classList: { toggle: noop, add: noop, remove: noop }, style: {}, addEventListener: noop };
  const store = { getItem: () => null, setItem: noop, removeItem: noop };
  const ctx: Record<string, unknown> = {
    console, setTimeout, clearTimeout, setInterval: noop, navigator: {}, window: {}, EDITION: {},
    location: { hash: '' }, localStorage: store, sessionStorage: store,
    document: { addEventListener: noop, querySelector: () => null, querySelectorAll: () => [], createElement: () => ({ ...fakeEl }), body: fakeEl, title: '' }
  };
  vm.createContext(ctx);
  const code = '"use strict";\n' + FILES.map(f => fs.readFileSync(path.join(dir, f), 'utf8')).join('\n') + `
;globalThis.__kernel = {
  freshState: () => { freshState(); const out = S; S = undefined; return out; },
  classify, maskPII, prepInbox: m => prepInbox(m),
  withRules: (rules, fn) => { const prev = S; S = { rules, audit: [], role: 'care' }; try { return fn(); } finally { S = prev; } },
  checkCompliance, autoFix, replyFallback, clockOf,
  ROLES, ACCOUNTS0, TYPE_META, OWNERS, PRODUCTS, RULES0, REPLY_LIB
};`;
  vm.runInContext(code, ctx, { filename: 'lume-web-rules.js' });
  const k = ctx.__kernel as any;
  const plain = <T>(v: T): T => JSON.parse(JSON.stringify(v));
  return {
    freshState: () => plain(k.freshState()),
    classify: (raw, meta = {}) => plain(k.classify(raw, meta)),
    maskPII: text => plain(k.maskPII(text)),
    prepInbox: item => plain(k.prepInbox(item)),
    checkCompliance: (rules, text, c = {}) => plain(k.withRules(rules, () => k.checkCompliance(text, c))),
    autoFix: (rules, text, c = {}) => k.withRules(rules, () => k.autoFix(text, c)),
    clockOf: t => plain(k.clockOf(t)),
    replyFallback: (rules, msg) => k.withRules(rules, () => k.replyFallback(msg)),
    ROLES: plain(k.ROLES), ACCOUNTS0: plain(k.ACCOUNTS0), TYPE_META: plain(k.TYPE_META), OWNERS: plain(k.OWNERS),
    PRODUCTS: plain(k.PRODUCTS), RULES0: plain(k.RULES0), REPLY_LIB: plain(k.REPLY_LIB)
  };
}

let cached: Kernel | null = null;
export function kernel(): Kernel { return (cached ||= load()); }
