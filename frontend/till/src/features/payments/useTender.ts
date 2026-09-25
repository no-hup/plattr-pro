import { useCallback, useEffect, useState } from 'react'
import { call } from '../../api/client'
import { getBill, putBill } from '../offline/cache'

// PY · the till side of payments. Money is integer minor units on the wire (R8); the PIN
// challenge for refunds and voids lives in api/client.ts, not here.

export interface Tender { id: string; label: string; kind: 'cash' | 'external' | 'credit'; opensDrawer: boolean; needsRef: boolean }   // credit: BT / TD-012, settles as money owed
export interface PaymentRow {
  paymentId: string; kind: 'take' | 'refund'; tenderId: string; tender: Tender; amount: number
  tendered: number | null; change: number | null; overpaid: number | null; tip?: number | null; receivableId?: string | null; at: number; by: string; ref: string | null
  creditNoteId: string | null; refundsPaymentId: string | null; void: { at: number; by: string; reason: string } | null
}
export interface BillState { billId: string; payable: number; paidTotal: number; outstanding: number; status: string; rows: PaymentRow[]; tenders: Tender[] }
export interface WriteResult { row: PaymentRow; bill: BillState; retry: boolean; opensDrawer: boolean }
export interface Ctx { restaurantId: string; sessionId: string; billId: string }

/**
 * R8 / PY-S31: typed text → integer minor units, or null. Never a float: "8.49" is 849 by string
 * arithmetic, not 8.49 × 100. Two decimals at most; anything else (spaces, commas, a third
 * decimal, a sign, more than ten integer digits) is refused at the pad and never becomes a request.
 */
export function toMinor(text: string): number | null {
  const m = /^(\d{0,10})(?:\.(\d{0,2}))?$/.exec(text.trim())
  if (!m || text.trim() === '' || text.trim() === '.') return null
  const whole = m[1] === '' ? 0 : Number(m[1])
  const frac = (m[2] ?? '').padEnd(2, '0')
  return whole * 100 + Number(frac)
}
export const fmt = (minor: number) => `₹${(minor / 100).toFixed(2)}`   // symbol is locale config; the first consumer, like App.tsx

/**
 * R13: one id per tap, minted here and kept until that tap succeeds, so a retry after a lost
 * response, or a reload mid-tender, resends the SAME id. A new tap mints a new one.
 */
const KEY = 'till.paymentId'
export function currentPaymentId(): string {
  try { const v = sessionStorage.getItem(KEY); if (v) return v } catch { /* storage may be unavailable */ }
  return freshPaymentId()
}
export function freshPaymentId(): string {
  const id = `till-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
  try { sessionStorage.setItem(KEY, id) } catch { /* ignore */ }
  return id
}
function settle(): void { try { sessionStorage.removeItem(KEY) } catch { /* ignore */ } }

export function useTender(ctx: Ctx) {
  const [bill, setBill] = useState<BillState | null>(null)
  const [busy, setBusy] = useState(false)
  // No error state: every failure is reported once, by ui/says, from the api client's one hook.
  const [last, setLast] = useState<WriteResult | null>(null)
  const [asOf, setAsOf] = useState<number | null>(null)   // OF-S17: the outstanding on screen is the cached one

  const refresh = useCallback(async () => {
    try {
      const r = await call<{ data: BillState }>('payments-list', { restaurantId: ctx.restaurantId, sessionId: ctx.sessionId, billId: ctx.billId })
      setBill(r.data); setAsOf(null); putBill(ctx.billId, r.data)
      return r.data
    } catch (e) {
      const c = getBill(ctx.billId)
      if (c) { setBill(b => b ?? c.bill); setAsOf(c.at) }
      throw e
    }
  }, [ctx.restaurantId, ctx.sessionId, ctx.billId])

  useEffect(() => { refresh().catch(() => { /* ui/says already said it */ }) }, [refresh])

  async function write(endpoint: string, body: Record<string, unknown>): Promise<WriteResult | null> {
    setBusy(true)
    try {
      const r = await call<{ data: WriteResult }>(endpoint, { restaurantId: ctx.restaurantId, sessionId: ctx.sessionId, ...body })
      settle()            // this tap is done; the next tap mints its own id
      setLast(r.data); setBill(b => (b ? { ...b, ...r.data.bill, rows: b.rows } : b))
      await refresh()
      return r.data
    } catch {
      return null
    } finally { setBusy(false) }
  }

  /** Cash sends `tendered`; an external or credit tender sends `amount`, plus `captured` when the money already arrived (PY-S28).
   *  BT: `tip` is typed by the cashier and sent as its own integer; the server never infers it from change. */
  const take = (tender: Tender, minor: number, opts: { ref?: string; captured?: boolean; tip?: number } = {}) =>
    write('payments-take', {
      billId: ctx.billId, paymentId: currentPaymentId(), tenderId: tender.id,
      ...(tender.kind === 'cash' ? { tendered: minor } : { amount: minor, ...(tender.kind === 'external' ? { captured: opts.captured === true } : {}) }),
      ...(opts.ref ? { ref: opts.ref } : {}),
      ...(opts.tip ? { tip: opts.tip } : {}),
    })
  const refund = (tenderId: string, minor: number, against: { creditNoteId?: string; refundsPaymentId?: string }, reason: string, note = '') =>
    write('payments-refund', { billId: ctx.billId, paymentId: currentPaymentId(), tenderId, amount: minor, ...against, reason, note })
  const voidRow = (paymentId: string, reason: string, note = '') =>
    write('payments-void', { paymentId, reason, note })

  /** D2 / BL-S9: Edit the bill (no PIN). Answers with the cancelled bill, whose draftId is where its dishes went back to. */
  const edit = async (): Promise<{ draftId: string; series: string; number: string } | null> => {
    setBusy(true)
    try { return (await call<{ data: { draftId: string; series: string; number: string } }>('billing-edit', { restaurantId: ctx.restaurantId, sessionId: ctx.sessionId, cid: `till_edit_${ctx.billId}`, billId: ctx.billId })).data }
    catch { return null } finally { setBusy(false) }
  }
  return { bill, busy, last, asOf, take, refund, voidRow, refresh, edit }
}
