import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart';
import 'package:provider/provider.dart';
import '../../auth/base_login_provider.dart';
import '../../state/data_state.dart';

/// A reusable login form widget for Platter apps.
/// 
/// It works with any provider extending [BaseLoginProvider].
class PlatterLoginForm<T extends BaseLoginProvider> extends StatefulWidget {
  final String title;
  final Widget? icon;
  final VoidCallback onLoginSuccess;
  final List<DebugCredential> debugCredentials;

  const PlatterLoginForm({
    super.key,
    required this.title,
    required this.onLoginSuccess,
    this.icon,
    this.debugCredentials = const [],
  });

  @override
  State<PlatterLoginForm<T>> createState() => _PlatterLoginFormState<T>();
}

class _PlatterLoginFormState<T extends BaseLoginProvider> extends State<PlatterLoginForm<T>> {
  final _formKey = GlobalKey<FormState>();
  final _restaurantIdController = TextEditingController();
  final _usernameController = TextEditingController();
  final _passwordController = TextEditingController();

  @override
  void initState() {
    super.initState();
    // Prefill so a dev never types these. Debug builds only, and only the first entry —
    // the cards below switch restaurant with one tap.
    if (kDebugMode && widget.debugCredentials.isNotEmpty) {
      final c = widget.debugCredentials.first;
      _restaurantIdController.text = c.id;
      _usernameController.text = c.username;
      _passwordController.text = c.pass;
    }
  }

  @override
  void dispose() {
    _restaurantIdController.dispose();
    _usernameController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _login() async {
    if (_formKey.currentState!.validate()) {
      final provider = Provider.of<T>(context, listen: false);
      
      await provider.loginUser(
        restaurantId: _restaurantIdController.text.trim(),
        username: _usernameController.text.trim(),
        password: _passwordController.text.trim(),
      );

      if (mounted && provider.state == DataState.loaded) {
        widget.onLoginSuccess();
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Center(
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(24.0),
        child: Form(
          key: _formKey,
          child: Consumer<T>(
            builder: (context, provider, child) {
              return Column(
                mainAxisAlignment: MainAxisAlignment.center,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: <Widget>[
                  if (widget.icon != null) ...[
                    widget.icon!,
                    const SizedBox(height: 16),
                  ],
                  Text(
                    widget.title,
                    style: Theme.of(context).textTheme.headlineSmall,
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 32.0),
                  Semantics(
                    identifier: 'login-restaurant',
                    child: TextFormField(
                    controller: _restaurantIdController,
                    decoration: const InputDecoration(
                      labelText: 'Restaurant ID',
                      border: OutlineInputBorder(),
                      prefixIcon: Icon(Icons.restaurant_menu),
                    ),
                    validator: (value) {
                      if (value == null || value.trim().isEmpty) {
                        return 'Please enter Restaurant ID';
                      }
                      return null;
                    },
                  ),),
                  const SizedBox(height: 16.0),
                  Semantics(
                    identifier: 'login-username',
                    child: TextFormField(
                    controller: _usernameController,
                    decoration: const InputDecoration(
                      labelText: 'Username (Email or Phone)',
                      border: OutlineInputBorder(),
                      prefixIcon: Icon(Icons.person_outline),
                    ),
                    validator: (value) {
                      if (value == null || value.trim().isEmpty) {
                        return 'Please enter username';
                      }
                      return null;
                    },
                  ),),
                  const SizedBox(height: 16.0),
                  Semantics(
                    identifier: 'login-password',
                    child: TextFormField(
                    controller: _passwordController,
                    decoration: const InputDecoration(
                      labelText: 'Password',
                      border: OutlineInputBorder(),
                      prefixIcon: Icon(Icons.lock_outline),
                    ),
                    obscureText: true,
                    validator: (value) {
                      if (value == null || value.isEmpty) {
                        return 'Please enter password';
                      }
                      return null;
                    },
                  ),),
                  const SizedBox(height: 24.0),
                  if (provider.isLoading)
                    const Center(child: CircularProgressIndicator())
                  else
                    Semantics(
                      identifier: 'login-submit',
                      child: ElevatedButton(
                      onPressed: _login,
                      style: ElevatedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(vertical: 16.0),
                        textStyle: const TextStyle(fontSize: 16.0),
                      ),
                      child: const Text('Login'),
                    ),),
                  if (provider.state == DataState.error &&
                      provider.errorMessage != null)
                    Padding(
                      padding: const EdgeInsets.only(top: 16.0),
                      child: Text(
                        provider.errorMessage!,
                        style: const TextStyle(
                            color: Colors.red, fontSize: 14.0),
                        textAlign: TextAlign.center,
                      ),
                    ),
                   if (kDebugMode && widget.debugCredentials.isNotEmpty) ...[
                      const SizedBox(height: 32),
                      const Divider(),
                      const Text(
                        'Seeded logins — tap to switch restaurant',
                        style: TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                        ),
                        textAlign: TextAlign.center,
                      ),
                      const SizedBox(height: 16),
                      ...widget.debugCredentials.map((cred) => _DebugCredentialCard(
                        credential: cred,
                        onTap: (id, phone, pass) {
                          _restaurantIdController.text = id;
                          _usernameController.text = phone;
                          _passwordController.text = pass;
                        },
                      )),
                    ],
                ],
              );
            },
          ),
        ),
      ),
    );
  }
}

class DebugCredential {
  final String name;
  final String id;
  final String username;
  final String pass;

  const DebugCredential({
    required this.name,
    required this.id,
    required this.username,
    required this.pass,
  });
}

class _DebugCredentialCard extends StatelessWidget {
  final DebugCredential credential;
  final Function(String, String, String) onTap;

  const _DebugCredentialCard({
    required this.credential,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.symmetric(vertical: 8),
      child: InkWell(
        onTap: () => onTap(credential.id, credential.username, credential.pass),
        child: Padding(
          padding: const EdgeInsets.all(12.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(credential.name, style: const TextStyle(fontWeight: FontWeight.bold)),
              const SizedBox(height: 4),
              Text('ID: ${credential.id}'),
              Text('User: ${credential.username}'),
              Text('Pass: ${credential.pass}'),
            ],
          ),
        ),
      ),
    );
  }
}
