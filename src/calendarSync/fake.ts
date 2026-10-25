// A phone calendar in memory, for tests: keeps events the way Android's calendar store does
// (repeating ones with a length instead of an end, changed occurrences under their series, a
// deleted series takes its occurrences with it).
import type { Answer, CalendarStore, EventValues, PhoneCalendar, PhoneEvent } from './native';
import { durationMs } from './shape';

const DAY = 86_400_000;

export class FakeCalendar implements CalendarStore {
  calendarList: PhoneCalendar[];
  items = new Map<string, PhoneEvent>();
  private next = 100;
  /** Every write, for checking what the sync did. */
  log: string[] = [];

  constructor(calendars: Partial<PhoneCalendar>[] = [{ id: '1', name: 'you@gmail.com' }]) {
    this.calendarList = calendars.map((c, i) => ({
      id: String(i + 1),
      name: `Calendar ${i + 1}`,
      account: 'you@gmail.com',
      accountType: 'com.google',
      color: '#7986CB',
      writable: true,
      visible: true,
      primary: i === 0,
      owner: 'you@gmail.com',
      synced: true,
      ...c,
    }));
  }

  /** Puts an event on the phone as if made in another app; its id. */
  add(event: Partial<PhoneEvent> & Pick<PhoneEvent, 'title' | 'startAt'>): string {
    const id = String(this.next++);
    this.items.set(id, {
      calendarId: '1',
      notes: null,
      location: null,
      endAt: null,
      duration: null,
      allDay: false,
      timeZone: 'America/New_York',
      rrule: null,
      exdate: null,
      originalId: null,
      originalStartAt: null,
      cancelled: false,
      selfStatus: 0,
      organizer: 'you@gmail.com',
      hasGuests: false,
      guestsCanModify: false,
      isOrganizer: true,
      color: null,
      originalSyncId: null,
      ...event,
      id,
      syncId: `sync-${id}`,
    });
    return id;
  }

  async calendars() {
    return this.calendarList;
  }

  async events(calendarIds: string[], since: number) {
    return [...this.items.values()].filter(
      (e) => calendarIds.includes(e.calendarId) && (e.rrule !== null || (e.endAt ?? e.startAt ?? 0) >= since),
    );
  }

  private fields(v: EventValues): Partial<PhoneEvent> {
    const length = v.endAt - v.startAt;
    return {
      calendarId: v.calendarId,
      title: v.title,
      notes: v.notes,
      location: v.location,
      startAt: v.startAt,
      allDay: v.allDay,
      timeZone: v.allDay ? 'UTC' : v.timeZone,
      rrule: v.rrule,
      ...(v.rrule
        ? { endAt: null, duration: v.allDay ? `P${Math.max(1, Math.round(length / DAY))}D` : `P${length / 1000}S` }
        : { endAt: v.endAt, duration: null }),
    };
  }

  async insert(v: EventValues) {
    const id = this.add({ ...this.fields(v), title: v.title, startAt: v.startAt });
    this.log.push(`insert ${id} ${v.title}`);
    return id;
  }

  async insertException(originalId: string, originalStartAt: number, v: EventValues | null, cancelled: boolean) {
    const original = this.items.get(originalId);
    if (!original) throw new Error('No such event');
    const length = original.endAt !== null ? original.endAt - original.startAt! : durationMs(original.duration);
    const own = v ? { ...this.fields(v), rrule: null, duration: null, calendarId: original.calendarId } : {};
    const { id: _id, syncId: _syncId, ...base } = original;
    const id = this.add({
      ...base,
      startAt: originalStartAt,
      endAt: originalStartAt + length,
      duration: null,
      rrule: null,
      exdate: null,
      ...own,
      title: v?.title ?? original.title,
      originalId,
      originalStartAt,
      originalSyncId: original.syncId,
      cancelled,
    });
    this.log.push(`exception ${id} of ${originalId}${cancelled ? ' cancelled' : ''}`);
    return id;
  }

  async update(id: string, v: EventValues) {
    const e = this.items.get(id);
    if (!e) return false;
    const { calendarId: _calendar, ...rest } = this.fields(v);
    this.items.set(id, { ...e, ...rest });
    this.log.push(`update ${id} ${v.title}`);
    return true;
  }

  async setCancelled(id: string, cancelled: boolean) {
    const e = this.items.get(id);
    if (!e) return false;
    this.items.set(id, { ...e, cancelled });
    this.log.push(`${cancelled ? 'cancel' : 'restore'} ${id}`);
    return true;
  }

  async remove(id: string) {
    const had = this.items.delete(id);
    for (const [key, e] of this.items) if (e.originalId === id) this.items.delete(key);
    this.log.push(`remove ${id}`);
    return had;
  }

  async respond(eventId: string, answer: Answer) {
    const e = this.items.get(eventId);
    if (!e) return false;
    this.items.set(eventId, { ...e, selfStatus: { accepted: 1, declined: 2, tentative: 4 }[answer] });
    this.log.push(`respond ${eventId} ${answer}`);
    return true;
  }
}
