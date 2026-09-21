import { useState } from 'react'
import { call } from '../../api/client'
import { putConfig, type OfflineConfig } from '../offline/cache'

export interface LineSnapshot { listPrice: number; v: number; discount?: { amount: number; pct: number }; void?: unknown; countsTowardTotal: boolean }
export interface ApplyBody { restaurantId: string; sessionId: string; action: string; cid: string; lineId?: string; amount?: number; reason?: string; note?: string }

export async function fetchReasons(restaurantId: string, sessionId: string): Promise<string[]> {
  const r = await call<{ data: { reasons: string[]; offline?: OfflineConfig } }>('approvals-config', { restaurantId, sessionId })
  if (r.data.offline) putConfig(r.data.offline)   // OF: kept in the cache so a reload with no server still has it
  return r.data.reasons
}

/** One hook per screen that approves things. The PIN challenge itself lives in api/client.ts, not here. */
export function useApproval() {
  const [busy, setBusy] = useState(false)
  // No error state: every failure is reported once, by ui/says, from the api client's one hook.
  async function apply(body: ApplyBody): Promise<LineSnapshot | null> {
    setBusy(true)
    try {
      const r = await call<{ data: { line?: LineSnapshot } }>('approvals-apply', body as unknown as Record<string, unknown>)
      return r.data.line ?? null
    } catch {
      return null
    } finally { setBusy(false) }
  }
  return { apply, busy }
}
