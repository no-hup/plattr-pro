import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { call } from '../../api/client'
import { useSays } from '../../ui/says'
import { fmt, freshPaymentId, toMinor, type Tender } from './useTender'

// BT / TD-012 · what accounts owe, and collecting it days later. One row per credit take, paid down
// by `payments-collect` on cash or an external tender; the bill it came from is untouched.

export interface Receivable { receivableId: string; party: string; billId: string; amount: number; collectedTotal: number; state: string; businessDate: string }
interface Listing { receivables: Receivable[]; tenders: Tender[] }

export function ReceivablesScreen({ ctx }: { ctx: { restaurantId: string; sessionId: string } }) {
  const [list, setList] = useState<Listing | null>(null)
  const [busy, setBusy] = useState(false)
  const { say, node: msgNode } = useSays('account-msg')

  const load = useCallback(async () => {
    try { const r = await call<{ data: Listing }>('payments-list', { ...ctx, receivables: true }); setList(r.data) } catch { /* ui/says said it */ }
  }, [ctx])
  useEffect(() => { load() }, [load])

  async function onCollect(e: FormEvent<HTMLFormElement>, rec: Receivable) {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    const amount = toMinor(String(f.get('amount') ?? ''))
    if (amount === null || amount === 0) { say('Enter a whole amount, up to two decimals'); return }
    setBusy(true); say('')
    try {
      const r = await call<{ data: { receivable: Receivable; opensDrawer: boolean } }>('payments-collect', {
        ...ctx, paymentId: freshPaymentId(), receivableId: rec.receivableId, tenderId: String(f.get('tender')), amount, ...(String(f.get('ref') ?? '').trim() ? { ref: String(f.get('ref')) } : {}),
      })
      say(r.data.receivable.state === 'collected' ? `${rec.party} settled` : `${rec.party} now owes ${fmt(r.data.receivable.amount - r.data.receivable.collectedTotal)}`)
      await load()
    } catch { /* said */ } finally { setBusy(false) }
  }

  if (!list) return <section data-testid="receivables">{msgNode}</section>
  return (
    <section data-testid="receivables">
      <h2>On account</h2>
      {list.receivables.length === 0 && <p data-testid="receivables-none">Nobody owes anything.</p>}
      <ul>
        {list.receivables.map(rec => (
          <li key={rec.receivableId} data-testid={`receivable-${rec.receivableId}`}>
            <strong>{rec.party}</strong> owes {fmt(rec.amount - rec.collectedTotal)} of {fmt(rec.amount)} · bill {rec.billId} · {rec.businessDate}
            <form onSubmit={e => onCollect(e, rec)}>
              <input name="amount" inputMode="decimal" placeholder="amount" data-testid={`collect-amount-${rec.receivableId}`} maxLength={13} />
              <select name="tender" data-testid={`collect-tender-${rec.receivableId}`} defaultValue={list.tenders[0]?.id}>
                {list.tenders.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
              </select>
              <input name="ref" placeholder="slip / reference" maxLength={64} />
              <button type="submit" data-testid={`collect-${rec.receivableId}`} disabled={busy}>Collect</button>
            </form>
          </li>
        ))}
      </ul>
      {msgNode}
    </section>
  )
}
