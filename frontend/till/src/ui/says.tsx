import { useCallback, useEffect, useState } from 'react'
import { onApiError } from '../api/client'

// The till's one message surface.
//
// Two things were wrong before. Every screen repeated the same four lines to turn an ApiError
// into words, so a screen that forgot them was silent about a refusal the server had explained
// perfectly well. And the words landed in a plain <p> at the foot of the page, which is where a
// cashier never looks — "table 2 has a guest signing in" was on screen and read by nobody.
//
// So: the message comes from the api client's one failure hook, not from a catch per screen, and
// it is painted as a bar across the bottom of the till. A refusal stays until the next thing
// happens, because a message that fades is a message the cashier can miss.

type Kind = 'ok' | 'bad'

export function useSays(testid: string) {
  const [said, setSaid] = useState<{ text: string; kind: Kind }>({ text: '', kind: 'ok' })

  useEffect(() => onApiError(e => setSaid({
    // A challenge the cashier cancelled keeps the server's own words; a plain 403 is a role
    // refusal, and "Not allowed" is the whole of it — there is no PIN that would change it.
    // QB-15: a box cancelled after a wrong or too-early PIN did nothing; its last hint is not the outcome.
    text: e.code === 'permission-denied' && !e.data.requires ? 'Not allowed'
      : e.data.requires && (e.data.wrong || e.data.tooSoon) ? 'PIN required'
      : e.message,
    kind: 'bad',
  })), [])

  const say = useCallback((text: string) => setSaid({ text, kind: 'ok' }), [])

  const node = (
    <p
      data-testid={testid}
      data-kind={said.kind}
      className={said.text ? `says ${said.kind}` : 'says'}
      role={said.kind === 'bad' ? 'alert' : 'status'}
      onClick={() => setSaid({ text: '', kind: 'ok' })}
    >
      {said.text}
    </p>
  )

  return { said: said.text, say, node }
}
