import 'package:flutter/material.dart';

import '../network/offline_status.dart';

/// OF-S5 · a red strip above the app while this device cannot reach the server. Nothing is disabled:
/// the screen keeps every figure it had and every tap is still attempted (blind, not quiet).
/// Wrap the app's navigator: `MaterialApp(builder: (_, child) => OfflineBanner(child: child!))`.
class OfflineBanner extends StatelessWidget {
  const OfflineBanner({super.key, required this.child, this.status});
  final Widget child;
  final OfflineStatus? status;

  @override
  Widget build(BuildContext context) {
    final s = status ?? OfflineStatus.instance;
    return AnimatedBuilder(
      animation: s,
      builder: (context, _) {
        final text = s.bannerText;
        return Column(
          children: [
            if (text != null)
              Material(
                color: Colors.red.shade700,
                child: SafeArea(
                  bottom: false,
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                    child: Row(children: [
                      const Icon(Icons.wifi_off, color: Colors.white, size: 16),
                      const SizedBox(width: 8),
                      Text(text, key: const Key('offline-banner'), style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w600)),
                    ]),
                  ),
                ),
              ),
            Expanded(child: child),
          ],
        );
      },
    );
  }
}
