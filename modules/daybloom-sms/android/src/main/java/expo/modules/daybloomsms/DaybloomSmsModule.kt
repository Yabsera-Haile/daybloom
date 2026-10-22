package expo.modules.daybloomsms

import android.Manifest
import android.app.ActivityManager
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.provider.Settings
import android.provider.Telephony
import expo.modules.kotlin.exception.CodedException
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.lang.ref.WeakReference

/**
 * Reads bank and mobile-money texts for Daybloom (BU-11): lists who sends texts, reads one sender's
 * texts so the app can learn their shapes, and passes on new ones as they arrive (SmsReceiver).
 * Only texts from the senders the person picked are kept; nothing is sent anywhere.
 */
class DaybloomSmsModule : Module() {
  private val context: Context
    get() = appContext.reactContext ?: throw Exceptions.ReactContextLost()

  override fun definition() = ModuleDefinition {
    Name("DaybloomSms")

    Events("onText")

    OnCreate { current = WeakReference(this@DaybloomSmsModule) }
    OnDestroy { current = null }

    Function("hasPermission") {
      granted(context, Manifest.permission.READ_SMS) && granted(context, Manifest.permission.RECEIVE_SMS)
    }

    /** Who sent the newest `scan` texts: how many each, when last, and a few of their texts. */
    AsyncFunction("listSenders") { scan: Int, samples: Int ->
      requireReadable()
      val out = LinkedHashMap<String, MutableMap<String, Any>>()
      var read = 0
      query(null, null) { address, body, date ->
        read += 1
        val entry = out.getOrPut(address) {
          mutableMapOf("address" to address, "count" to 0, "lastAt" to date.toDouble(), "samples" to mutableListOf<String>())
        }
        entry["count"] = (entry["count"] as Int) + 1
        @Suppress("UNCHECKED_CAST")
        val list = entry["samples"] as MutableList<String>
        if (list.size < samples) list.add(body)
        read < scan
      }
      out.values.toList()
    }

    /** Texts from these senders that arrived after `since` (ms), newest first, at most `limit`. */
    AsyncFunction("readTexts") { addresses: List<String>, since: Double, limit: Int ->
      requireReadable()
      if (addresses.isEmpty()) return@AsyncFunction emptyList<Map<String, Any>>()
      val texts = mutableListOf<Map<String, Any>>()
      val marks = addresses.joinToString(",") { "?" }
      query(
        "${Telephony.Sms.ADDRESS} IN ($marks) AND ${Telephony.Sms.DATE} > ?",
        (addresses + since.toLong().toString()).toTypedArray()
      ) { address, body, date ->
        texts.add(mapOf("address" to address, "body" to body, "receivedAt" to date.toDouble()))
        texts.size < limit
      }
      texts
    }

    /** The senders to watch and the shapes of their texts, as JSON (see src/sms/native.ts). */
    AsyncFunction("configure") { json: String ->
      SmsStore.saveConfig(context, json)
    }

    /** Texts and answers waiting to be added, as a JSON list. */
    Function("readQueue") { SmsStore.queue(context) }

    Function("dropQueue") { count: Int -> SmsStore.dropFirst(context, count) }

    Function("cancelNotice") { id: String -> Notices.cancel(context, id) }

    /** Whether Daybloom may appear on top of other apps, to ask about a payment the moment it comes. */
    Function("canPopUp") { PopUp.allowed(context) }

    /** Opens the phone's "Appear on top" setting for Daybloom. */
    Function("openPopUpSettings") {
      val intent = Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION, Uri.parse("package:${context.packageName}"))
      val activity = appContext.currentActivity
      if (activity != null) activity.startActivity(intent) else context.startActivity(intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
    }
  }

  private fun granted(context: Context, permission: String) =
    context.checkSelfPermission(permission) == PackageManager.PERMISSION_GRANTED

  private fun requireReadable() {
    if (!granted(context, Manifest.permission.READ_SMS)) {
      throw CodedException("ERR_SMS_PERMISSION", "Daybloom may not read texts yet", null)
    }
  }

  /** Walks the inbox, newest first, while `each` returns true. */
  private fun query(selection: String?, args: Array<String>?, each: (String, String, Long) -> Boolean) {
    val columns = arrayOf(Telephony.Sms.ADDRESS, Telephony.Sms.BODY, Telephony.Sms.DATE)
    context.contentResolver
      .query(Telephony.Sms.Inbox.CONTENT_URI, columns, selection, args, "${Telephony.Sms.DATE} DESC")
      ?.use { c ->
        while (c.moveToNext()) {
          val address = c.getString(0) ?: continue
          if (!each(address, c.getString(1) ?: "", c.getLong(2))) break
        }
      }
  }

  companion object {
    @Volatile private var current: WeakReference<DaybloomSmsModule>? = null

    /** Tells the open app a text or answer is waiting. False when the app isn't on screen. */
    internal fun tellApp(): Boolean {
      val module = current?.get() ?: return false
      val state = ActivityManager.RunningAppProcessInfo().also { ActivityManager.getMyMemoryState(it) }
      if (state.importance != ActivityManager.RunningAppProcessInfo.IMPORTANCE_FOREGROUND) return false
      return try {
        module.sendEvent("onText", emptyMap<String, Any>())
        true
      } catch (e: Exception) {
        false
      }
    }
  }
}
