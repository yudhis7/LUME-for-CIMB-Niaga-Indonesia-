// X, TikTok and WhatsApp Business (Ask OCTO / advocate notifications).
import { config } from '../config.js';
import { callJson, ManualStep, type Channel, type Credential, type Account } from './types.js';

const need = (cred: Credential | null, acc: Account): Credential => {
  if (!cred) throw new ManualStep(`${acc.handle} is not connected yet: connect it under Accounts`);
  return cred;
};

/* ---------- X (API v2, OAuth 2.0 user token; pay-per-use billing) ---------- */
const X = 'https://api.x.com/2';
export const x: Channel = {
  async publish(acc, cred, input) {
    const c = need(cred, acc);
    const r = await callJson(`${X}/tweets`, { method: 'POST', headers: { authorization: `Bearer ${c.token}`, 'content-type': 'application/json' }, body: JSON.stringify({ text: input.caption.slice(0, 280) }) });
    return { platformId: r.data.id, url: `https://x.com/${acc.handle.replace('@', '')}/status/${r.data.id}` };
  },
  async reply(acc, cred, to, text) {
    const c = need(cred, acc);
    if (to.kind === 'DM') {
      if (!to.platformUserId) throw new ManualStep('No X user id on this message');
      const r = await callJson(`${X}/dm_conversations/with/${to.platformUserId}/messages`, { method: 'POST', headers: { authorization: `Bearer ${c.token}`, 'content-type': 'application/json' }, body: JSON.stringify({ text }) });
      return { platformId: r.data?.dm_event_id || 'dm' };
    }
    if (!to.platformMsgId) throw new ManualStep('No post id on this mention');
    const r = await callJson(`${X}/tweets`, { method: 'POST', headers: { authorization: `Bearer ${c.token}`, 'content-type': 'application/json' }, body: JSON.stringify({ text: text.slice(0, 280), reply: { in_reply_to_tweet_id: to.platformMsgId } }) });
    return { platformId: r.data.id };
  },
  async hide(acc, cred, to) {
    const c = need(cred, acc);
    if (!to.platformMsgId) throw new ManualStep('No reply id to hide');
    await callJson(`${X}/tweets/${to.platformMsgId}/hidden`, { method: 'PUT', headers: { authorization: `Bearer ${c.token}`, 'content-type': 'application/json' }, body: JSON.stringify({ hidden: true }) });
  },
  async postMetrics(acc, cred, platformId) {
    const c = need(cred, acc);
    const r = await callJson(`${X}/tweets/${platformId}?tweet.fields=public_metrics`, { headers: { authorization: `Bearer ${c.token}` } });
    const m = r?.data?.public_metrics || {};
    return { views: m.impression_count, likes: m.like_count, comments: m.reply_count, shares: (m.retweet_count || 0) + (m.quote_count || 0) };
  }
};
/** Pull new mentions for an X account (used by the listening job; no webhook needed). */
export async function xMentions(cred: Credential, sinceId?: string): Promise<{ id: string; text: string; author: string; authorId: string; at: number }[]> {
  const q = new URLSearchParams({ 'tweet.fields': 'created_at,author_id', expansions: 'author_id', 'user.fields': 'username', max_results: '50' });
  if (sinceId) q.set('since_id', sinceId);
  const r = await callJson(`${X}/users/${cred.externalId}/mentions?${q}`, { headers: { authorization: `Bearer ${cred.token}` } });
  const users = new Map<string, string>((r?.includes?.users || []).map((u: any) => [u.id, u.username]));
  return (r?.data || []).map((t: any) => ({ id: t.id, text: t.text, authorId: t.author_id, author: '@' + (users.get(t.author_id) || t.author_id), at: Date.parse(t.created_at) || Date.now() }));
}

/* ---------- TikTok (Content Posting API: direct post after TikTok's audit) ---------- */
const TT = 'https://open.tiktokapis.com/v2';
export const tiktok: Channel = {
  async publish(acc, cred, input) {
    const c = need(cred, acc);
    const video = (input.mediaUrls || []).find(u => /\.(mp4|mov|webm)(\?|$)/i.test(u));
    const images = (input.mediaUrls || []).filter(u => /\.(jpe?g|png|webp)(\?|$)/i.test(u));
    const headers = { authorization: `Bearer ${c.token}`, 'content-type': 'application/json; charset=UTF-8' };
    let r: any;
    if (video) {
      r = await callJson(`${TT}/post/publish/video/init/`, { method: 'POST', headers, body: JSON.stringify({ post_info: { title: input.caption.slice(0, 2200), privacy_level: 'PUBLIC_TO_EVERYONE', disable_comment: false, brand_content_toggle: false, brand_organic_toggle: true }, source_info: { source: 'PULL_FROM_URL', video_url: video } }) });
    } else if (images.length) {
      r = await callJson(`${TT}/post/publish/content/init/`, { method: 'POST', headers, body: JSON.stringify({ media_type: 'PHOTO', post_mode: 'DIRECT_POST', post_info: { title: input.title.slice(0, 90), description: input.caption.slice(0, 4000), privacy_level: 'PUBLIC_TO_EVERYONE', brand_organic_toggle: true }, source_info: { source: 'PULL_FROM_URL', photo_images: images.slice(0, 35), photo_cover_index: 0 } }) });
    } else throw new ManualStep('TikTok needs a video or photos: attach a library asset to this post');
    const publishId = r?.data?.publish_id;
    return { platformId: publishId, url: `https://www.tiktok.com/${acc.handle}` };
  },
  async reply() { throw new ManualStep('TikTok does not offer comment replies to partner apps: reply in TikTok Studio'); },
  async hide() { throw new ManualStep('Hide this comment in TikTok Studio'); },
  async postMetrics() { return {}; }
};

/* ---------- WhatsApp Business Platform (Cloud API) ---------- */
export async function sendWhatsAppTemplate(to: string, template: string, params: string[]): Promise<string> {
  if (!config.WHATSAPP_PHONE_NUMBER_ID || !config.WHATSAPP_TOKEN) throw new ManualStep('WhatsApp Business is not configured');
  const r = await callJson(`https://graph.facebook.com/${config.META_GRAPH_VERSION}/${config.WHATSAPP_PHONE_NUMBER_ID}/messages`, {
    method: 'POST', headers: { authorization: `Bearer ${config.WHATSAPP_TOKEN}`, 'content-type': 'application/json' },
    body: JSON.stringify({ messaging_product: 'whatsapp', to, type: 'template', template: { name: template, language: { code: 'id' }, components: [{ type: 'body', parameters: params.map(t => ({ type: 'text', text: t })) }] } })
  });
  return r?.messages?.[0]?.id || 'wa';
}

export const unsupported: Channel = {
  async publish(acc) { throw new ManualStep(`Publishing to ${acc.platform} is done in the platform's own tool`); },
  async reply(acc) { throw new ManualStep(`Reply on ${acc.platform} in the platform's own tool`); },
  async hide(acc) { throw new ManualStep(`Hide on ${acc.platform} in the platform's own tool`); },
  async postMetrics() { return {}; }
};
