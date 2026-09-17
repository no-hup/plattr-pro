import { useEffect, useState, type FormEvent } from 'react'
import { rupees, useBill, type Ctx } from './useBill'
import { EstimateScreen } from '../offline/EstimateScreen'
import { useOnline } from '../offline/useOnline'

/** BL-S1..S10 on one screen: a table's draft, its blocks and totals, Generate bill, drop the service charge, Cancel. Print bytes are KT's. */
export function BillScreen({ ctx, reasons }: { ctx: Ctx; reasons: string[] }) {
  const { bill, busy, error, dropCharges, asOf, preview, issue, comp, cancel, toggleCharge } = useBill(ctx)
  const { offline } = useOnline()
  const [msg, setMsg] = useState('')
  useEffect(() => { preview() }, [dropCharges])   // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (error) setMsg(error.code === 'permission-denied' && !error.data.requires ? 'Not allowed' : error.message) }, [error])

  async function onCancel(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!bill?.billId) return
    const f = new FormData(e.currentTarget)
    setMsg('')
    const r = await cancel(bill.billId, String(f.get('reason')), String(f.get('note') ?? ''))
    if (r) setMsg(`Bill ${r.number} cancelled`)
  }
  async function onComp(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    setMsg('')
    const r = await comp(String(f.get('reason')), String(f.get('note') ?? ''))
    if (r) setMsg(`Bill ${r.number} comped to ₹0.00`)
  }
  const issued = !!bill?.number
  return (
    <section data-testid="bill">
      <h2>Table bill {issued ? <span data-testid="bill-number">#{bill!.series}-{bill!.number}{bill!.status === 'cancelled' ? ' (cancelled)' : ''}</span> : <em>draft</em>}</h2>
      {bill && (
        <>
          <table>
            <tbody>
              {bill.lines.filter(l => l.countsTowardTotal).map(l => (
                <tr key={l.lineId} data-testid="line"><td>{l.name} × {l.qty}</td><td>{rupees(l.listPrice)}</td>
                  <td>{l.offer?.amount ? `−${rupees(l.offer.amount)}` : ''}{l.discount?.amount ? ` −${rupees(l.discount.amount)}` : ''}{l.billDiscount ? ` −${rupees(l.billDiscount)}` : ''}</td></tr>
              ))}
            </tbody>
          </table>
          {bill.blocks.map(b => (
            <p key={b.id} data-testid={`block-${b.id}`}>{b.label}: {rupees(b.taxable)}{b.parts.map(p => ` · ${p.label} ${p.rateBps / 100}% ${rupees(p.amount)}`).join('')}</p>
          ))}
          {bill.charges.map(c => <p key={c.type} data-testid={`charge-${c.type}`}>{c.type} {c.pctBps / 100}%: {rupees(c.amount)}</p>)}
          {bill.roundOff !== 0 && <p data-testid="roundoff">Round off {bill.roundOff > 0 ? '+' : ''}{rupees(bill.roundOff)}</p>}
          <p><strong data-testid="payable">Payable {rupees(bill.payable)}</strong>{asOf !== null && <span data-testid="as-of"> as of {new Date(asOf).toTimeString().slice(0, 5)}</span>}{' '}
            <button data-testid="preview" onClick={() => preview()} disabled={busy}>Preview</button></p>
          {/* OF-S16: the emergency path opens only after a failed call, never a slow one, and only for a draft */}
          {offline && !issued && asOf !== null && <EstimateScreen draftId={ctx.draftId} amountMinor={bill.payable} previewAt={asOf} />}
          {!issued && (
            <p>
              <button data-testid="issue" onClick={() => issue().then(b => b && setMsg(`Bill ${b.number} issued`))} disabled={busy}>Generate bill</button>
              {' '}
              {(bill.charges.length > 0 || dropCharges.length > 0) && (
                <button data-testid="toggle-charge" onClick={() => toggleCharge('SERVICE_CHARGE')} disabled={busy}>
                  {dropCharges.includes('SERVICE_CHARGE') ? 'Add service charge back' : 'Remove service charge'}
                </button>
              )}
            </p>
          )}
          {!issued && (
            // DC-S25a: the guests left. Nothing to collect, and the day cannot close over food that
            // is on no bill at all. This puts a numbered ₹0 document against it instead.
            <form onSubmit={onComp} data-testid="comp-form">
              <select name="reason" data-testid="comp-reason" required defaultValue="">
                <option value="" disabled>reason</option>
                {reasons.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
              <input name="note" placeholder="note" data-testid="comp-note" maxLength={120} />
              <button type="submit" data-testid="comp" disabled={busy || reasons.length === 0}>Comp the whole bill</button>
            </form>
          )}
          {issued && bill.status === 'issued' && (
            <form onSubmit={onCancel}>
              <select name="reason" data-testid="cancel-reason" required defaultValue="">
                <option value="" disabled>reason</option>
                {reasons.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
              <input name="note" placeholder="note" data-testid="cancel-note" maxLength={120} />
              <button type="submit" data-testid="cancel" disabled={busy}>Cancel bill</button>
            </form>
          )}
        </>
      )}
      <p data-testid="bill-msg">{msg}</p>
    </section>
  )
}
