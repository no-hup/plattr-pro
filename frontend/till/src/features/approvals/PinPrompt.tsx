import { useEffect, useRef, useState } from 'react'
import { setChallenge, type Requires } from '../../api/client'

// QF-14: the box says what the PIN is for in words. Keys are the backend's approval actions (domain/approvals.ts).
const FOR: Record<string, string> = {
  discount: 'a discount on this line', billDiscount: 'a discount on the bill', removeOffer: 'removing the offer',
  void: 'voiding an item', reprint: 'a reprint', drawer: 'a drawer entry', cancelBill: 'cancelling the bill',
  creditNote: 'a credit note', estimate: 'an estimate', releaseUnpaid: 'freeing a table that still owes',
}

interface Pending { requires: Requires; detail: Record<string, unknown>; resolve: (v: string | null) => void }

/** Mount once. Registers itself as the client's challenge handler and renders the box when the server asks. */
export function PinPrompt() {
  const [pending, setPending] = useState<Pending | null>(null)
  const [value, setValue] = useState('')
  const input = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setChallenge((requires, detail) => new Promise<string | null>(resolve => setPending({ requires, detail, resolve })))
    return () => setChallenge(async () => null)
  }, [])
  useEffect(() => { if (pending) { setValue(''); input.current?.focus() } }, [pending])

  if (!pending) return null
  const { detail } = pending
  const waitS = typeof detail.retryAfter === 'number' ? Math.max(1, Math.ceil((detail.retryAfter - Date.now()) / 1000)) : null
  const hint = detail.tooSoon ? `Too soon, wait ${waitS} s`
    : detail.wrong && waitS !== null ? `Wrong PIN, wait ${waitS} s`
    : detail.wrong ? `Wrong PIN, ${detail.attemptsLeft as number} left`
    : FOR[String(detail.action)] ? `Needed for ${FOR[String(detail.action)]}` : 'Needed to go ahead'
  const finish = (v: string | null) => { pending.resolve(v); setPending(null); setValue('') }
  return (
    <div role="dialog" aria-label="PIN required" data-testid="pin-prompt" style={{ position: 'fixed', inset: 0, background: '#0006', display: 'grid', placeItems: 'center' }}>
      <form onSubmit={e => { e.preventDefault(); finish(value) }} style={{ background: '#fff', padding: 24, borderRadius: 8, minWidth: 260 }}>
        <h2 style={{ marginTop: 0 }}>Enter your PIN</h2>
        <p data-testid="pin-hint">{hint}</p>
        <input ref={input} data-testid="pin-input" type="password" inputMode="numeric" autoComplete="off" value={value} onChange={e => setValue(e.target.value)} />
        <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
          <button type="button" data-testid="pin-cancel" onClick={() => finish(null)}>Cancel</button>
          <button type="submit" data-testid="pin-ok" disabled={value === ''}>OK</button>
        </div>
      </form>
    </div>
  )
}
