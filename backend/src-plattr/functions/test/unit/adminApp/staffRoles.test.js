/* eslint-disable global-require */

// TD-139 (QA2-3): the cashier's till@ login is a MANAGER. It could make itself ADMIN from the Staff
// screen, and every owner-only rule was one tap away from the person it controls. Shaurya 2026-09-26:
// only an ADMIN gives the ADMIN or MANAGER role; nobody changes their own role; every change is audited.

jest.mock('../../../admin/admin', () => ({ db: {}, admin: {} }));
const { roleChangeRefusal, cardEditRefusal } = require('../../../adminApp/staff_admin');

const OWN = 'Nobody can change their own role';
const ONLY_ADMIN = 'Only an Admin can give or take the Admin or Manager role';
const change = (callerRole, callerId, targetId, fromRole, toRole) => roleChangeRefusal({ callerRole, callerId, targetId, fromRole, toRole });

describe('TD-139 who may change a staff role', () => {
  it('a manager (till@) cannot make themself Admin', () => {
    expect(change('MANAGER', 'srv_till', 'srv_till', 'MANAGER', 'ADMIN')).toBe(OWN);
  });
  it('an admin cannot change their own role either (the owner cannot lock themself out)', () => {
    expect(change('ADMIN', 'srv_admin', 'srv_admin', 'ADMIN', 'SERVER')).toBe(OWN);
  });
  it('a manager cannot make a waiter a Manager or an Admin', () => {
    expect(change('MANAGER', 'srv_mgr', 'srv_1', 'SERVER', 'MANAGER')).toBe(ONLY_ADMIN);
    expect(change('MANAGER', 'srv_mgr', 'srv_1', 'SERVER', 'ADMIN')).toBe(ONLY_ADMIN);
  });
  it('a manager cannot demote the owner or another manager (taking the role is the same power)', () => {
    expect(change('MANAGER', 'srv_mgr', 'srv_admin', 'ADMIN', 'SERVER')).toBe(ONLY_ADMIN);
    expect(change('MANAGER', 'srv_mgr', 'srv_till', 'MANAGER', 'KITCHEN')).toBe(ONLY_ADMIN);
  });
  it('a manager can move a waiter to the kitchen', () => {
    expect(change('MANAGER', 'srv_mgr', 'srv_1', 'SERVER', 'KITCHEN')).toBeNull();
  });
  it('an admin can make a waiter a Manager, and a manager an Admin', () => {
    expect(change('ADMIN', 'srv_admin', 'srv_1', 'SERVER', 'MANAGER')).toBeNull();
    expect(change('ADMIN', 'srv_admin', 'srv_mgr', 'MANAGER', 'ADMIN')).toBeNull();
  });
  it('sending the role a person already has is not a change, so even their own card saves', () => {
    expect(change('MANAGER', 'srv_mgr', 'srv_mgr', 'MANAGER', 'MANAGER')).toBeNull();
  });
  it('adding staff: a manager can add a waiter but not a Manager or an Admin', () => {
    expect(change('MANAGER', 'srv_mgr', null, null, 'SERVER')).toBeNull();
    expect(change('MANAGER', 'srv_mgr', null, null, 'MANAGER')).toBe(ONLY_ADMIN);
    expect(change('ADMIN', 'srv_admin', null, null, 'MANAGER')).toBeNull();
  });
});

// TD-147: till@ (a MANAGER) could reset the owner's PIN and was shown it, change the owner's email, or switch the owner
// inactive. Shaurya 2026-09-26: only an ADMIN changes an ADMIN's or MANAGER's card, Reset PIN included.
describe('TD-147 who may change a staff card (name, phone, email, status, PIN)', () => {
  const CARD = 'Only an Admin can change an Admin or Manager card';
  const edit = (callerRole, targetRole) => cardEditRefusal({ callerRole, targetRole });
  it('a manager cannot change the owner\'s card or another manager\'s, their own included', () => {
    expect(edit('MANAGER', 'ADMIN')).toBe(CARD);
    expect(edit('MANAGER', 'MANAGER')).toBe(CARD);
  });
  it('a manager can change a waiter\'s or a cook\'s card', () => {
    expect(edit('MANAGER', 'SERVER')).toBeNull();
    expect(edit('MANAGER', 'KITCHEN')).toBeNull();
  });
  it('the owner can change any card', () => {
    expect(edit('ADMIN', 'ADMIN')).toBeNull();
    expect(edit('ADMIN', 'MANAGER')).toBeNull();
  });
});
