
package expo.modules.mymodule

import android.util.Base64
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class MyModule : Module() {

    override fun definition() = ModuleDefinition {
        Name("MyModule")

        AsyncFunction("saveCredentials") { accessToken: String, secretKey: String ->
            SecureCredentialStore(requireContext()).save(accessToken, secretKey)
            true
        }

        AsyncFunction("getCredentials") {
            val credentials = SecureCredentialStore(requireContext()).get()
                ?: return@AsyncFunction null

            mapOf(
                "accessToken" to credentials.accessToken,
                "secretKey" to credentials.secretKey
            )
        }

        AsyncFunction("clearCredentials") {
            SecureCredentialStore(requireContext()).clear()
            true
        }

        AsyncFunction("setScanHistoryEnabled") { enabled: Boolean ->
            ScanHistoryPreferenceStore(requireContext()).setEnabled(enabled)
            true
        }
    }

    private fun requireContext() =
        appContext.reactContext?.applicationContext
            ?: throw IllegalStateException("Android context is unavailable")
}
