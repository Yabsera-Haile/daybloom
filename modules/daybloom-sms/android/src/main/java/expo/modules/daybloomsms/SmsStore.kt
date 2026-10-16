package expo.modules.daybloomsms

import android.content.Context
import org.json.JSONArray
import org.json.JSONObject
import java.util.regex.Pattern

/**
 * What the app told us to watch for (senders and the shapes of their texts), and a queue of texts
 * and answers waiting for the app to add them. Kept in SharedPreferences, so it works while the app
 * is closed. Texts never leave the phone.
 */
internal object SmsStore {
  private const val PREFS = "daybloom-sms"
  private const val CONFIG = "config"
  private const val QUEUE = "queue"
  private val lock = Any()

  class Shape(val kind: String, val regex: Pattern, val amountGroup: Int, val payeeGroup: Int)
  class Sender(val address: String, val label: String, val shapes: List<Shape>)
  class Config(val ask: Boolean, val senders: List<Sender>, val strings: JSONObject, val color: String?)

  private fun prefs(context: Context) = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

  fun saveConfig(context: Context, json: String) {
    prefs(context).edit().putString(CONFIG, json).apply()
  }

  fun config(context: Context): Config? {
    val json = prefs(context).getString(CONFIG, null) ?: return null
    return try {
      val root = JSONObject(json)
      val senders = root.optJSONArray("senders") ?: JSONArray()
      Config(
        ask = root.optBoolean("ask", true),
        senders = (0 until senders.length()).map { i ->
          val s = senders.getJSONObject(i)
          val shapes = s.optJSONArray("shapes") ?: JSONArray()
          Sender(
            address = s.getString("address"),
            label = s.getString("label"),
            shapes = (0 until shapes.length()).mapNotNull { j ->
              val p = shapes.getJSONObject(j)
              try {
                Shape(
                  kind = p.getString("kind"),
                  // the same patterns the app uses (src/sms/learn.ts), which match ignoring case
                  regex = Pattern.compile(p.getString("regex"), Pattern.CASE_INSENSITIVE or Pattern.UNICODE_CASE),
                  amountGroup = p.optInt("amountGroup", 0),
                  payeeGroup = p.optInt("payeeGroup", 0)
                )
              } catch (e: Exception) {
                null
              }
            }
          )
        },
        strings = root.optJSONObject("strings") ?: JSONObject(),
        color = root.optString("color", "").ifEmpty { null }
      )
    } catch (e: Exception) {
      null
    }
  }

  fun enqueue(context: Context, item: JSONObject) {
    synchronized(lock) {
      val p = prefs(context)
      val queue = JSONArray(p.getString(QUEUE, "[]"))
      queue.put(item)
      // a long time closed: keep the newest; the app also reads the inbox when it opens
      val kept = if (queue.length() > 500) JSONArray((queue.length() - 500 until queue.length()).map { queue.get(it) }) else queue
      p.edit().putString(QUEUE, kept.toString()).commit()
    }
  }

  fun queue(context: Context): String = synchronized(lock) { prefs(context).getString(QUEUE, "[]") ?: "[]" }

  /** Removes the first `count` items, once the app has added them. */
  fun dropFirst(context: Context, count: Int) {
    synchronized(lock) {
      val p = prefs(context)
      val queue = JSONArray(p.getString(QUEUE, "[]"))
      val rest = JSONArray((count.coerceAtMost(queue.length()) until queue.length()).map { queue.get(it) })
      p.edit().putString(QUEUE, rest.toString()).commit()
    }
  }

  /** The same id as messageId() in src/sms/learn.ts: FNV-1a over the sender and text, twice. */
  fun messageId(address: String, body: String): String {
    val s = "$address\n$body"
    fun fnv(seed: Int): String {
      var h = seed
      for (c in s) {
        h = h xor c.code
        h *= 16777619
      }
      return Integer.toHexString(h).padStart(8, '0')
    }
    return fnv(0x811c9dc5L.toInt()) + fnv(0x4f1bbcdd)
  }
}
