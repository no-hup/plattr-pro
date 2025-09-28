# Flutter Boilerplate

This is my Flutter starter template for production applications with a REST backend.

The main aim of this template is to get you up and running as fast as possible on your next production-ready Flutter project without all the hassle of initial project setup.

## What this is

This is a simple boilerplate template for creating a production-ready Flutter app with icon/splash screen generation, rest boilerplate, and reporting (analytics, performance, and crash reporting) all wired up for you.

## What this is not

Since y'all get a bit too religious in your State Management and App Architecture ways, this template doesn't take any opinions on these topics.

This is, therefore, not your state management and app architecture template.
So, you can choose any state management approach or move things around to create your preferred architecture.

Or fork the repo, customize the template to your heart's content, and make it your own!

That said, I may consider creating branches with my architecture and state management opinions in the future.

## Getting Started

This README contains project-specific notes. The canonical emulator and Flutter run instructions (including port handling and troubleshooting) are maintained in:

```
backend/src-plattr/.cursor/rules/emulator-flutter-run.mdc
```

Follow that rule file for bootstrapping the backend emulator and running Flutter apps locally. Use this README for app-specific notes and links to tooling.

## Packages used

* [change_app_package_name](https://pub.dev/packages/change_app_package_name) - Changes app package name with a single command. It makes the process very easy and fast.
* [dio](https://pub.dev/packages/dio) - The best HTTP Client for Flutter IMO. Reusable interceptors, amirite?
* [dio_http_cache](https://pub.dev/packages/dio_http_cache) - Dio interceptor to cache requests. It intercepts requests to
  respond with cached data or intercepts new remote responses to be cached. Very configurable.
* [dio_log](https://pub.dev/packages/dio_log) - It's a Dio Interceptor that presents your request & response logs within your app's UI
* [envied](https://pub.dev/packages/envied) - Load configuration from a `.env` file.
* [firebase_analytics](https://pub.dev/packages/firebase_analytics) - Flutter plugin for Google Analytics for Firebase, an app measurement solution that provides insight on app usage and user engagement on Android and iOS.
* [firebase_crashlytics](https://pub.dev/packages/firebase_crashlytics) - Flutter plugin for Firebase Crashlytics. It reports uncaught errors to the Firebase console.
* [firebase_performance](https://pub.dev/packages/firebase_performance) - Flutter plugin for Google Performance Monitoring for Firebase, an app measurement solution that monitors traces and HTTP/S network requests on Android and iOS.
* [firebase_performance_dio](https://pub.dev/packages/firebase_performance_dio) - Dio's Interceptor implementation that sends HTTP request metric data to Firebase.
* [flutter_launcher_icons](https://pub.dev/packages/flutter_launcher_icons) - A command-line tool that simplifies the task of updating your Flutter app's launcher icon.
* [flutter_native_splash](https://pub.dev/packages/flutter_native_splash) - Automatically generates native code for adding splash screens in Android and iOS. Customize with a specific platform, background color, and splash image.
* [freezed](https://pub.dev/packages/freezed) - Simple yet powerful code generator for immutable classes with all the good stuff like unions/pattern-matching/copy etc. Made by [Remi Rousselet](https://github.com/rrousselGit), the creator & maintainer of Provider. Can work with [json_serializable](https://pub.dev/packages/json_serializable) for all your `fromJson()` and `toJson()` needs.
* [go_router](https://pub.dev/packages/go_router) - This package builds on top of the Flutter framework's Router API and provides convenient URL-based APIs to navigate between different screens.
* [screenshots](https://pub.dev/packages/screenshots) - Screenshots is a standalone command line utility and package for capturing screenshot images for Flutter.
* [pretty_dio_logger](https://pub.dev/packages/pretty_dio_logger) - Dio interceptor that prettily prints to console HTTP requests and responses going through Dio

[![Buy me a coffee](https://www.buymeacoffee.com/assets/img/custom_images/purple_img.png)](https://buymeacoffee.com/danvick)
