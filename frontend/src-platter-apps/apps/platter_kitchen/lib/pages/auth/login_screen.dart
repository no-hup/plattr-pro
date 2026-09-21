import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:platter_core/platter_core.dart';
import 'login_provider.dart';
import '../../main_navigation.dart';

/// Login screen for Kitchen app
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
     
     if (loginData != null) {
       Navigator.of(context).pushReplacement(
          MaterialPageRoute(
            builder: (context) => MainNavigation(
              restaurantId: loginData.restaurantId,
              sessionId: loginData.sessionId,
              restaurantName: loginData.restaurantName,
              kitchenName: loginData.name,
            ),
          ),
        );
     }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Kitchen Login')),
      body: PlatterLoginForm<LoginProvider>(
        title: 'Kitchen Portal',
        icon: Icon(
          Icons.restaurant,
          size: 80,
          color: Theme.of(context).colorScheme.primary,
        ),
        onLoginSuccess: () => _onLoginSuccess(context),
        debugCredentials: DevLogins.forApp('kitchen'),
      ),
    );
  }
}
