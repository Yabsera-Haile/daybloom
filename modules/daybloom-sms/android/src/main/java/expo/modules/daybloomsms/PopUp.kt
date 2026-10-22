package expo.modules.daybloomsms

import android.content.Context
import android.graphics.Color
import android.graphics.PixelFormat
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.provider.Settings
import android.text.InputType
import android.util.TypedValue
import android.view.Gravity
import android.view.KeyEvent
import android.view.MotionEvent
import android.view.View
import android.view.ViewGroup.LayoutParams.MATCH_PARENT
import android.view.ViewGroup.LayoutParams.WRAP_CONTENT
import android.view.WindowManager
import android.view.inputmethod.EditorInfo
import android.view.inputmethod.InputMethodManager
import android.widget.EditText
import android.widget.FrameLayout
import android.widget.HorizontalScrollView
import android.widget.LinearLayout
import android.widget.TextView
import android.widget.Toast
import org.json.JSONObject

/**
 * "What was it for?" over whatever is on screen when a payment text arrives (BU-11), for people who
 * allowed Daybloom to appear on top: a name, a category, Save or Later. The answer is queued like a
 * notification reply; Later keeps the name from the text. Untouched for a while (the phone in a
 * pocket), it turns into the notification instead.
 */
internal object PopUp {
  private const val WAIT_MS = 90_000L

  private class Shown(val view: View, var touched: Boolean = false)

  private var shown: Shown? = null
  private val waiting = ArrayDeque<Notices.Payment>()
  private val handler = Handler(Looper.getMainLooper())

  fun allowed(context: Context) = Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && Settings.canDrawOverlays(context)

  fun show(context: Context, config: SmsStore.Config, payment: Notices.Payment) {
    val app = context.applicationContext
    if (!allowed(app)) return Notices.show(app, config, payment)
    // one at a time: the next shows when this one closes
    if (shown != null) return waiting.addLast(payment)
    val view = build(app, config, payment)
    @Suppress("DEPRECATION")
    val params = WindowManager.LayoutParams(
      MATCH_PARENT,
      WRAP_CONTENT,
      WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY,
      // touches outside the card go to the app underneath
      WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL,
      PixelFormat.TRANSLUCENT
    ).apply {
      // in the middle, clear of other apps' banners at the top; above the keyboard while typing
      gravity = Gravity.CENTER
      softInputMode = WindowManager.LayoutParams.SOFT_INPUT_ADJUST_RESIZE
    }
    try {
      windows(app).addView(view, params)
    } catch (e: Exception) {
      return Notices.show(app, config, payment)
    }
    val entry = Shown(view)
    shown = entry
    handler.postDelayed({
      if (shown === entry && !entry.touched) {
        close(app)
        Notices.show(app, config, payment)
      }
    }, WAIT_MS)
  }

  private fun close(context: Context) {
    val current = shown ?: return
    shown = null
    runCatching { windows(context).removeView(current.view) }
    val next = waiting.removeFirstOrNull() ?: return
    SmsStore.config(context)?.let { show(context, it, next) }
  }

  private fun windows(context: Context) = context.getSystemService(Context.WINDOW_SERVICE) as WindowManager

  private fun build(context: Context, config: SmsStore.Config, payment: Notices.Payment): View {
    val metrics = context.resources.displayMetrics
    fun dp(v: Float) = TypedValue.applyDimension(TypedValue.COMPLEX_UNIT_DIP, v, metrics)
    fun px(v: Float) = dp(v).toInt()
    fun word(key: String, fallback: String) =
      config.strings.optString(key, fallback)
        .replace("{amount}", payment.amount)
        .replace("{payee}", payment.payee ?: "")
        .replace("{label}", payment.label)
    fun color(key: String, fallback: String) =
      runCatching { Color.parseColor(config.colors.optString(key, fallback)) }.getOrDefault(Color.parseColor(fallback))
    fun font(name: String) = runCatching { Typeface.createFromAsset(context.assets, "fonts/$name.ttf") }.getOrNull()

    val surface = color("surface", "#fff8f5")
    val onSurface = color("onSurface", "#1e1b18")
    val muted = color("onSurfaceVariant", "#424843")
    val outline = color("outlineVariant", "#c2c8c0")
    val primary = color("primary", "#43654f")
    val onPrimary = color("onPrimary", "#ffffff")
    val serif = font("Literata_600SemiBold")
    val sans = font("PlusJakartaSans_400Regular")
    val sansBold = font("PlusJakartaSans_600SemiBold")

    fun label(text: String, size: Float, color: Int, face: Typeface?) = TextView(context).apply {
      this.text = text
      textSize = size
      setTextColor(color)
      typeface = face
    }
    fun rounded(fill: Int, radius: Float, stroke: Int? = null) = GradientDrawable().apply {
      setColor(fill)
      cornerRadius = dp(radius)
      stroke?.let { setStroke(px(1.5f), it) }
    }
    fun gap(view: View, top: Float) = LinearLayout.LayoutParams(MATCH_PARENT, WRAP_CONTENT).apply {
      topMargin = px(top)
    }.also { view.layoutParams = it }

    val root = object : FrameLayout(context) {
      override fun dispatchKeyEvent(event: KeyEvent): Boolean {
        if (event.keyCode == KeyEvent.KEYCODE_BACK) {
          if (event.action == KeyEvent.ACTION_UP) close(context)
          return true
        }
        return super.dispatchKeyEvent(event)
      }

      override fun onInterceptTouchEvent(ev: MotionEvent): Boolean {
        shown?.touched = true
        return false
      }
    }
    root.setPadding(px(12f), px(4f), px(12f), px(12f))

    val card = LinearLayout(context).apply {
      orientation = LinearLayout.VERTICAL
      setPadding(px(20f), px(16f), px(20f), px(12f))
      background = rounded(surface, 24f)
      elevation = dp(8f)
    }
    root.addView(card, FrameLayout.LayoutParams(MATCH_PARENT, WRAP_CONTENT))

    // "MoMo · Paid 7,380 to Aline"
    card.addView(label(word(if (payment.payee.isNullOrEmpty()) "headingNoPayee" else "heading", "{label}"), 13f, muted, sans))
    val title = label(word("reply", "What was it for?"), 22f, onSurface, serif)
    card.addView(title.also { gap(it, 2f) })

    val field = EditText(context).apply {
      hint = word(if (payment.payee.isNullOrEmpty()) "nameNoPayee" else "name", "")
      setHintTextColor(muted)
      setTextColor(onSurface)
      typeface = sans
      textSize = 16f
      isSingleLine = true
      inputType = InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_FLAG_CAP_SENTENCES
      imeOptions = EditorInfo.IME_ACTION_DONE
      minHeight = px(48f)
      setPadding(px(12f), 0, px(12f), 0)
      background = rounded(surface, 12f, outline)
      contentDescription = word("reply", "What was it for?")
      setOnEditorActionListener { v, action, _ ->
        if (action != EditorInfo.IME_ACTION_DONE) return@setOnEditorActionListener false
        (context.getSystemService(Context.INPUT_METHOD_SERVICE) as InputMethodManager)
          .hideSoftInputFromWindow(v.windowToken, 0)
        v.clearFocus()
        true
      }
    }
    card.addView(field.also { gap(it, 12f) })

    // categories: the payee's last one is picked already
    val categoryHeading = word("category", "Category")
    card.addView(label(categoryHeading, 13f, muted, sansBold).also { gap(it, 14f) })
    var chosen: String? = config.payees.optString(payment.payee ?: "", "").takeIf { id ->
      config.categories.any { it.id == id }
    }
    val chips = LinearLayout(context).apply { orientation = LinearLayout.HORIZONTAL }
    val selected = word("selected", "Selected")
    fun paintChips() {
      for (i in 0 until chips.childCount) {
        val chip = chips.getChildAt(i) as TextView
        val on = chip.tag == chosen
        chip.background = rounded(if (on) primary else surface, 22f, if (on) primary else outline)
        chip.setTextColor(if (on) onPrimary else onSurface)
        chip.isSelected = on
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) chip.stateDescription = if (on) selected else null
      }
    }
    config.categories.forEachIndexed { i, category ->
      val chip = label(category.name, 14f, onSurface, sansBold).apply {
        gravity = Gravity.CENTER
        minHeight = px(44f)
        setPadding(px(16f), 0, px(16f), 0)
        tag = category.id
        setOnClickListener {
          chosen = if (chosen == category.id) null else category.id
          paintChips()
        }
      }
      chips.addView(chip, LinearLayout.LayoutParams(WRAP_CONTENT, WRAP_CONTENT).apply { if (i > 0) marginStart = px(8f) })
    }
    paintChips()
    val scroller = HorizontalScrollView(context).apply {
      isHorizontalScrollBarEnabled = false
      contentDescription = categoryHeading
      addView(chips)
    }
    card.addView(scroller.also { gap(it, 8f) })

    // Later · Save
    val buttons = LinearLayout(context).apply {
      orientation = LinearLayout.HORIZONTAL
      gravity = Gravity.END or Gravity.CENTER_VERTICAL
    }
    val later = label(word("later", "Later"), 15f, muted, sansBold).apply {
      gravity = Gravity.CENTER
      minHeight = px(48f)
      setPadding(px(16f), 0, px(16f), 0)
      setOnClickListener { close(context) }
    }
    val save = label(word("save", "Save"), 15f, onPrimary, sansBold).apply {
      gravity = Gravity.CENTER
      minHeight = px(48f)
      setPadding(px(24f), 0, px(24f), 0)
      background = rounded(primary, 24f)
      setOnClickListener {
        val note = field.text.toString().trim()
        val answer = JSONObject().put("type", "note").put("id", payment.id).put("note", note)
        chosen?.let { answer.put("categoryId", it) }
        SmsStore.enqueue(context, answer)
        // the next payment to them picks it too, even before Daybloom is opened
        val category = chosen
        if (category != null && !payment.payee.isNullOrEmpty()) SmsStore.rememberPayee(context, payment.payee, category)
        DaybloomSmsModule.tellApp()
        close(context)
        val saved = if (note.isEmpty()) word("savedPlain", "Saved") else word("saved", "{note}").replace("{note}", note)
        Toast.makeText(context, saved, Toast.LENGTH_SHORT).show()
      }
    }
    buttons.addView(later)
    buttons.addView(save, LinearLayout.LayoutParams(WRAP_CONTENT, WRAP_CONTENT).apply { marginStart = px(8f) })
    card.addView(buttons.also { gap(it, 12f) })
    return root
  }
}
