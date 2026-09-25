import { useEffect, useState, type FormEvent } from 'react'
import { useSays } from '../../ui/says'
import { fmt, toMinor, useTender, type Ctx, type Tender } from './useTender'
import { EstimateScreen } from '../offline/EstimateScreen'
import { getBill } from '../offline/cache'
import { useOnline } from '../offline/useOnline'

// PY · the tender screen for one issued bill. The server owns every number: this screen shows
// the outstanding it was told, previews change for cash, and sends integers. Drawer hardware is
// KT's; here `opensDrawer` from the response flips a visible signal the browser test can assert.

export function TenderScreen({ ctx, reasons }: { ctx: Ctx; reasons: string[] }) {
  const { bill, busy, last, asOf, take, refund, voidRow, edit } = useTender(ctx)
  const { offline } = useOnline()
  const [tender, setTender] = useState<Tender | null>(null)
  const [text, setText] = useState('')
  const [ref, setRef] = useState('')
  const [tipText, setTipText] = useState('')   // BT: the tip, typed; never derived from the change
  const [captured, setCaptured] = useState(false)
  const { say, node: msgNode } = useSays('pay-msg')
  const [drawer, setDrawer] = useState(false)

  useEffect(() => { if (bill && !tender) setTender(bill.tenders[0] ?? null) }, [bill, tender])
  useEffect(() => {
    if (!last) return
    setDrawer(last.opensDrawer)
    if (last.retry) say('Already recorded')
    else if (last.row.void) say('Voided')          // a voided row keeps its kind, so check the void block first
    else if (last.row.kind === 'take') say(last.row.change ? `Change ${fmt(last.row.change)}` : last.row.overpaid ? `Overpaid ${fmt(last.row.overpaid)}, recorded` : 'Recorded')
    else say('Refunded')
    setText(''); setRef(''); setTipText('')
  }, [last])

  const minor = toMinor(text)
  const tip = tipText.trim() === '' ? 0 : toMinor(tipText)
  const outstanding = bill?.outstanding ?? 0
  // BT: on cash the tip comes out of what was handed over, so the change previewed is tendered − tip − outstanding.
  const change = tender?.kind === 'cash' && minor !== null && tip !== null && minor - tip > outstanding ? minor - tip - outstanding : 0
  const settled = !!bill && bill.status === 'paid'
  // The figure on screen was answered before the cut (asOf null) or read from the cache after it: its time either way.
  const cachedAt = asOf ?? getBill(ctx.billId)?.at ?? null

  async function onTake(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!tender || minor === null || tip === null) { say('Enter a whole amount, up to two decimals'); return }
    say('')
    await take(tender, minor, { ref: ref || undefined, captured, tip: tip || undefined })
  }
  // DECISION(D2, 2026-09-25): Edit lives on the till only; the waiter app has no bill powers. See moonshot/reviews/2026-09-25-decisions-for-shaurya.md. If you change this, ask Shaurya first.
  // 22:10 table 12 orders two gulab jamun on a printed ₹4,800 bill: Edit cancels it as "edited" and opens its draft.
  // With money on it the server refuses and names the bill (D3); the message says so on this screen.
  async function onEdit() {
    say('')
    const r = await edit()
    if (r) location.assign(`?r=${encodeURIComponent(ctx.restaurantId)}&draft=${encodeURIComponent(r.draftId)}`)
  }
  async function onRefund(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    const m = toMinor(String(f.get('amount') ?? ''))
    if (m === null) { say('Enter a whole amount, up to two decimals'); return }
    say('')
    const note = String(f.get('creditNoteId') ?? '').trim()
    const row = String(f.get('refundsPaymentId') ?? '').trim()
    await refund(String(f.get('tender')), m, note ? { creditNoteId: note } : { refundsPaymentId: row }, String(f.get('reason')), String(f.get('note') ?? ''))
  }

  if (!bill) return <>{msgNode}<p>Loading bill…</p></>
  return (
    <section>
      <p>
        Bill <code>{bill.billId}</code> · payable {fmt(bill.payable)} · paid {fmt(bill.paidTotal)} ·{' '}
        <strong data-testid="outstanding">{settled ? 'settled' : bill.status === 'walkedOut' ? `walked out · ${fmt(outstanding)} unpaid` : `outstanding ${fmt(outstanding)}`}</strong>
        <span data-testid="status"> [{bill.status}]</span>
      </p>
      <p data-testid="drawer" hidden={!drawer}>DRAWER OPEN</p>
      {bill.status === 'issued' && !offline && <p><button data-testid="edit-bill" onClick={onEdit} disabled={busy}>Edit bill</button></p>}
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
          {tender?.needsRef && <input name="ref" placeholder={tender.kind === 'credit' ? 'account name (who owes)' : 'slip / reference'} value={ref} onChange={e => setRef(e.target.value)} data-testid="ref" maxLength={64} />}
          <input name="tip" inputMode="decimal" placeholder="tip (optional)" value={tipText} onChange={e => setTipText(e.target.value)} data-testid="tip" maxLength={13} />
          {tender?.kind === 'external' && (
            <label><input type="checkbox" checked={captured} onChange={e => setCaptured(e.target.checked)} data-testid="captured" /> money already received</label>
          )}
          <button type="submit" data-testid="take" disabled={busy || !tender || minor === null || minor === 0 || tip === null || (tender.needsRef && !ref.trim())}>{tender?.kind === 'credit' ? 'Put on account' : 'Take'}</button>
        </form>
      )}

      <ul data-testid="rows">
        {bill.rows.map(r => (
          <li key={r.paymentId} data-testid={`row-${r.paymentId}`} style={r.void ? { textDecoration: 'line-through' } : undefined}>
            {r.kind} {fmt(r.amount)} {r.tender.label}{r.ref && r.tender.kind === 'credit' ? ` · ${r.ref}` : ''}{r.change ? ` (change ${fmt(r.change)})` : ''}{r.overpaid ? ` (overpaid ${fmt(r.overpaid)})` : ''}{r.tip ? ` (tip ${fmt(r.tip)})` : ''}{r.receivableId ? ' (collected on account)' : ''}
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

      {msgNode}
    </section>
  )
}
