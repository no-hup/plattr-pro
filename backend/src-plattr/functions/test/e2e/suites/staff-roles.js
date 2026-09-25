/**
 * Suite: staff-roles. TD-139 (QA2-3, moonshot/reviews/2026-09-25-qa-admin-app.md), Shaurya 2026-09-26: only an ADMIN
 * gives or takes the ADMIN or MANAGER role, nobody changes their own role, and every role given writes one audit row.
 * Scene: the cashier's till@ login is a MANAGER; at 21:00 it opens Staff and picks Admin on its own card.
 * TD-147 (R7, R8), Shaurya 2026-09-26: only an ADMIN changes an ADMIN's or MANAGER's card, Reset PIN included, and every
 * change to a card writes an audit row.
 *
 * Real writers only (admin-updateServer / admin-addServer). Own state: res_meghana's servers and audit are
 * re-imported from MockData7 at the start and the end, so a role changed here never leaks into another suite.
 */
import { execSync } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import config from '../lib/config.js';
import { call, fsFor, ok } from '../lib/rest.mjs';

const RID = 'res_meghana';
const { getDoc, listCol, delDoc } = fsFor(RID);
const __dirname = dirname(fileURLToPath(import.meta.url));
const need = (r, what) => { if (!ok(r)) throw new Error(`${what}: ${r?.message || JSON.stringify(r).slice(0, 200)}`); return r.data ?? r; };

async function reimport() {
  for (const d of await listCol('audit', 300)) await delDoc(`audit/${d.id}`);
  execSync(`node "${resolve(__dirname, '../../../mock/importMockData5.js')}" --file=mock/MockData7ProductionMenus.json --refresh-timestamps`, {
    cwd: resolve(__dirname, '../../..'), env: { ...process.env, FIRESTORE_EMULATOR_HOST: config.FIRESTORE_HOST }, stdio: 'ignore', timeout: 60000,
  });
}
const login = async who => need(await call('server-serverLogin', { restaurantId: RID, username: `${who}@meg.test`, password: '1234' }), `${who} login`).sessionId;
const update = (sessionId, serverId, updateData) => call('admin-updateServer', { restaurantId: RID, sessionId, serverId, updateData });
const roleOf = async id => (await getDoc(`servers/${id}`))?.role;
const roleRows = async id => (await listCol('audit', 300)).filter(a => a.action === 'staffRoleChange' && a.cid === `staff_${id}`);

export default async function staffRolesSuite() {
  const results = { name: 'staff-roles', pass: 0, fail: 0, tests: [] };
  const check = (label, cond, actual) => {
    results.tests.push({ pass: Boolean(cond), message: `${label} → ${cond ? 'ok' : 'FAILED'}`, actual: cond ? undefined : actual });
    cond ? results.pass++ : results.fail++;
  };
  const scene = async (label, fn) => { try { await fn(); } catch (e) { check(`${label}: setup failed — ${e.message}`, false); } };

  await reimport();
  const till = await login('till');
  const manager = await login('manager');
  const admin = await login('admin');

  await scene('R1', async () => {
    const r = await update(till, 'srv_meg_till', { role: 'ADMIN' });
    check('R1 till@ (a MANAGER) making itself Admin is refused, naming the rule', !ok(r) && /own role/.test(r.message), r);
    check('R1 its role is still MANAGER and no audit row was written', (await roleOf('srv_meg_till')) === 'MANAGER' && (await roleRows('srv_meg_till')).length === 0);
  });

  await scene('R2', async () => {
    const r = await update(manager, 'srv_meg_1', { role: 'MANAGER' });
    check('R2 a manager making a waiter a Manager is refused: only an Admin gives it', !ok(r) && /Only an Admin/.test(r.message), r);
    const d = await update(manager, 'srv_meg_admin', { role: 'SERVER' });
    check('R2 a manager demoting the owner is refused', !ok(d) && /Only an Admin/.test(d.message), d);
    check('R2 both roles unchanged', (await roleOf('srv_meg_1')) === 'SERVER' && (await roleOf('srv_meg_admin')) === 'ADMIN');
  });

  await scene('R3', async () => {
    const r = await update(manager, 'srv_meg_2', { role: 'KITCHEN' });
    check('R3 a manager moving Server Two to the kitchen is accepted', ok(r), r);
    const rows = await roleRows('srv_meg_2');
    check('R3 one audit row names the manager, SERVER before and KITCHEN after',
      rows.length === 1 && rows[0].staffId === 'srv_meg_mgr' && rows[0].before?.role === 'SERVER' && rows[0].after?.role === 'KITCHEN', rows);
  });

  await scene('R4', async () => {
    const r = await update(admin, 'srv_meg_1', { role: 'MANAGER' });
    check('R4 the owner making Server One a Manager is accepted', ok(r) && (await roleOf('srv_meg_1')) === 'MANAGER', r);
    const rows = await roleRows('srv_meg_1');
    check('R4 one audit row names the owner', rows.length === 1 && rows[0].staffId === 'srv_meg_admin' && rows[0].after?.role === 'MANAGER', rows);
    const own = await update(admin, 'srv_meg_admin', { role: 'SERVER' });
    check('R4 the owner cannot change their own role either', !ok(own) && /own role/.test(own.message), own);
  });

  await scene('R5', async () => {
    // TD-147 changed this scene: a manager's own card is now the owner's to change, so the owner saves their own.
    const name = await update(admin, 'srv_meg_admin', { name: 'Owner', role: 'ADMIN' });
    check('R5 the owner saving their own card with their own role unchanged goes through (not a role change)',
      ok(name) && (await roleRows('srv_meg_admin')).length === 0, name);
    const bad = await update(admin, 'srv_meg_2', { role: 'OWNER' });
    check('R5 an unknown role is refused, not stored', !ok(bad) && /Unknown role/.test(bad.message) && (await roleOf('srv_meg_2')) !== 'OWNER', bad);
  });

  await scene('R6', async () => {
    const add = (sessionId, role, email) => call('admin-addServer', { restaurantId: RID, sessionId, server: { name: `R6 ${role}`, email, role } });
    const r = await add(manager, 'MANAGER', 'r6-mgr@meg.test');
    check('R6 a manager adding a new Manager is refused', !ok(r) && /Only an Admin/.test(r.message), r);
    const w = need(await add(manager, 'SERVER', 'r6-srv@meg.test'), 'R6 add waiter');
    const rows = await roleRows(w.serverId);
    check('R6 a manager adding a waiter is accepted, with one audit row (none before, SERVER after)',
      rows.length === 1 && rows[0].before === null && rows[0].after?.role === 'SERVER' && rows[0].staffId === 'srv_meg_mgr', rows);
    await delDoc(`servers/${w.serverId}`);   // the re-import merges, so a record this suite made is removed by hand
  });

  const rowsOf = async (id, action) => (await listCol('audit', 300)).filter(a => a.action === action && a.cid === `staff_${id}`);
  const pin = (sessionId, serverId) => call('admin-resetServerPin', { restaurantId: RID, sessionId, serverId });

  await scene('R7', async () => {
    const owner = await getDoc('servers/srv_meg_admin');
    const rowsBefore = (await rowsOf('srv_meg_admin', 'staffPinReset')).length + (await rowsOf('srv_meg_admin', 'staffCardChange')).length;
    const r = await pin(till, 'srv_meg_admin');
    check('R7 till@ (a MANAGER) resetting the owner\'s PIN is refused, and no PIN comes back', !ok(r) && /Only an Admin/.test(r.message) && !r.data?.newPin, r);
    const e = await update(manager, 'srv_meg_admin', { email: 'mine@meg.test' });
    const st = await update(manager, 'srv_meg_admin', { status: 'inactive' });
    check('R7 a manager changing the owner\'s email or switching the owner inactive is refused',
      !ok(e) && /Only an Admin/.test(e.message) && !ok(st) && /Only an Admin/.test(st.message), { e, st });
    const own = await update(till, 'srv_meg_till', { name: 'Cash' });
    check('R7 a manager changing their own card is refused too', !ok(own) && /Only an Admin/.test(own.message), own);
    const after = await getDoc('servers/srv_meg_admin');
    check('R7 the owner\'s PIN, email and status are unchanged, and no audit row was written',
      after.pinHash === owner.pinHash && after.email === owner.email && after.status === owner.status
      && (await rowsOf('srv_meg_admin', 'staffPinReset')).length + (await rowsOf('srv_meg_admin', 'staffCardChange')).length === rowsBefore, after);
  });

  await scene('R8', async () => {
    const r = await update(manager, 'srv_meg_2', { name: 'Ravi' });
    const rows = await rowsOf('srv_meg_2', 'staffCardChange');
    check('R8 a manager renaming a staff member is accepted, with one audit row: the old name before, Ravi after',
      ok(r) && rows.length === 1 && rows[0].staffId === 'srv_meg_mgr' && typeof rows[0].before?.name === 'string' && rows[0].after?.name === 'Ravi', { r, rows });
    const before = (await getDoc('servers/srv_meg_mgr')).pinHash;
    const p = need(await pin(admin, 'srv_meg_mgr'), 'R8 owner resets the manager\'s PIN');
    const pinRows = await rowsOf('srv_meg_mgr', 'staffPinReset');
    check('R8 the owner resets the manager\'s PIN: a new PIN, one audit row naming the owner, the PIN not in it',
      /^\d{4}$/.test(p.newPin) && (await getDoc('servers/srv_meg_mgr')).pinHash !== before
      && pinRows.length === 1 && pinRows[0].staffId === 'srv_meg_admin' && !JSON.stringify(pinRows[0]).includes(p.newPin), { p, pinRows });
  });

  await reimport();
  return results;
}
