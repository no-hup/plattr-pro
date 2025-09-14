import 'package:envied/envied.dart';
part 'env.g.dart';

@Envied(path: '.env')
abstract class Env {
  @EnviedField(varName: 'FIREBASE_API_KEY', obfuscate: true, defaultValue: '')
  static final String firebaseApiKey = _Env.firebaseApiKey;
  @EnviedField(varName: 'SERVER_URL')
  static const String serverUrl = _Env.serverUrl;
  @EnviedField(varName: 'FIREBASE_PROJECT_ID', defaultValue: '')
  static final String firebaseProjectId = _Env.firebaseProjectId;
}
