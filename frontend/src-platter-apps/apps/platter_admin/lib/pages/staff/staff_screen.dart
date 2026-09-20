import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import 'package:platter_core/platter_core.dart';
import 'staff_api_service.dart';
import 'staff_provider.dart';

class StaffScreen extends StatelessWidget {
  final String restaurantId;
  final String sessionId;

  const StaffScreen({
    super.key,
    required this.restaurantId,
    required this.sessionId,
  });

  @override
  Widget build(BuildContext context) {
    return ChangeNotifierProvider(
      create: (_) => StaffProvider(
        apiService: StaffApiService(),
        restaurantId: restaurantId,
        sessionId: sessionId,
      )..loadStaff(),
      child: const _StaffView(),
    );
  }
}

class _StaffView extends StatelessWidget {
  const _StaffView();

  @override
  Widget build(BuildContext context) {
    return Consumer<StaffProvider>(
      builder: (context, provider, _) {
        if (provider.state == DataState.loading && provider.staff.isEmpty) {
          return const Center(child: CircularProgressIndicator());
        }

        if (provider.state == DataState.error && provider.staff.isEmpty) {
          return Center(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(Icons.error_outline, size: 48, color: Colors.red),
                const SizedBox(height: 16),
                Text(provider.errorMessage ?? 'Failed to load staff'),
                const SizedBox(height: 12),
                ElevatedButton(
                  onPressed: provider.loadStaff,
                  child: const Text('Retry'),
                ),
              ],
            ),
          );
        }

        return Column(
          children: [
            _buildHeader(context, provider),
            Expanded(child: _buildStaffList(context, provider)),
          ],
        );
      },
    );
  }

  Widget _buildHeader(BuildContext context, StaffProvider provider) {
    return Padding(
      padding: const EdgeInsets.all(16.0),
      child: Row(
        children: [
          const Expanded(
            child: Text(
              'Staff Members',
              style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
            ),
          ),
          IconButton(
            tooltip: 'Refresh',
            onPressed: provider.loadStaff,
            icon: const Icon(Icons.refresh),
          ),
          const SizedBox(width: 8),
          ElevatedButton.icon(
            onPressed: () => _showAddStaffDialog(context, provider),
            icon: const Icon(Icons.person_add),
            label: const Text('Add Staff'),
          ),
        ],
      ),
    );
  }

  Widget _buildStaffList(BuildContext context, StaffProvider provider) {
    if (provider.staff.isEmpty) {
      return const Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.people_outline, size: 64, color: Colors.grey),
            SizedBox(height: 16),
            Text(
              'No staff members yet',
              style: TextStyle(fontSize: 16, color: Colors.grey),
            ),
            SizedBox(height: 8),
            Text(
              'Add your first staff member to get started',
              style: TextStyle(color: Colors.grey),
            ),
          ],
        ),
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      itemCount: provider.staff.length,
      itemBuilder: (context, index) {
        final staff = provider.staff[index];
        return _StaffCard(
          staff: staff,
          onEdit: () => _showEditStaffDialog(context, provider, staff),
          onToggleStatus: (active) =>
              provider.toggleStaffStatus(staff.id, active),
          onResetPin: () => _showResetPinDialog(context, provider, staff),
        );
      },
    );
  }

  Future<void> _showAddStaffDialog(
      BuildContext context, StaffProvider provider) async {
    final result = await showDialog<_StaffFormResult>(
      context: context,
      builder: (context) => const _StaffEditorDialog(),
    );

    if (result == null) return;

    final response = await provider.addStaff(
      name: result.name,
      phoneNumber: result.phoneNumber,
      email: result.email,
      role: result.role,
    );

    if (response != null && context.mounted) {
      _showPinDialog(context, response.name, response.pin,
          password: response.password);
    }
  }

  Future<void> _showEditStaffDialog(
      BuildContext context, StaffProvider provider, StaffMember staff) async {
    final result = await showDialog<_StaffFormResult>(
      context: context,
      builder: (context) => _StaffEditorDialog(staff: staff),
    );

    if (result == null) return;

    await provider.updateStaff(
      serverId: staff.id,
      name: result.name,
      phoneNumber: result.phoneNumber,
      email: result.email,
      role: result.role,
    );
  }

  Future<void> _showResetPinDialog(
      BuildContext context, StaffProvider provider, StaffMember staff) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Reset PIN'),
        content: Text('Generate a new PIN for ${staff.name}?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () => Navigator.of(context).pop(true),
            child: const Text('Reset'),
          ),
        ],
      ),
    );

    if (confirmed != true) return;

    final response = await provider.resetPin(staff.id);
    if (response != null && context.mounted) {
      _showPinDialog(context, staff.name, response.newPin);
    }
  }

  void _showPinDialog(BuildContext context, String name, String pin,
      {String password = ''}) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Staff PIN'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text('PIN for $name:'),
            const SizedBox(height: 16),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
              decoration: BoxDecoration(
                color: Theme.of(context).colorScheme.primaryContainer,
                borderRadius: BorderRadius.circular(8),
              ),
              child: SelectableText(
                pin,
                style: const TextStyle(
                  fontSize: 32,
                  fontWeight: FontWeight.bold,
                  letterSpacing: 8,
                ),
              ),
            ),
            if (password.isNotEmpty) ...[
              const SizedBox(height: 16),
              Text('Login password for $name:'),
              const SizedBox(height: 8),
              SelectableText(
                password,
                style: const TextStyle(
                    fontSize: 20, fontWeight: FontWeight.bold, letterSpacing: 4),
              ),
            ],
            const SizedBox(height: 16),
            const Text(
              'Share this PIN securely with the staff member.',
              style: TextStyle(color: Colors.grey),
              textAlign: TextAlign.center,
            ),
          ],
        ),
        actions: [
          TextButton.icon(
            onPressed: () {
              Clipboard.setData(ClipboardData(text: pin));
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('PIN copied to clipboard')),
              );
            },
            icon: const Icon(Icons.copy),
            label: const Text('Copy'),
          ),
          ElevatedButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('Done'),
          ),
        ],
      ),
    );
  }
}

class _StaffCard extends StatelessWidget {
  final StaffMember staff;
  final VoidCallback onEdit;
  final Function(bool) onToggleStatus;
  final VoidCallback onResetPin;

  const _StaffCard({
    required this.staff,
    required this.onEdit,
    required this.onToggleStatus,
    required this.onResetPin,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          children: [
            CircleAvatar(
              radius: 28,
              backgroundColor:
                  staff.isActive ? Colors.green.shade100 : Colors.grey.shade200,
              child: Text(
                staff.name.isNotEmpty ? staff.name[0].toUpperCase() : '?',
                style: TextStyle(
                  fontSize: 24,
                  color: staff.isActive ? Colors.green.shade700 : Colors.grey,
                ),
              ),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Text(
                        staff.name,
                        style: const TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const SizedBox(width: 8),
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 8,
                          vertical: 2,
                        ),
                        decoration: BoxDecoration(
                          color: _getRoleColor(staff.role).withOpacity(0.1),
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(
                            color: _getRoleColor(staff.role),
                          ),
                        ),
                        child: Text(
                          ServerRoles.displayName(staff.role),
                          style: TextStyle(
                            fontSize: 12,
                            color: _getRoleColor(staff.role),
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  if (staff.phoneNumber.isNotEmpty)
                    Text(
                      staff.phoneNumber,
                      style: TextStyle(color: Colors.grey.shade600),
                    ),
                  if (staff.email.isNotEmpty)
                    Text(
                      staff.email,
                      style: TextStyle(color: Colors.grey.shade600),
                    ),
                ],
              ),
            ),
            Column(
              children: [
                Switch(
                  value: staff.isActive,
                  onChanged: onToggleStatus,
                ),
                Text(
                  staff.isActive ? 'Active' : 'Inactive',
                  style: TextStyle(
                    fontSize: 12,
                    color: staff.isActive ? Colors.green : Colors.grey,
                  ),
                ),
              ],
            ),
            const SizedBox(width: 8),
            PopupMenuButton<String>(
              onSelected: (value) {
                switch (value) {
                  case 'edit':
                    onEdit();
                    break;
                  case 'reset_pin':
                    onResetPin();
                    break;
                }
              },
              itemBuilder: (context) => [
                const PopupMenuItem(
                  value: 'edit',
                  child: Row(
                    children: [
                      Icon(Icons.edit),
                      SizedBox(width: 8),
                      Text('Edit'),
                    ],
                  ),
                ),
                const PopupMenuItem(
                  value: 'reset_pin',
                  child: Row(
                    children: [
                      Icon(Icons.key),
                      SizedBox(width: 8),
                      Text('Reset PIN'),
                    ],
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Color _getRoleColor(String role) {
    switch (role) {
      case 'ADMIN':
        return Colors.purple;
      case 'MANAGER':
        return Colors.blue;
      case 'KITCHEN':
        return Colors.orange;
      default:
        return Colors.teal;
    }
  }
}

class _StaffFormResult {
  final String name;
  final String? phoneNumber;
  final String? email;
  final String role;

  _StaffFormResult({
    required this.name,
    this.phoneNumber,
    this.email,
    required this.role,
  });
}

class _StaffEditorDialog extends StatefulWidget {
  final StaffMember? staff;

  const _StaffEditorDialog({this.staff});

  @override
  State<_StaffEditorDialog> createState() => _StaffEditorDialogState();
}

class _StaffEditorDialogState extends State<_StaffEditorDialog> {
  late final TextEditingController _nameController;
  late final TextEditingController _phoneController;
  late final TextEditingController _emailController;
  late String _selectedRole;

  @override
  void initState() {
    super.initState();
    _nameController = TextEditingController(text: widget.staff?.name ?? '');
    _phoneController =
        TextEditingController(text: widget.staff?.phoneNumber ?? '');
    _emailController = TextEditingController(text: widget.staff?.email ?? '');
    _selectedRole = widget.staff?.role ?? 'SERVER';
  }

  @override
  void dispose() {
    _nameController.dispose();
    _phoneController.dispose();
    _emailController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final isEditing = widget.staff != null;

    return AlertDialog(
      title: Text(isEditing ? 'Edit Staff' : 'Add Staff'),
      content: SizedBox(
        width: 400,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
              controller: _nameController,
              decoration: const InputDecoration(
                labelText: 'Name *',
                border: OutlineInputBorder(),
              ),
            ),
            const SizedBox(height: 16),
            TextField(
              controller: _phoneController,
              decoration: const InputDecoration(
                labelText: 'Phone Number',
                border: OutlineInputBorder(),
              ),
              keyboardType: TextInputType.phone,
            ),
            const SizedBox(height: 16),
            TextField(
              controller: _emailController,
              decoration: const InputDecoration(
                labelText: 'Email',
                border: OutlineInputBorder(),
              ),
              keyboardType: TextInputType.emailAddress,
            ),
            const SizedBox(height: 16),
            DropdownButtonFormField<String>(
              value: _selectedRole,
              decoration: const InputDecoration(
                labelText: 'Role *',
                border: OutlineInputBorder(),
              ),
              items: ServerRoles.all
                  .map((role) => DropdownMenuItem(
                        value: role,
                        child: Text(ServerRoles.displayName(role)),
                      ))
                  .toList(),
              onChanged: (value) {
                if (value != null) {
                  setState(() => _selectedRole = value);
                }
              },
            ),
          ],
        ),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.of(context).pop(),
          child: const Text('Cancel'),
        ),
        ElevatedButton(
          onPressed: _submit,
          child: Text(isEditing ? 'Update' : 'Add'),
        ),
      ],
    );
  }

  void _submit() {
    final name = _nameController.text.trim();
    if (name.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Name is required')),
      );
      return;
    }

    final phone = _phoneController.text.trim();
    final email = _emailController.text.trim();

    if (phone.isEmpty && email.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Phone or email is required for login')),
      );
      return;
    }

    Navigator.of(context).pop(_StaffFormResult(
      name: name,
      phoneNumber: phone.isNotEmpty ? phone : null,
      email: email.isNotEmpty ? email : null,
      role: _selectedRole,
    ));
  }
}
