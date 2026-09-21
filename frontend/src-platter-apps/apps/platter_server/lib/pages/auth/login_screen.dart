import 'package:flutter/material.dart';
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

class _LoginScreenContent extends StatelessWidget {
  const _LoginScreenContent();

  void _onLoginSuccess(BuildContext context) {
    final provider = Provider.of<LoginProvider>(context, listen: false);
    final loginData = provider.loginData;
    if (loginData == null) return;

    Navigator.of(context).pushReplacement(
      MaterialPageRoute(
        builder: (context) => MainNavigation(
          restaurantId: loginData.restaurantId,
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

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Server Login')),
      body: PlatterLoginForm<LoginProvider>(
        title: 'Welcome Back!',
        onLoginSuccess: () => _onLoginSuccess(context),
        debugCredentials: DevLogins.forApp('server'),
      ),
    );
  }
}
