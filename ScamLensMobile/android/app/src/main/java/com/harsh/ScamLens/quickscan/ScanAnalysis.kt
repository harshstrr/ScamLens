
package com.harsh.ScamLens.quickscan

import android.content.Context
import org.json.JSONArray
import org.json.JSONObject
import expo.modules.mymodule.ScanHistoryPreferenceStore
import java.net.HttpURLConnection
import java.net.URL

data class ScanVerdict(
    val risk: String,
    val summary: String,
    val reasons: List<String>,
    val recommendation: String,
    val scanId: String? = null,
    val riskScore: Int? = null,
    val verdict: String? = null,
    val canViewReport: Boolean = false
)

internal object ScanAnalysis {

    private const val BASE_URL =
        "https://scamlens-76sd.onrender.com/api/v1"

    private const val ANALYSIS_ENDPOINT = "$BASE_URL/scans/analyze"
    private const val REFRESH_ENDPOINT = "$BASE_URL/auth/refresh"

    fun analyze(context: Context, text: String): ScanVerdict {
        require(text.isNotBlank()) { "Text to analyze cannot be empty." }

        val credentials = try {
            QuickScanCredentials.get(context)
        } catch (e: Exception) {
            QuickScanLog.e("Unable to read secure credentials", e)
            throw IllegalStateException(
                "Unable to access secure credentials. Open ScamLens and sign in again."
            )
        }

        // No saved credentials: preserve guest scanning.
        if (credentials == null) {
            return callAnalysisApi(
                text = text.take(40000),
                accessToken = null,
                saveToHistory = false,
                saveToContent = false
            )
        }

        val saveToHistory = ScanHistoryPreferenceStore(context).isEnabled()

        // Refresh first because the access token may have expired.
        val refreshed = try {
            refreshCredentials(context, credentials.secretKey)
        } catch (e: Exception) {
            QuickScanLog.e("Credential refresh failed", e)
            throw IllegalStateException(
                "Your ScamLens session could not be refreshed. Open the app and sign in again."
            )
        }

        return callAnalysisApi(
            text = text.take(40000),
            accessToken = refreshed.first,
            saveToHistory = saveToHistory,
            saveToContent = saveToHistory
        )
    }

    private fun refreshCredentials(
        context: Context,
        secretKey: String
    ): Pair<String, String> {
        val connection =
            URL(REFRESH_ENDPOINT).openConnection() as HttpURLConnection

        try {
            connection.requestMethod = "POST"
            connection.connectTimeout = 15000
            connection.readTimeout = 20000
            connection.doOutput = true
            connection.setRequestProperty(
                "Content-Type",
                "application/json; charset=utf-8"
            )
            connection.setRequestProperty("Accept", "application/json")

            val payload = JSONObject().put("secret_key", secretKey)

            connection.outputStream.use { output ->
                output.write(payload.toString().toByteArray(Charsets.UTF_8))
            }

            val status = connection.responseCode
            val stream = if (status in 200..299) {
                connection.inputStream
            } else {
                connection.errorStream
            }

            val raw = stream?.bufferedReader()?.use { it.readText() }.orEmpty()

            if (status !in 200..299) {
                QuickScanLog.e("Refresh API returned HTTP $status: ${raw.take(300)}")
                throw IllegalStateException("Refresh failed (HTTP $status)")
            }

            val response = JSONObject(raw)
            val accessToken = response.getString("access_token")
            val rotatedSecretKey = response.getString("secret_key")

            require(accessToken.isNotBlank() && rotatedSecretKey.isNotBlank()) {
                "Refresh response did not contain valid credentials."
            }

            // Persist the rotated key before proceeding with the scan.
            QuickScanCredentials.save(
                context,
                accessToken,
                rotatedSecretKey
            )

            return accessToken to rotatedSecretKey
        } finally {
            connection.disconnect()
        }
    }

    private fun callAnalysisApi(
        text: String,
        accessToken: String?,
        saveToHistory: Boolean,
        saveToContent: Boolean
    ): ScanVerdict {
        val connection =
            URL(ANALYSIS_ENDPOINT).openConnection() as HttpURLConnection

        try {
            connection.requestMethod = "POST"
            connection.connectTimeout = 15000
            connection.readTimeout = 20000
            connection.doOutput = true

            connection.setRequestProperty(
                "Content-Type",
                "application/json; charset=utf-8"
            )
            connection.setRequestProperty("Accept", "application/json")

            if (!accessToken.isNullOrBlank()) {
                connection.setRequestProperty(
                    "Authorization",
                    "Bearer $accessToken"
                )
            }

            val payload = JSONObject()
                .put("text", text)
                .put("source_type", "quick_scan")
                .put("source_title", "ScamLens Quick Scan")
                .put("save_to_history", saveToHistory)
                .put("save_content", saveToContent)

            connection.outputStream.use { output ->
                output.write(payload.toString().toByteArray(Charsets.UTF_8))
            }

            val status = connection.responseCode
            val stream = if (status in 200..299) {
                connection.inputStream
            } else {
                connection.errorStream
            }

            val raw = stream?.bufferedReader()?.use { it.readText() }.orEmpty()

            if (status !in 200..299) {
                QuickScanLog.e("Scan API returned HTTP $status: ${raw.take(500)}")
                throw IllegalStateException("Scan request failed (HTTP $status)")
            }

            val response = JSONObject(raw)
            val findings = response.optJSONArray("findings") ?: JSONArray()

            val reasons = (0 until findings.length()).mapNotNull { index ->
                val finding = findings.optJSONObject(index)
                    ?: return@mapNotNull null

                val title = finding.optString("title", "").trim()
                val detail = finding.optString("detail", "").trim()

                when {
                    title.isBlank() -> detail.takeIf { it.isNotBlank() }
                    detail.isBlank() -> title
                    else -> "$title: $detail"
                }
            }

            val recommendations =
                response.optJSONArray("recommendations") ?: JSONArray()

            val recommendationText = (0 until recommendations.length())
                .map { recommendations.optString(it) }
                .filter { it.isNotBlank() }
                .joinToString("\n")

            return ScanVerdict(
                risk = response.optString("risk_level", "unknown").lowercase(),
                summary = response.optString("summary", "Analysis completed."),
                reasons = reasons.ifEmpty {
                    listOf("No specific indicators were returned.")
                },
                recommendation = recommendationText.ifBlank {
                    "Verify independently through an official channel."
                },
                scanId = response.optString("id")
                    .takeIf { it.isNotBlank() && it != "null" },
                riskScore = if (response.has("risk_score")) {
                    response.optInt("risk_score")
                } else {
                    null
                },
                verdict = response.optString("verdict")
                    .takeIf { it.isNotBlank() },
                canViewReport = saveToHistory &&
                    !accessToken.isNullOrBlank() &&
                    response.optString("id").isNotBlank() &&
                    response.optString("id") != "null"
            )
        } finally {
            connection.disconnect()
        }
    }
}
