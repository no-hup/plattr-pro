import { useState } from 'react'
import { call, ApiError } from '../../api/client'
import type { Bill } from '../billing/useBill'
import { fmt, freshPaymentId, type WriteResult } from '../payments/useTender'
import { hhmm, openEstimates, stamp, upsertEstimate, type Estimate } from './cache'

/**
 * OF-S8 · the morning after. One estimate at a time, through the normal endpoints in the normal order:
 * check (preview, so the gap shows first, OF-S11) → issue → take, each step remembered on the estimate so a
 * retry resumes where it died (OF-S18). An issued-then-dark bill takes only (OF-S17); a draft with nothing
 * left to bill books the cash as a drawer cash-in with the est: trail in its note (OF-S19). Never back-dated:
 * the server dates every row (OF-S9); the estimate's own time rides on the ref.
 */
export function ReconcileScreen({ ctx }: { ctx: { restaurantId: string; sessionId: string } }) {
  const [list, setList] = useState(openEstimates)
  const [checked, setChecked] = useState<Record<string, Bill>>({})
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)

  const ref = (e: Estimate) => `est:${e.draftId ?? e.billId}:${stamp(e.at)}:${e.amountMinor}`
  const save = (e: Estimate) => { upsertEstimate(e); setList(openEstimates()) }
  async function run(fn: () => Promise<void>) {
    setBusy(true); setMsg('')
    try { await fn() } catch (err) { setMsg(err instanceof ApiError ? err.message : String(err)) } finally { setBusy(false) }
  }

  const check = (e: Estimate) => run(async () => {
    const r = await call<{ data: Bill }>('billing-preview', { ...ctx, cid: `till_${e.draftId}`, draftId: e.draftId, dropCharges: [] })
    setChecked(c => ({ ...c, [e.id]: r.data }))
  })
  const take = async (e: Estimate, billId: string) => {
    if (!e.paymentId) { e = { ...e, paymentId: freshPaymentId() }; save(e) }   // R13: minted once, before the call
    const r = await call<{ data: WriteResult }>('payments-take', {
      ...ctx, billId, paymentId: e.paymentId, tenderId: e.tenderId, ref: ref(e),
      ...(e.tenderKind === 'cash' ? { tendered: e.takenMinor } : { amount: e.takenMinor, captured: true }),
    })
    save({ ...e, status: 'done' })
    setMsg(`${e.id}: ${r.data.retry ? 'already recorded' : 'paid'}${r.data.row.change ? `, change ${fmt(r.data.row.change)}` : ''}; outstanding ${fmt(r.data.bill.outstanding)}`)
  }
  const issueAndTake = (e: Estimate) => run(async () => {
    let billId = e.issuedBillId
    if (!billId) {
      const r = await call<{ data: Bill }>('billing-issue', { ...ctx, cid: `till_${e.draftId}`, draftId: e.draftId, dropCharges: [], tableIds: [], expectedV: {} })
      billId = r.data.billId!
      e = { ...e, issuedBillId: billId }; save(e)
    }
    await take(e, billId)
  })
  const takeOnly = (e: Estimate) => run(() => take(e, e.billId!))
  const bookCash = (e: Estimate) => run(async () => {
    await call('dayClose-move', { ...ctx, movementId: `mv_${e.id}`, kind: 'in', amount: e.takenMinor, reason: 'correction', note: ref(e) })
    save({ ...e, status: 'done' }); setMsg(`${e.id}: booked as drawer cash-in ${fmt(e.takenMinor)}`)
  })

  return (
    <section data-testid="reconcile">
      <h2>Reconcile {list.length} estimate{list.length === 1 ? '' : 's'}</h2>
      <ul>
        {list.map(e => {
          const pv = checked[e.id]
          return (
            <li key={e.id} data-testid={`est-${e.id}`}>
              {e.draftId ?? e.billId} · slip {fmt(e.amountMinor)} at {hhmm(e.at)} · took {fmt(e.takenMinor)} {e.tenderId}{e.synced ? '' : ' · not synced'}
              {' '}
              {e.billId ? (
                <button data-testid="take-only" onClick={() => takeOnly(e)} disabled={busy}>Take {fmt(e.takenMinor)} on {e.billId}</button>
              ) : !pv && !e.issuedBillId ? (
                <button data-testid="check" onClick={() => check(e)} disabled={busy}>Check</button>
              ) : (
                <>
                  {pv && <span data-testid="gap">now {fmt(pv.payable)}, {pv.payable === e.amountMinor ? 'no gap' : `gap ${pv.payable > e.amountMinor ? '+' : '−'}${fmt(Math.abs(pv.payable - e.amountMinor))}`}</span>}{' '}
                  {pv && pv.payable === 0 && !e.issuedBillId
                    ? <button data-testid="book-cash" onClick={() => bookCash(e)} disabled={busy}>Nothing to bill: book as drawer cash-in</button>
                    : <button data-testid="issue-take" onClick={() => issueAndTake(e)} disabled={busy}>{e.issuedBillId ? 'Take' : 'Issue and take'}</button>}
                </>
              )}
            </li>
          )
        })}
      </ul>
      <p data-testid="rec-msg">{msg}</p>
    </section>
  )
}
