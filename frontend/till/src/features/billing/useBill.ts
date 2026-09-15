import { useState } from 'react'
import { call, ApiError } from '../../api/client'

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
  const [error, setError] = useState<ApiError | null>(null)
  const [dropCharges, setDropCharges] = useState<string[]>([])

  async function run<T>(fn: () => Promise<T>): Promise<T | null> {
    setBusy(true); setError(null)
    try { return await fn() } catch (e) { setError(e instanceof ApiError ? e : new ApiError('unknown', String(e))); return null } finally { setBusy(false) }
  }
  const body = (extra: Record<string, unknown> = {}) => ({ ...ctx, cid: `till_${ctx.draftId}`, dropCharges, ...extra })

  const preview = () => run(async () => { const r = await call<{ data: Bill }>('billing-preview', body()); setBill(r.data); return r.data })
  const issue = () => run(async () => { const r = await call<{ data: Bill }>('billing-issue', body({ tableIds: [], expectedV: {} })); setBill(r.data); return r.data })
  const cancel = (billId: string, reason: string, note: string) =>
    run(async () => { const r = await call<{ data: Bill }>('billing-cancel', body({ billId, reason, note })); setBill(r.data); return r.data })
  const toggleCharge = (type: string) => setDropCharges(d => (d.includes(type) ? d.filter(t => t !== type) : [...d, type]))
  return { bill, busy, error, dropCharges, preview, issue, cancel, toggleCharge }
}
