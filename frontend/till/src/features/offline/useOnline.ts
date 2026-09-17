import { useEffect, useReducer } from 'react'
import { net, onNet } from '../../api/client'
import { getConfig } from './cache'

/**
 * OF R5. "Offline" is a fact the till observed, never a guess: the last call FAILED and the last answer is
 * older than staleAfterSeconds. A slow call in flight is neither, so nothing here reacts to it (OF-S16).
 */
export function useOnline() {
  const [, tick] = useReducer((x: number) => x + 1, 0)
  useEffect(() => onNet(tick), [])
  useEffect(() => { const t = setInterval(tick, 1000); return () => clearInterval(t) }, [])
  const cfg = getConfig()
  const offline = net.failedAt > net.answeredAt && Date.now() - net.answeredAt > cfg.staleAfterSeconds * 1000
  return { offline, since: net.answeredAt }
}
