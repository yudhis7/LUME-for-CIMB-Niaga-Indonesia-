// Meta platforms: Instagram (Graph API, professional accounts), Facebook Pages, Threads.
// Needs a Meta app with Advanced Access for the permissions listed in docs/INFRASTRUCTURE.md,
// and a Page / IG / Threads token per connected account (stored encrypted in channel_credentials).
import { config } from '../config.js';
import { callJson, ManualStep, type Channel, type Account, type Credential } from './types.js';

const graph = () => `https://graph.facebook.com/${config.META_GRAPH_VERSION}`;
const threadsApi = 'https://graph.threads.net/v1.0';
const form = (o: Record<string, string | undefined>) => {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(o)) if (v !== undefined && v !== '') p.set(k, v);
  return p;
};
const need = (cred: Credential | null, acc: Account): Credential => {
  if (!cred) throw new ManualStep(`${acc.handle} is not connected yet: connect it under Accounts`);
  return cred;
};
const wait = (ms: number) => new Promise(r => setTimeout(r, ms));

async function waitForContainer(base: string, id: string, token: string): Promise<void> {
  // video containers process asynchronously; images are usually ready at once
  for (let i = 0; i < 20; i++) {
    const s = await callJson(`${base}/${id}?fields=status_code&access_token=${encodeURIComponent(token)}`);
    if (!s?.status_code || s.status_code === 'FINISHED') return;
    if (s.status_code === 'ERROR' || s.status_code === 'EXPIRED') throw new Error('Platform could not process the media (' + s.status_code + ')');
    await wait(3000);
  }
}

export const instagram: Channel = {
  async publish(acc, cred, input) {
    const c = need(cred, acc);
    const media = input.mediaUrls || [];
    if (!media.length) throw new ManualStep('Instagram needs an image or video: attach a library asset to this post');
    const isVideo = (u: string) => /\.(mp4|mov)(\?|$)/i.test(u);
    let creation: string;
    if (media.length === 1) {
      const p = isVideo(media[0])
        ? form({ media_type: input.format === 'Story' ? 'STORIES' : 'REELS', video_url: media[0], caption: input.caption, access_token: c.token })
        : form({ image_url: media[0], caption: input.caption, access_token: c.token, ...(input.format === 'Story' ? { media_type: 'STORIES' } : {}) });
      creation = (await callJson(`${graph()}/${c.externalId}/media`, { method: 'POST', body: p })).id;
    } else {
      const children: string[] = [];
      for (const u of media.slice(0, 10)) {
        const p = form({ is_carousel_item: 'true', access_token: c.token, ...(isVideo(u) ? { media_type: 'VIDEO', video_url: u } : { image_url: u }) });
        children.push((await callJson(`${graph()}/${c.externalId}/media`, { method: 'POST', body: p })).id);
      }
      creation = (await callJson(`${graph()}/${c.externalId}/media`, { method: 'POST', body: form({ media_type: 'CAROUSEL', children: children.join(','), caption: input.caption, access_token: c.token }) })).id;
    }
    await waitForContainer(graph(), creation, c.token);
    const pub = await callJson(`${graph()}/${c.externalId}/media_publish`, { method: 'POST', body: form({ creation_id: creation, access_token: c.token }) });
    const link = await callJson(`${graph()}/${pub.id}?fields=permalink&access_token=${encodeURIComponent(c.token)}`).catch(() => null);
    return { platformId: pub.id, url: link?.permalink || `https://www.instagram.com/${acc.handle.replace('@', '')}/` };
  },
  async reply(acc, cred, to, text) {
    const c = need(cred, acc);
    if (to.kind === 'DM') {
      if (!to.platformUserId) throw new ManualStep('No Instagram user id on this message');
      const r = await callJson(`${graph()}/${c.externalId}/messages`, { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${c.token}` }, body: JSON.stringify({ recipient: { id: to.platformUserId }, message: { text } }) });
      return { platformId: r.message_id || r.id };
    }
    if (!to.platformMsgId) throw new ManualStep('No Instagram comment id on this message');
    const r = await callJson(`${graph()}/${to.platformMsgId}/replies`, { method: 'POST', body: form({ message: text, access_token: c.token }) });
    return { platformId: r.id };
  },
  async hide(acc, cred, to) {
    const c = need(cred, acc);
    if (!to.platformMsgId) throw new ManualStep('No comment id to hide');
    await callJson(`${graph()}/${to.platformMsgId}`, { method: 'POST', body: form({ hide: 'true', access_token: c.token }) });
  },
  async postMetrics(acc, cred, platformId) {
    const c = need(cred, acc);
    const r = await callJson(`${graph()}/${platformId}/insights?metric=views,likes,comments,shares,saved&access_token=${encodeURIComponent(c.token)}`);
    const v = (n: string) => r?.data?.find((d: any) => d.name === n)?.values?.[0]?.value;
    return { views: v('views'), likes: v('likes'), comments: v('comments'), shares: v('shares') };
  }
};

export const facebook: Channel = {
  async publish(acc, cred, input) {
    const c = need(cred, acc);
    const media = input.mediaUrls || [];
    let r: any;
    if (media.length && /\.(mp4|mov)(\?|$)/i.test(media[0])) r = await callJson(`${graph()}/${c.externalId}/videos`, { method: 'POST', body: form({ file_url: media[0], description: input.caption, access_token: c.token }) });
    else if (media.length) r = await callJson(`${graph()}/${c.externalId}/photos`, { method: 'POST', body: form({ url: media[0], caption: input.caption, access_token: c.token }) });
    else r = await callJson(`${graph()}/${c.externalId}/feed`, { method: 'POST', body: form({ message: input.caption, link: input.link, access_token: c.token }) });
    const id = r.post_id || r.id;
    return { platformId: id, url: `https://www.facebook.com/${id}` };
  },
  async reply(acc, cred, to, text) {
    const c = need(cred, acc);
    if (to.kind === 'DM') {
      if (!to.platformUserId) throw new ManualStep('No Messenger user id on this message');
      const r = await callJson(`${graph()}/${c.externalId}/messages`, { method: 'POST', body: form({ recipient: JSON.stringify({ id: to.platformUserId }), message: JSON.stringify({ text }), messaging_type: 'RESPONSE', access_token: c.token }) });
      return { platformId: r.message_id };
    }
    if (!to.platformMsgId) throw new ManualStep('No Facebook comment id on this message');
    const r = await callJson(`${graph()}/${to.platformMsgId}/comments`, { method: 'POST', body: form({ message: text, access_token: c.token }) });
    return { platformId: r.id };
  },
  async hide(acc, cred, to) {
    const c = need(cred, acc);
    if (!to.platformMsgId) throw new ManualStep('No comment id to hide');
    await callJson(`${graph()}/${to.platformMsgId}`, { method: 'POST', body: form({ is_hidden: 'true', access_token: c.token }) });
  },
  async postMetrics(acc, cred, platformId) {
    const c = need(cred, acc);
    const r = await callJson(`${graph()}/${platformId}?fields=reactions.summary(true),comments.summary(true),shares&access_token=${encodeURIComponent(c.token)}`);
    return { likes: r?.reactions?.summary?.total_count, comments: r?.comments?.summary?.total_count, shares: r?.shares?.count };
  }
};

export const threads: Channel = {
  async publish(acc, cred, input) {
    const c = need(cred, acc);
    const media = input.mediaUrls || [];
    const text = input.caption.slice(0, 500);
    const p = media.length
      ? form({ media_type: /\.(mp4|mov)(\?|$)/i.test(media[0]) ? 'VIDEO' : 'IMAGE', [/\.(mp4|mov)(\?|$)/i.test(media[0]) ? 'video_url' : 'image_url']: media[0], text, access_token: c.token })
      : form({ media_type: 'TEXT', text, access_token: c.token });
    const container = (await callJson(`${threadsApi}/${c.externalId}/threads`, { method: 'POST', body: p })).id;
    if (media.length) await wait(30000); // Meta recommends ~30 s before publishing media containers
    const pub = await callJson(`${threadsApi}/${c.externalId}/threads_publish`, { method: 'POST', body: form({ creation_id: container, access_token: c.token }) });
    const link = await callJson(`${threadsApi}/${pub.id}?fields=permalink&access_token=${encodeURIComponent(c.token)}`).catch(() => null);
    return { platformId: pub.id, url: link?.permalink || `https://www.threads.net/${acc.handle}` };
  },
  async reply(acc, cred, to, text) {
    const c = need(cred, acc);
    if (!to.platformMsgId) throw new ManualStep('No Threads post id on this message');
    const container = (await callJson(`${threadsApi}/${c.externalId}/threads`, { method: 'POST', body: form({ media_type: 'TEXT', text: text.slice(0, 500), reply_to_id: to.platformMsgId, access_token: c.token }) })).id;
    const pub = await callJson(`${threadsApi}/${c.externalId}/threads_publish`, { method: 'POST', body: form({ creation_id: container, access_token: c.token }) });
    return { platformId: pub.id };
  },
  async hide(acc, cred, to) {
    const c = need(cred, acc);
    if (!to.platformMsgId) throw new ManualStep('No reply id to hide');
    await callJson(`${threadsApi}/${to.platformMsgId}/manage_reply`, { method: 'POST', body: form({ hide: 'true', access_token: c.token }) });
  },
  async postMetrics(acc, cred, platformId) {
    const c = need(cred, acc);
    const r = await callJson(`${threadsApi}/${platformId}/insights?metric=views,likes,replies,reposts&access_token=${encodeURIComponent(c.token)}`);
    const v = (n: string) => r?.data?.find((d: any) => d.name === n)?.values?.[0]?.value;
    return { views: v('views'), likes: v('likes'), comments: v('replies'), shares: v('reposts') };
  }
};

/** Normalise a Meta webhook body (Instagram / Page / messaging) into incoming messages. */
export interface Incoming { platform: string; externalAccountId: string; platformMsgId?: string; platformUserId?: string; postId?: string; kind: 'Comment' | 'DM' | 'Mention' | 'Reply'; handle: string; text: string; at: number; dedupe: string }
export function parseMetaWebhook(body: any): Incoming[] {
  const out: Incoming[] = [];
  const obj = body?.object;
  for (const entry of body?.entry || []) {
    const acct = String(entry.id || '');
    for (const ch of entry.changes || []) {
      const v = ch.value || {};
      if (obj === 'instagram' && ch.field === 'comments' && v.text) {
        out.push({ platform: 'instagram', externalAccountId: acct, platformMsgId: v.id, platformUserId: v.from?.id, postId: v.media?.id, kind: 'Comment', handle: '@' + (v.from?.username || 'unknown'), text: v.text, at: Date.now(), dedupe: 'igc:' + v.id });
      } else if (obj === 'instagram' && ch.field === 'mentions' && (v.comment_id || v.media_id)) {
        out.push({ platform: 'instagram', externalAccountId: acct, platformMsgId: v.comment_id || v.media_id, postId: v.media_id, kind: 'Mention', handle: '@mention', text: v.text || '(mentioned in a post)', at: Date.now(), dedupe: 'igm:' + (v.comment_id || v.media_id) });
      } else if (obj === 'page' && ch.field === 'feed' && v.item === 'comment' && v.verb === 'add' && v.message) {
        if (v.from?.id === acct) continue; // our own reply
        out.push({ platform: 'facebook', externalAccountId: acct, platformMsgId: v.comment_id, platformUserId: v.from?.id, postId: v.post_id, kind: 'Comment', handle: v.from?.name || 'Facebook user', text: v.message, at: (v.created_time ? v.created_time * 1000 : Date.now()), dedupe: 'fbc:' + v.comment_id });
      }
    }
    for (const m of entry.messaging || []) {
      if (!m.message?.text || m.message?.is_echo) continue;
      out.push({ platform: obj === 'instagram' ? 'instagram' : 'facebook', externalAccountId: acct, platformMsgId: m.message.mid, platformUserId: m.sender?.id, kind: 'DM', handle: obj === 'instagram' ? '@ig-user' : 'Messenger user', text: m.message.text, at: m.timestamp || Date.now(), dedupe: 'dm:' + m.message.mid });
    }
  }
  return out;
}
