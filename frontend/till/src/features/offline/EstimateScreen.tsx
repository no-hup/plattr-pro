import { useState, type FormEvent } from 'react'
import { fmt, toMinor } from '../payments/useTender'
import { findEstimate, getConfig, getTenders, hhmm, stamp, upsertEstimate, type Estimate } from './cache'

/**
 * OF-S7 · the emergency bill. Shown only while the till is offline (OF-S16). Amount taken and tender come
 * first (R8), then a slip ON SCREEN that says ESTIMATE, carries the cached total and its time, and has no
 * number and no tax split (R3). It is never printed: the printer is driven through the server (KT-D6 as
 * amended 2026-09-22), so the cashier turns the tablet round and the guest photographs it; the real bill
 * prints when the till is back. Nothing here talks to the server (OF-S14); once shown the slip is frozen
 * and a second tap shows it again (OF-S15). A preview older than estimateMaxAgeMinutes is refused (OF-S12).
 */
export function EstimateScreen({ draftId, billId, amountMinor, previewAt }: { draftId?: string; billId?: string; amountMinor: number; previewAt: number }) {
  const key = draftId ? { draftId } : { billId }
  const [est, setEst] = useState<Estimate | null>(() => findEstimate(key))
  const [show, setShow] = useState(false)
  const [msg, setMsg] = useState('')
  const cfg = getConfig()
  const tenders = getTenders()

  function onRecord(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    const taken = toMinor(String(f.get('taken') ?? ''))
    const tender = tenders.find(t => t.id === f.get('tender'))
    if (taken === null || taken === 0 || !tender) { setMsg('Amount taken and tender first'); return }
    if (Date.now() - previewAt > cfg.estimateMaxAgeMinutes * 60_000) { setMsg(`No preview since ${hhmm(previewAt)}, too old: write it by hand`); return }
    const at = Date.now()
    const next: Estimate = { id: `est_${draftId ?? billId}_${stamp(at)}`, ...key, amountMinor, takenMinor: taken, tenderId: tender.id, tenderKind: tender.kind, previewAt, at, synced: false, status: 'open' }
    upsertEstimate(next); setEst(next); setShow(true); setMsg('')
  }

  return (
    <section data-testid="estimate">
      {est ? (
        <button data-testid="reprint" onClick={() => setShow(true)}>Show estimate again {fmt(est.amountMinor)}</button>
      ) : (
        <form onSubmit={onRecord} data-testid="estimate-form">
          <input name="taken" data-testid="est-taken" inputMode="decimal" placeholder="₹ taken" />
          <select name="tender" data-testid="est-tender" defaultValue="">
            <option value="" disabled>tender</option>
            {tenders.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
          </select>
          <button type="submit" data-testid="est-print">Show estimate</button>
        </form>
      )}
      {est && show && (
        <div data-testid="estimate-print">
          <p data-testid="est-text">{cfg.estimateText}</p>
          <p data-testid="est-amount">{fmt(est.amountMinor)}</p>
          <p data-testid="est-asof">as of {hhmm(est.previewAt)}</p>
          <p>{est.tenderId} {fmt(est.takenMinor)} taken {hhmm(est.at)}</p>
        </div>
      )}
      <p data-testid="est-msg">{msg}</p>
    </section>
  )
}
