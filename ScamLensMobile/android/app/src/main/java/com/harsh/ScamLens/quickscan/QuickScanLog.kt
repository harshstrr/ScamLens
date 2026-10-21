
package com.harsh.ScamLens.quickscan

import android.util.Log

internal object QuickScanLog {
    private const val TAG = "ScamLensQuickScan"
    fun d(message: String) = Log.d(TAG, message)
    fun e(message: String, error: Throwable? = null) {
        if (error == null) Log.e(TAG, message) else Log.e(TAG, message, error)
    }
}
