package com.platter.platter_kitchen

import android.content.Intent
import android.os.Build
import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.MethodChannel

class MainActivity: FlutterActivity() {
    // KT-5b · print_toggle.dart starts and stops PrintService through this channel.
    override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)
        MethodChannel(flutterEngine.dartExecutor.binaryMessenger, "plattr/print_service")
            .setMethodCallHandler { call, result ->
                val service = Intent(this, PrintService::class.java)
                when (call.method) {
                    "start" -> {
                        if (Build.VERSION.SDK_INT >= 26) startForegroundService(service) else startService(service)
                        result.success(null)
                    }
                    "stop" -> { stopService(service); result.success(null) }
                    else -> result.notImplemented()
                }
            }
    }

    // The agent lives in this activity's engine; when it goes, the service must not outlive it.
    override fun onDestroy() {
        stopService(Intent(this, PrintService::class.java))
        super.onDestroy()
    }
}
