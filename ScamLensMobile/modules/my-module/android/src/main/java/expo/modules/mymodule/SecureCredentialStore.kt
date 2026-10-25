
package expo.modules.mymodule

import android.content.Context
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import android.util.Base64
import org.json.JSONObject
import java.nio.charset.StandardCharsets
import java.security.KeyStore
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec

data class StoredCredentials(
    val accessToken: String,
    val secretKey: String
)

class SecureCredentialStore(context: Context) {

    companion object {
        private const val PREFS_NAME = "scamlens_secure_credentials"
        private const val KEY_ALIAS = "scamlens_credentials_key"
        private const val CIPHER = "AES/GCM/NoPadding"
        private const val IV_LENGTH = 12
        private const val TAG_LENGTH_BITS = 128
    }

    private val prefs = context.applicationContext.getSharedPreferences(
        PREFS_NAME,
        Context.MODE_PRIVATE
    )

    @Synchronized
    fun save(accessToken: String, secretKey: String) {
        require(accessToken.isNotBlank()) { "Access token cannot be empty" }
        require(secretKey.isNotBlank()) { "Secret key cannot be empty" }

        val json = JSONObject()
            .put("access_token", accessToken)
            .put("secret_key", secretKey)
            .toString()

        val encrypted = encrypt(json.toByteArray(StandardCharsets.UTF_8))

        check(
            prefs.edit()
                .putString("credentials", Base64.encodeToString(encrypted, Base64.NO_WRAP))
                .commit()
        ) { "Could not save credentials" }
    }

    @Synchronized
    fun get(): StoredCredentials? {
        val stored = prefs.getString("credentials", null) ?: return null

        val encrypted = Base64.decode(stored, Base64.NO_WRAP)
        val json = JSONObject(
            String(decrypt(encrypted), StandardCharsets.UTF_8)
        )

        return StoredCredentials(
            accessToken = json.getString("access_token"),
            secretKey = json.getString("secret_key")
        )
    }

    @Synchronized
    fun clear() {
        check(prefs.edit().remove("credentials").commit()) {
            "Could not clear credentials"
        }
    }

    private fun getOrCreateSecretKey(): SecretKey {
        val keyStore = KeyStore.getInstance("AndroidKeyStore").apply {
            load(null)
        }

        (keyStore.getKey(KEY_ALIAS, null) as? SecretKey)?.let { return it }

        val generator = KeyGenerator.getInstance(
            KeyProperties.KEY_ALGORITHM_AES,
            "AndroidKeyStore"
        )

        generator.init(
            KeyGenParameterSpec.Builder(
                KEY_ALIAS,
                KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT
            )
                .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
                .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
                .setRandomizedEncryptionRequired(true)
                .build()
        )

        return generator.generateKey()
    }

    private fun encrypt(plaintext: ByteArray): ByteArray {
        val cipher = Cipher.getInstance(CIPHER)
        cipher.init(Cipher.ENCRYPT_MODE, getOrCreateSecretKey())
        return cipher.iv + cipher.doFinal(plaintext)
    }

    private fun decrypt(payload: ByteArray): ByteArray {
        require(payload.size > IV_LENGTH) { "Invalid encrypted credentials" }

        val iv = payload.copyOfRange(0, IV_LENGTH)
        val ciphertext = payload.copyOfRange(IV_LENGTH, payload.size)

        val cipher = Cipher.getInstance(CIPHER)
        cipher.init(
            Cipher.DECRYPT_MODE,
            getOrCreateSecretKey(),
            GCMParameterSpec(TAG_LENGTH_BITS, iv)
        )

        return cipher.doFinal(ciphertext)
    }
}
