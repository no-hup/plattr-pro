import { useRef, useState } from 'react'
import { call } from '../../api/client'
export { toMinor, fmt } from '../payments/useTender'   // one money parser in the till, not two

// Money on the wire is integer minor units. The screen formats; nothing here does arithmetic.
export interface TenderTotal { tenderId: string; label: string; kind: 'cash' | 'external'; taken: number; refunded: number; overpaid: number; count: number; net: number; counted?: number; difference?: number }
export interface Movement { movementId: string; kind: 'float' | 'in' | 'out'; amount: number; reason: string; note?: string; by: string; void?: { reason: string } | null }
export interface DayView {
  businessDate: string; closed: boolean; blindCount: boolean; reasons: string[]
  byTender: TenderTotal[]; byStaff?: { staffId: string; net: number }[]; movements?: Movement[]
  openingFloat?: number; expectedCash?: number; countedCash?: number; difference?: number; leftInDrawer?: number | null
  closedAt?: number; closedBy?: string; note?: string
  floor: { issuedBills: number; unbilledItems: number }
  previousClose: { businessDate: string; countedCash: number; leftInDrawer: number | null } | null
  previousDayClosed: boolean
}

export interface Ctx { restaurantId: string; sessionId: string; businessDate?: string }

/**
 * One hook per day-close screen. The server owns every computed number; the till sends the count
 * and nothing else. While the day is open and blindCount is true the reply carries no cash figure
 * at all, so there is nothing here to accidentally render (R14).
 */
export function useDayClose(ctx: Ctx) {
  const [day, setDay] = useState<DayView | null>(null)
  const [busy, setBusy] = useState(false)
  // No error state: every failure is reported once, by ui/says, from the api client's one hook.
  // R13: one id per tap, kept until that tap succeeds, so a PIN challenge or a lost reply
  // re-sends the SAME id and the vendor is paid once.
  const tap = useRef<string>('')

  async function run<T>(fn: () => Promise<T>): Promise<T | null> {
    setBusy(true)
    try { return await fn() } catch { return null } finally { setBusy(false) }
  }

  const load = () => run(async () => {
    const r = await call<{ data: DayView }>('dayClose-get', { ...ctx })
    setDay(r.data); return r.data
  })

  const move = (kind: Movement['kind'], amount: number, reason: string, note = '') => run(async () => {
    if (!tap.current) tap.current = `mv_${Date.now()}_${Math.floor(Math.random() * 1e9).toString(36)}`
    await call('dayClose-move', { restaurantId: ctx.restaurantId, sessionId: ctx.sessionId, movementId: tap.current, kind, amount, reason, note })
    tap.current = ''
    return load()
  })

  const close = (countedCash: number, leftInDrawer: number | null, note = '') => run(async () => {
    const r = await call<{ data: { doc: DayView & { difference: number }; retry: boolean } }>('dayClose-close', {
      restaurantId: ctx.restaurantId, sessionId: ctx.sessionId, businessDate: day?.businessDate ?? ctx.businessDate,
      countedCash, ...(leftInDrawer === null ? {} : { leftInDrawer }), note,
    })
    await load()
    return r.data.doc
  })

  return { day, busy, load, move, close }
}
