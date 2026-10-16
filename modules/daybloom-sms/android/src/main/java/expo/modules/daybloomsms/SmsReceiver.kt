package expo.modules.daybloomsms

import android.app.RemoteInput
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.provider.Telephony
import org.json.JSONObject

/**
 * A new text arrived. If it's from a sender the person picked, keep it for the app; if it's a
 * payment and Daybloom should ask about it, show a notification with a "What was it for?" reply.
 * When Daybloom is open, the app asks itself instead.
 */
class SmsReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    if (intent.action != Telephony.Sms.Intents.SMS_RECEIVED_ACTION) return
    val config = SmsStore.config(context) ?: return
    if (config.senders.isEmpty()) return
    val parts = Telephony.Sms.Intents.getMessagesFromIntent(intent) ?: return
    // a long text arrives in parts
    val texts = LinkedHashMap<String, StringBuilder>()
    for (part in parts) {
      val address = part?.originatingAddress ?: part?.displayOriginatingAddress ?: continue
      texts.getOrPut(address) { StringBuilder() }.append(part.messageBody ?: "")
    }
    val now = System.currentTimeMillis()
    var queued = false
    val payments = mutableListOf<Notices.Payment>()
    for ((address, builder) in texts) {
      val sender = config.senders.firstOrNull { it.address.equals(address, ignoreCase = true) } ?: continue
      val body = builder.toString()
      val id = SmsStore.messageId(sender.address, body)
      SmsStore.enqueue(
        context,
        JSONObject()
          .put("type", "text")
          .put("id", id)
          .put("address", sender.address)
          .put("body", body)
          .put("receivedAt", now)
      )
      queued = true
      if (!config.ask) continue
      val shape = sender.shapes.firstOrNull { it.regex.matcher(body).find() } ?: continue
      if (shape.kind != "spend") continue
      val m = shape.regex.matcher(body)
      if (!m.find()) continue
      // tidied like cleanPayee() in src/sms/learn.ts
      val group = { n: Int ->
        if (n in 1..m.groupCount()) {
          m.group(n)?.replace(Regex("\\s+"), " ")?.trim { it.isWhitespace() || it in ",.:;-" }?.ifEmpty { null }
        } else {
          null
        }
      }
      payments.add(Notices.Payment(id, sender.label, group(shape.amountGroup) ?: "", group(shape.payeeGroup)))
    }
    if (!queued) return
    // the app is open: it adds the text and asks there
    if (DaybloomSmsModule.tellApp()) return
    for (payment in payments) Notices.show(context, config, payment)
  }
}

/** The answer typed into the notification. */
class ReplyReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    val id = intent.getStringExtra(Notices.EXTRA_ID) ?: return
    val note = RemoteInput.getResultsFromIntent(intent)?.getCharSequence(Notices.KEY_NOTE)?.toString()?.trim()
    if (!note.isNullOrEmpty()) {
      SmsStore.enqueue(context, JSONObject().put("type", "note").put("id", id).put("note", note))
      DaybloomSmsModule.tellApp()
    }
    Notices.cancel(context, id)
  }
}
