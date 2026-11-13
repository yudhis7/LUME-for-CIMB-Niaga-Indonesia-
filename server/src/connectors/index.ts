import { config } from '../config.js';
import { pool } from '../db.js';
import { unseal } from '../crypto.js';
import { sandbox } from './sandbox.js';
import { instagram, facebook, threads } from './meta.js';
import { x, tiktok, unsupported } from './others.js';
import type { Channel, Credential } from './types.js';

const LIVE: Record<string, Channel> = { instagram, facebook, threads, x, tiktok };

export function channelFor(platform: string): Channel {
  if (config.CONNECTOR_MODE === 'sandbox') return sandbox;
  return LIVE[platform] || unsupported;
}

export async function credentialFor(ws: string, accountId: string): Promise<Credential | null> {
  if (config.CONNECTOR_MODE === 'sandbox') return { externalId: 'sandbox', token: 'sandbox' };
  const r = (await pool.query('select external_id, token_enc from channel_credentials where ws=$1 and account_id=$2', [ws, accountId])).rows[0];
  return r ? { externalId: r.external_id, token: unseal(r.token_enc) } : null;
}

export * from './types.js';
