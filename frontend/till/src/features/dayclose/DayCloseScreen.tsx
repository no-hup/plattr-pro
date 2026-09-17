import { useEffect, useState, type FormEvent } from 'react'
import { fmt, toMinor, useDayClose, type Ctx } from './useDayClose'
import { getConfig, openEstimates } from '../offline/cache'

/**
 * DC on one screen: what the day took by tender, the drawer movements, and the count.
 * While the day is open and blindCount is on, the server sends no cash figure and this screen
 * therefore cannot show one — the cashier counts first and sees the difference afterwards.
 */
export function DayCloseScreen({ ctx }: { ctx: Ctx }) {
  const { day, busy, error, load, move, close } = useDayClose(ctx)
  const [msg, setMsg] = useState('')
  useEffect(() => { load() }, [])   // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (error) setMsg(error.code === 'permission-denied' && !error.data.requires ? 'Not allowed' : error.message) }, [error])

  async function onMove(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget          // React clears currentTarget across the await; keep the node
    const f = new FormData(form)
    const amount = toMinor(String(f.get('amount') ?? ''))
    if (amount === null || amount === 0) { setMsg('Type an amount like 1200.00'); return }
    setMsg('')
    const r = await move(f.get('kind') as 'float' | 'in' | 'out', amount, String(f.get('reason')), String(f.get('note') ?? ''))
    if (r) { setMsg(`Drawer: ${fmt(amount)} recorded`); form.reset() }
  }

  async function onClose(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    const counted = toMinor(String(f.get('counted') ?? ''))
    if (counted === null) { setMsg('Type what you counted, like 13166.00'); return }
    const leftText = String(f.get('left') ?? '').trim()
    setMsg('')
    const doc = await close(counted, leftText === '' ? null : toMinor(leftText), String(f.get('note') ?? ''))
    if (doc) setMsg(doc.difference === 0 ? 'Day closed, drawer exact' : `Day closed, ${doc.difference < 0 ? 'short' : 'over'} ${fmt(Math.abs(doc.difference))}`)
  }

  if (!day) return <section data-testid="dayclose"><p data-testid="day-msg">{msg || 'Loading…'}</p></section>
  const blocked = day.floor.issuedBills + day.floor.unbilledItems
  // OF R6 / OF-S10: an estimate still open on this till means cash the server has not seen. The server's own
  // gate (unbilled lines, DC R5) holds regardless; this one is the till's, and offline.reconcileBeforeClose turns it off.
  const estimates = getConfig().reconcileBeforeClose ? openEstimates().length : 0

  return (
    <section data-testid="dayclose">
      <h2>Day close <span data-testid="day-date">{day.businessDate}</span> {day.closed ? <strong data-testid="day-closed">closed</strong> : <em>open</em>}</h2>

      {!day.previousDayClosed && !day.closed && <p data-testid="day-prev-open">Yesterday was never closed.</p>}
      {day.previousClose && (
        <p data-testid="day-prev">Last close {day.previousClose.businessDate}: counted {fmt(day.previousClose.countedCash)}
          {day.previousClose.leftInDrawer !== null ? `, left in the drawer ${fmt(day.previousClose.leftInDrawer)}` : ''}</p>
      )}

      <table><tbody>
        {day.byTender.map(t => (
          <tr key={t.tenderId} data-testid={`tender-${t.tenderId}`}>
            <td>{t.label}</td><td>{fmt(t.net)}</td><td>{t.overpaid ? `over ${fmt(t.overpaid)}` : ''}</td>
            <td>{t.counted !== undefined ? `counted ${fmt(t.counted)} (${fmt(t.difference ?? 0)})` : ''}</td>
          </tr>
        ))}
      </tbody></table>

      {day.closed ? (
        <p data-testid="day-result">
          Expected {fmt(day.expectedCash ?? 0)} · counted {fmt(day.countedCash ?? 0)} ·{' '}
          <strong>{(day.difference ?? 0) === 0 ? 'exact' : `${(day.difference ?? 0) < 0 ? 'short' : 'over'} ${fmt(Math.abs(day.difference ?? 0))}`}</strong>
          {day.leftInDrawer !== null && day.leftInDrawer !== undefined ? ` · left in the drawer ${fmt(day.leftInDrawer)}` : ''}
        </p>
      ) : (
        <>
          {day.expectedCash !== undefined && <p data-testid="day-expected">Drawer should hold {fmt(day.expectedCash)}</p>}
          {blocked > 0 && (
            <p data-testid="day-floor">
              Still on the floor: {day.floor.issuedBills} unpaid bill(s), {day.floor.unbilledItems} item(s) not on a bill. The day cannot close yet.
            </p>
          )}
          <form onSubmit={onMove} data-testid="day-move-form">
            <select name="kind" data-testid="move-kind" defaultValue="out">
              <option value="float">Opening float</option><option value="in">Cash in</option><option value="out">Cash out</option>
            </select>
            <input name="amount" data-testid="move-amount" inputMode="decimal" placeholder="₹ amount" />
            <select name="reason" data-testid="move-reason" required defaultValue="">
              <option value="" disabled>reason</option>
              {day.reasons.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
            <input name="note" data-testid="move-note" placeholder="note" maxLength={120} />
            <button type="submit" data-testid="move" disabled={busy}>Record drawer movement</button>
          </form>

          {estimates > 0 && <p data-testid="day-estimates">reconcile {estimates} estimate{estimates === 1 ? '' : 's'} first</p>}
          {estimates === 0 && <form onSubmit={onClose} data-testid="day-close-form">
            <input name="counted" data-testid="counted" inputMode="decimal" placeholder="₹ counted in the drawer" required />
            <input name="left" data-testid="left" inputMode="decimal" placeholder="₹ left for the morning" />
            <input name="note" data-testid="close-note" placeholder="note" maxLength={200} />
            <button type="submit" data-testid="close-day" disabled={busy}>Close the day</button>
          </form>}
        </>
      )}

      {day.movements && day.movements.length > 0 && (
        <ul data-testid="day-movements">
          {day.movements.map(m => <li key={m.movementId} data-testid="movement">{m.kind} {fmt(m.amount)} · {m.reason}{m.void ? ' · VOIDED' : ''}</li>)}
        </ul>
      )}
      <p data-testid="day-msg">{msg}</p>
    </section>
  )
}
