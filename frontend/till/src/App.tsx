import { useEffect, useState, type FormEvent } from 'react'
import { call } from './api/client'
import { useSays } from './ui/says'
import { PinPrompt } from './features/approvals/PinPrompt'
import { fetchReasons, useApproval, type LineSnapshot } from './features/approvals/useApproval'
import { BillScreen } from './features/billing/BillScreen'
import { TenderScreen } from './features/payments/TenderScreen'
import { DayCloseScreen } from './features/dayclose/DayCloseScreen'
import { ReconcileScreen } from './features/offline/ReconcileScreen'
import { FloorScreen } from './features/floor/FloorScreen'
import { useOnline } from './features/offline/useOnline'
import { startSync } from './features/offline/sync'

// Screens are picked by the URL: ?r=<restaurantId>&line=<lineId> discounts one line (ST); ?r=&draft=<draftId> shows that draft's bill (BL);
// ?r=&bill=<billId> takes money against an issued bill (PY); ?r=&day=1 (or &day=2026-09-16) counts the drawer and closes the day (DC);
// ?r= alone lands on the floor (FL) — the home screen, since a cashier should not have to type a table number to reach a bill.
// ?r=&reconcile=1 works through the estimates printed while the server was gone (OF).
const q = new URLSearchParams(location.search)
// Dev convenience only: the bare URL lands on Meghana's floor instead of an empty restaurant id,
// and the login arrives filled in. `till@<slug>.test` is a MANAGER — the till bills and approves.
// Kept in step with backend/src-plattr/functions/mock/buildMockData7.js (standardStaff).
const DEV = import.meta.env.DEV
const DEV_LOGIN = { restaurant: 'res_meghana', email: 'till@meg.test', password: '1234' }
const RESTAURANT = q.get('r') ?? (DEV ? DEV_LOGIN.restaurant : '')
const LINE = q.get('line') ?? ''
const DRAFT = q.get('draft') ?? ''
const BILL = q.get('bill') ?? ''
const DAY = q.get('day') ?? ''
const RECONCILE = q.get('reconcile') ?? ''

export default function App() {
  // FL-S29: the role comes back with the login, so the floor can leave Merge and Move off the
  // screen for a SERVER instead of offering a button that always answers 403.
  const [session, setSession] = useState<{ sessionId: string; name: string; role?: string } | null>(null)
  const { say, node: msgNode } = useSays('msg')
  const [reasons, setReasons] = useState<string[]>([])
  const [line, setLine] = useState<LineSnapshot | null>(null)
  const { apply, busy } = useApproval()
  const { offline, since } = useOnline()

  useEffect(() => { if (session) fetchReasons(RESTAURANT, session.sessionId).then(setReasons).catch(() => { /* the bar already said it */ }) }, [session])
  useEffect(() => { if (session) return startSync({ restaurantId: RESTAURANT, sessionId: session.sessionId }) }, [session])   // OF-S20

  async function login(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    try {
      const r = await call<{ data: { sessionId: string; name: string; role?: string } }>('server-serverLogin', { restaurantId: RESTAURANT, username: f.get('email'), password: f.get('password') })
      setSession(r.data)
    } catch (err) { say(`Login failed: ${(err as Error).message}`) }
  }

  async function discount(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!session) return
    const f = new FormData(e.currentTarget)
    say('')
    const next = await apply({
      restaurantId: RESTAURANT, sessionId: session.sessionId, action: 'discount', cid: `till_${Date.now()}`, lineId: LINE,
      amount: Number(f.get('amount')), reason: String(f.get('reason')), note: String(f.get('note') ?? ''),
    })
    // Line money is paise (R9); the till shows rupees.
    if (next) { setLine(next); say(`Applied −₹${(next.discount?.amount ?? 0) / 100} (${next.discount?.pct} %)`) }
  }

  return (
    <main>
      <h1>Till</h1>
      {/* OF-S5: blind, not quiet. The time is the last answer's; the banner leaves on the next one. */}
      {offline && <p data-testid="offline-banner">No connection since {new Date(since).toTimeString().slice(0, 5)}</p>}
      {!session ? (
        <form onSubmit={login}>
          <input name="email" placeholder="email" data-testid="email" defaultValue={DEV ? DEV_LOGIN.email : undefined} /> <input name="password" type="password" placeholder="password" data-testid="password" defaultValue={DEV ? DEV_LOGIN.password : undefined} />
          <button type="submit" data-testid="login">Log in</button>
        </form>
      ) : RECONCILE ? (
        <ReconcileScreen ctx={{ restaurantId: RESTAURANT, sessionId: session.sessionId }} />
      ) : DAY ? (
        <DayCloseScreen ctx={{ restaurantId: RESTAURANT, sessionId: session.sessionId, ...(DAY === '1' ? {} : { businessDate: DAY }) }} />
      ) : BILL ? (
        <TenderScreen ctx={{ restaurantId: RESTAURANT, sessionId: session.sessionId, billId: BILL }} reasons={reasons} />
      ) : DRAFT ? (
        <BillScreen ctx={{ restaurantId: RESTAURANT, sessionId: session.sessionId, draftId: DRAFT }} reasons={reasons} />
      ) : LINE ? (
        <>
          <p>Logged in as {session.name} · line <code>{LINE}</code>{line ? ` · v${line.v}` : ''}</p>
          <form onSubmit={discount}>
            <input name="amount" type="number" step="0.01" min="0.01" placeholder="₹ off" data-testid="amount" required />
            <select name="reason" data-testid="reason" required defaultValue="">
              <option value="" disabled>reason</option>
              {reasons.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
            <input name="note" placeholder="note (optional)" data-testid="note" maxLength={200} />
            <button type="submit" data-testid="apply" disabled={busy || reasons.length === 0}>Apply</button>
          </form>
        </>
      ) : (
        <FloorScreen ctx={{ restaurantId: RESTAURANT, sessionId: session.sessionId }} role={session.role ?? ''} />
      )}
      {/* Every screen below carries its own bar; these two branches have none of their own. */}
      {(!session || LINE) && msgNode}
      <PinPrompt />
    </main>
  )
}
