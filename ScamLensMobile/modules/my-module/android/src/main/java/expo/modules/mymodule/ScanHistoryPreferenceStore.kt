package expo.modules.mymodule

import android.content.Context

class ScanHistoryPreferenceStore(context: Context) {
    companion object {
        private const val PREFS_NAME = "scamlens_scan_preferences"
        private const val KEY_HISTORY_ENABLED = "scan_history_enabled"
    }

    private val preferences = context.applicationContext.getSharedPreferences(
        PREFS_NAME,
        Context.MODE_PRIVATE
    )

    fun isEnabled(): Boolean =
        preferences.getBoolean(KEY_HISTORY_ENABLED, true)

    fun setEnabled(enabled: Boolean) {
        check(
            preferences.edit()
                .putBoolean(KEY_HISTORY_ENABLED, enabled)
                .commit()
        ) { "Could not save scan history preference." }
    }
}
