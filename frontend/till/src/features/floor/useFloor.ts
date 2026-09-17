import { useCallback, useEffect, useRef, useState } from 'react'
import { call, ApiError } from '../../api/client'

// FL · the floor is a picture (R1). This hook owns the picture and nothing else decides from it:
// every act, and the tap itself, goes back to the server. Money on the wire is integer minor
// units (R8); the screen formats and never does arithmetic.

export type TileWord = 'free' | 'seated' | 'ordered' | 'billed' | 'settled'
export interface Tile {
  tableIds: string[]      // document ids: what an act is sent with
  label: string           // what a person reads: "12", or "5+6" for a merged group
  word: TileWord
  onTable: number
  unpaid: number
  drafts: number
  minutes: number
}
export interface FloorConfig { pollSeconds: number; staleAfterSeconds: number; settledFreeAfterMinutes: number }
export interface Draft { draftId: string; onTable: number; lineIds: string[] }
export interface OpenBill { billId: string; payable: number; paid: number; status: string }
export interface Opened { tableIds: string[]; sessionId: string | null; drafts: Draft[]; bills: OpenBill[] }

export const rupees = (minor: number) => `₹${(minor / 100).toFixed(2)}`

const DEFAULTS: FloorConfig = { pollSeconds: 5, staleAfterSeconds: 20, settledFreeAfterMinutes: 30 }

export interface Ctx { restaurantId: string; sessionId: string }

export function useFloor(ctx: Ctx) {
  const [tiles, setTiles] = useState<Tile[]>([])
  const [config, setConfig] = useState<FloorConfig>(DEFAULTS)
  const [at, setAt] = useState(0)          // when the last GOOD answer landed
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [now, setNow] = useState(() => Date.now())
  const live = useRef(true)

  const load = useCallback(async () => {
    try {
      const r = await call<{ data: { tiles: Tile[]; config: FloorConfig; at: number } }>(
        'floor-get', { restaurantId: ctx.restaurantId, staffSessionId: ctx.sessionId },
      )
      if (!live.current) return
      setTiles(r.data.tiles)
      setConfig(r.data.config)
      setAt(Date.now())
      setError('')
    } catch (e) {
      // R19: keep painting the last good answer, greyed, and say so. Never blank the floor and
      // never paint an occupied table as ₹0 — the cashier would skip it.
      if (live.current) setError(e instanceof ApiError ? e.message : 'No connection')
    }
  }, [ctx.restaurantId, ctx.sessionId])

  useEffect(() => {
    live.current = true
    load()
    const poll = setInterval(load, config.pollSeconds * 1000)
    const tick = setInterval(() => setNow(Date.now()), 1000)   // so the grey arrives on its own
    return () => { live.current = false; clearInterval(poll); clearInterval(tick) }
  }, [load, config.pollSeconds])

  // A hung poll is not the same as a poll interval: the answer goes stale on its own clock.
  const stale = at === 0 || now - at > config.staleAfterSeconds * 1000

  async function act<T>(endpoint: string, body: Record<string, unknown>): Promise<T | null> {
    setBusy(true)
    setError('')
    try {
      const r = await call<{ data: T }>(endpoint, { restaurantId: ctx.restaurantId, staffSessionId: ctx.sessionId, ...body })
      await load()
      return r.data
    } catch (e) {
      setError(e instanceof ApiError ? e.message : String(e))
      return null
    } finally {
      setBusy(false)
    }
  }

  const cid = () => `fl_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`

  return {
    tiles, config, error, busy, stale, at,
    reload: load,
    // R1: the tap asks the server what is actually open. The tile never decides.
    open: (tableId: string) => act<Opened>('floor-open', { tableId }),
    merge: (parentTableId: string, childTableIds: string[]) =>
      act('table-setMerge', { parentTableId, childTableIds, merge: true, cid: cid() }),
    unmerge: (parentTableId: string) =>
      act('table-setMerge', { parentTableId, merge: false, cid: cid() }),
    move: (fromTableId: string, toTableId: string) =>
      act('table-moveTable', { fromTableId, toTableId, cid: cid() }),
    clear: (tableId: string) => act('floor-clear', { tableId, cid: cid() }),
  }
}
