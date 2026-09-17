import { call, ApiError, net, onNet } from '../../api/client'
import { estimates, upsertEstimate } from './cache'

// OF-S20 · every estimate goes to the server by itself on the first answered call, as an `estimate` row on ST's
// door. The cid is the estimate's id, so a resend is one row (retry: true) and the till just marks it synced.
let ctx: { restaurantId: string; sessionId: string } | null = null
let running = false

export async function syncEstimates(): Promise<void> {
  if (!ctx || running) return
  running = true
  try {
    for (const e of estimates().filter(x => !x.synced)) {
      try {
        await call('approvals-apply', { ...ctx, action: 'estimate', cid: e.id, amountMinor: e.amountMinor, note: `${e.tenderId} ${e.takenMinor} taken at ${e.at}, preview ${e.previewAt}` })
        upsertEstimate({ ...e, synced: true })
      } catch (err) {
        // ponytail: a captain's session is refused every time; one wasted call per answered call until a manager logs in.
        if (err instanceof ApiError && err.code === 'permission-denied') return
        return   // the line dropped again: the next answered call retries
      }
    }
  } finally { running = false }
}

/** Called once at login. Runs now, then after every answered call. */
export function startSync(c: { restaurantId: string; sessionId: string }): () => void {
  ctx = c
  void syncEstimates()
  return onNet(() => { if (net.answeredAt >= net.failedAt) void syncEstimates() })
}
