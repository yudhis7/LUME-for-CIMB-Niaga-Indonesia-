// Outbound services: internal alerts (email / chat webhook), CIMB Niaga's complaint system (CMS), and Claude.
import nodemailer from 'nodemailer';
import { config } from './config.js';
import { kernel } from './kernel.js';
import { callJson } from './connectors/types.js';
import { log } from './log.js';

/* ---------- internal alerts ---------- */
let mailer: ReturnType<typeof nodemailer.createTransport> | null = null;
const teamEmails = (team: string): string[] => {
  if (team === 'fraud') return config.ALERT_EMAILS_FRAUD;
  if (team === 'comms') return config.ALERT_EMAILS_COMMS;
  if (team === 'compliance') return config.ALERT_EMAILS_COMPLIANCE;
  return config.ALERT_EMAILS_CARE; // care desk, ticket owners and anything not mapped yet
};
export async function sendAlert(team: string, subject: string, text: string, link?: string): Promise<{ channels: string[] }> {
  const url = link ? `${config.PUBLIC_URL}/${link}` : config.PUBLIC_URL;
  const channels: string[] = [];
  const to = teamEmails(team);
  if (config.SMTP_URL && to.length) {
    mailer ||= nodemailer.createTransport(config.SMTP_URL);
    await mailer.sendMail({ from: config.MAIL_FROM, to, subject: `[Lume] ${subject}`, text: `${text}\n\nOpen in Lume: ${url}` });
    channels.push('email:' + to.length);
  }
  if (config.ALERT_WEBHOOK_URL) {
    await callJson(config.ALERT_WEBHOOK_URL, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ text: `*${subject}* (${team})\n${text}\n${url}` }) });
    channels.push('webhook');
  }
  if (!channels.length) { log.info({ team, subject }, 'alert recorded (no email or webhook configured)'); channels.push('log'); }
  return { channels };
}

/* ---------- CIMB Niaga complaint management system ---------- */
export async function createComplaint(ticket: any): Promise<string> {
  if (config.CMS_MODE === 'sandbox') return ticket.cms && /^CMS-/.test(ticket.cms) ? ticket.cms : 'CMS-' + new Date().getFullYear() + '-' + String(Date.now()).slice(-6);
  const r = await callJson(`${config.CMS_URL.replace(/\/$/, '')}/complaints`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${config.CMS_TOKEN}` },
    body: JSON.stringify({
      externalRef: ticket.id, channel: 'social-media', source: ticket.src, createdAt: new Date(ticket.createdAt).toISOString(),
      summary: ticket.issue, product: ticket.product, category: ticket.theme, priority: ticket.priority, ownerUnit: ticket.owner
    })
  });
  return r.reference || r.id;
}

/* ---------- Claude ---------- */
export const aiEnabled = () => !!config.ANTHROPIC_API_KEY;
const SYSTEM = 'You write for PT Bank CIMB Niaga Tbk social media and care teams. Follow the brief exactly. Never ask for or include PIN, OTP, passwords, card, account or ID numbers. No promises of returns, outcomes or timelines. No comparisons with other banks. Output only the requested text.';

/** Write text with Claude. Personal data is masked before it leaves Lume; the result is checked again by the compliance rules wherever it is used. */
export async function aiWrite(prompt: string, purpose: string): Promise<{ text: string; model: string; masked: string[] }> {
  if (!aiEnabled()) throw new Error('AI is not configured');
  const mk = kernel().maskPII(prompt);
  const r = await callJson(`${config.ANTHROPIC_BASE_URL.replace(/\/$/, '')}/v1/messages`, {
    method: 'POST', timeoutMs: 30000,
    headers: { 'content-type': 'application/json', 'x-api-key': config.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model: config.AI_MODEL, max_tokens: config.AI_MAX_TOKENS, system: SYSTEM, metadata: { user_id: 'lume:' + purpose }, messages: [{ role: 'user', content: mk.text }] })
  });
  const text = (r?.content || []).filter((b: any) => b.type === 'text').map((b: any) => b.text).join('').trim();
  return { text, model: r?.model || config.AI_MODEL, masked: mk.found };
}
