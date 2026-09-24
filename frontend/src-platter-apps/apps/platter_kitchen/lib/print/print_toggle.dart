import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:platter_core/platter_core.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'print_agent.dart';

/// KT-5 · "This tablet prints". Off by default; the room turns it on (KT-0 row 2). While it is on, this widget
/// owns the one [PrintAgent] for the app and stops it on logout or when the switch goes off. The choice is kept
/// in shared preferences so a restart resumes printing without anyone remembering to tap.
///
/// KT-5b · while it is on, Android's PrintService (Kotlin, `connectedDevice`) keeps the process alive and the CPU
/// awake so the agent keeps polling with the screen off. Off, logout or the app going away stops both.
class PrintToggle extends StatefulWidget {
  const PrintToggle(
      {super.key, required this.restaurantId, required this.sessionId});
  final String restaurantId;
  final String sessionId;

  static const prefsKey = 'print.enabled';
  static const _service = MethodChannel('plattr/print_service');

  @override
  State<PrintToggle> createState() => _PrintToggleState();
}

class _PrintToggleState extends State<PrintToggle> {
  PrintAgent? _agent;
  bool _on = false;
  bool _ready = false;

  @override
  void initState() {
    super.initState();
    _restore();
  }

  Future<void> _restore() async {
    final prefs = await SharedPreferences.getInstance();
    final on = prefs.getBool(PrintToggle.prefsKey) ?? false;
    if (!mounted) return;
    setState(() {
      _on = on;
      _ready = true;
    });
    if (on) await _start(prefs);
  }

  /// Android only: the web build has no socket and no service. A refused start is logged, never fatal — the agent
  /// still prints while the app is on screen, and the till's red line catches a tablet that sleeps (KT-S23).
  static Future<void> _keepAwake(bool on) async {
    if (kIsWeb || defaultTargetPlatform != TargetPlatform.android) return;
    try {
      await PrintToggle._service.invokeMethod<void>(on ? 'start' : 'stop');
    } catch (e) {
      AppLogger.warning(jsonEncode(
          {'mod': 'print.agent', 'evt': 'service.failed', 'on': on, 'error': '$e'}));
    }
  }

  Future<void> _start(SharedPreferences prefs) async {
    await _keepAwake(true);
    final id = await PrintAgent.installId(prefs);
    if (!mounted) {
      await _keepAwake(false); // logged out while the service was starting: no agent on a dead session
      return;
    }
    final agent = PrintAgent(
        restaurantId: widget.restaurantId,
        sessionId: widget.sessionId,
        agentId: id);
    _agent = agent;
    await agent.start();
  }

  Future<void> _set(bool on) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(PrintToggle.prefsKey, on);
    if (!mounted) return;
    setState(() => _on = on);
    if (on) {
      await _start(prefs);
    } else {
      _agent?.stop();
      _agent = null;
      await _keepAwake(false);
    }
    AppLogger.info('print agent ${on ? 'on' : 'off'}');
  }

  @override
  void dispose() {
    if (_agent != null) _keepAwake(false);
    _agent?.stop();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Semantics(
      identifier: 'kitchen-print-toggle',
      label: 'This tablet prints',
      child: Tooltip(
        message: _on
            ? 'This tablet prints the tickets'
            : 'This tablet does not print',
        child: IconButton(
          icon: Icon(_on ? Icons.print : Icons.print_disabled,
              color: _on ? Colors.greenAccent : null),
          onPressed: _ready ? () => _set(!_on) : null,
        ),
      ),
    );
  }
}
