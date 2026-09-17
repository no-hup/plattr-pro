import { useEffect, useState, type FormEvent } from 'react'
import { fmt, toMinor, useTender, type Ctx, type Tender } from './useTender'
import { EstimateScreen } from '../offline/EstimateScreen'
import { getBill } from '../offline/cache'
import { useOnline } from '../offline/useOnline'

// PY · the tender screen for one issued bill. The server owns every number: this screen shows
// the outstanding it was told, previews change for cash, and sends integers. Drawer hardware is
// KT's; here `opensDrawer` from the response flips a visible signal the browser test can assert.

export function TenderScreen({ ctx, reasons }: { ctx: Ctx; reasons: string[] }) {
  const { bill, busy, error, last, asOf, take, refund, voidRow } = useTender(ctx)
  const { offline } = useOnline()
  const [tender, setTender] = useState<Tender | null>(null)
  const [text, setText] = useState('')
  const [ref, setRef] = useState('')
  const [captured, setCaptured] = useState(false)
  const [msg, setMsg] = useState('')
  const [drawer, setDrawer] = useState(false)

  useEffect(() => { if (bill && !tender) setTender(bill.tenders[0] ?? null) }, [bill, tender])
  useEffect(() => {
    if (!error) return
    setMsg(error.code === 'permission-denied' && !error.data.requires ? 'Not allowed' : error.message)
  }, [error])
  useEffect(() => {
    if (!last) return
    setDrawer(last.opensDrawer)
    if (last.retry) setMsg('Already recorded')
    else if (last.row.void) setMsg('Voided')          // a voided row keeps its kind, so check the void block first
    else if (last.row.kind === 'take') setMsg(last.row.change ? `Change ${fmt(last.row.change)}` : last.row.overpaid ? `Overpaid ${fmt(last.row.overpaid)}, recorded` : 'Recorded')
    else setMsg('Refunded')
    setText(''); setRef('')
  }, [last])

  const minor = toMinor(text)
  const outstanding = bill?.outstanding ?? 0
  const change = tender?.kind === 'cash' && minor !== null && minor > outstanding ? minor - outstanding : 0
  const settled = !!bill && bill.status === 'paid'
  // The figure on screen was answered before the cut (asOf null) or read from the cache after it: its time either way.
  const cachedAt = asOf ?? getBill(ctx.billId)?.at ?? null

  async function onTake(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!tender || minor === null) { setMsg('Enter a whole amount, up to two decimals'); return }
    setMsg('')
    await take(tender, minor, { ref: ref || undefined, captured })
  }
  async function onRefund(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    const m = toMinor(String(f.get('amount') ?? ''))
    if (m === null) { setMsg('Enter a whole amount, up to two decimals'); return }
    setMsg('')
    const note = String(f.get('creditNoteId') ?? '').trim()
    const row = String(f.get('refundsPaymentId') ?? '').trim()
    await refund(String(f.get('tender')), m, note ? { creditNoteId: note } : { refundsPaymentId: row }, String(f.get('reason')), String(f.get('note') ?? ''))
  }

  if (!bill) return <p data-testid="pay-msg">{msg || 'Loading bill…'}</p>
  return (
    <section>
      <p>
        Bill <code>{bill.billId}</code> · payable {fmt(bill.payable)} · paid {fmt(bill.paidTotal)} ·{' '}
        <strong data-testid="outstanding">{settled ? 'settled' : `outstanding ${fmt(outstanding)}`}</strong>
        <span data-testid="status"> [{bill.status}]</span>
      </p>
      <p data-testid="drawer" hidden={!drawer}>DRAWER OPEN</p>
      {/* OF-S17: issued, then dark. The slip says what is due on which bill; the morning does take only. */}
      {offline && !settled && cachedAt !== null && (
        <>
          <p data-testid="due-offline">due {fmt(outstanding)} on {bill.billId} (as of {new Date(cachedAt).toTimeString().slice(0, 5)})</p>
          <EstimateScreen billId={bill.billId} amountMinor={outstanding} previewAt={cachedAt} />
        </>
      )}

      {settled || bill.status === 'cancelled' ? (
        <p data-testid="nothing-to-collect">{bill.status === 'cancelled' ? 'Bill cancelled' : 'Nothing to collect'}</p>
      ) : (
        <form onSubmit={onTake}>
          <div>
            {bill.tenders.map(t => (
              <button type="button" key={t.id} data-testid={`tender-${t.id}`} aria-pressed={tender?.id === t.id} onClick={() => { setTender(t); setCaptured(false) }}>{t.label}</button>
            ))}
          </div>
          <input name="amount" inputMode="decimal" placeholder={tender?.kind === 'cash' ? 'cash tendered' : 'amount'} value={text} onChange={e => setText(e.target.value)} data-testid="amount" maxLength={13} />
          <span data-testid="minor">{minor === null ? (text ? 'invalid' : '') : String(minor)}</span>
          {tender?.kind === 'cash' && change > 0 && <span data-testid="change"> change {fmt(change)}</span>}
          {tender?.needsRef && <input name="ref" placeholder="slip / reference" value={ref} onChange={e => setRef(e.target.value)} data-testid="ref" maxLength={64} />}
          {tender?.kind === 'external' && (
            <label><input type="checkbox" checked={captured} onChange={e => setCaptured(e.target.checked)} data-testid="captured" /> money already received</label>
          )}
          <button type="submit" data-testid="take" disabled={busy || !tender || minor === null || minor === 0 || (tender.needsRef && !ref.trim())}>Take</button>
        </form>
      )}

      <ul data-testid="rows">
        {bill.rows.map(r => (
          <li key={r.paymentId} data-testid={`row-${r.paymentId}`} style={r.void ? { textDecoration: 'line-through' } : undefined}>
            {r.kind} {fmt(r.amount)} {r.tender.label}{r.change ? ` (change ${fmt(r.change)})` : ''}{r.overpaid ? ` (overpaid ${fmt(r.overpaid)})` : ''}
            {!r.void && (
              <select data-testid={`void-${r.paymentId}`} defaultValue="" disabled={busy} onChange={e => { const v = e.target.value; if (v) { e.target.value = ''; void voidRow(r.paymentId, v) } }}>
                <option value="" disabled>void…</option>
                {reasons.map(x => <option key={x} value={x}>{x}</option>)}
              </select>
            )}
          </li>
        ))}
      </ul>

      <form onSubmit={onRefund}>
        <input name="creditNoteId" placeholder="credit note id" data-testid="refund-note" />
        <input name="refundsPaymentId" placeholder="or overpaid payment id" data-testid="refund-row" />
        <input name="amount" inputMode="decimal" placeholder="amount" data-testid="refund-amount" maxLength={13} />
        <select name="tender" data-testid="refund-tender" defaultValue={bill.tenders[0]?.id}>
          {bill.tenders.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
        </select>
        <select name="reason" data-testid="refund-reason" required defaultValue="">
          <option value="" disabled>reason</option>
          {reasons.map(x => <option key={x} value={x}>{x}</option>)}
        </select>
        <input name="note" placeholder="note (optional)" maxLength={200} />
        <button type="submit" data-testid="refund" disabled={busy}>Refund</button>
      </form>

      <p data-testid="pay-msg">{msg}</p>
    </section>
  )
}
