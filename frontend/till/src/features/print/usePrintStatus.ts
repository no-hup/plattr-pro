import { useCallback, useEffect, useRef, useState } from 'react'
import { call, ApiError } from '../../api/client'

// KT · the till is not on the print path; it is where a human sees that paper did not come out (KT-S7, S23).
// This hook owns that picture and the two buttons. It never encodes, never opens a socket, never decides
// which agent prints: `print-status` answers the same facts the every-minute sweep logs.

export interface StationStatus { waiting: number; oldestWaitingSeconds: number; notAutoPrinted: number; lastError: string | null }
export interface PrintStatus {
  stations: Record<string, StationStatus>
  waiting: number
  notAutoPrinted: number
  lastClaimAt: number | null
  silentSeconds: number | null
  at: number
}
export interface Ctx { restaurantId: string; sessionId: string }

const EMPTY: PrintStatus = { stations: {}, waiting: 0, notAutoPrinted: 0, lastClaimAt: null, silentSeconds: null, at: 0 }
export const POLL_MS = 10_000

const hhmm = (ms: number) => { const d = new Date(ms); return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}` }

/**
 * The red line, as words. One line per station that is stuck, or one line for a silent queue (KT-S23): the
 * cashier reads which printer and how many tickets, never a job id.
 */
export function lines(s: PrintStatus): string[] {
  const out: string[] = []
  const silent = s.waiting > 0 && s.silentSeconds !== null && s.silentSeconds >= 90
  if (silent) out.push(`No print agent has claimed a job since ${s.lastClaimAt ? hhmm(s.lastClaimAt) : hhmm(s.at - (s.silentSeconds as number) * 1000)} — ${s.waiting} waiting`)
  for (const [id, st] of Object.entries(s.stations)) {
    const label = id.toUpperCase()
    if (st.waiting > 0 && !silent) out.push(`${label} printer ${st.lastError ? 'not answering' : 'busy'} — ${st.waiting} ticket${st.waiting === 1 ? '' : 's'} waiting`)
    if (st.notAutoPrinted > 0) out.push(`${label}: ${st.notAutoPrinted} not auto-printed`)
  }
  return out
}

export function usePrintStatus(ctx: Ctx) {
  const [status, setStatus] = useState<PrintStatus>(EMPTY)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const live = useRef(true)

  const load = useCallback(async () => {
    try {
      const r = await call<{ data: PrintStatus }>('print-status', { restaurantId: ctx.restaurantId, sessionId: ctx.sessionId })
      if (!live.current) return
      setStatus(r.data)
      setError('')
    } catch (e) {
      if (live.current) setError(e instanceof ApiError ? e.message : 'No connection')
    }
  }, [ctx.restaurantId, ctx.sessionId])

  useEffect(() => {
    live.current = true
    load()
    const t = setInterval(load, POLL_MS)
    return () => { live.current = false; clearInterval(t) }
  }, [load])

  /** Retry: every stale ticket goes through once (`force`); reprint: a fresh REPRINT n for a round. */
  const act = useCallback(async (body: { jobId?: string; cartId?: string; billId?: string }) => {
    setBusy(true)
    try {
      const r = await call<{ data: { jobIds: string[] } }>('print-reprint', { restaurantId: ctx.restaurantId, sessionId: ctx.sessionId, ...body })
      await load()
      return r.data.jobIds
    } catch (e) {
      if (live.current) setError(e instanceof ApiError ? e.message : 'No connection')
      return null
    } finally { setBusy(false) }
  }, [ctx.restaurantId, ctx.sessionId, load])

  return { status, error, busy, lines: lines(status), reload: load, act }
}
