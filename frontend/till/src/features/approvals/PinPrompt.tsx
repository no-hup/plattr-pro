import { useEffect, useRef, useState } from 'react'
import { setChallenge, type Requires } from '../../api/client'

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
  const attemptsLeft = detail.wrong ? (detail.attemptsLeft as number) : null
  const finish = (v: string | null) => { pending.resolve(v); setPending(null); setValue('') }
  return (
    <div role="dialog" aria-label="PIN required" data-testid="pin-prompt" style={{ position: 'fixed', inset: 0, background: '#0006', display: 'grid', placeItems: 'center' }}>
      <form onSubmit={e => { e.preventDefault(); finish(value) }} style={{ background: '#fff', padding: 24, borderRadius: 8, minWidth: 260 }}>
        <h2 style={{ marginTop: 0 }}>Enter your PIN</h2>
        <p data-testid="pin-hint">{attemptsLeft !== null ? `Wrong PIN, ${attemptsLeft} left` : `Needed for this ${String(detail.action ?? 'action')}`}</p>
        <input ref={input} data-testid="pin-input" type="password" inputMode="numeric" autoComplete="off" value={value} onChange={e => setValue(e.target.value)} />
        <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
          <button type="button" data-testid="pin-cancel" onClick={() => finish(null)}>Cancel</button>
          <button type="submit" data-testid="pin-ok" disabled={value === ''}>OK</button>
        </div>
      </form>
    </div>
  )
}
