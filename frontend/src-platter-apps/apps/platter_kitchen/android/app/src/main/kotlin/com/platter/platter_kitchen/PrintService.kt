package com.platter.platter_kitchen

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Intent
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.IBinder
import android.os.PowerManager

/**
 * KT-5b · keeps the kitchen app's process alive and its CPU awake while "This tablet prints" is on, so the Dart
 * print agent keeps polling with the screen off. It prints nothing and knows nothing about jobs: the agent is
 * still the Dart loop in print_agent.dart. Type `connectedDevice` (a LAN printer is an external device over a
 * network connection), not `dataSync`, which Android 15 caps at six hours a day. Sheet: SPEC_KT_print_path.md.
 *
 * Alive only while the Flutter engine is: MainActivity stops it in onDestroy, and `stopWithTask` stops it when the
 * app is swiped away, so the notification never claims printing that is not happening. Not sticky: if Android
 * kills the process there is no agent to keep awake, and the till's red line (KT-S23) is what notices.
 */
class PrintService : Service() {
    private var wakeLock: PowerManager.WakeLock? = null

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val open = PendingIntent.getActivity(
            this, 0, Intent(this, MainActivity::class.java), PendingIntent.FLAG_IMMUTABLE
        )
        val builder = if (Build.VERSION.SDK_INT >= 26) {
            getSystemService(NotificationManager::class.java).createNotificationChannel(
                NotificationChannel(CHANNEL, "Printing", NotificationManager.IMPORTANCE_LOW)
            )
            Notification.Builder(this, CHANNEL)
        } else {
            @Suppress("DEPRECATION") Notification.Builder(this)
        }
        val n = builder
            .setContentTitle("Printing tickets")
            .setContentText("This tablet prints the kitchen, bar and counter tickets")
            .setSmallIcon(R.mipmap.ic_launcher)
            .setContentIntent(open)
            .setOngoing(true)
            .build()
        if (Build.VERSION.SDK_INT >= 29) {
            startForeground(ID, n, ServiceInfo.FOREGROUND_SERVICE_TYPE_CONNECTED_DEVICE)
        } else {
            startForeground(ID, n)
        }
        if (wakeLock == null) {
            // Screen off → CPU sleeps → the Dart timer stops. Released in onDestroy; a kitchen tablet is on a charger.
            wakeLock = (getSystemService(POWER_SERVICE) as PowerManager)
                .newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "plattr:print")
                .apply { setReferenceCounted(false); acquire() }
        }
        return START_NOT_STICKY
    }

    override fun onDestroy() {
        wakeLock?.release()
        wakeLock = null
        super.onDestroy()
    }

    private companion object {
        const val CHANNEL = "print"
        const val ID = 9100
    }
}
