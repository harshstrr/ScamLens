
package com.harsh.ScamLens.quickscan

import android.content.Context
import android.graphics.Color
import android.graphics.PixelFormat
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.os.Build
import android.provider.Settings
import android.util.TypedValue
import android.view.Gravity
import android.view.View
import android.view.WindowManager
import android.widget.Button
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.TextView

import com.harsh.ScamLens.R

internal class ResultOverlay(
    private val context: Context,
    private val onDismiss: () -> Unit,
    private val onViewReport: (ScanVerdict) -> Unit
) {
    private var currentVerdict: ScanVerdict? = null
    private val wm =
        context.getSystemService(Context.WINDOW_SERVICE) as WindowManager

    private var root: LinearLayout? = null
    private var panel: LinearLayout? = null
    private var loading = false

    private fun dp(n: Int) =
        (n * context.resources.displayMetrics.density).toInt()

    private fun rounded(color: Int, radius: Int) =
        GradientDrawable().apply {
            setColor(color)
            cornerRadius = dp(radius).toFloat()
        }

    /** Rounded top corners only, flat bottom (sheet touches screen edge). */
    private fun topRounded(color: Int, radius: Int) =
        GradientDrawable().apply {
            setColor(color)
            val r = dp(radius).toFloat()
            cornerRadii = floatArrayOf(r, r, r, r, 0f, 0f, 0f, 0f)
        }

    private fun navBarHeight(): Int {
        val id = context.resources
            .getIdentifier("navigation_bar_height", "dimen", "android")
        return if (id > 0) context.resources.getDimensionPixelSize(id) else 0
    }

    private fun text(
        value: String,
        size: Float,
        color: Int = 0xFF171717.toInt(),
        bold: Boolean = false
    ) = TextView(context).apply {
        text = value
        setTextSize(TypedValue.COMPLEX_UNIT_SP, size)
        setTextColor(color)
        if (bold) setTypeface(typeface, Typeface.BOLD)
        setLineSpacing(dp(2).toFloat(), 1f)
    }

    private fun space(height: Int) =
        View(context).apply {
            layoutParams = LinearLayout.LayoutParams(-1, dp(height))
        }

    private fun skeleton(widthFraction: Float, height: Int = 10) =
        View(context).apply {
            background = rounded(0xFFEDEDED.toInt(), 8)
            val contentWidth =
                context.resources.displayMetrics.widthPixels - dp(40)
            layoutParams = LinearLayout.LayoutParams(
                (contentWidth * widthFraction).toInt(),
                dp(height)
            ).apply {
                bottomMargin = dp(10)
            }
        }

    private fun styledButton(
        label: String,
        bg: Int,
        fg: Int,
        strokeColor: Int? = null
    ) = Button(context).apply {
        text = label
        isAllCaps = false
        stateListAnimator = null
        elevation = 0f
        setTextSize(TypedValue.COMPLEX_UNIT_SP, 14f)
        setTypeface(typeface, Typeface.BOLD)
        setTextColor(fg)
        minHeight = 0
        minimumHeight = 0
        setPadding(dp(18), 0, dp(18), 0)
        background = GradientDrawable().apply {
            setColor(bg)
            cornerRadius = dp(12).toFloat()
            if (strokeColor != null) setStroke(dp(1), strokeColor)
        }
    }

    fun showLoading() {
        if (!Settings.canDrawOverlays(context) || root != null) return
        loading = true
        buildSheet()
        addHeader()

        panel!!.addView(
            text("Checking the screen you shared", 20f, bold = true)
        )
        panel!!.addView(space(8))
        panel!!.addView(
            text(
                "Looking at visible text only. No assessment is ready yet.",
                12f, 0xFF777777.toInt()
            )
        )
        panel!!.addView(space(14))
        panel!!.addView(skeleton(1f, 12))
        panel!!.addView(skeleton(1f, 10))
        panel!!.addView(skeleton(0.45f, 10))
        panel!!.addView(space(4))
        panel!!.addView(
            text(
                "Capture was approved for this session.",
                11f, 0xFF777777.toInt()
            )
        )
        addActions(showReport = false)
        attach()
    }

    fun showResult(verdict: ScanVerdict) {
        if (!Settings.canDrawOverlays(context)) return

        currentVerdict = verdict

        if (root == null) {
            loading = false
            buildSheet()
            addHeader()
            addVerdict(verdict)
            addActions(showReport = true)
            attach()
            return
        }

        loading = false
        val sheet = panel ?: return
        sheet.removeAllViews()
        addHeader()
        addVerdict(verdict)
        addActions(showReport = true)
    }

    private fun buildSheet() {
        panel = LinearLayout(context).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(dp(20), dp(10), dp(20), dp(20) + navBarHeight())
            background = topRounded(Color.WHITE, 24)
            isClickable = true // keep taps inside the sheet
        }

        root = LinearLayout(context).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.BOTTOM
            // Single scrim (no FLAG_DIM_BEHIND) so opacity isn't doubled
            setBackgroundColor(0x80000000.toInt())
            addView(panel, LinearLayout.LayoutParams(-1, -2))
            setOnClickListener { dismiss() }
        }
    }

    private fun addHeader() {
        val sheet = panel ?: return

        // Grab handle
        sheet.addView(
            View(context).apply {
                background = rounded(0xFFD9D9D9.toInt(), 5)
                layoutParams = LinearLayout.LayoutParams(dp(38), dp(4)).apply {
                    gravity = Gravity.CENTER_HORIZONTAL
                    bottomMargin = dp(12)
                }
            }
        )

        val header = LinearLayout(context).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL
        }

        // Shield logo
        header.addView(
            ImageView(context).apply {
                setImageResource(R.drawable.ic_shield)
                scaleType = ImageView.ScaleType.FIT_CENTER
            },
            LinearLayout.LayoutParams(dp(24), dp(24)).apply {
                marginEnd = dp(8)
            }
        )

        // Title (takes remaining space, pushes close button to the far right)
        header.addView(
            text("ScamLens", 17f, bold = true),
            LinearLayout.LayoutParams(0, -2, 1f)
        )

        // Close icon, top-right, comfortable 40dp touch target
        header.addView(
            ImageView(context).apply {
                setImageResource(R.drawable.ic_close)
                scaleType = ImageView.ScaleType.CENTER_INSIDE
                setPadding(dp(10), dp(10), dp(10), dp(10))
                background = rounded(0xFFF2F2F2.toInt(), 20)
                contentDescription = "Close"
                setOnClickListener { dismiss() }
            },
            LinearLayout.LayoutParams(dp(40), dp(40))
        )

        sheet.addView(
            header,
            LinearLayout.LayoutParams(-1, -2)
        )
        sheet.addView(space(16))
    }

    private fun addVerdict(verdict: ScanVerdict) {
        val sheet = panel ?: return

        val riskColor = when (verdict.risk.lowercase()) {
            "high" -> 0xFFB42318.toInt()
            "medium" -> 0xFFB54708.toInt()
            "low" -> 0xFF16803D.toInt()
            else -> 0xFF667085.toInt()
        }

        sheet.addView(
            text("${verdict.risk.uppercase()} RISK", 12f, riskColor, true)
        )
        sheet.addView(space(6))
        sheet.addView(text(verdict.summary, 19f, bold = true))
        sheet.addView(space(8))

        sheet.addView(
            text(
                "This is an automated assessment of visible text. " +
                    "It cannot guarantee safety.",
                12f, 0xFF777777.toInt()
            )
        )
        sheet.addView(space(16))
        sheet.addView(text("Why this matters", 14f, bold = true))
        sheet.addView(space(6))

        val reasons = verdict.reasons.take(4)
        sheet.addView(
            text(
                reasons.joinToString("\n") { "•  $it" },
                13f, 0xFF333333.toInt()
            )
        )
        sheet.addView(space(16))
        sheet.addView(text("Recommended action", 14f, bold = true))
        sheet.addView(space(5))
        sheet.addView(
            text(verdict.recommendation, 13f, 0xFF555555.toInt())
        )
    }

    private fun addActions(showReport: Boolean) {
        val sheet = panel ?: return
        sheet.addView(space(20))

        val buttons = LinearLayout(context).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL
        }

        if (showReport) {
            buttons.addView(
                styledButton(
                    "View full report",
                    0xFF171717.toInt(),
                    Color.WHITE
                ).apply {
                    setOnClickListener { currentVerdict?.let(onViewReport) }
                },
                LinearLayout.LayoutParams(0, dp(48), 1f).apply {
                    marginEnd = dp(10)
                }
            )
        }

        buttons.addView(
            styledButton(
                "Dismiss",
                Color.WHITE,
                0xFF171717.toInt(),
                strokeColor = 0xFFE0E0E0.toInt()
            ).apply { setOnClickListener { dismiss() } },
            if (showReport) LinearLayout.LayoutParams(-2, dp(48))
            else LinearLayout.LayoutParams(-1, dp(48))
        )

        sheet.addView(buttons, LinearLayout.LayoutParams(-1, -2))
        sheet.addView(space(10))
        sheet.addView(
            text(
                "Illustrative assessment · Verify through official channels",
                10f, 0xFF888888.toInt()
            ).apply { gravity = Gravity.CENTER_HORIZONTAL },
            LinearLayout.LayoutParams(-1, -2)
        )
    }

    private fun attach() {
        val view = root ?: return
        if (view.parent != null) return

        val type = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
        } else {
            @Suppress("DEPRECATION")
            WindowManager.LayoutParams.TYPE_PHONE
        }

        val params = WindowManager.LayoutParams(
            WindowManager.LayoutParams.MATCH_PARENT,
            WindowManager.LayoutParams.MATCH_PARENT,
            type,
            WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN or
                WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS,
            PixelFormat.TRANSLUCENT
        ).apply {
            gravity = Gravity.BOTTOM
        }

        wm.addView(view, params)
        animateSheet()
    }

    private fun animateSheet() {
        val sheet = panel ?: return
        sheet.post {
            sheet.translationY = dp(500).toFloat()
            sheet.animate()
                .translationY(0f)
                .setDuration(280)
                .start()
        }
    }

    fun dismiss() {
        root?.let {
            try {
                wm.removeView(it)
            } catch (_: Exception) {
            }
        }
        root = null
        panel = null
        onDismiss()
    }
}