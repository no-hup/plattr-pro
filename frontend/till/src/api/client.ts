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

export async function call<T = unknown>(endpoint: string, body: Record<string, unknown> = {}): Promise<T> {
  const res = await fetch(`${BASE}/${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ data: body }),
  })
  const json = await res.json()
  const out = json.result ?? json
  if (res.ok && out.status !== 'error') return out as T
  const err = json.error ?? out
  const data = err.details?.data ?? err.data ?? {}
  // Ask whenever the server asks, including after a wrong credential (ST-S3: "till asks again").
  // The cashier can cancel; the server locks the account after too many wrong tries, so this cannot loop forever.
  const requires = data.requires as Requires | undefined
  if (requires) {
    const cred = await challenge(requires, data)
    if (cred !== null) return call<T>(endpoint, { ...body, [requires]: cred })
  }
  throw new ApiError(data.code ?? err.code ?? 'unknown', err.message ?? out.message ?? 'Request failed', data)
}
