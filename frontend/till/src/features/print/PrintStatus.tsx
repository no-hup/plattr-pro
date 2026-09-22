import { useState } from 'react'
import { usePrintStatus, type Ctx } from './usePrintStatus'

// KT · the red line on the floor: which printer, how many tickets, and one button to force a stale ticket
// through (KT-S7, S23). Nothing here prints; the kitchen tablet does. Empty when nothing is stuck.

export function PrintStatus({ ctx, role }: { ctx: Ctx; role: string }) {
  const p = usePrintStatus(ctx)
  const [jobId, setJobId] = useState('')
  const [msg, setMsg] = useState('')
  const mayAct = ['MANAGER', 'ADMIN'].includes(role)
  if (!p.lines.length && !p.error) return null
  return (
    <section data-testid="print-status" className="print-status">
      {p.lines.map((l, i) => <p key={i} data-testid="print-line" className="red">{l}</p>)}
      {p.error && <p data-testid="print-error">{p.error}</p>}
      {mayAct && p.status.notAutoPrinted > 0 && (
        <form data-testid="print-retry" onSubmit={async e => { e.preventDefault(); if (!jobId) return; const r = await p.act({ jobId }); setMsg(r ? `Queued ${jobId}` : ''); setJobId('') }}>
          <input data-testid="retry-job" value={jobId} onChange={e => setJobId(e.target.value)} placeholder="ticket job id" />
          <button type="submit" data-testid="retry" disabled={p.busy || !jobId}>Retry</button>
        </form>
      )}
      {msg && <p data-testid="print-msg">{msg}</p>}
    </section>
  )
}
