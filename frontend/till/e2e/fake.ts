import type { Page } from '@playwright/test'

// A faked backend for screen-only tests: every Cloud Function call is answered from a table, so no emulator
// is needed. Use it only where the claim is about what the screen shows or sends; a claim about what the
// backend stores belongs on a real writer (walks.spec.ts) or in the backend suites.

type Reply = { status?: number; body: unknown }
export type Handler = (data: Record<string, unknown>) => Reply
export const ok = (data: unknown): Reply => ({ body: { result: { data } } })
export const refuse = (status: number, message: string, data: Record<string, unknown>): Reply =>
  ({ status, body: { error: { message, status: 'ERR', details: { data } } } })

export const tile = (label: string, extra: Record<string, unknown> = {}) =>
  ({ tableIds: [`tbl_meg_${label}`], label, word: 'free', onTable: 0, unpaid: 0, drafts: 0, minutes: 0, ...extra })
export const floorOf = (tiles: unknown[]) => ok({ tiles, config: { pollSeconds: 5, staleAfterSeconds: 20, settledFreeAfterMinutes: 30, takeawayTableIds: [] }, at: 0 })

/** Fakes every function; returns the bodies each endpoint was sent, so a test can check what the till sent. */
export async function fake(page: Page, handlers: Record<string, Handler>, role = 'MANAGER') {
  const sent: Record<string, Record<string, unknown>[]> = {}
  const all: Record<string, Handler> = {
    'server-serverLogin': () => ok({ sessionId: 'sess_qa', name: 'Till', role }),
    'approvals-config': () => ok({ reasons: ['guest left', 'complaint'] }),
    'print-status': () => ok({ stations: {}, waiting: 0, notAutoPrinted: 0, lastClaimAt: null, silentSeconds: null, at: 0 }),
    ...handlers,
  }
  await page.route(/\/us-central1\/[\w-]+$/, route => {
    const name = route.request().url().split('/').pop()!
    const data = (route.request().postDataJSON() as { data: Record<string, unknown> }).data
    ;(sent[name] ??= []).push(data)
    const r = (all[name] ?? (() => ok({})))(data)
    return route.fulfill({ status: r.status ?? 200, contentType: 'application/json', body: JSON.stringify(r.body) })
  })
  return sent
}

export async function login(page: Page, query = '') {
  await page.goto(`/?r=res_qa${query}`)
  await page.getByTestId('email').fill('till@qa.test')
  await page.getByTestId('password').fill('1234')
  await page.getByTestId('login').click()
}
