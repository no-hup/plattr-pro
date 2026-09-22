// KT-2 · the encoder, against hand-written byte arrays. No printer, no socket, no dependency.

import { encode, textBytes, DRAWER } from './escpos';
import { Ticket } from '../../domain/kot';

const A = (s: string) => [...s].map(c => c.charCodeAt(0));
const hex = (u: Uint8Array) => [...u].map(x => x.toString(16).padStart(2, '0')).join(' ');
const ticket = (over: Partial<Ticket> = {}): Ticket => ({ kind: 'kot', stationId: 'kitchen', charsPerLine: 48, copies: 1, rows: [], cut: true, drawer: false, ...over });

describe('the byte string of a ticket (KT-S13, KT-S17, KT-S21)', () => {
  it('KT-S1 one plain row: ESC @, ESC t 0, ESC a 0, text, LF, ESC a 0, ESC d 3, GS V B 0 — in that order', () => {
    const u = encode(ticket({ rows: [{ text: '1 x Butter Naan'.padEnd(48) }] }), { codePage: 0, drawerPulseMs: 50 });
    expect([...u]).toEqual([
      0x1b, 0x40,            // ESC @  init FIRST
      0x1b, 0x74, 0x00,      // ESC t 0  code page AFTER init, because init resets it
      0x1b, 0x61, 0x00,      // ESC a 0  left
      ...A('1 x Butter Naan'), 0x0a,
      0x1b, 0x61, 0x00,      // back to left before the cut
      0x1b, 0x64, 0x03,      // feed 3 so the last lines clear the blade
      0x1d, 0x56, 0x42, 0x00,   // partial cut
    ]);
  });

  it('the code page is emitted after init, never before: "1b 40 1b 74 10" for codePage 16, and the reverse never appears', () => {
    const h = hex(encode(ticket({ rows: [{ text: 'x' }] }), { codePage: 16, drawerPulseMs: 50 }));
    expect(h.startsWith('1b 40 1b 74 10')).toBe(true);
    expect(h).not.toMatch(/1b 74 10 1b 40/);
  });

  it('KT-S13 a big row: GS ! 0x11 before the text and GS ! 0x00 after it; a bold row wraps in ESC E 1 / ESC E 0', () => {
    const u = encode(ticket({ rows: [{ text: '    ! no onion'.padEnd(48), big: true }, { text: '1 x Paneer Tikka'.padEnd(48), bold: true }], cut: false }), { codePage: 0, drawerPulseMs: 50 });
    expect(hex(u)).toBe([
      '1b 40 1b 74 00',
      '1b 61 00', '1d 21 11', hex(Uint8Array.from(A('    ! no onion'))), '0a', '1d 21 00',
      '1b 61 00', '1b 45 01', hex(Uint8Array.from(A('1 x Paneer Tikka'))), '0a', '1b 45 00',
      '1b 61 00',
    ].join(' '));
  });

  it('a centred row strips its padding and uses ESC a 1; a right row ESC a 2', () => {
    const u = encode(ticket({ rows: [{ text: 'TABLE 7'.padEnd(48), align: 'c' }, { text: 'x'.padStart(48), align: 'r' }], cut: false }), { codePage: 0, drawerPulseMs: 50 });
    expect(hex(u)).toBe(['1b 40 1b 74 00', '1b 61 01', hex(Uint8Array.from(A('TABLE 7'))), '0a', '1b 61 02', hex(Uint8Array.from(A(' '.repeat(47) + 'x'))), '0a', '1b 61 00'].join(' '));
  });

  it('a two-column row keeps its internal spaces: the right column ends exactly at the width', () => {
    const row = 'TOTAL' + ' '.repeat(48 - 5 - 12) + 'Rs. 1,580.00';
    const u = encode(ticket({ rows: [{ text: row }], cut: false }), { codePage: 0, drawerPulseMs: 50 });
    expect([...u].slice(8, 8 + 48)).toEqual(A(row));
  });

  it('KT-S21 every code point above 0x7F is "?": क (U+0915) is 0x3f, never its low byte 0x15 (NAK); ₹ and é too', () => {
    expect(textBytes('क')).toEqual([0x3f]);
    expect(textBytes('₹1')).toEqual([0x3f, 0x31]);
    expect(textBytes('café')).toEqual([...A('caf'), 0x3f]);
    expect(textBytes('Rs. 1,02,450.00')).toEqual(A('Rs. 1,02,450.00'));
    const u = encode(ticket({ rows: [{ text: 'पनीर टिक्का' }], cut: false }), { codePage: 0, drawerPulseMs: 50 });
    expect([...u]).not.toContain(0x15);
    expect([...u].filter(x => x === 0x3f)).toHaveLength([...'पनीर टिक्का'].length - 1);   // every char but the space
  });

  it('a stray control byte in a row (should never reach here) is also "?", so no byte on the wire is an accident', () => {
    expect(textBytes('a\x1bEb')).toEqual([0x61, 0x3f, 0x45, 0x62]);
    expect(textBytes('\t')).toEqual([0x3f]);
  });

  it('KT-S17 the drawer: ESC p 0 t1 t2 with t1 = 50 ms / 2 = 25 = 0x19 and t2 = 0xfa; a drawer ticket has no text and no cut', () => {
    expect(DRAWER(50)).toEqual([0x1b, 0x70, 0x00, 0x19, 0xfa]);
    const u = encode(ticket({ kind: 'drawer', rows: [], cut: false, drawer: true }), { codePage: 0, drawerPulseMs: 50 });
    expect([...u]).toEqual([0x1b, 0x40, 0x1b, 0x74, 0x00, 0x1b, 0x70, 0x00, 0x19, 0xfa]);
  });

  it('the pulse is clamped: 1 ms → t1 1, 1000 ms → t1 255; 25 ms → t1 13 (the sheet\'s old default, weaker than 0x19)', () => {
    expect(DRAWER(1)[3]).toBe(1);
    expect(DRAWER(1000)[3]).toBe(255);
    expect(DRAWER(25)[3]).toBe(13);
  });

  it('a bill with drawer:true kicks AFTER the cut, once, even with two copies', () => {
    const u = hex(encode(ticket({ kind: 'bill', rows: [{ text: 'x' }], copies: 2, cut: true, drawer: true }), { codePage: 0, drawerPulseMs: 50 }));
    expect(u.endsWith('1d 56 42 00 1b 70 00 19 fa')).toBe(true);
    expect(u.match(/1b 70 00/g)).toHaveLength(1);
  });

  it('copies 2 prints the rows and cuts twice: two LF+cut sequences, one init', () => {
    const u = hex(encode(ticket({ rows: [{ text: 'x' }], copies: 2 }), { codePage: 0, drawerPulseMs: 50 }));
    expect(u.match(/1d 56 42 00/g)).toHaveLength(2);
    expect(u.match(/1b 40/g)).toHaveLength(1);
    expect(u.match(/78 0a/g)).toHaveLength(2);
  });

  it('cut:false (a screen-only or continuous station) emits no feed and no cut', () => {
    const u = hex(encode(ticket({ rows: [{ text: 'x' }], cut: false }), { codePage: 0, drawerPulseMs: 50 }));
    expect(u).not.toMatch(/1d 56 42 00|1b 64/);
  });

  it('an empty row is a bare LF (a blank line on paper), not nothing', () => {
    const u = encode(ticket({ rows: [{ text: ' '.repeat(48) }], cut: false }), { codePage: 0, drawerPulseMs: 50 });
    expect([...u].slice(5)).toEqual([0x1b, 0x61, 0x00, 0x0a, 0x1b, 0x61, 0x00]);
  });

  it('a 25-item ticket is well under a cheap printer\'s 4 KB buffer: 25 rows of 48 chars ≈ 1.4 KB', () => {
    const rows = Array.from({ length: 25 }, (_, i) => ({ text: `${i + 1} x Item number ${i + 1}`.padEnd(48), bold: true }));
    expect(encode(ticket({ rows }), { codePage: 0, drawerPulseMs: 50 }).length).toBeLessThan(4096);
  });
});
