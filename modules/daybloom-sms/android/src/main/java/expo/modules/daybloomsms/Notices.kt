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
  const val CHANNEL = "bank-texts"
  const val EXTRA_ID = "id"
  const val KEY_NOTE = "note"

  class Payment(val id: String, val label: String, val amount: String, val payee: String?)

  private fun idOf(textId: String) = textId.take(8).toLong(16).toInt()

  fun cancel(context: Context, textId: String) {
    (context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager).cancel(idOf(textId))
  }

  fun show(context: Context, config: SmsStore.Config, payment: Payment) {
    val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    if (!manager.areNotificationsEnabled()) return
    val words = config.strings
    fun word(key: String, fallback: String) =
      words.optString(key, fallback)
        .replace("{amount}", payment.amount)
        .replace("{payee}", payment.payee ?: "")
        .replace("{label}", payment.label)
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      val channel = NotificationChannel(CHANNEL, word("channel", "Bank texts"), NotificationManager.IMPORTANCE_DEFAULT)
      channel.description = word("channelText", "")
      manager.createNotificationChannel(channel)
    }
    val code = idOf(payment.id)
    val flags = PendingIntent.FLAG_UPDATE_CURRENT
    // tap: open the expense in Daybloom
    val open = Intent(Intent.ACTION_VIEW, Uri.parse("daybloom://sms-entry?id=${payment.id}"))
      .setPackage(context.packageName)
      .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
    val openIntent = PendingIntent.getActivity(context, code, open, flags or PendingIntent.FLAG_IMMUTABLE)
    // reply: the answer names the expense
    val reply = Intent(context, ReplyReceiver::class.java).putExtra(EXTRA_ID, payment.id)
    val replyFlags = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) flags or PendingIntent.FLAG_MUTABLE else flags
    val replyIntent = PendingIntent.getBroadcast(context, code, reply, replyFlags)
    val input = RemoteInput.Builder(KEY_NOTE).setLabel(word("reply", "What was it for?")).build()
    val action = Notification.Action.Builder(null, word("action", "Answer"), replyIntent)
      .addRemoteInput(input)
      .build()

    @Suppress("DEPRECATION")
    val builder = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) Notification.Builder(context, CHANNEL) else Notification.Builder(context)
    val icon = context.resources.getIdentifier("notification_icon", "drawable", context.packageName)
    builder
      .setSmallIcon(if (icon != 0) icon else context.applicationInfo.icon)
      .setContentTitle(word(if (payment.payee.isNullOrEmpty()) "titleNoPayee" else "title", "{amount}"))
      .setContentText(word("text", "{label}"))
      .setContentIntent(openIntent)
      .setAutoCancel(true)
      .setCategory(Notification.CATEGORY_STATUS)
      .addAction(action)
    config.color?.let { runCatching { builder.setColor(Color.parseColor(it)) } }
    manager.notify(code, builder.build())
  }
}
