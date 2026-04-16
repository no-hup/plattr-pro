import 'dart:async';
import 'package:flutter/material.dart';

import 'network_connectivity_service.dart';
import 'page_type_identifier.dart';
import '../widgets/server_app_bar_configuration.dart';
import '../widgets/no_internet_banner_widget.dart';

/// Abstract base class for screen states in the server app.
///
/// Similar to Android's BaseFragment pattern, this provides common functionality:
/// - Automatic connectivity monitoring with offline banner
/// - Page type identification (L0 home vs L1+ detail)
/// - App bar configuration for shell integration
///
/// ## Usage
/// ```dart
/// class _OrdersHomeScreenState extends BaseScreenState<OrdersHomeScreen> {
///   @override
///   PageType get pageType => PageType.homeLevel;
///
///   @override
///   ServerAppBarConfiguration get appBarConfiguration => ServerAppBarConfiguration(
///     additionalActions: [
///       IconButton(icon: Icon(Icons.refresh), onPressed: _refresh),
///     ],
///   );
///
///   @override
///   Widget build(BuildContext context) {
///     return wrapWithConnectivityBanner(
///       YourActualContent(),
///     );
///   }
/// }
/// ```
abstract class BaseScreenState<T extends StatefulWidget> extends State<T> {
  StreamSubscription<bool>? _connectivitySubscription;
  bool _isOnline = true;

  /// The type of page this screen represents.
  /// Override in subclass to specify.
  PageType get pageType;

  /// Configuration for the shared app bar.
  /// Override in subclass to customize actions, visibility, etc.
  /// Return null for screens that don't use the shared app bar.
  ServerAppBarConfiguration? get appBarConfiguration =>
      const ServerAppBarConfiguration();

  /// Convenience getter to check if this is a home-level (L0) page
  bool get isHomeLevel => pageType == PageType.homeLevel;

  /// Convenience getter to check if this is a detail-level (L1+) page
  bool get isDetailLevel => pageType == PageType.detailLevel;

  /// Current online status
  bool get isOnline => _isOnline;

  @override
  void initState() {
    super.initState();
    _subscribeToConnectivity();
  }

  @override
  void dispose() {
    _connectivitySubscription?.cancel();
    super.dispose();
  }

  void _subscribeToConnectivity() {
    final service = NetworkConnectivityService();
    _isOnline = service.isOnline;

    _connectivitySubscription =
        service.onConnectivityChanged.listen((isOnline) {
      if (mounted && _isOnline != isOnline) {
        setState(() {
          _isOnline = isOnline;
        });
      }
    });
  }

  /// Wraps child content with the connectivity banner.
  /// Use this in your build method to automatically show/hide the offline banner.
  ///
  /// The banner animates in below the app bar when offline.
  Widget wrapWithConnectivityBanner(Widget child) {
    return Column(
      children: [
        NoInternetBannerWidget(isVisible: !_isOnline),
        Expanded(child: child),
      ],
    );
  }

  /// Called when connectivity status changes.
  /// Override to handle connectivity changes in your screen.
  @protected
  void onConnectivityChanged(bool isOnline) {
    // Subclasses can override to react to connectivity changes
  }
}
