
package com.harsh.ScamLens.quickscan

import android.content.Context
import expo.modules.mymodule.SecureCredentialStore
import expo.modules.mymodule.StoredCredentials

internal object QuickScanCredentials {

    fun get(context: Context): StoredCredentials? {
        return SecureCredentialStore(context.applicationContext).get()
    }

    fun save(
        context: Context,
        accessToken: String,
        secretKey: String
    ) {
        SecureCredentialStore(context.applicationContext)
            .save(accessToken, secretKey)
    }

    fun clear(context: Context) {
        SecureCredentialStore(context.applicationContext).clear()
    }
}
