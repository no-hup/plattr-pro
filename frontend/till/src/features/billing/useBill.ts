import { useState } from 'react'
import { call, ApiError } from '../../api/client'
import { getPreview, putPreview } from '../offline/cache'

// Money on the wire is integer minor units (R8). The screen formats; nothing here does arithmetic.
export interface Part { label: string; rateBps: number; amount: number }
export interface Block { id: string; label: string; mode: string; taxable: number; parts: Part[]; total: number }
export interface BillLine { lineId: string; name: string; qty: number; listPrice: number; countsTowardTotal: boolean; billDiscount: number; offer?: { amount: number } | null; discount?: { amount: number } }
export interface Charge { type: string; pctBps: number; base: number; amount: number }
export interface Bill {
  billId?: string; number?: string; series?: string; status?: string
  lines: BillLine[]; blocks: Block[]; charges: Charge[]; subtotal: number; taxTotal: number; roundOff: number; payable: number
  flagged?: string[]; offer?: { name: string; amount: number } | null; seller?: { name: string; taxId: string }
}
export const rupees = (minor: number) => `₹${(minor / 100).toFixed(2)}`

export interface Ctx { restaurantId: string; sessionId: string; draftId: string }

/** One hook per bill screen. Every call recomputes on the server; the till never sends money (D7). */
export function useBill(ctx: Ctx) {
  const [bill, setBill] = useState<Bill | null>(null)
  const [busy, setBusy] = useState(false)
  // No error state: every failure is reported once, by ui/says, from the api client's one hook.
  const [dropCharges, setDropCharges] = useState<string[]>([])
  const [asOf, setAsOf] = useState<number | null>(null)   // OF-S6: set when the figures on screen are the cached ones

  async function run<T>(fn: () => Promise<T>): Promise<T | null> {
    setBusy(true)
    try { return await fn() } catch { return null } finally { setBusy(false) }
  }
  const body = (extra: Record<string, unknown> = {}) => ({ ...ctx, cid: `till_${ctx.draftId}`, dropCharges, ...extra })

  // OF R7: a preview that answers is cached; one that fails leaves the last answer on screen, labelled with its time (OF-S6).
  const preview = () => run(async () => {
    try { const r = await call<{ data: Bill }>('billing-preview', body()); setBill(r.data); setAsOf(null); putPreview(ctx.draftId, r.data); return r.data }
    catch (e) { const c = getPreview(ctx.draftId); if (c && !bill) setBill(c.bill); if (c) setAsOf(c.at); throw e }
  })
  const issue = () => run(async () => { const r = await call<{ data: Bill }>('billing-issue', body({ tableIds: [], expectedV: {} })); setBill(r.data); return r.data })

  /**
   * DC-S25a. Guests left without paying, so there is nothing to collect and the day close will not
   * go over an unbilled table. Comping the bill to zero gives the food a numbered document instead
   * of letting it vanish, and BL refuses it without a PIN (TD-019) — the one interceptor handles
   * that, so there is no PIN box in this file.
   * `net` is the same sum the server computes (listPrice − offer − discount over the live lines);
   * it comes from the preview the server just sent us, and the server re-derives it anyway.
   */
  const comp = (reason: string, note = '') => run(async () => {
    const live = (bill?.lines ?? []).filter(l => l.countsTowardTotal)
    const net = live.reduce((n, l) => n + l.listPrice - (l.offer?.amount ?? 0) - (l.discount?.amount ?? 0), 0)
    if (net <= 0) throw new ApiError('failed-precondition', 'Nothing to comp')
    const r = await call<{ data: Bill }>('billing-issue', body({ tableIds: [], expectedV: {}, discount: { amount: net, pct: 100, source: { reason, note } } }))
    setBill(r.data); return r.data
  })
  const cancel = (billId: string, reason: string, note: string) =>
    run(async () => { const r = await call<{ data: Bill }>('billing-cancel', body({ billId, reason, note })); setBill(r.data); return r.data })
  const toggleCharge = (type: string) => setDropCharges(d => (d.includes(type) ? d.filter(t => t !== type) : [...d, type]))
  return { bill, busy, dropCharges, asOf, preview, issue, comp, cancel, toggleCharge }
}
