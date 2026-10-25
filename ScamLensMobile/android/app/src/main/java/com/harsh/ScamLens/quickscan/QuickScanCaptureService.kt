
package com.harsh.ScamLens.quickscan

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.PixelFormat
import android.hardware.display.DisplayManager
import android.hardware.display.VirtualDisplay
import android.media.Image
import android.media.ImageReader
import android.media.projection.MediaProjection
import android.media.projection.MediaProjectionManager
import android.os.Build
import android.os.Handler
import android.os.HandlerThread
import android.os.IBinder
import android.provider.Settings
import androidx.core.app.NotificationCompat
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.text.TextRecognition
import com.google.mlkit.vision.text.latin.TextRecognizerOptions
import java.util.concurrent.atomic.AtomicBoolean

class QuickScanCaptureService : Service() {
    companion object {
        const val ACTION_CAPTURE = "com.harsh.ScamLens.quickscan.CAPTURE"
        const val ACTION_DISMISS = "com.harsh.ScamLens.quickscan.DISMISS"
        const val EXTRA_RESULT_CODE = "capture_result_code"
        const val EXTRA_RESULT_DATA = "capture_result_data"
        private const val CHANNEL = "scamlens_quick_scan"
        private const val NOTIFICATION_ID = 7402
    }

    private var projection: MediaProjection? = null
    private var display: VirtualDisplay? = null
    private var reader: ImageReader? = null
    private var thread: HandlerThread? = null
    private var handler: Handler? = null
    private var overlay: ResultOverlay? = null
    private val started = AtomicBoolean(false)

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        if (intent?.action == ACTION_DISMISS) {
            stopEverything()
            return START_NOT_STICKY
        }
        if (intent?.action != ACTION_CAPTURE) {
            stopSelf()
            return START_NOT_STICKY
        }
        createChannel()
        startForeground(NOTIFICATION_ID, notification("Capturing one screen…"))
        val code = intent.getIntExtra(EXTRA_RESULT_CODE, 0)
        @Suppress("DEPRECATION")
        val data: Intent? = if (Build.VERSION.SDK_INT >= 33)
            intent.getParcelableExtra(EXTRA_RESULT_DATA, Intent::class.java)
        else intent.getParcelableExtra(EXTRA_RESULT_DATA)
        if (code == 0 || data == null) {
            showResult(ScanVerdict("unknown", "Screen-capture consent was not received.",
                listOf("No capture was performed"), "Try again from the Quick Settings tile."))
            return START_NOT_STICKY
        }
        Handler(mainLooper).postDelayed({ startCapture(code, data) }, 450)
        return START_NOT_STICKY
    }

    private fun startCapture(code: Int, data: Intent) {
        if (!started.compareAndSet(false, true)) return
        try {
            val manager = getSystemService(Context.MEDIA_PROJECTION_SERVICE) as MediaProjectionManager
            projection = manager.getMediaProjection(code, data)
            val mp = projection ?: error("MediaProjection unavailable")
            mp.registerCallback(object : MediaProjection.Callback() {
                override fun onStop() { releaseDisplayReader() }
            }, Handler(mainLooper))

            thread = HandlerThread("ScamLensOcr").also { it.start() }
            handler = Handler(thread!!.looper)
            val width = resources.displayMetrics.widthPixels.coerceAtLeast(1)
            val height = resources.displayMetrics.heightPixels.coerceAtLeast(1)
            val density = resources.displayMetrics.densityDpi
            reader = ImageReader.newInstance(width, height, PixelFormat.RGBA_8888, 2)
            reader!!.setOnImageAvailableListener({ source ->
                val image = try { source.acquireLatestImage() } catch (_: Exception) { null }
                if (image != null) {
                    source.setOnImageAvailableListener(null, null)
                    handler?.post { recognize(image) }
                }
            }, handler)
            display = mp.createVirtualDisplay(
                "ScamLensOneShot", width, height, density,
                DisplayManager.VIRTUAL_DISPLAY_FLAG_AUTO_MIRROR, reader!!.surface, null, handler
            )
        } catch (e: Exception) {
            QuickScanLog.e("Capture initialization failed", e)
            showResult(ScanVerdict("unknown", "Screen capture failed.",
                listOf("The device did not allow the capture session to start"),
                "Try again. If the issue persists, restart ScamLens."))
        }
    }

    private fun prepareOcrText(rawText: String): String {
        return rawText
            .replace("\u0000", "")
            .replace("\r\n", "\n")
            .replace('\r', '\n')
            .trim()
            .take(40000)
    }
        
    private fun recognize(image: Image) {
        val bitmap = try {
            toBitmap(image)
        } catch (e: Exception) {
            QuickScanLog.e("Frame conversion failed", e)
            null
        } finally {
            image.close()
        }

        if (bitmap == null) {
            runMain {
                showResult(unknown("Could not read the captured screen."))
            }
            return
        }

        val recognizer = TextRecognition.getClient(
            TextRecognizerOptions.DEFAULT_OPTIONS
        )

        recognizer.process(InputImage.fromBitmap(bitmap, 0))
            .addOnSuccessListener { result ->
                val extractedText = prepareOcrText(result.text)
                
                bitmap.recycle()
                recognizer.close()
                releaseProjection()

                if (extractedText.isBlank()) {
                    showResult(
                        unknown("No readable text was found on this screen.")
                    )
                    return@addOnSuccessListener
                }

                // Show the loading sheet while risk analysis runs.
                runMain {
                    if (Settings.canDrawOverlays(this)) {
                        if (overlay == null) {
                            overlay = ResultOverlay(
                                context = this,
                                onDismiss = { stopEverything() },
                                onViewReport = { verdict ->
                                    openAppFallback(verdict)
                                    stopEverything()
                                }
                            )
                        }
                        overlay?.showLoading()
                    }
                }

                Thread {
                    val verdict = try {
                        ScanAnalysis.analyze(applicationContext, extractedText)
                    } catch (e: Exception) {
                        QuickScanLog.e("Risk analysis failed", e)
                        unknown("Analysis failed. Please try again.")
                    }

                    runMain {
                        showResult(verdict)
                    }
                }.start()
            }
            .addOnFailureListener { error ->
                bitmap.recycle()
                recognizer.close()
                QuickScanLog.e("ML Kit OCR failed", error)
                releaseProjection()

                runMain {
                    showResult(
                        unknown("Text recognition failed. Please try again.")
                    )
                }
            }
    }


    private fun toBitmap(image: Image): Bitmap {
        val plane = image.planes[0]
        val rowPadding = plane.rowStride - plane.pixelStride * image.width
        val paddedWidth = image.width + rowPadding / plane.pixelStride
        val padded = Bitmap.createBitmap(paddedWidth, image.height, Bitmap.Config.ARGB_8888)
        padded.copyPixelsFromBuffer(plane.buffer)
        val cropped = Bitmap.createBitmap(padded, 0, 0, image.width, image.height)
        padded.recycle()
        return cropped
    }

    private fun unknown(message: String) = ScanVerdict(
        "unknown", message, listOf("No definitive analysis was produced"),
        "Try again or use the manual scan in ScamLens."
    )

    
    private fun showResult(verdict: ScanVerdict) {
        runMain {
            if (!Settings.canDrawOverlays(this)) {
                openAppFallback(verdict)
                stopEverything()
                return@runMain
            }

            try {
                if (overlay == null) {
                    overlay = ResultOverlay(
                        context = this,
                        onDismiss = { stopEverything() },
                        onViewReport = { verdict ->
                            openAppFallback(verdict)
                            stopEverything()
                        }
                    )
                    }
                overlay?.showResult(verdict)

                val manager =
                    getSystemService(Context.NOTIFICATION_SERVICE)
                        as NotificationManager
                manager.notify(
                    NOTIFICATION_ID,
                    notification("Scan complete — dismiss the result card to finish")
                )
            } catch (e: Exception) {
                QuickScanLog.e("Overlay display failed", e)
                openAppFallback(verdict)
                stopEverything()
            }
        }
    }


    private fun openAppFallback(verdict: ScanVerdict) {
        val launch = packageManager.getLaunchIntentForPackage(packageName) ?: Intent(this, QuickScanActivity::class.java)
        launch.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
        launch.putExtra("quick_scan_risk", verdict.risk)
        launch.putExtra("quick_scan_summary", verdict.summary)
        startActivity(launch)
    }

    private fun runMain(action: () -> Unit) { Handler(mainLooper).post(action) }

    private fun createChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(CHANNEL, "ScamLens Quick Scan", NotificationManager.IMPORTANCE_LOW)
            (getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager).createNotificationChannel(channel)
        }
    }

    private fun notification(message: String): Notification {
        val dismiss = Intent(this, QuickScanCaptureService::class.java).setAction(ACTION_DISMISS)
        val pending = PendingIntent.getService(this, 7403, dismiss,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
        return NotificationCompat.Builder(this, CHANNEL)
            .setSmallIcon(android.R.drawable.ic_menu_search)
            .setContentTitle("ScamLens Quick Scan")
            .setContentText(message)
            .setOngoing(true)
            .addAction(android.R.drawable.ic_menu_close_clear_cancel, "Dismiss", pending)
            .build()
    }

    private fun releaseProjection() {
        releaseDisplayReader()
        try { projection?.stop() } catch (_: Exception) {}
        projection = null
    }

    private fun releaseDisplayReader() {
        try { display?.release() } catch (_: Exception) {}
        display = null
        try { reader?.close() } catch (_: Exception) {}
        reader = null
    }

    
private fun stopEverything() {
    val currentOverlay = overlay
    overlay = null
    currentOverlay?.dismiss()

    releaseProjection()

    try {
        thread?.quitSafely()
    } catch (_: Exception) {
    }

    thread = null
    handler = null

    stopForeground(STOP_FOREGROUND_REMOVE)
    stopSelf()
}


    override fun onDestroy() {
        overlay?.dismiss()
        releaseProjection()
        try { thread?.quitSafely() } catch (_: Exception) {}
        super.onDestroy()
    }
}
