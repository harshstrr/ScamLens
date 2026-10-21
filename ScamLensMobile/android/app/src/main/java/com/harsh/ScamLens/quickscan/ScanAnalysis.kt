
package com.harsh.ScamLens.quickscan


import org.json.JSONArray
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL

data class ScanVerdict(
    val risk: String,
    val summary: String,
    val reasons: List<String>,
    val recommendation: String
)

internal object ScanAnalysis {
    // Set this to your HTTPS backend endpoint; never embed a private server secret here.
    private const val ANALYSIS_ENDPOINT = "https://perch-carnation-improving.ngrok-free.dev/scan"

    fun analyze(text: String): ScanVerdict {
        if (ANALYSIS_ENDPOINT.isNotBlank()) {
            try { return callApi(text) }
            catch (e: Exception) { QuickScanLog.e("Analysis API failed; using demo fallback", e) }
        }
        return heuristic(text)
    }

    private fun callApi(text: String): ScanVerdict {
        val conn = URL(ANALYSIS_ENDPOINT).openConnection() as HttpURLConnection
        try {
            conn.requestMethod = "POST"
            conn.connectTimeout = 8000
            conn.readTimeout = 12000
            conn.doOutput = true
            conn.setRequestProperty("Content-Type", "application/json; charset=utf-8")
            conn.setRequestProperty("Accept", "application/json")
            val payload = JSONObject().put("text", text.take(12000))
                .put("source", "android_quick_scan").toString()
            conn.outputStream.use { it.write(payload.toByteArray(Charsets.UTF_8)) }
            val status = conn.responseCode
            val stream = if (status in 200..299) conn.inputStream else conn.errorStream
            val raw = stream?.bufferedReader()?.use { it.readText() }.orEmpty()
            if (status !in 200..299) error("API returned HTTP $status")
            val obj = JSONObject(raw)
            val arr = obj.optJSONArray("reasons") ?: JSONArray()
            val reasons = (0 until arr.length()).map { arr.optString(it) }.filter { it.isNotBlank() }
            val risk = obj.optString("risk", "unknown").lowercase()
            return ScanVerdict(
                if (risk in listOf("low", "medium", "high", "unknown")) risk else "unknown",
                obj.optString("summary", "Analysis completed."),
                reasons,
                obj.optString("recommendation", "Verify independently through an official channel.")
            )
        } finally { conn.disconnect() }
    }

    // Demo only: keyword checks cannot reliably determine whether a message is a scam.
    private fun heuristic(text: String): ScanVerdict {
        val lower = text.lowercase()
        val reasons = mutableListOf<String>()
        if (listOf("urgent", "immediately", "within 24 hours", "blocked", "suspended", "last warning").any { it in lower })
            reasons += "Urgent or threatening language"
        if (listOf("otp", "one time password", "pin", "password", "cvv", "share your code").any { it in lower })
            reasons += "Sensitive credential or code request"
        if (listOf("claim reward", "you won", "prize", "lottery", "free gift").any { it in lower })
            reasons += "Unexpected reward or prize claim"
        if (Regex("""https?://|www\.""", RegexOption.IGNORE_CASE).containsMatchIn(text))
            reasons += "Contains a link that should be verified"
        val risk = when (reasons.size) { 0 -> "unknown"; 1, 2 -> "medium"; else -> "high" }
        return ScanVerdict(
            risk,
            if (reasons.isEmpty()) "No obvious keyword indicator was found. This does not prove the message is safe."
            else "Potential warning signs were found. This is only a preliminary check.",
            reasons.ifEmpty { listOf("No obvious keyword indicators; message context was not verified") },
            "Never share OTPs, PINs, passwords, or payment details. Verify independently through an official app or website."
        )
    }
}
