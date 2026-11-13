// Sandbox connector for the pilot and UAT: behaves like the platforms (ids, links, delays, metrics)
// without touching real accounts. Every call is still recorded in deliveries and the audit log.
import type { Channel } from './types.js';

const id = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const pause = (ms: number) => new Promise(r => setTimeout(r, ms));
const host: Record<string, string> = { instagram: 'instagram.com/p/', facebook: 'facebook.com/CIMBIndonesia/posts/', x: 'x.com/CIMBNiaga/status/', threads: 'threads.net/@cimb_niaga/post/', tiktok: 'tiktok.com/@cimb.niaga/video/', youtube: 'youtube.com/watch?v=', whatsapp: 'wa.me/' };

export const sandbox: Channel = {
  async publish(acc, _cred, input) {
    await pause(300);
    if (/\[fail\]/i.test(input.caption)) throw new Error('Sandbox: simulated platform error');
    const pid = id();
    return { platformId: pid, url: 'https://' + (host[acc.platform] || acc.platform + '.example/') + pid };
  },
  async reply() { await pause(150); return { platformId: 'r_' + id() }; },
  async hide() { await pause(100); },
  async postMetrics(_acc, _cred, platformId) {
    // deterministic, slowly growing numbers so dashboards move during a demo
    let h = 0; for (const ch of platformId) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    const age = Math.max(1, (Date.now() % 86400000) / 3600000);
    const views = Math.round((800 + (h % 4000)) * Math.log2(1 + age));
    return { views, likes: Math.round(views * 0.025), comments: Math.round(views * 0.003), shares: Math.round(views * 0.002), clicks: Math.round(views * 0.006) };
  }
};
