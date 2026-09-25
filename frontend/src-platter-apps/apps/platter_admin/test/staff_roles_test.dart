// TD-139: the Staff screen offers only the roles the backend would accept (adminApp/staff_admin.js is the check).
import 'package:flutter_test/flutter_test.dart';
import 'package:platter_admin/pages/staff/staff_api_service.dart';

StaffMember card(String id, String role) =>
    StaffMember(id: id, name: id, phoneNumber: '', email: '', role: role, status: 'active', profileImageUrl: '');

void main() {
  test('till@ (a manager) editing its own card: the role is fixed, with the reason', () {
    final till = card('srv_meg_till', 'MANAGER');
    expect(ServerRoles.assignable(callerRole: 'MANAGER', callerId: 'srv_meg_till', target: till), isEmpty);
    expect(ServerRoles.fixedReason(callerId: 'srv_meg_till', target: till), 'Nobody can change their own role');
  });
  test('a manager editing the owner: fixed; editing a waiter: Server or Kitchen only', () {
    expect(ServerRoles.assignable(callerRole: 'MANAGER', callerId: 'srv_meg_mgr', target: card('srv_meg_admin', 'ADMIN')), isEmpty);
    expect(ServerRoles.assignable(callerRole: 'MANAGER', callerId: 'srv_meg_mgr', target: card('srv_meg_1', 'SERVER')),
        ['SERVER', 'KITCHEN']);
  });
  test('a manager adding staff: Server or Kitchen; the owner: every role', () {
    expect(ServerRoles.assignable(callerRole: 'manager', callerId: 'srv_meg_mgr'), ['SERVER', 'KITCHEN']);
    expect(ServerRoles.assignable(callerRole: 'ADMIN', callerId: 'srv_meg_admin', target: card('srv_meg_mgr', 'MANAGER')),
        ['ADMIN', 'MANAGER', 'SERVER', 'KITCHEN']);
  });
  test('the owner editing their own card: fixed too', () {
    expect(ServerRoles.assignable(callerRole: 'ADMIN', callerId: 'srv_meg_admin', target: card('srv_meg_admin', 'ADMIN')), isEmpty);
  });
  // TD-147: a manager can't touch the owner's or a manager's card at all (edit, status switch, Reset PIN).
  test('a manager: the owner\'s and a manager\'s cards are locked, their own included; a waiter\'s is open', () {
    expect(ServerRoles.canChangeCard(callerRole: 'MANAGER', target: card('srv_meg_admin', 'ADMIN')), isFalse);
    expect(ServerRoles.canChangeCard(callerRole: 'MANAGER', target: card('srv_meg_till', 'MANAGER')), isFalse);
    expect(ServerRoles.canChangeCard(callerRole: 'MANAGER', target: card('srv_meg_1', 'SERVER')), isTrue);
    expect(ServerRoles.canChangeCard(callerRole: 'admin', target: card('srv_meg_mgr', 'MANAGER')), isTrue);
  });
}
