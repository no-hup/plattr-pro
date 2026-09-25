import { useState } from 'react'
import { useFloor, rupees, type Ctx, type Tile } from './useFloor'
import { useSays } from '../../ui/says'
import { PrintStatus } from '../print/PrintStatus'

// FL · the till's home screen. A cashier glances at it between bills, so a tile says two numbers
// and a word, and nothing needs a tap to be read (FL-S1).
//
// The one rule that shapes the interaction: while an act is being set up, a tap PICKS a table
// instead of opening its money (R13, FL-S23). Without the mode the first tap opens table 5's bill
// and a merge can never be started.

type Mode = null | 'merge' | 'move'
const ACTORS = ['MANAGER', 'ADMIN']

export function FloorScreen({ ctx, role }: { ctx: Ctx; role: string }) {
  const floor = useFloor(ctx)
  const [mode, setMode] = useState<Mode>(null)
  const [picked, setPicked] = useState<string[]>([])
  const { say, node: msgNode } = useSays('floor-msg')

  const mayAct = ACTORS.includes(role)
  const stop = () => { setMode(null); setPicked([]) }

  async function tap(tile: Tile) {
    if (mode) {                                   // FL-S23: picking, not billing
      const id = tile.tableIds[0]
      setPicked(p => (p.includes(id) ? p.filter(x => x !== id) : [...p, id]))
      return
    }
    // R1: ask the server what is open. The tile is up to five seconds old and never routes.
    const r = await floor.open(tile.tableIds[0])
    if (!r) return
    if (r.bills.length === 1 && r.drafts.length === 0) return go({ bill: r.bills[0].billId })
    if (r.drafts.length === 1 && r.bills.length === 0) return go({ draft: r.drafts[0].draftId })
    if (!r.drafts.length && !r.bills.length) return say(`Nothing open at ${tile.label}`)
    say('')                                   // FL-S21: several — the cashier picks, we never guess
    setPicker({ tile, opened: r })
  }

  const [picker, setPicker] = useState<{ tile: Tile; opened: Awaited<ReturnType<typeof floor.open>> } | null>(null)

  function go(q: Record<string, string>) {
    const p = new URLSearchParams(location.search)
    for (const [k, v] of Object.entries(q)) p.set(k, v)
    location.assign(`${location.pathname}?${p.toString()}`)
  }

  // QF-9: a person reads table numbers, never document ids (Decisions 2026-09-18). Ids stay on the wire.
  const labelOf = (id: string) => floor.tiles.find(t => t.tableIds[0] === id)?.label ?? id
  const pickedWords = mode === 'merge'
    ? `keep ${labelOf(picked[0])}${picked.length > 1 ? `, join ${picked.slice(1).map(labelOf).join(', ')}` : ''}`
    : `move ${labelOf(picked[0])}${picked.length > 1 ? ` to ${labelOf(picked[1])}` : ''}`

  async function confirm() {
    if (mode === 'merge' && picked.length >= 2) {
      const [parent, ...children] = picked
      const keeper = labelOf(parent)
      if (await floor.merge(parent, children)) say(`Merged into ${keeper}`)
    }
    if (mode === 'move' && picked.length === 2) {
      if (await floor.move(picked[0], picked[1])) say('Party moved')
    }
    stop()
  }

  const ready = mode === 'merge' ? picked.length >= 2 : picked.length === 2

  const isParcel = (t: Tile) => t.tableIds.some(id => floor.config.takeawayTableIds.includes(id))
  // QF-12: by number, so 2 comes before 10 ("3+9" sorts as 3). The server's order is not a promise.
  const sorted = [...floor.tiles].sort((a, b) => a.label.localeCompare(b.label, undefined, { numeric: true }))
  const tables = sorted.filter(t => !isParcel(t))
  const parcels = sorted.filter(isParcel)
  const tileList = (tiles: Tile[]) => (
    <>
        {tiles.map(t => (
          <li key={t.tableIds.join('+')} data-testid={`tile-${t.label}`} data-word={t.word} data-picked={picked.includes(t.tableIds[0]) || undefined}>
            <button onClick={() => tap(t)} disabled={floor.busy}>
              <strong>{t.label}</strong>
              {/* R11: two numbers on two axes. A billed table still ordering shows both. */}
              {t.unpaid > 0 && <span data-testid={`due-${t.label}`}> {rupees(t.unpaid)} due</span>}
              {/* QF-8 / FL-S20: beside a due amount the second number is "new", or it reads as a correction */}
              {t.onTable > 0 && <span data-testid={`on-${t.label}`}>{t.unpaid > 0 ? ` · ${rupees(t.onTable)} new` : ` ${rupees(t.onTable)}`}</span>}
              {t.drafts > 1 && <span data-testid={`drafts-${t.label}`}> · {t.drafts} drafts</span>}
              {/* QF-13 / FL-S5: seated reads as a word and ₹0, so it never looks like a stuck sign-in */}
              {t.word === 'seated' && <span data-testid={`seated-${t.label}`}> seated · {rupees(0)}</span>}
              {t.word === 'free' ? <span> free</span>
                : t.word === 'holding' ? <span data-testid={`holding-${t.label}`}> signing in</span>
                : t.word === 'reserved' ? <span data-testid={`reserved-${t.label}`}> reserved</span>
                : <span> · {t.minutes} min</span>}
              {t.word === 'settled' && <span data-testid={`settled-${t.label}`}> settled</span>}
            </button>
            {/* FL-S8/S27: unmerge lives on the group's own tile, because that is the thing it acts on. */}
            {mayAct && !mode && t.tableIds.length > 1 && (
              <button data-testid={`unmerge-${t.label}`} onClick={async () => { if (await floor.unmerge(t.tableIds[0])) say('Released') }} disabled={floor.busy || floor.stale}>Unmerge</button>
            )}
            {/* FL-Q1: Clear is the cashier's override; the table also frees itself later. */}
            {mayAct && !mode && t.word === 'settled' && (
              <button data-testid={`clear-${t.label}`} onClick={async () => { if (await floor.clear(t.tableIds[0])) say(`${t.label} cleared`) }} disabled={floor.busy || floor.stale}>Clear</button>
            )}
            {mayAct && !mode && t.onTable + t.unpaid > 0 && (
              <button data-testid={`walkout-${t.label}`} onClick={async () => { if (window.confirm(`Walk out ${t.label}? Its unpaid bill is written off at day close.`) && await floor.walkOut(t.tableIds[0])) say(`${t.label} walked out`) }} disabled={floor.busy || floor.stale}>Walk-out</button>
            )}
          </li>
        ))}
    </>
  )

  return (
    <section data-testid="floor">
      <PrintStatus ctx={ctx} role={role} />   {/* KT-S7/S23: the red line lives on the home screen, where the cashier glances */}
      {/* FL-S15: blind, not quiet. The last good answer stays on screen, greyed, with its time. */}
      {floor.stale && (
        <p data-testid="floor-stale">
          Showing {floor.at ? `the floor as of ${new Date(floor.at).toTimeString().slice(0, 5)}` : 'nothing yet'}
          {floor.error ? ` — ${floor.error}` : ''}
        </p>
      )}

      {mayAct && (
        <div data-testid="floor-actions">
          {!mode ? (
            <>
              <button data-testid="start-merge" onClick={() => setMode('merge')} disabled={floor.stale}>Merge</button>
              <button data-testid="start-move" onClick={() => setMode('move')} disabled={floor.stale}>Move</button>
            </>
          ) : (
            <>
              <span data-testid="picking">
                {mode === 'merge' ? 'Pick the table to keep, then the ones to join it' : 'Pick the party, then the empty table'}
                {picked.length ? ` — ${pickedWords}` : ''}
              </span>
              <button data-testid="confirm-pick" onClick={confirm} disabled={!ready || floor.busy}>Confirm</button>
              <button data-testid="cancel-pick" onClick={stop}>Cancel</button>
            </>
          )}
        </div>
      )}

      {/* BT / OR-3: the counter tickets are table documents too (`ordering.takeawayTableIds`); the floor draws
          them in their own strip so a waiting parcel is seen, and never mistaken for a table (Shaurya 2026-09-23). */}
      <ul data-testid="tiles" className={floor.stale ? 'stale' : ''}>{tileList(tables)}</ul>
      {parcels.length > 0 && (
        <section data-testid="parcels">
          <h3>Parcels</h3>
          <ul data-testid="parcels-list" className={floor.stale ? 'stale' : ''}>{tileList(parcels)}</ul>
        </section>
      )}

      {/* FL-S21: a split has several drafts and one issued bill can sit beside them. Never guess. */}
      {picker && (
        <div data-testid="floor-picker">
          <p>{picker.tile.label} has more than one</p>
          {/* QF-15: numbered, so two drafts of the same amount can be told apart. Dish names are not in floor-open. */}
          {picker.opened?.drafts.map((d, i) => (
            <button key={d.draftId} data-testid={`pick-draft-${d.draftId}`} onClick={() => go({ draft: d.draftId })}>
              Draft {i + 1} · {rupees(d.onTable)} · {d.lineIds.length} {d.lineIds.length === 1 ? 'item' : 'items'}
            </button>
          ))}
          {picker.opened?.bills.map(b => (
            <button key={b.billId} data-testid={`pick-bill-${b.billId}`} onClick={() => go({ bill: b.billId })}>
              {rupees(b.payable - b.paid)} due
            </button>
          ))}
          <button data-testid="pick-cancel" onClick={() => setPicker(null)}>Back</button>
        </div>
      )}

      {msgNode}
    </section>
  )
}
