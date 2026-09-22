// KT · the vendor adapter: Ticket → ESC/POS bytes. Sheet: moonshot/SPEC_KT_print_path.md v4, KT-2.
//
// The only file that knows what a thermal printer eats. No dependency: the whole protocol we use is eight
// constants. Rows arrive from the domain already padded to the station's width, so this file does no column
// arithmetic; it strips the padding again, because a printer centres or right-aligns text itself (ESC a) and a
// row padded to the full width would centre as a full-width row.
//
// Every code point above 0x7F becomes '?' (KT-D5, KT-S21): standard code pages have no rupee glyph, and a
// multi-byte character sent as its low byte is a control code — U+0915 'क' is 0x15 (NAK) — never that.

import { Ticket } from '../../domain/kot';

const ESC = 0x1b, GS = 0x1d, LF = 0x0a;
export const INIT = [ESC, 0x40];                       // ESC @   reset (also resets the code page, so it goes FIRST)
export const CODEPAGE = (n: number) => [ESC, 0x74, n]; // ESC t n
export const ALIGN = (a: 'l' | 'c' | 'r') => [ESC, 0x61, a === 'c' ? 1 : a === 'r' ? 2 : 0];   // ESC a n
export const BOLD = (on: boolean) => [ESC, 0x45, on ? 1 : 0];                                    // ESC E n
export const BIG = (on: boolean) => [GS, 0x21, on ? 0x11 : 0x00];                                // GS ! n  (double width + height)
export const FEED = (n: number) => [ESC, 0x64, n];                                                // ESC d n  feed n lines before the blade
export const CUT = [GS, 0x56, 0x42, 0x00];                                                       // GS V B 0  partial cut
/** ESC p 0 t1 t2 — pulse on pin 2 for t1×2 ms, off for t2×2 ms. drawerPulseMs 50 → t1 = 25 = 0x19. */
export const DRAWER = (pulseMs: number) => [ESC, 0x70, 0x00, Math.min(255, Math.max(1, Math.round(pulseMs / 2))), 0xfa];

export const FEED_BEFORE_CUT = 3;   // the last lines sit under the head; three feeds put them past the blade

/** Text → bytes: ASCII as-is, anything else '?'. Control characters were already stripped by the domain. */
export function textBytes(s: string): number[] {
  const out: number[] = [];
  for (const ch of s) { const c = ch.codePointAt(0) as number; out.push(c >= 0x20 && c <= 0x7e ? c : 0x3f); }
  return out;
}

export interface EncoderConfig { codePage: number; drawerPulseMs: number }

/**
 * One ticket → one byte string, copies included. Order matters: INIT first (it resets the code page), then the
 * code page, then the rows, then feed, cut, drawer. A drawer ticket has no rows and just pulses.
 */
export function encode(t: Ticket, cfg: EncoderConfig): Uint8Array {
  const b: number[] = [...INIT, ...CODEPAGE(cfg.codePage)];
  for (let copy = 0; copy < Math.max(1, t.copies); copy++) {
    for (const r of t.rows) {
      const align = r.align ?? 'l';
      b.push(...ALIGN(align));
      if (r.bold) b.push(...BOLD(true));
      if (r.big) b.push(...BIG(true));
      b.push(...textBytes(r.text.replace(/\s+$/, '')), LF);
      if (r.big) b.push(...BIG(false));
      if (r.bold) b.push(...BOLD(false));
    }
    if (t.rows.length) b.push(...ALIGN('l'));
    if (t.cut) b.push(...FEED(FEED_BEFORE_CUT), ...CUT);
  }
  if (t.drawer) b.push(...DRAWER(cfg.drawerPulseMs));
  return Uint8Array.from(b);
}
