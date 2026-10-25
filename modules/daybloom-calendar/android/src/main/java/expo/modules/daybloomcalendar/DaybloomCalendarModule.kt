package expo.modules.daybloomcalendar

import android.Manifest
import android.content.ContentUris
import android.content.ContentValues
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.database.Cursor
import android.provider.CalendarContract
import android.provider.CalendarContract.Attendees
import android.provider.CalendarContract.Calendars
import android.provider.CalendarContract.Events
import expo.modules.kotlin.exception.CodedException
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.records.Field
import expo.modules.kotlin.records.Record

/** An event as Daybloom writes it (src/calendarSync/native.ts). Times are UTC milliseconds. */
class EventValues : Record {
  @Field val calendarId: String = ""
  @Field val title: String = ""
  @Field val notes: String? = null
  @Field val location: String? = null
  @Field val startAt: Double = 0.0
  @Field val endAt: Double = 0.0
  @Field val allDay: Boolean = false
  @Field val timeZone: String = "UTC"
  @Field val rrule: String? = null
}

private const val DAY = 86_400_000L

/**
 * The phone's calendars for Daybloom (GC-01..GC-06): Android's calendar store holds the events of
 * every account on the phone (Google Calendar and others), and the phone's own sync carries changes
 * made here to Google. Daybloom reads them to show on its calendar and writes the events saved to
 * them. No sign-in, no server.
 */
class DaybloomCalendarModule : Module() {
  private val context: Context
    get() = appContext.reactContext ?: throw Exceptions.ReactContextLost()

  override fun definition() = ModuleDefinition {
    Name("DaybloomCalendar")

    Function("hasPermission") {
      granted(Manifest.permission.READ_CALENDAR) && granted(Manifest.permission.WRITE_CALENDAR)
    }

    /** Every calendar on the phone. */
    AsyncFunction("calendars") {
      requirePermission()
      val out = mutableListOf<Map<String, Any?>>()
      val columns = arrayOf(
        Calendars._ID, Calendars.CALENDAR_DISPLAY_NAME, Calendars.ACCOUNT_NAME, Calendars.ACCOUNT_TYPE,
        Calendars.CALENDAR_COLOR, Calendars.CALENDAR_ACCESS_LEVEL, Calendars.VISIBLE, Calendars.IS_PRIMARY,
        Calendars.OWNER_ACCOUNT, Calendars.SYNC_EVENTS,
      )
      context.contentResolver.query(Calendars.CONTENT_URI, columns, null, null, null)?.use { c ->
        while (c.moveToNext()) {
          out.add(
            mapOf(
              "id" to c.getLong(0).toString(),
              "name" to (c.getString(1) ?: ""),
              "account" to (c.getString(2) ?: ""),
              "accountType" to (c.getString(3) ?: ""),
              "color" to hex(c.getInt(4)),
              "writable" to (c.getInt(5) >= Calendars.CAL_ACCESS_CONTRIBUTOR),
              "visible" to (c.getInt(6) == 1),
              "primary" to (!c.isNull(7) && c.getInt(7) == 1),
              "owner" to c.getString(8),
              "synced" to (c.getInt(9) == 1),
            )
          )
        }
      }
      out
    }

    /**
     * The events of these calendars still going on after `since` (ms): one-off events, repeating
     * ones (with their rule) and the changed or cancelled occurrences of repeating ones.
     */
    AsyncFunction("events") { calendarIds: List<String>, since: Double ->
      requirePermission()
      if (calendarIds.isEmpty()) return@AsyncFunction emptyList<Map<String, Any?>>()
      val marks = calendarIds.joinToString(",") { "?" }
      val selection =
        "${Events.CALENDAR_ID} IN ($marks) AND ${Events.DELETED} = 0 AND " +
          "(${Events.LAST_DATE} IS NULL OR ${Events.LAST_DATE} >= ?)"
      val args = (calendarIds + since.toLong().toString()).toTypedArray()
      val columns = arrayOf(
        Events._ID, Events.CALENDAR_ID, Events.TITLE, Events.DESCRIPTION, Events.EVENT_LOCATION,
        Events.DTSTART, Events.DTEND, Events.DURATION, Events.ALL_DAY, Events.EVENT_TIMEZONE,
        Events.RRULE, Events.EXDATE, Events.ORIGINAL_ID, Events.ORIGINAL_INSTANCE_TIME, Events.STATUS,
        Events.SELF_ATTENDEE_STATUS, Events.ORGANIZER, Events.HAS_ATTENDEE_DATA, Events.GUESTS_CAN_MODIFY,
        Events.IS_ORGANIZER, Events.DISPLAY_COLOR, Events._SYNC_ID, Events.ORIGINAL_SYNC_ID,
      )
      val out = mutableListOf<Map<String, Any?>>()
      context.contentResolver.query(Events.CONTENT_URI, columns, selection, args, null)?.use { c ->
        while (c.moveToNext()) {
          out.add(
            mapOf(
              "id" to c.getLong(0).toString(),
              "calendarId" to c.getLong(1).toString(),
              "title" to (c.getString(2) ?: ""),
              "notes" to c.getString(3),
              "location" to c.getString(4),
              "startAt" to c.longOrNull(5)?.toDouble(),
              "endAt" to c.longOrNull(6)?.toDouble(),
              "duration" to c.getString(7),
              "allDay" to (c.getInt(8) == 1),
              "timeZone" to c.getString(9),
              "rrule" to c.getString(10),
              "exdate" to c.getString(11),
              "originalId" to c.longOrNull(12)?.toString(),
              "originalStartAt" to c.longOrNull(13)?.toDouble(),
              "cancelled" to (c.longOrNull(14) == Events.STATUS_CANCELED.toLong()),
              "selfStatus" to c.getInt(15),
              "organizer" to c.getString(16),
              "hasGuests" to (c.getInt(17) == 1),
              "guestsCanModify" to (c.getInt(18) == 1),
              "isOrganizer" to (c.getString(19) == "1"),
              "color" to c.longOrNull(20)?.let { hex(it.toInt()) },
              "syncId" to c.getString(21),
              "originalSyncId" to c.getString(22),
            )
          )
        }
      }
      out
    }

    /** Adds an event; its id. */
    AsyncFunction("insert") { v: EventValues ->
      requirePermission()
      val uri = context.contentResolver.insert(Events.CONTENT_URI, valuesOf(v))
        ?: throw CodedException("The calendar didn't take the event")
      ContentUris.parseId(uri).toString()
    }

    /**
     * Changes (or cancels) one occurrence of a repeating event; the new occurrence's id. Android
     * copies the rest from the repeating event, and takes a length here, not an end.
     */
    AsyncFunction("insertException") { originalId: String, originalStartAt: Double, v: EventValues?, cancelled: Boolean ->
      requirePermission()
      val values = if (v == null) ContentValues() else occurrenceValuesOf(v)
      values.put(Events.ORIGINAL_INSTANCE_TIME, originalStartAt.toLong())
      if (cancelled) values.put(Events.STATUS, Events.STATUS_CANCELED)
      val uri = context.contentResolver.insert(
        ContentUris.withAppendedId(Events.CONTENT_EXCEPTION_URI, originalId.toLong()), values
      ) ?: throw CodedException("The calendar didn't take the change")
      ContentUris.parseId(uri).toString()
    }

    /** Changes an event; false when it isn't there any more. */
    AsyncFunction("update") { id: String, v: EventValues ->
      requirePermission()
      val values = valuesOf(v).apply { remove(Events.CALENDAR_ID) }
      context.contentResolver.update(ContentUris.withAppendedId(Events.CONTENT_URI, id.toLong()), values, null, null) > 0
    }

    /** Cancels a changed occurrence, or brings it back. */
    AsyncFunction("setCancelled") { id: String, cancelled: Boolean ->
      requirePermission()
      val values = ContentValues().apply {
        put(Events.STATUS, if (cancelled) Events.STATUS_CANCELED else Events.STATUS_CONFIRMED)
      }
      context.contentResolver.update(ContentUris.withAppendedId(Events.CONTENT_URI, id.toLong()), values, null, null) > 0
    }

    /** Deletes an event (a repeating one with all its occurrences); false when it wasn't there. */
    AsyncFunction("remove") { id: String ->
      requirePermission()
      context.contentResolver.delete(ContentUris.withAppendedId(Events.CONTENT_URI, id.toLong()), null, null) > 0
    }

    /** Answers an invitation for the calendar's owner: accepted, tentative or declined. */
    AsyncFunction("respond") { eventId: String, answer: String ->
      requirePermission()
      val status = when (answer) {
        "accepted" -> Attendees.ATTENDEE_STATUS_ACCEPTED
        "tentative" -> Attendees.ATTENDEE_STATUS_TENTATIVE
        "declined" -> Attendees.ATTENDEE_STATUS_DECLINED
        else -> throw CodedException("Unknown answer: $answer")
      }
      val owner = context.contentResolver.query(
        ContentUris.withAppendedId(Events.CONTENT_URI, eventId.toLong()), arrayOf(Events.OWNER_ACCOUNT), null, null, null
      )?.use { c -> if (c.moveToFirst()) c.getString(0) else null } ?: return@AsyncFunction false
      val values = ContentValues().apply { put(Attendees.ATTENDEE_STATUS, status) }
      context.contentResolver.update(
        Attendees.CONTENT_URI,
        values,
        "${Attendees.EVENT_ID} = ? AND LOWER(${Attendees.ATTENDEE_EMAIL}) = LOWER(?)",
        arrayOf(eventId, owner),
      ) > 0
    }

    /** Opens the event in the phone's calendar app (Google Calendar or another). */
    Function("open") { eventId: String, begin: Double, end: Double ->
      val intent = Intent(Intent.ACTION_VIEW, ContentUris.withAppendedId(Events.CONTENT_URI, eventId.toLong()))
        .putExtra(CalendarContract.EXTRA_EVENT_BEGIN_TIME, begin.toLong())
        .putExtra(CalendarContract.EXTRA_EVENT_END_TIME, end.toLong())
      val activity = appContext.currentActivity
      if (activity != null) activity.startActivity(intent)
      else context.startActivity(intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
    }
  }

  /** What the calendar store keeps for an event: a repeating one has a length, a one-off an end. */
  private fun valuesOf(v: EventValues) = ContentValues().apply {
    put(Events.CALENDAR_ID, v.calendarId.toLong())
    put(Events.TITLE, v.title)
    put(Events.DESCRIPTION, v.notes)
    put(Events.EVENT_LOCATION, v.location)
    put(Events.DTSTART, v.startAt.toLong())
    put(Events.ALL_DAY, if (v.allDay) 1 else 0)
    // all-day events are kept at midnight UTC (Daybloom sends them that way)
    put(Events.EVENT_TIMEZONE, if (v.allDay) "UTC" else v.timeZone)
    if (v.rrule != null) {
      put(Events.RRULE, v.rrule)
      putNull(Events.DTEND)
      put(Events.DURATION, lengthOf(v))
    } else {
      putNull(Events.RRULE)
      putNull(Events.DURATION)
      put(Events.DTEND, v.endAt.toLong())
    }
  }

  /** A changed occurrence: only the columns Android lets an exception set (no end, no calendar). */
  private fun occurrenceValuesOf(v: EventValues) = ContentValues().apply {
    put(Events.TITLE, v.title)
    put(Events.DESCRIPTION, v.notes)
    put(Events.EVENT_LOCATION, v.location)
    put(Events.DTSTART, v.startAt.toLong())
    put(Events.ALL_DAY, if (v.allDay) 1 else 0)
    put(Events.EVENT_TIMEZONE, if (v.allDay) "UTC" else v.timeZone)
    put(Events.DURATION, lengthOf(v))
  }

  /** RFC 5545 length: whole days for all-day events, seconds otherwise. */
  private fun lengthOf(v: EventValues): String {
    val length = (v.endAt - v.startAt).toLong()
    return if (v.allDay) "P${maxOf(1L, length / DAY)}D" else "P${maxOf(0L, length / 1000)}S"
  }

  private fun granted(permission: String) =
    context.checkSelfPermission(permission) == PackageManager.PERMISSION_GRANTED

  private fun requirePermission() {
    if (!granted(Manifest.permission.READ_CALENDAR) || !granted(Manifest.permission.WRITE_CALENDAR)) {
      throw CodedException("Daybloom may not use the phone's calendars")
    }
  }
}

private fun Cursor.longOrNull(i: Int): Long? = if (isNull(i)) null else getLong(i)

private fun hex(color: Int) = String.format("#%06X", 0xFFFFFF and color)
