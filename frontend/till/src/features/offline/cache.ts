// OF R7 · what the till keeps in localStorage: the last preview per draft, the last tender state per bill, the
// config, and the estimates it printed with no server. Every read and write is wrapped: storage may be gone.
import type { Bill } from '../billing/useBill'
import type { BillState, Tender } from '../payments/useTender'

export interface OfflineConfig { staleAfterSeconds: number; estimateMaxAgeMinutes: number; estimateText: string; reconcileBeforeClose: boolean }
export const OFFLINE_DEFAULTS: OfflineConfig = { staleAfterSeconds: 15, estimateMaxAgeMinutes: 240, estimateText: 'ESTIMATE, not a tax invoice. A tax invoice will be issued.', reconcileBeforeClose: true }

/** One printed slip. `amountMinor` is what the slip says (the cached figure); `takenMinor` and `tenderId` are what the cashier took. */
export interface Estimate {
  id: string                       // est_<draftId|billId>_<yyyymmddThhmm>: the audit cid on the server (OF-S20)
  draftId?: string; billId?: string
  amountMinor: number; takenMinor: number; tenderId: string; tenderKind: 'cash' | 'external' | 'credit'
  previewAt: number; at: number
  synced: boolean                  // OF-S20: sent through approvals-apply on the first answered call
  issuedBillId?: string; paymentId?: string   // OF-S18: remembered between the steps so a retry resumes
  status: 'open' | 'done'
}
interface Store {
  previews: Record<string, { bill: Bill; at: number }>
  bills: Record<string, { bill: BillState; at: number }>
  tenders: Tender[]
  estimates: Estimate[]
  config: OfflineConfig
}
const KEY = 'till.offline'
const EMPTY: Store = { previews: {}, bills: {}, tenders: [], estimates: [], config: OFFLINE_DEFAULTS }

function load(): Store {
  try { const raw = localStorage.getItem(KEY); if (raw) return { ...EMPTY, ...(JSON.parse(raw) as Partial<Store>) } } catch { /* corrupt or unavailable: start empty */ }
  return { ...EMPTY }
}
function save(fn: (s: Store) => void) { const s = load(); fn(s); try { localStorage.setItem(KEY, JSON.stringify(s)) } catch { /* ignore */ } }

export const getConfig = () => load().config
export const putConfig = (c: OfflineConfig) => save(s => { s.config = c })
export const getPreview = (draftId: string) => load().previews[draftId] ?? null
export const putPreview = (draftId: string, bill: Bill) => save(s => { s.previews[draftId] = { bill, at: Date.now() } })
export const getBill = (billId: string) => load().bills[billId] ?? null
export const putBill = (billId: string, bill: BillState) => save(s => { s.bills[billId] = { bill, at: Date.now() }; if (bill.tenders?.length) s.tenders = bill.tenders })
export const getTenders = (): Tender[] => load().tenders.length ? load().tenders : [{ id: 'cash', label: 'Cash', kind: 'cash', opensDrawer: true, needsRef: false }, { id: 'upi', label: 'UPI', kind: 'external', opensDrawer: false, needsRef: true }]
export const estimates = () => load().estimates
export const openEstimates = () => estimates().filter(e => e.status === 'open')
export const findEstimate = (key: { draftId?: string; billId?: string }) =>
  openEstimates().find(e => (key.draftId && e.draftId === key.draftId) || (key.billId && e.billId === key.billId)) ?? null
export const upsertEstimate = (e: Estimate) => save(s => { const i = s.estimates.findIndex(x => x.id === e.id); if (i >= 0) s.estimates[i] = e; else s.estimates.push(e) })

export const hhmm = (t: number) => new Date(t).toTimeString().slice(0, 5)
/** Local yyyymmddThhmm, the estimate's own time on the audit cid and the payment ref. */
export function stamp(t: number): string {
  const d = new Date(t), p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}T${p(d.getHours())}${p(d.getMinutes())}`
}
