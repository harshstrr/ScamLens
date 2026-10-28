
package com.harsh.ScamLens.quickscan

import android.app.Activity
import android.content.Intent
import android.media.projection.MediaProjectionManager
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.provider.Settings
import android.widget.TextView
import androidx.activity.result.contract.ActivityResultContracts

class QuickScanActivity : Activity() {

    companion object {
        private const val CAPTURE_REQUEST = 901
    }

    private var captureRequested = false
    private var settingsOpened = false

    private val overlaySettingsLauncher =
        registerForActivityResult(
            ActivityResultContracts.StartActivityForResult()
        ) {
            settingsOpened = false

            if (Settings.canDrawOverlays(this)) {
                requestScreenCapture()
            } else {
                showOverlayPermissionMessage()
            }
        }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        window.setBackgroundDrawableResource(android.R.color.transparent)

        @Suppress("DEPRECATION")
        overridePendingTransition(0, 0)
    }

    override fun onResume() {
        super.onResume()

        if (captureRequested || settingsOpened) return

        if (!Settings.canDrawOverlays(this)) {
            openOverlaySettings()
            return
        }

        requestScreenCapture()
    }

    private fun openOverlaySettings() {
        if (settingsOpened) return

        settingsOpened = true

        try {
            val intent = Intent(
                Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                Uri.parse("package:$packageName")
            )

            overlaySettingsLauncher.launch(intent)
        } catch (e: Exception) {
            settingsOpened = false
            QuickScanLog.e("Unable to open overlay settings", e)
            showOverlayPermissionMessage()
        }
    }

    private fun requestScreenCapture() {
        if (captureRequested) return

        // Recheck immediately before starting capture.
        if (!Settings.canDrawOverlays(this)) {
            openOverlaySettings()
            return
        }

        captureRequested = true

        try {
            val manager = getSystemService(
                MEDIA_PROJECTION_SERVICE
            ) as MediaProjectionManager

            @Suppress("DEPRECATION")
            startActivityForResult(
                manager.createScreenCaptureIntent(),
                CAPTURE_REQUEST
            )
        } catch (e: Exception) {
            captureRequested = false
            QuickScanLog.e("Unable to request screen capture", e)
            finish()
        }
    }

    @Deprecated("Uses the Android activity result callback")
    override fun onActivityResult(
        requestCode: Int,
        resultCode: Int,
        data: Intent?
    ) {
        super.onActivityResult(requestCode, resultCode, data)

        if (requestCode != CAPTURE_REQUEST) return

        if (resultCode != RESULT_OK || data == null) {
            finish()
            return
        }

        val serviceIntent = Intent(
            this,
            QuickScanCaptureService::class.java
        ).apply {
            action = QuickScanCaptureService.ACTION_CAPTURE
            putExtra(
                QuickScanCaptureService.EXTRA_RESULT_CODE,
                resultCode
            )
            putExtra(
                QuickScanCaptureService.EXTRA_RESULT_DATA,
                data
            )
        }

        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                startForegroundService(serviceIntent)
            } else {
                startService(serviceIntent)
            }

            finish()
        } catch (e: Exception) {
            QuickScanLog.e("Unable to start capture service", e)

            setContentView(TextView(this).apply {
                text = "Quick Scan could not start. Please try again."
                textSize = 18f
                setPadding(32, 48, 32, 32)
            })
        }
    }

    private fun showOverlayPermissionMessage() {
        setContentView(TextView(this).apply {
            text = "Display over other apps permission is required for Quick Scan. Please enable it in Settings and try again."
            textSize = 18f
            setPadding(32, 48, 32, 32)
        })
    }
}
