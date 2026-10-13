# Daybloom: Requirements

**Status:** v0.4, 2026-10-12. Every screen is designed (`design/daybloom/`). No photos, no profile button.

- **Section A:** requirements that apply across the whole app (from the brief, updated after the design review)
- **Section B:** screen by screen, from the Stitch export ([DESIGN_REVIEW.md](DESIGN_REVIEW.md))
- **Section C:** post-MVP (pet mascot, Google Calendar)
- **Section D:** explicitly out of scope for the MVP

Every requirement has an ID, and [TEST_PLAN.md](TEST_PLAN.md) refers to them.
Priority: **M** = must have for MVP, **S** = should have, **L** = later.
**(D#)** = depends on a decision in DESIGN_REVIEW section 9; the recommended option is written here.

---

## A. Whole-app requirements

### A.1 Functional

| ID | Requirement | Priority |
|---|---|---|
| FR-01 | User can create an event with a title and a date; time is optional (all-day if not set) | M |
| FR-02 | User can edit any field of an event and delete it; delete can be undone for at least 5 seconds | M |
| FR-03 | Plans can be seen by day (Today tab), week (Week tab) and month (Month tab, grid + agenda) | M |
| FR-04 | One or more reminders per event and task (at time, 10 min, 30 min, 1 hour, 1 day before), plus a default reminder in Settings | M |
| FR-05 | Repeating events: every day, every week on chosen days, every month, every year, with an end date or count. Editing asks "Just this one / This and following / All". | M |
| FR-06 | Events and tasks have a category (color + label) from an editable list, and a separate **Urgent** flag (DESIGN_REVIEW I4, I5) | M |
| FR-07 | To-dos for a day ("Daily Intentions") and for a week ("Weekly Priorities") | M |
| FR-08 | "Today" is one tap away on every date-based screen | M |
| FR-09 | All data stays on the phone and survives app restarts, phone restarts and app updates | M |
| FR-10 | Reminders fire if the app is closed, the phone restarted, or battery saving is on | M |
| FR-11 | Times stay correct after a time zone or daylight-saving change | M |
| FR-12 | First run asks for notification permission in plain words; the app still works if it's refused | M |
| FR-13 | Every count, percentage, streak and total on screen is calculated from the data, never stored separately (DESIGN_REVIEW section 8) | M |
| FR-14 | Deadlines are tasks with a due date (and optional time). They appear on Today (tasks), Week (day card) and Month (grid + upcoming deadlines). | M |
| FR-15 | Unfinished tasks from past days: a gentle prompt offers to move them to today (D11) | S |

### A.2 Usability

| ID | Requirement | Priority |
|---|---|---|
| UX-01 | A first-time user adds an event with a time and a reminder in under 60 seconds, unaided (≥ 4 of 5 test users) | M |
| UX-02 | Adding a basic event or task takes no more than 3 taps plus typing, from Today, Week or Month | M |
| UX-03 | No technical or finance jargon (banned list + copy changes in DESIGN_REVIEW section 7) | M |
| UX-04 | Every destructive action can be undone or asks first | M |
| UX-05 | Typed text is never lost; an unsaved draft comes back if the app closes | M |
| UX-06 | Every screen and section has a friendly empty state with a next step (`today-empty/`, `empty-states/`) | M |
| UX-07 | Error messages: one short sentence saying what happened and what to do | M |
| UX-08 | Status messages are encouraging, never shaming ("Finding your pace", not "Behind") | M |
| UX-09 | One consistent "+ Add" button on Today, Week and Month (DESIGN_REVIEW I7) | M |

### A.3 Non-functional

| ID | Requirement | Priority |
|---|---|---|
| NFR-01 | Android 7.0 (API 24) and newer, targeting Android 16 (API 36); the same code builds for iOS | M |
| NFR-02 | Everything works offline, images included (bundled in the app) | M |
| NFR-03 | Cold start < 2 s on a mid-range phone about 3 years old; scrolling stays smooth | M |
| NFR-04 | Accessibility: text contrast ≥ 4.5:1; text ≥ 12px (month cell chips ≥ 11px); touch areas ≥ 48dp (dense grids ≥ 32dp); works at 200% font size; every control labelled for TalkBack; unticked boxes and circles have a 3:1 outline (DESIGN_REVIEW section 4) | M |
| NFR-05 | Visuals come only from `design/tokens.json`; screens match the Stitch design after review | M |
| NFR-06 | Privacy: no account; no personal data leaves the phone except crash reports with no content | M |
| NFR-07 | Reminders fire within 1 minute of their time on the test devices | M |
| NFR-08 | Crash-free sessions ≥ 99.5% in beta | M |
| NFR-09 | The MVP ships in English only, but all interface text lives in translation files; dates, times, numbers and money are formatted by the phone's locale | M |
| NFR-10 | Android download < 40 MB | S |
| NFR-11 | Animations respect the phone's reduce-motion setting | M |
| NFR-12 | Money stored as whole cents (no rounding errors) | M |

---

## B. Screen-by-screen requirements

### B.0 App shell (all tabs)

**Design:** every screen in `design/stitch/`
**Elements:** translucent header (logo, "Daybloom", section name, search button, profile photo); bottom tab bar (Today, Week, Month, Habits, Hub).

| ID | Requirement | Priority |
|---|---|---|
| SH-01 | Header shows the logo, "Daybloom" and the current section name, with a search button on the right. No profile picture or account button (D8). | M |
| SH-02 | Bottom tabs: Today, Week, Month, Habits, More (renamed from "Hub", D6). The active tab has the sage pill. Each tab keeps its scroll position and selected date when you switch away and back. | M |
| SH-03 | Header and tab bar are translucent with blur; content scrolls underneath; notches and the gesture bar are respected | M |
| SH-04 | Android back button: on a pushed screen it goes back; on a tab other than Today it goes to Today; on Today it leaves the app | M |
| SH-05 | Floating "+ Add" on Today, Week and Month opens a chooser (Event / To-do; Week also offers Weekly priority) with the date preset to the day being viewed | M |
| SH-06 | Settings opens from More (there's no profile button). Settings keeps an optional first name used only for greetings (D8). | M |

### B.1 Today tab

**Design:** `design/daybloom/today/` (empty first day: `today-empty/`; original: `design/stitch/daily_planner/`)
**Purpose:** one day as a planner page: routines, to-dos and an hourly timeline.

| ID | Requirement | Priority |
|---|---|---|
| TD-01 | Date header: "Wednesday, Oct 23", season + day of year ("Autumn • Day 297 of 366"), ‹ › to change the day, "Today" button | M |
| TD-02 | Swiping left/right changes the day | S |
| TD-03 | The date card shows a seasonal sticker (spring, summer, autumn, winter; hemisphere-aware, D3). No photos (D7) and no weather chip (D2). | M |
| TD-04 | When viewing another date, the header subtitle shows that date instead of "Today", the "Now" line is hidden, and "Today" brings you back | M |
| TD-05 | Routine cards (e.g. Morning Ritual, Evening Wind-Down): name, icon, optional time ("Scheduled for 9:30 PM"), progress "3 of 4 done", checklist. Ticking strikes the item through. Cards collapse and expand, and the collapsed state is remembered. | M |
| TD-06 | A routine scheduled later today shows as a compact preview (2-column tiles); tapping opens its checklist | S |
| TD-07 | Routine items are habits; ticking here also ticks them in Habits (D1) | M |
| TD-08 | Daily Intentions: tasks for this date with checkbox, title, Urgent badge, optional due time, optional list label, ⋮ menu | M |
| TD-09 | Filter chips "All (n)", "Urgent (n)", "Not urgent (n)" with live counts | M |
| TD-10 | "Add Task" opens an inline form: title (required), Urgent toggle, optional time from a time picker (not typed). Save adds the task at the top; Cancel discards. | M |
| TD-11 | Ticking a task: filled checkbox, strikethrough, text at 75% opacity (A3), Undo offered | M |
| TD-12 | To-do ⋮ menu: Edit, Move to tomorrow, Move to another day, Urgent on/off, Delete (with Undo) | M |
| TD-13 | Hourly timeline: rows from 7 AM to 9 PM by default, extended to fit earlier or later events. To-dos with a due time and routines also appear at their hour. Events sit under their start hour with icon, title, "8:30 AM – 9:30 AM • place", category tag and Urgent badge. | M |
| TD-14 | "Now" line at the current time (today only), with label "1:15 PM Now"; updates every minute | M |
| TD-15 | Tapping an empty hour adds a short hour note (or an event via the chooser); hour notes can be ticked; their text is readable (A1) | M |
| TD-16 | Several items in the same hour stack inside that row; all-day events show in an "All day" row above 7 AM | M |
| TD-17 | Tapping an event opens its detail (G2) | M |
| TD-18 | Daily quote at the bottom, rotating from a bundled list | S |
| TD-19 | "Up next" card near the top: the next event, its time, place and how soon ("in 45 min") | S |


### B.2 Week tab

**Design:** `design/daybloom/week/` (original: `design/stitch/weekly_planner/`)
**Purpose:** the week as a spread: each day at a glance, week to-dos, habit overview.

| ID | Requirement | Priority |
|---|---|---|
| WK-01 | Header: "Week 43 • 2024" and "Oct 20 – Oct 26"; week number and first day follow the week-start setting | M |
| WK-02 | Go to previous/next week (buttons + swipe) and back to this week | M |
| WK-03 | Status capsule: gentle pace label for the current week ("In rhythm" / "Finding your pace"); hidden for other weeks (UX-08) | S |
| WK-04 | Week strip: 7 days with weekday letter, date and a dot if there are plans (urgent dot in terracotta); today/selected filled sage; tapping a day scrolls to its card | M |
| WK-05 | Weekly intention: the user can write one sentence per week; below it "11 of 18 done this week" (tasks done / tasks planned) | M |
| WK-06 | Day cards (7, in week-start order): number, weekday, status chip, items (events and tasks, with category stripe, time and subtitle); done items struck through; an empty day says "Nothing planned" | M |
| WK-07 | Status chip rule: past day → "Completed" (all done) or "n done"; future day → "Deadline" if a deadline is due, otherwise its main category | S |
| WK-08 | Today's card is highlighted: left sage stripe, "Today • 3 plans", "Today" chip | M |
| WK-09 | Tapping a day card opens Today for that date; tapping an item opens it | M |
| WK-10 | Weekly Priorities: week tasks with checkbox, title, note, Urgent badge; "1/3 done" | M |
| WK-11 | Habits at a glance: one row per routine (Morning, Evening, Anytime), each day shown as all done / some done / none; "75% done so far"; read-only; tapping opens Habits | M |
| WK-12 | "+ Add" follows SH-05; on this screen the chooser also offers "Weekly priority" | M |

### B.3 Month tab

**Design:** `design/daybloom/month/` (original: `design/stitch/monthly_calendar/`)
**Purpose:** the month at a glance, plus deadlines.

| ID | Requirement | Priority |
|---|---|---|
| MO-01 | Title "October 2024" with season chip; ‹ Today › and swipe to change month | M |
| MO-02 | Summary: "2 urgent • 8 planned" for the month | S |
| MO-03 | Grid / Agenda switch. Agenda is a dated list from today to the end of the month, with "Show earlier days" | M |
| MO-04 | Grid: first day follows the week-start setting; other-month days faded; today marked in sage (I6); each day shows one single-line label ending in "…" (urgent first, then earliest) plus "+n" if there are more; labels ≥ 11px (A4) | M |
| MO-05 | Tapping a day selects it; the sheet below shows that date ("Wednesday, October 23 • 3 items") and "+" adds to that date | M |
| MO-06 | Day sheet items: time (or "Due" time), title, category stripe, Urgent badge; urgent first, then by time. The month's goal shows as its own card with a progress bar. | M |
| MO-07 | Upcoming deadlines: unfinished tasks due later this month, with date tile, chips, "Mon • End of day" (if no time) or the time, and a chevron that opens the task | M |

### B.4 Habits tab

**Design:** `design/daybloom/habits/` (+ `habit/` form, `habit-history/`; original: `design/stitch/habit_tracker/`)
**Purpose:** track daily and weekly habits with streaks.

| ID | Requirement | Priority |
|---|---|---|
| HB-01 | Header "Habits • October 2024", "Day 23 of 31 • 78% of habits done", month progress bar | M |
| HB-02 | Stat tiles: best streak (days), active habits (count), today done (x / y daily habits), all calculated (FR-13) | M |
| HB-03 | Hint "Tap any circle to mark complete" with the 7-day range; it can be dismissed and stays dismissed | S |
| HB-04 | Daily habits, grouped by routine (Morning Ritual, Evening Wind-Down, Anytime): last 7 days (today on the right, highlighted); each row has name, a streak (only when 2+ days) or a short note, and 7 circles; tapping toggles; future days are not shown | M |
| HB-05 | Weekly habits: one circle per week of the month (4, 5 or 6 weeks, per week-start setting) | M |
| HB-06 | Streaks: consecutive completed days (weeks for weekly habits). Today not being done yet doesn't break a streak until the day ends. | M |
| HB-07 | Add, edit, reorder, archive habits: name, how often (daily/weekly), routine (Morning, Evening, Anytime or a new one), reminder (shared with the routine, or its own time), short note | M |
| HB-08 | Habit names wrap to 2 lines instead of being cut off (A6) | M |
| HB-09 | Calendar button (top right) shows a month history per habit | S |

The "Coming soon" teaser is removed (D13).

### B.5 More tab (was "Hub")

**Design:** `design/daybloom/more/`

| ID | Requirement | Priority |
|---|---|---|
| MR-01 | A simple list: Budget, Settings, Help & feedback (D6) | M |

### B.6 Budget

**Design:** `design/daybloom/budget/` (+ `budget-goals/`, `budget-entries/`, `budget-bill/`; opened from More; back button; no tab bar; original: `design/stitch/budget_planner/`)
**Purpose:** a gentle monthly money page with manual entries; no bank connection.

| ID | Requirement | Priority |
|---|---|---|
| BU-01 | Title "October Balance" with a month chip; tapping the chip switches month | M |
| BU-02 | Quote card with the savings sticker and a calculated line: "36% of your budget left · 9 days to go" | S |
| BU-03 | Summary: "Left this month" (money in − money out), spent amount and % of the monthly budget, progress bar, "On track" / "Careful" chip, "Money in" / "Money out" tiles (copy per DESIGN_REVIEW section 7) | M |
| BU-04 | Monthly budget amount can be set (defaults to money in) | M |
| BU-05 | Savings goals: icon, name, note, saved / target, % bar; "Manage" opens a list to add, edit and add money | M |
| BU-06 | Upcoming bills (next 14 days): due-date chip ("Due soon" within 3 days), name, note, amount, payment label; bills can repeat monthly; add/edit | M |
| BU-07 | Recent spending: category icon, description, category chip, date and time, amount (− expense, + income); "View all" opens the full list with edit/delete | M |
| BU-08 | "Add Expense / Income" opens the Record Entry sheet: Expense/Income switch, amount (number keypad, local currency), description, category chips, Save. Amount must be > 0. Closes by ✕ or tapping outside; a typed draft is kept (UX-05). | M |
| BU-09 | Currency from the phone's region, changeable in Settings (D9); amounts stored in cents (NFR-12) | M |
| BU-10 | Optional reminder for a bill's due date | S |

### B.7 Add / Edit Event sheet and event detail

**Design:** `design/daybloom/event/` (new, edit, repeating-event question) and `design/daybloom/today/#event-detail`.

| ID | Requirement | Priority |
|---|---|---|
| EV-01 | Fields: title (required), date, all-day switch, start and end (end defaults to start + 1 hour), repeat, reminder (default from Settings), category, Urgent, place, notes | M |
| EV-02 | Opens with the date (and hour, if an hour was tapped) preset from where it was opened | M |
| EV-03 | Only the title is required; Save is visible without scrolling; rarely used fields (repeat, place, notes) sit under "More options" | M |
| EV-04 | Detail view: all fields, plus Edit, Duplicate, Delete (with Undo) | M |
| EV-05 | Repeat choices in plain words: "Every Tuesday", "Every month on the 23rd", "Every year on Oct 23" | M |
| EV-06 | The event's icon is chosen automatically from the title (walk, lunch, call…), falling back to the category's icon; the user never picks one | S |
| EV-07 | New events default to the next whole hour, 1 hour long, category Personal, the usual reminder | M |

### B.8 Onboarding, Settings, Search

**Design:** `design/daybloom/onboarding/`, `settings/` (+ `settings-categories/`, `reminder-help/`), `search/`, `notifications/`, empty states in `empty-states/`.

| ID | Requirement | Priority |
|---|---|---|
| ON-01 | Onboarding of up to 4 short steps: welcome → your name (optional) → why reminders matter + notification permission → done. Week start and time format come from the phone. Skippable. | M |
| ST-01 | Settings: first name, week start, 12/24-hour, usual reminder, categories (rename, recolor, reorder), seasons on/off + hemisphere, currency, calm mode, reminder help, privacy & about | M |
| ST-02 | Export all data to a file (backup) | S |
| ST-03 | "Reminders not arriving?" screen: live checks (notifications on, on-time reminders allowed, battery saving), step-by-step help for Samsung, Xiaomi, OnePlus/Oppo and other phones, and a "Send a test reminder" button | M |
| NT-01 | Reminder notifications: time and title first; place, details or "in 10 minutes" second; at most two actions (Snooze / Open, Done / Later, Mark as paid); urgent to-dos use the rose accent; never any marketing messages | M |
| SR-01 | Search finds events and tasks by text; results grouped by date; tapping opens the item | M |
| SR-02 | Search also covers hour notes, habits and budget entries | S |

---

## C. Post-MVP requirements

### C.1 Pet mascot

| ID | Requirement | Priority |
|---|---|---|
| MS-01 | User picks a pet (cat, puppy, bird to start) in onboarding or Settings and can change it any time | L |
| MS-02 | User can name the pet; the name appears in its messages | L |
| MS-03 | Reminders show the pet's image and a message in its voice; time and title always come first | L |
| MS-04 | The pet reacts in the app: idle, happy (task or habit done), reminding, sleeping (quiet hours), celebrating (streaks, "In rhythm" weeks) | L |
| MS-05 | "Calm mode" turns off pet messages and animations; the app stays fully usable | L |
| MS-06 | Pet animations respect reduce-motion | L |
| MS-07 | The pet never sends notifications other than the user's own reminders | L |
| MS-08 | A new pet needs only art + a message file, with no code changes | L |
| MS-09 | The pet can live in the header, on the right next to search | L |

### C.2 Google Calendar integration

Step A (device calendar bridge):

| ID | Requirement | Priority |
|---|---|---|
| GC-01 | "Show my Google Calendar" switch and a choice of calendars | L |
| GC-02 | Google events (including received invites) appear on Today, Week and Month, visually distinct | L |
| GC-03 | Turning it off removes Google events from view; Daybloom data untouched | L |
| GC-04 | Refusing calendar permission leaves the app fully working, with a plain explanation | L |

Step B (Google Calendar API):

| ID | Requirement | Priority |
|---|---|---|
| GC-10 | Connect with "Sign in with Google"; disconnect any time | L |
| GC-11 | Two-way sync of create/edit/delete | L |
| GC-12 | Accept / decline / maybe for invites inside Daybloom | L |
| GC-13 | Create events with guests; Google sends the invites | L |
| GC-14 | Offline changes are kept and synced later | L |
| GC-15 | If the same event changed in both places, the user chooses which version to keep | L |
| GC-16 | Repeating events and their exceptions sync correctly | L |
| GC-17 | Disconnecting removes tokens; the user chooses whether to keep Google events on the phone | L |
| GC-18 | Tokens stored only in secure storage | L |

---

## D. Out of scope for the MVP

Weather (D2) · "Coming soon" logs: skincare, language learning, weight (D13) · bank connections · dark mode (D10) · tablet layout · accounts, cloud backup, sync between devices · sharing plans with other people
