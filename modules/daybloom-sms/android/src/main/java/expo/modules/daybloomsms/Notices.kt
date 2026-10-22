package expo.modules.daybloomsms

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.RemoteInput
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.net.Uri
import android.os.Build

/** "Paid 7,380 to Aline · What was it for?", with a reply box. Words come from the app (en.ts). */
internal object Notices {
  // high importance, so it shows at the top of the screen (the first channel, "bank-texts", didn't)
  const val CHANNEL = "bank-texts-ask"
  private const val OLD_CHANNEL = "bank-texts"
  const val EXTRA_ID = "id"
  const val KEY_NOTE = "note"

  class Payment(val id: String, val label: String, val amount: String, val payee: String?)

  private fun idOf(textId: String) = textId.take(8).toLong(16).toInt()

  private fun manager(context: Context) = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

  fun cancel(context: Context, textId: String) = manager(context).cancel(idOf(textId))

  fun show(context: Context, config: SmsStore.Config, payment: Payment) {
    val manager = manager(context)
    if (!manager.areNotificationsEnabled()) return
    fun word(key: String, fallback: String) =
      config.strings.optString(key, fallback)
        .replace("{amount}", payment.amount)
        .replace("{payee}", payment.payee ?: "")
        .replace("{label}", payment.label)
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      val channel = NotificationChannel(CHANNEL, word("channel", "Bank texts"), NotificationManager.IMPORTANCE_HIGH)
      channel.description = word("channelText", "")
      manager.createNotificationChannel(channel)
      manager.deleteNotificationChannel(OLD_CHANNEL)
    }
    // reply: the answer names the expense
    val reply = Intent(context, ReplyReceiver::class.java).putExtra(EXTRA_ID, payment.id)
    val flags = PendingIntent.FLAG_UPDATE_CURRENT
    val replyFlags = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) flags or PendingIntent.FLAG_MUTABLE else flags
    val replyIntent = PendingIntent.getBroadcast(context, idOf(payment.id), reply, replyFlags)
    val input = RemoteInput.Builder(KEY_NOTE).setLabel(word("reply", "What was it for?")).build()
    val action = Notification.Action.Builder(null, word("action", "Answer"), replyIntent)
      .addRemoteInput(input)
      .build()
    val builder = builder(context, config, payment.id)
      .setContentTitle(word(if (payment.payee.isNullOrEmpty()) "titleNoPayee" else "title", "{amount}"))
      .setContentText(word("text", "{label}"))
      .addAction(action)
    manager.notify(idOf(payment.id), builder.build())
  }

  /**
   * After a reply: "Saved as “Lunch”" for a moment. Updating rather than cancelling, because Android
   * keeps a notification that was answered from if the app only cancels it.
   */
  fun saved(context: Context, textId: String, note: String) {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
      cancel(context, textId)
      return
    }
    val config = SmsStore.config(context)
    val text = (config?.strings?.optString("saved", "") ?: "").ifEmpty { "{note}" }.replace("{note}", note)
    val builder = builder(context, config, textId)
      .setContentTitle(text)
      .setOnlyAlertOnce(true)
      .setTimeoutAfter(4000)
    manager(context).notify(idOf(textId), builder.build())
  }

  private fun builder(context: Context, config: SmsStore.Config?, textId: String): Notification.Builder {
    @Suppress("DEPRECATION")
    val builder = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) Notification.Builder(context, CHANNEL) else Notification.Builder(context)
    // tap: open the expense in Daybloom
    val open = Intent(Intent.ACTION_VIEW, Uri.parse("daybloom://sms-entry?id=$textId"))
      .setPackage(context.packageName)
      .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
    val openIntent = PendingIntent.getActivity(
      context,
      idOf(textId),
      open,
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
    )
    val icon = context.resources.getIdentifier("notification_icon", "drawable", context.packageName)
    builder
      .setSmallIcon(if (icon != 0) icon else context.applicationInfo.icon)
      .setContentIntent(openIntent)
      .setAutoCancel(true)
      .setCategory(Notification.CATEGORY_STATUS)
    config?.color?.let { runCatching { builder.setColor(Color.parseColor(it)) } }
    return builder
  }
}
