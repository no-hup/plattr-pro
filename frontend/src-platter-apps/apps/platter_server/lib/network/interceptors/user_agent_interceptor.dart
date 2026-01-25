import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:package_info_plus/package_info_plus.dart';

class UserAgentInterceptor extends Interceptor {
  @override
  Future<void> onRequest(
      RequestOptions options, RequestInterceptorHandler handler) async {
    String userAgent = 'PlatterApp/unknown';
    if (kIsWeb) {
      userAgent = 'PlatterApp/Web';
    } else {
      try {
        final info = await PackageInfo.fromPlatform();
        userAgent =
            '${info.appName}/${info.version} (${info.packageName}; ${info.buildNumber})';
      } catch (_) {
        userAgent = 'PlatterApp/UnknownPlatform';
      }
    }
    options.headers['User-Agent'] = userAgent;
    handler.next(options);
  }
}
