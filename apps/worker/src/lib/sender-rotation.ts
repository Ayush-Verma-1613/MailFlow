/**
 * Choose which connected mailbox sends the next message, honoring the
 * campaign's rotation strategy and skipping unhealthy / capped accounts.
 */
import { getRedis } from '@mailflow/queue';
import type { RotationStrategy } from '@mailflow/shared';
import type { IEmailAccount } from '@mailflow/db';
import type { HydratedDocument } from 'mongoose';

type Account = HydratedDocument<IEmailAccount>;

/** Accounts that are connected and still under their daily cap. */
function eligible(accounts: Account[]): Account[] {
  return accounts.filter(
    (a) => a.health.status === 'connected' && a.health.sentToday < a.limits.dailyCap,
  );
}

export async function pickSender(
  accounts: Account[],
  strategy: RotationStrategy,
  rotationKey: string,
): Promise<Account | null> {
  const pool = eligible(accounts);
  if (pool.length === 0) return null;
  if (pool.length === 1) return pool[0] ?? null;

  switch (strategy) {
    case 'round-robin': {
      // Atomic per-campaign counter → even distribution across the pool.
      const n = await getRedis().incr(`rotate:${rotationKey}`);
      return pool[(n - 1) % pool.length] ?? null;
    }
    case 'lru': {
      // Oldest lastSentAt first (never-sent counts as oldest).
      return [...pool].sort(
        (a, b) =>
          (a.health.lastSentAt?.getTime() ?? 0) - (b.health.lastSentAt?.getTime() ?? 0),
      )[0] ?? null;
    }
    case 'weighted': {
      // Weight by remaining daily capacity.
      const weights = pool.map((a) => Math.max(1, a.limits.dailyCap - a.health.sentToday));
      const total = weights.reduce((s, w) => s + w, 0);
      let r = Math.random() * total;
      for (let i = 0; i < pool.length; i++) {
        r -= weights[i] ?? 0;
        if (r <= 0) return pool[i] ?? null;
      }
      return pool[0] ?? null;
    }
    default:
      return pool[0] ?? null;
  }
}
