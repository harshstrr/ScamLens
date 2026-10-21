
package com.harsh.ScamLens.quickscan

import android.app.Activity
import android.content.Intent
import android.media.projection.MediaProjectionManager
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.provider.Settings
import android.widget.TextView

class QuickScanActivity : Activity() {

    companion object {
        private const val CAPTURE_REQUEST = 901
    }

    private var captureRequested = false
    private var settingsOpened = false

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
    }

    override fun onResume() {
        super.onResume()
        if (captureRequested) return

        if (!Settings.canDrawOverlays(this)) {
            if (!settingsOpened) {
                settingsOpened = true
                startActivity(
                    Intent(
                        Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                        Uri.parse("package:$packageName")
                    )
                )
            } else {
                finish()
                overridePendingTransition(0, 0)
            }
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
}
