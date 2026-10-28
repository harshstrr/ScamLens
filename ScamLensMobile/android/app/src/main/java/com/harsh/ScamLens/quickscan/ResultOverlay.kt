package com.harsh.ScamLens.quickscan

import android.animation.ValueAnimator
import android.content.Context
import android.content.res.ColorStateList
import android.content.res.Configuration
import android.graphics.Color
import android.graphics.PixelFormat
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.graphics.drawable.RippleDrawable
import android.os.Build
import android.provider.Settings
import android.transition.AutoTransition
import android.transition.TransitionManager
import android.util.DisplayMetrics
import android.util.TypedValue
import android.view.Gravity
import android.view.MotionEvent
import android.view.View
import android.view.WindowInsets
import android.view.WindowManager
import android.view.animation.DecelerateInterpolator
import android.widget.Button
import android.widget.FrameLayout
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.TextView
import kotlin.math.max

import com.harsh.ScamLens.R

internal class ResultOverlay(
    private val context: Context,
    private val onDismiss: () -> Unit,
    private val onViewReport: (ScanVerdict) -> Unit
) {


    private class Palette(
        val sheet: Int,
        val surface: Int,
        val text: Int,
        val textMuted: Int,
        val outline: Int,
        val handle: Int,
        val scrim: Int,
        val primaryBg: Int,
        val primaryFg: Int,
        val ripple: Int
    )

    private class RiskStyle(val fg: Int, val bg: Int, val label: String)

    private val lightPalette = Palette(
        sheet = 0xFFFFFFFF.toInt(),
        surface = 0xFFF4F4F5.toInt(),
        text = 0xFF171717.toInt(),
        textMuted = 0xFF667085.toInt(),
        outline = 0xFFE4E4E7.toInt(),
        handle = 0xFFD4D4D8.toInt(),
        scrim = 0x99000000.toInt(),
        primaryBg = 0xFF171717.toInt(),
        primaryFg = 0xFFFFFFFF.toInt(),
        ripple = 0x22000000
    )

    private val darkPalette = Palette(
        sheet = 0xFF141416.toInt(),
        surface = 0xFF1F1F23.toInt(),
        text = 0xFFF4F4F5.toInt(),
        textMuted = 0xFFA1A1AA.toInt(),
        outline = 0xFF2E2E34.toInt(),
        handle = 0xFF3F3F46.toInt(),
        scrim = 0xB3000000.toInt(),
        primaryBg = 0xFFF4F4F5.toInt(),
        primaryFg = 0xFF141416.toInt(),
        ripple = 0x33FFFFFF
    )

    private fun isDark(): Boolean =
        (context.resources.configuration.uiMode and
            Configuration.UI_MODE_NIGHT_MASK) == Configuration.UI_MODE_NIGHT_YES

    private fun riskStyle(risk: String): RiskStyle {
        val dark = isDark()
        return when (risk.lowercase()) {
            "high" -> RiskStyle(
                fg = if (dark) 0xFFFDA29B.toInt() else 0xFFB42318.toInt(),
                bg = if (dark) 0xFF3A1815.toInt() else 0xFFFEF3F2.toInt(),
                label = "HIGH RISK"
            )
            "medium" -> RiskStyle(
                fg = if (dark) 0xFFFEC84B.toInt() else 0xFFB54708.toInt(),
                bg = if (dark) 0xFF3A2C0E.toInt() else 0xFFFFFAEB.toInt(),
                label = "MEDIUM RISK"
            )
            "low" -> RiskStyle(
                fg = if (dark) 0xFF6CE9A6.toInt() else 0xFF16803D.toInt(),
                bg = if (dark) 0xFF0F2E1F.toInt() else 0xFFECFDF3.toInt(),
                label = "LOW RISK"
            )
            else -> RiskStyle(
                fg = if (dark) 0xFFD0D5DD.toInt() else 0xFF667085.toInt(),
                bg = if (dark) 0xFF25272B.toInt() else 0xFFF2F4F7.toInt(),
                label = "${risk.uppercase()} RISK"
            )
        }
    }

    // ───────────────────────── State ─────────────────────────

    private var currentVerdict: ScanVerdict? = null
    private val wm =
        context.getSystemService(Context.WINDOW_SERVICE) as WindowManager

    private var root: FrameLayout? = null
    private var scrim: View? = null
    private var panel: LinearLayout? = null
    private var body: LinearLayout? = null
    private var actions: LinearLayout? = null

    private var palette: Palette = lightPalette
    private var bottomInset = 0
    private var shimmer: ValueAnimator? = null


    private fun dp(n: Int) =
        (n * context.resources.displayMetrics.density).toInt()

    private fun rounded(color: Int, radius: Int) =
        GradientDrawable().apply {
            setColor(color)
            cornerRadius = dp(radius).toFloat()
        }

    private fun circle(color: Int) =
        GradientDrawable().apply {
            shape = GradientDrawable.OVAL
            setColor(color)
        }

    /** Rounded top corners only; the sheet runs flush to the screen bottom. */
    private fun topRounded(color: Int, radius: Int) =
        GradientDrawable().apply {
            setColor(color)
            val r = dp(radius).toFloat()
            cornerRadii = floatArrayOf(r, r, r, r, 0f, 0f, 0f, 0f)
        }

    private fun screenHeight(): Int =
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            wm.maximumWindowMetrics.bounds.height()
        } else {
            val m = DisplayMetrics()
            @Suppress("DEPRECATION")
            wm.defaultDisplay.getRealMetrics(m)
            m.heightPixels
        }

    private fun bottomInsetOf(insets: WindowInsets): Int =
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            insets.getInsets(WindowInsets.Type.systemBars()).bottom
        } else {
            @Suppress("DEPRECATION")
            insets.systemWindowInsetBottom
        }

    private fun text(
        value: String,
        size: Float,
        color: Int = palette.text,
        bold: Boolean = false
    ) = TextView(context).apply {
        text = value
        setTextSize(TypedValue.COMPLEX_UNIT_SP, size)
        setTextColor(color)
        includeFontPadding = false
        if (bold) setTypeface(typeface, Typeface.BOLD)
        setLineSpacing(dp(3).toFloat(), 1f)
    }

    private fun space(height: Int) =
        View(context).apply {
            layoutParams = LinearLayout.LayoutParams(-1, dp(height))
        }

    private fun sectionLabel(value: String) =
        text(value.uppercase(), 11f, palette.textMuted, bold = true).apply {
            letterSpacing = 0.08f
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
        setTextSize(TypedValue.COMPLEX_UNIT_SP, 15f)
        setTypeface(typeface, Typeface.BOLD)
        setTextColor(fg)
        minHeight = 0
        minimumHeight = 0
        setPadding(dp(18), 0, dp(18), 0)
        val shape = GradientDrawable().apply {
            setColor(bg)
            cornerRadius = dp(14).toFloat()
            if (strokeColor != null) setStroke(dp(1), strokeColor)
        }
        background = RippleDrawable(
            ColorStateList.valueOf(palette.ripple), shape, null
        )
    }

    /** Scroll container that never grows past [maxHeightPx]. */
    private class MaxHeightScrollView(
        context: Context,
        private val maxHeightPx: Int
    ) : ScrollView(context) {
        override fun onMeasure(widthMeasureSpec: Int, heightMeasureSpec: Int) {
            super.onMeasure(
                widthMeasureSpec,
                MeasureSpec.makeMeasureSpec(maxHeightPx, MeasureSpec.AT_MOST)
            )
        }
    }


    fun showLoading() {
        if (!Settings.canDrawOverlays(context) || root != null) return
        buildSheet()
        renderLoading()
        attach()
    }

    fun showResult(verdict: ScanVerdict) {
        if (!Settings.canDrawOverlays(context)) return
        currentVerdict = verdict

        if (root == null) {
            buildSheet()
            renderResult(verdict)
            attach()
            return
        }

        panel?.let {
            TransitionManager.beginDelayedTransition(
                it, AutoTransition().setDuration(200)
            )
        }
        renderResult(verdict)
    }

    fun dismiss() {
        val view = root ?: return
        val sheet = panel
        val dim = scrim

        root = null
        panel = null
        scrim = null
        body = null
        actions = null
        stopShimmer()

        fun finish() {
            try {
                wm.removeView(view)
            } catch (_: Exception) {
            }
            onDismiss()
        }

        if (sheet == null || dim == null) {
            finish()
            return
        }

        dim.animate().alpha(0f).setDuration(180).start()
        sheet.animate()
            .translationY(sheet.height.toFloat())
            .setDuration(200)
            .setInterpolator(DecelerateInterpolator())
            .withEndAction { finish() }
            .start()
    }


    private fun buildSheet() {
        palette = if (isDark()) darkPalette else lightPalette

        val sheet = LinearLayout(context).apply {
            orientation = LinearLayout.VERTICAL
            background = topRounded(palette.sheet, 28)
            isClickable = true // keep taps inside the sheet
        }
        panel = sheet

        // Drag handle (also the drag-to-dismiss zone)
        val dragZone = FrameLayout(context).apply {
            addView(
                View(context).apply { background = rounded(palette.handle, 4) },
                FrameLayout.LayoutParams(dp(40), dp(4), Gravity.CENTER)
            )
        }
        enableDragToDismiss(dragZone)
        sheet.addView(dragZone, LinearLayout.LayoutParams(-1, dp(28)))

        sheet.addView(buildHeader(), sideMargins())
        sheet.addView(space(14))

        val scroll = MaxHeightScrollView(
            context, (screenHeight() * 0.58f).toInt()
        ).apply {
            isVerticalScrollBarEnabled = false
            overScrollMode = View.OVER_SCROLL_NEVER
        }
        val content = LinearLayout(context).apply {
            orientation = LinearLayout.VERTICAL
        }
        body = content
        scroll.addView(content, FrameLayout.LayoutParams(-1, -2))
        sheet.addView(scroll, sideMargins())

        val buttonRow = LinearLayout(context).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL
        }
        actions = buttonRow
        sheet.addView(space(18))
        sheet.addView(buttonRow, sideMargins())

        sheet.addView(space(12))
        sheet.addView(
            text(
                "Automated assessment of visible text · Verify through official channels",
                10.5f, palette.textMuted
            ).apply { gravity = Gravity.CENTER_HORIZONTAL },
            sideMargins()
        )
        // Bottom padding is the real system inset, applied below.
        sheet.setPadding(0, 0, 0, dp(16) + bottomInset)

        val dim = View(context).apply {
            setBackgroundColor(palette.scrim)
            setOnClickListener { dismiss() }
        }
        scrim = dim

        val frame = FrameLayout(context).apply {
            addView(dim, FrameLayout.LayoutParams(-1, -1))
            addView(
                sheet,
                FrameLayout.LayoutParams(-1, -2, Gravity.BOTTOM)
            )
            // Use the REAL insets instead of the navigation_bar_height
            // resource, which is wrong under gesture navigation.
            setOnApplyWindowInsetsListener { _, insets ->
                bottomInset = bottomInsetOf(insets)
                panel?.setPadding(0, 0, 0, dp(16) + bottomInset)
                insets
            }
        }
        root = frame
    }

    private fun sideMargins() =
        LinearLayout.LayoutParams(-1, -2).apply {
            marginStart = dp(20)
            marginEnd = dp(20)
        }

    private fun buildHeader(): View {
        val header = LinearLayout(context).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL
        }

        // Shield badge
        val badge = FrameLayout(context).apply {
            background = circle(palette.surface)
            addView(
                ImageView(context).apply {
                    setImageResource(R.drawable.ic_shield)
                    setColorFilter(palette.text)
                    scaleType = ImageView.ScaleType.FIT_CENTER
                },
                FrameLayout.LayoutParams(dp(22), dp(22), Gravity.CENTER)
            )
        }
        header.addView(
            badge,
            LinearLayout.LayoutParams(dp(40), dp(40)).apply { marginEnd = dp(12) }
        )

        // Title + subtitle
        val titles = LinearLayout(context).apply {
            orientation = LinearLayout.VERTICAL
            addView(text("ScamLens", 17f, bold = true))
            addView(space(2))
            addView(text("Screen scan", 12f, palette.textMuted))
        }
        header.addView(titles, LinearLayout.LayoutParams(0, -2, 1f))

        // Close
        header.addView(
            ImageView(context).apply {
                setImageResource(R.drawable.ic_close)
                setColorFilter(palette.text)
                scaleType = ImageView.ScaleType.CENTER_INSIDE
                setPadding(dp(10), dp(10), dp(10), dp(10))
                background = RippleDrawable(
                    ColorStateList.valueOf(palette.ripple),
                    circle(palette.surface),
                    null
                )
                contentDescription = "Close"
                setOnClickListener { dismiss() }
            },
            LinearLayout.LayoutParams(dp(40), dp(40))
        )
        return header
    }

    // ───────────────────────── Loading state ─────────────────────────

    private fun renderLoading() {
        val content = body ?: return
        val row = actions ?: return
        stopShimmer()
        content.removeAllViews()
        row.removeAllViews()

        content.addView(text("Checking the screen you shared", 20f, bold = true))
        content.addView(space(6))
        content.addView(
            text(
                "Reading visible text only. No assessment is ready yet.",
                13f, palette.textMuted
            )
        )
        content.addView(space(16))

        val card = LinearLayout(context).apply {
            orientation = LinearLayout.VERTICAL
            background = rounded(palette.surface, 16)
            setPadding(dp(16), dp(16), dp(16), dp(8))
        }
        val cardWidth =
            context.resources.displayMetrics.widthPixels - dp(72)
        val bars = listOf(
            skeletonBar(cardWidth, 1f, 14),
            skeletonBar(cardWidth, 1f, 10),
            skeletonBar(cardWidth, 0.7f, 10),
            skeletonBar(cardWidth, 0.45f, 10)
        )
        bars.forEach { card.addView(it) }
        content.addView(card, LinearLayout.LayoutParams(-1, -2))

        content.addView(space(12))
        content.addView(
            text("Capture was approved for this session.", 11.5f, palette.textMuted)
        )

        shimmer = ValueAnimator.ofFloat(0.35f, 1f).apply {
            duration = 900
            repeatMode = ValueAnimator.REVERSE
            repeatCount = ValueAnimator.INFINITE
            addUpdateListener { a ->
                val v = a.animatedValue as Float
                bars.forEach { it.alpha = v }
            }
            start()
        }

        addActions(showReport = false)
    }

    private fun skeletonBar(contentWidth: Int, fraction: Float, height: Int) =
        View(context).apply {
            background = rounded(palette.outline, 6)
            layoutParams = LinearLayout.LayoutParams(
                (contentWidth * fraction).toInt(), dp(height)
            ).apply { bottomMargin = dp(10) }
        }

    private fun stopShimmer() {
        shimmer?.cancel()
        shimmer = null
    }

    // ───────────────────────── Result state ─────────────────────────

    private fun renderResult(verdict: ScanVerdict) {
        val content = body ?: return
        val row = actions ?: return
        stopShimmer()
        content.removeAllViews()
        row.removeAllViews()

        val risk = riskStyle(verdict.risk)

        // Verdict card
        val card = LinearLayout(context).apply {
            orientation = LinearLayout.VERTICAL
            background = rounded(risk.bg, 18)
            setPadding(dp(16), dp(14), dp(16), dp(16))
        }
        card.addView(
            text(risk.label, 11.5f, risk.fg, bold = true).apply {
                letterSpacing = 0.1f
            }
        )
        card.addView(space(8))
        card.addView(text(verdict.summary, 19f, palette.text, bold = true))
        content.addView(card, LinearLayout.LayoutParams(-1, -2))

        // Reasons
        content.addView(space(20))
        content.addView(sectionLabel("Why this matters"))
        content.addView(space(10))
        verdict.reasons.take(4).forEachIndexed { i, reason ->
            if (i > 0) content.addView(space(8))
            content.addView(reasonRow(reason, risk.fg))
        }

        // Recommendation
        content.addView(space(20))
        val rec = LinearLayout(context).apply {
            orientation = LinearLayout.VERTICAL
            background = rounded(palette.surface, 16)
            setPadding(dp(16), dp(14), dp(16), dp(16))
        }
        rec.addView(sectionLabel("Recommended action"))
        rec.addView(space(8))
        rec.addView(text(verdict.recommendation, 14f, palette.text))
        content.addView(rec, LinearLayout.LayoutParams(-1, -2))

        addActions(showReport = true, canViewReport = verdict.canViewReport)
    }

    private fun reasonRow(reason: String, dotColor: Int): View {
        val row = LinearLayout(context).apply {
            orientation = LinearLayout.HORIZONTAL
        }
        row.addView(
            View(context).apply { background = circle(dotColor) },
            LinearLayout.LayoutParams(dp(6), dp(6)).apply {
                topMargin = dp(7)
                marginEnd = dp(12)
            }
        )
        row.addView(
            text(reason, 14f, palette.text),
            LinearLayout.LayoutParams(0, -2, 1f)
        )
        return row
    }

    // ───────────────────────── Actions ─────────────────────────

    private fun addActions(showReport: Boolean, canViewReport: Boolean = false) {
        val row = actions ?: return
        row.removeAllViews()

        if (showReport) {
            val reportButton = styledButton(
                    "View full report",
                    palette.primaryBg,
                    palette.primaryFg
                ).apply {
                    if (canViewReport) {
                        setOnClickListener { currentVerdict?.let(onViewReport) }
                    } else {
                        isEnabled = false
                        alpha = 0.45f
                        val lock = context.getDrawable(android.R.drawable.ic_lock_lock)
                            ?.mutate()
                        lock?.setBounds(0, 0, dp(16), dp(16))
                        lock?.setTint(palette.primaryFg)
                        setCompoundDrawables(lock, null, null, null)
                        compoundDrawablePadding = dp(8)
                    }
                }
            row.addView(
                reportButton,
                LinearLayout.LayoutParams(0, dp(52), 1f).apply {
                    marginEnd = dp(10)
                }
            )
        }

        row.addView(
            styledButton(
                "Dismiss",
                palette.sheet,
                palette.text,
                strokeColor = palette.outline
            ).apply { setOnClickListener { dismiss() } },
            if (showReport) LinearLayout.LayoutParams(-2, dp(52))
            else LinearLayout.LayoutParams(-1, dp(52))
        )
    }

    // ───────────────────────── Gestures ─────────────────────────

    private fun enableDragToDismiss(zone: View) {
        var startY = 0f
        zone.setOnTouchListener { _, e ->
            val sheet = panel ?: return@setOnTouchListener false
            when (e.actionMasked) {
                MotionEvent.ACTION_DOWN -> {
                    startY = e.rawY
                    true
                }
                MotionEvent.ACTION_MOVE -> {
                    sheet.translationY = max(0f, e.rawY - startY)
                    true
                }
                MotionEvent.ACTION_UP, MotionEvent.ACTION_CANCEL -> {
                    if (sheet.translationY > sheet.height * 0.25f) {
                        dismiss()
                    } else {
                        sheet.animate().translationY(0f).setDuration(180).start()
                    }
                    true
                }
                else -> false
            }
        }
    }

    // ───────────────────────── Window ─────────────────────────

    private fun attach() {
        val view = root ?: return
        if (view.parent != null) return

        val type = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
        } else {
            @Suppress("DEPRECATION")
            WindowManager.LayoutParams.TYPE_PHONE
        }

        // Explicit full-screen height (status bar + nav bar included) so the
        // sheet really reaches the bottom edge and no strip is left behind it.
        val params = WindowManager.LayoutParams(
            WindowManager.LayoutParams.MATCH_PARENT,
            screenHeight(),
            type,
            WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN or
                WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS or
                WindowManager.LayoutParams.FLAG_HARDWARE_ACCELERATED,
            PixelFormat.TRANSLUCENT
        ).apply {
            gravity = Gravity.TOP or Gravity.START
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                layoutInDisplayCutoutMode =
                    WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES
            }
        }

        // Start off-screen / transparent, then animate in.
        scrim?.alpha = 0f
        panel?.translationY = screenHeight().toFloat()

        wm.addView(view, params)
        view.requestApplyInsets()
        animateIn()
    }

    private fun animateIn() {
        val sheet = panel ?: return
        val dim = scrim ?: return
        sheet.post {
            dim.animate().alpha(1f).setDuration(220).start()
            sheet.translationY = sheet.height.toFloat()
            sheet.animate()
                .translationY(0f)
                .setDuration(300)
                .setInterpolator(DecelerateInterpolator(1.6f))
                .start()
        }
    }
}