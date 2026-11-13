// Background jobs on Redis (BullMQ): retries with back-off, one place to see what is pending or failed.
import { Queue, type JobsOptions } from 'bullmq';
import { config } from './config.js';

export interface JobSpec { name: string; data: Record<string, unknown>; opts?: JobsOptions }
export const QUEUE = 'lume';

let q: Queue | null = null;
export function queue(): Queue {
  return (q ||= new Queue(QUEUE, {
    connection: { url: config.REDIS_URL, maxRetriesPerRequest: null },
    defaultJobOptions: { attempts: 5, backoff: { type: 'exponential', delay: 5000 }, removeOnComplete: { age: 7 * 86400, count: 5000 }, removeOnFail: { age: 30 * 86400 } }
  }));
}
export async function enqueue(j: JobSpec): Promise<void> {
  await queue().add(j.name, { ws: config.WORKSPACE_ID, ...j.data }, j.opts);
}
export async function closeQueue(): Promise<void> { await q?.close(); q = null; }
