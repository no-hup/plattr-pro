// The one door to Cloud Functions. Every call goes through here; nothing else in the till does fetch.
// The credential challenge (backend answers permission-denied + {requires:'pin'|'otp'|'password'})
// is handled here once, not per screen: prompt, then resend the same body plus the credential.
const BASE = import.meta.env.VITE_FUNCTIONS_URL ?? 'http://127.0.0.1:5002/rms-app-dd875/us-central1'

export type Requires = 'pin' | 'otp' | 'password'
export type Challenge = (requires: Requires, detail: Record<string, unknown>) => Promise<string | null>

let challenge: Challenge = async () => null
export function setChallenge(fn: Challenge) { challenge = fn }

export class ApiError extends Error {
  code: string
  data: Record<string, unknown>
  constructor(code: string, message: string, data: Record<string, unknown> = {}) { super(message); this.code = code; this.data = data }
}

// R7 never locks an account, so a server that keeps answering `requires` would re-prompt forever. Ten answered
// challenges per call is the ceiling; the cashier can also press Cancel at any time.
const MAX_CHALLENGES = 10

// OF R5: the till knows it is offline only because a call failed. These two times are the whole fact;
// features/offline reads them and nothing else in the till looks at navigator.onLine.
export const net = { answeredAt: 0, failedAt: 0 }
const listeners = new Set<() => void>()
export function onNet(fn: () => void): () => void { listeners.add(fn); return () => { listeners.delete(fn) } }
function mark(k: 'answeredAt' | 'failedAt') { net[k] = Date.now(); listeners.forEach(f => f()) }

export async function call<T = unknown>(endpoint: string, body: Record<string, unknown> = {}, challenges = 0): Promise<T> {
  let res: Response
  let json: { result?: unknown; error?: { message?: string; code?: string; details?: { data?: Record<string, unknown> }; data?: Record<string, unknown> } } & Record<string, unknown>
  try {
    res = await fetch(`${BASE}/${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: body }),
    })
    json = await res.json()
  } catch (e) {
    mark('failedAt')
    throw new ApiError('unavailable', 'No connection', { cause: String(e) })
  }
  mark('answeredAt')
  const out = (json.result ?? json) as Record<string, unknown> & { status?: string; message?: string }
  if (res.ok && out.status !== 'error') return out as T
  const err = (json.error ?? out) as { message?: string; code?: string; details?: { data?: Record<string, unknown> }; data?: Record<string, unknown> }
  const data = err.details?.data ?? err.data ?? {}
  // Ask whenever the server asks, including after a wrong credential (ST-S3: "till asks again").
  const requires = data.requires as Requires | undefined
  if (requires) {
    if (challenges >= MAX_CHALLENGES) throw new ApiError('too-many-challenges', 'Too many PIN attempts, start again', {})
    const cred = await challenge(requires, data)
    if (cred !== null) return call<T>(endpoint, { ...body, [requires]: cred }, challenges + 1)
  }
  throw new ApiError(String(data.code ?? err.code ?? 'unknown'), err.message ?? out.message ?? 'Request failed', data)
}
