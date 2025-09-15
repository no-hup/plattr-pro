import 'dart:async';

import 'package:dio/dio.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_crashlytics/firebase_crashlytics.dart';
import 'package:firebase_performance/firebase_performance.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:get_it/get_it.dart';

import 'app.dart';
import 'env.dart';
import 'firebase_options.dart';
import 'utils/http_client.dart';

void main() async {
  await runZonedGuarded(
    () async {
      WidgetsFlutterBinding.ensureInitialized();
      // Retain native splash screen until Dart is ready
      //FlutterNativeSplash.preserve(widgetsBinding: widgetsBinding);
      await Firebase.initializeApp(
        options: DefaultFirebaseOptions.currentPlatform,
      );
      GetIt.instance.registerLazySingleton(
        () => HttpClient(baseOptions: BaseOptions(baseUrl: Env.serverUrl)),
      );

      // Filter verbose SDK noise in logs
      debugPrint = (String? message, {int? wrapWidth}) {
        if (message == null) return;
        final filtered = filterSdkNoise(message);
        if (filtered.isEmpty) return;
        // Use print so it goes through zone print filter too
        print(filtered);
      };

      // Enhanced error handling
      FlutterError.onError = (FlutterErrorDetails details) {
        FlutterError.presentError(details); // Show full error overlay
        if (!kIsWeb) {
          FirebaseCrashlytics.instance.recordFlutterError(details);
        }
        Zone.current.handleUncaughtError(details.exception, details.stack!);
      };

      ErrorWidget.builder = (FlutterErrorDetails error) {
        Zone.current.handleUncaughtError(error.exception, error.stack!);
        return ErrorWidget(error.exception);
      };

      if (!kIsWeb) {
        if (kDebugMode) {
          await FirebaseCrashlytics.instance
              .setCrashlyticsCollectionEnabled(false);
        } else {
          await FirebaseCrashlytics.instance
              .setCrashlyticsCollectionEnabled(true);
        }
      }
      if (!kIsWeb) {
        if (kDebugMode) {
          await FirebasePerformance.instance
              .setPerformanceCollectionEnabled(false);
        }
      }

      runApp(const MyApp());
      //FlutterNativeSplash.remove(); // Now remove splash screen
    },
    (error, stackTrace) {
      debugPrint('🔥 Uncaught Exception: $error');
      final filtered = filterSdkNoise(stackTrace.toString());
      if (filtered.isNotEmpty) debugPrint(filtered);
      if (!kIsWeb) {
        FirebaseCrashlytics.instance.recordError(error, stackTrace);
      }
    },
    zoneSpecification: ZoneSpecification(
      print: (self, parent, zone, line) {
        final filtered = filterSdkNoise(line);
        if (filtered.isEmpty) return;
        parent.print(zone, filtered);
      },
    ),
  );
}
