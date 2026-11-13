export interface Account { id: string; platform: string; handle: string; name?: string }
export interface Credential { externalId: string; token: string }
export interface PublishInput { caption: string; title: string; format?: string; mediaUrls?: string[]; link?: string }
export interface PublishResult { platformId: string; url: string }
export interface ReplyTarget { platformMsgId?: string; platformUserId?: string; kind: string; handle: string; postId?: string }
export interface Metrics { views?: number; likes?: number; comments?: number; shares?: number; clicks?: number; followers?: number }

/** One social platform. Calls that a platform does not offer throw ManualStep so the team finishes it in the platform's own tool. */
export interface Channel {
  publish(acc: Account, cred: Credential | null, input: PublishInput): Promise<PublishResult>;
  reply(acc: Account, cred: Credential | null, to: ReplyTarget, text: string): Promise<{ platformId: string }>;
  hide(acc: Account, cred: Credential | null, to: ReplyTarget): Promise<void>;
  postMetrics(acc: Account, cred: Credential | null, platformId: string): Promise<Metrics>;
}

export class ManualStep extends Error {
  constructor(msg: string) { super(msg); this.name = 'ManualStep'; }
}
export class PlatformError extends Error {
  constructor(msg: string, public status?: number, public retryable = true) { super(msg); this.name = 'PlatformError'; }
}

export async function callJson(url: string, init: RequestInit & { timeoutMs?: number } = {}): Promise<any> {
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), init.timeoutMs ?? 20000);
  try {
    const res = await fetch(url, { ...init, signal: ac.signal });
    const text = await res.text();
    let body: any = null;
    try { body = text ? JSON.parse(text) : null; } catch { body = { raw: text.slice(0, 500) }; }
    if (!res.ok) {
      const msg = body?.error?.message || body?.detail || body?.title || body?.error?.code || `HTTP ${res.status}`;
      throw new PlatformError(String(msg), res.status, res.status >= 500 || res.status === 429);
    }
    return body;
  } finally { clearTimeout(timer); }
}
