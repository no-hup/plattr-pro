import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart';
import 'package:provider/provider.dart';
import 'package:platter_core/platter_core.dart';
import 'login_provider.dart';
import '../../main_navigation.dart';

class LoginScreen extends StatelessWidget {
  const LoginScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return ChangeNotifierProvider(
      create: (_) => LoginProvider(),
      child: const _LoginScreenContent(),
    );
  }
}

class _LoginScreenContent extends StatefulWidget {
  const _LoginScreenContent();

  @override
  State<_LoginScreenContent> createState() => _LoginScreenContentState();
}

class _LoginScreenContentState extends State<_LoginScreenContent> {
  final _formKey = GlobalKey<FormState>();
  final _restaurantIdController = TextEditingController();
  final _usernameController = TextEditingController();
  final _passwordController = TextEditingController();

  @override
  void dispose() {
    _restaurantIdController.dispose();
    _usernameController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _login() async {
    if (_formKey.currentState!.validate()) {
      final provider = Provider.of<LoginProvider>(context, listen: false);
      final restaurantId = _restaurantIdController.text.trim();

      await provider.loginUser(
        restaurantId: restaurantId,
        username: _usernameController.text.trim(),
        password: _passwordController.text.trim(),
      );

      if (provider.state == DataState.loaded && provider.loginData != null) {
        if (mounted) {
          final loginData = provider.loginData!;
          Navigator.of(context).pushReplacement(
            MaterialPageRoute(
              builder: (context) => MainNavigation(
                restaurantId: restaurantId,
                sessionId: loginData.sessionId,
                restaurantName: loginData.restaurantName,
                serverName: loginData.name,
                serverProfileImageUrl: loginData.profileImageUrl.isNotEmpty
                    ? loginData.profileImageUrl
                    : null,
              ),
            ),
          );
        }
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Server Login')),
      body: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24.0),
          child: Form(
            key: _formKey,
            child: Consumer<LoginProvider>(
              builder: (context, provider, child) {
                return Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: <Widget>[
                    Text(
                      'Welcome Back!',
                      style: Theme.of(context).textTheme.headlineSmall,
                      textAlign: TextAlign.center,
                    ),
                    const SizedBox(height: 24.0),
                    TextFormField(
                      controller: _restaurantIdController,
                      decoration: const InputDecoration(
                        labelText: 'Restaurant ID',
                        border: OutlineInputBorder(),
                        prefixIcon: Icon(Icons.restaurant),
                      ),
                      validator: (value) {
                        if (value == null || value.trim().isEmpty) {
                          return 'Please enter Restaurant ID';
                        }
                        return null;
                      },
                    ),
                    const SizedBox(height: 16.0),
                    TextFormField(
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
                    ),
                    const SizedBox(height: 16.0),
                    TextFormField(
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
                    ),
                    const SizedBox(height: 24.0),
                    if (provider.isLoading)
                      const Center(child: CircularProgressIndicator())
                    else
                      ElevatedButton(
                        onPressed: _login,
                        style: ElevatedButton.styleFrom(
                          padding: const EdgeInsets.symmetric(vertical: 16.0),
                          textStyle: const TextStyle(fontSize: 16.0),
                        ),
                        child: const Text('Login'),
                      ),
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
                    if (kDebugMode) ...[
                      const SizedBox(height: 32),
                      const Divider(),
                      const Text(
                        'Debug Credentials',
                        style: TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                        ),
                        textAlign: TextAlign.center,
                      ),
                      const SizedBox(height: 16),
                      _DebugCredentialCard(
                        name: 'Server 1 - All Features ON',
                        id: 'res_e2e_all_on',
                        username: 'server1@e2e.com',
                        pass: '1234',
                        onTap: (id, username, pass) {
                          _restaurantIdController.text = id;
                          _usernameController.text = username;
                          _passwordController.text = pass;
                        },
                      ),
                      _DebugCredentialCard(
                        name: 'Server 2 - All Features ON',
                        id: 'res_e2e_all_on',
                        username: 'server2@e2e.com',
                        pass: '1234',
                        onTap: (id, username, pass) {
                          _restaurantIdController.text = id;
                          _usernameController.text = username;
                          _passwordController.text = pass;
                        },
                      ),
                      _DebugCredentialCard(
                        name: 'Server 1 - Simple Menu',
                        id: 'res_e2e_simple_menu',
                        username: 'server1@e2e-simple.com',
                        pass: '1234',
                        onTap: (id, username, pass) {
                          _restaurantIdController.text = id;
                          _usernameController.text = username;
                          _passwordController.text = pass;
                        },
                      ),
                    ],
                  ],
                );
              },
            ),
          ),
        ),
      ),
    );
  }
}

class _DebugCredentialCard extends StatelessWidget {
  final String name;
  final String id;
  final String username;
  final String pass;
  final Function(String, String, String) onTap;

  const _DebugCredentialCard({
    required this.name,
    required this.id,
    required this.username,
    required this.pass,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.symmetric(vertical: 8),
      child: InkWell(
        onTap: () => onTap(id, username, pass),
        child: Padding(
          padding: const EdgeInsets.all(12.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(name, style: const TextStyle(fontWeight: FontWeight.bold)),
              const SizedBox(height: 4),
              Text('ID: $id'),
              Text('Username: $username'),
              Text('Pass: $pass'),
            ],
          ),
        ),
      ),
    );
  }
}
