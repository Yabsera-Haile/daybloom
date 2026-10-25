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
| UX-04 | Every destructive action can be undone or asks first. Its note ("Event deleted · Undo", a soft sage pill above the tabs, not a dark bar) stays 5 seconds; a note that something was simply done ("Done: Call the bank") stays about a second, a little longer for more words; a tap puts either away | M |
| UX-05 | Typed text is never lost; an unsaved draft comes back if the app closes | M |
| UX-06 | Every screen and section has a friendly empty state with a next step (`today-empty/`, `empty-states/`) | M |
| UX-07 | Error messages: one short sentence saying what happened and what to do | M |
| UX-08 | Status messages are encouraging, never shaming ("Finding your pace", not "Behind") | M |
| UX-09 | One consistent "+ Add" button on Today, Week and Month (DESIGN_REVIEW I7) | M |
| UX-10 | The field being typed in is never hidden by the keyboard: pages, forms, sheets and the first-run pages move it above the keyboard, also when another field is tapped while it's open | M |

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
| NFR-13 | Screen sizes: every screen works from 320dp to 412dp+ wide (small budget phones to large ones like a Galaxy S24 Ultra), with the phone's text at up to 130%. Under 400dp (or with large text), a value, tag or button beside a title moves under it instead of squeezing it; headings with a side note wrap; long page titles shrink a little; tab labels shrink rather than cut; first-run pages scroll when they don't fit | M |
| NFR-14 | Tablets and foldables: phones (under 600dp) keep the phone design. On a wider screen nothing stretches edge to edge: pages, forms and first-run pages keep to a centred column, sheets and the pop-up to the middle. From 720dp each tab shows two panes side by side, each scrolling on its own (Today: to-dos | timeline; Week: the week | day-by-day spread; Month: grid | chosen day, goal, coming up; Habits: daily | weekly; Budget: budget | spending, bills, savings), and Settings and More show two columns. From 840dp the tabs move to a rail on the left. Widths count large text as less room. Tablets and unfolded foldables turn with the device; phones stay upright | M |

---

## B. Screen-by-screen requirements

### B.0 App shell (all tabs)

**Design:** every screen in `design/stitch/`
**Elements:** translucent header (logo, "Daybloom", section name, search button, profile photo); bottom tab bar (Today, Week, Month, Habits, Hub).

| ID | Requirement | Priority |
|---|---|---|
| SH-01 | Header shows the logo, "Daybloom" and the current section name, with a search button and a ≡ More button (settings and help) on the right. No profile picture or account button (D8). | M |
| SH-02 | Bottom tabs: Today, Week, Month, Habits, Budget (D14: Budget took the place of More, which opens from the header). The active tab has the sage pill. Each tab keeps its scroll position and selected date when you switch away and back. | M |
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
| TD-18 | Daily quote just under the date card, as a light line (no box), rotating from a bundled list | S |
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
| HB-07 | Add, edit, reorder, archive habits: name, how often (daily/weekly), routine (Morning, Evening, Anytime or a new one), reminder (shared with the routine, or its own: once, or for daily habits several times a day, every 30 min to 4 hours between two times), short note | M |
| HB-08 | Habit names wrap to 2 lines instead of being cut off (A6) | M |
| HB-09 | Calendar button (top right) shows a month history per habit | S |

The "Coming soon" teaser is removed (D13).

### B.5 More (was "Hub")

**Design:** `design/daybloom/more/`. Opens from the ≡ button in the header (D14), with a back button.

| ID | Requirement | Priority |
|---|---|---|
| MR-01 | A simple list: Spending categories, Add expenses from bank texts (BU-11; says which senders are read), Settings, Reminders not arriving? (D6, D14) | M |

### B.6 Budget tab

**Design:** `design/daybloom/budget/` (+ `budget-goals/`, `budget-entries/`, `budget-bill/`; original: `design/stitch/budget_planner/`). Since D14 it is a tab, with ideas from the Cashew app; it tracks spending only (no income).
**Purpose:** a gentle money page with expenses entered by hand; no bank connection.

| ID | Requirement | Priority |
|---|---|---|
| BU-01 | Title "October budget" (or "Week of Oct 12") with ‹ This month › to move between months or weeks; swiping does the same | M |
| BU-02 | Quote card with the savings sticker and a calculated line: "36% of your budget left · 9 days to go" (hidden in calm mode and when over budget) | S |
| BU-03 | Budget card: "Left to spend" (budget − spent), "Spent $3,120.00 of $4,850.00 (64%)", a progress bar that turns red past the budget with "Over budget by $120.00" and an icon, "On track" / "Careful" / "Over budget" chip, and "About $190 a day for the next 9 days" (copy per DESIGN_REVIEW section 7) | M |
| BU-04 | The budget is set per month or per week (the person chooses) with an amount; a change counts from the current period on, earlier periods keep theirs | M |
| BU-05 | Savings goals: icon, name, note, saved / target, % bar; "Manage" opens a list to add, edit, add or take out money, and see reached goals | M |
| BU-06 | Upcoming bills (next 14 days): due-date chip ("Due soon" within 3 days, "Late"), name, how often, amount, "Paid automatically" / "Needs paying"; bills repeat every 1, 3, 6 or 12 months; add/edit; a paid bill is added to spending (automatically on its day, or when marked paid) | M |
| BU-07 | Where it went: spending per category, biggest first, with a labelled bar and share. Recent spending: category icon, description, category, date and time, amount; "View all" opens the full list by day, filterable by category, with edit/delete and Undo | M |
| BU-08 | "+ Add expense" (also in the "+ Add" chooser) opens the expense sheet: amount (number keypad, local currency), what it was for, category chips with "+ New category", day, Save. Amount must be > 0. Categories start as Groceries, Dining, Transport, Home, Bills, Health, Fun and Other, and can be added, renamed, re-iconed, recolored, reordered and deleted (More › Spending categories). | M |
| BU-09 | Amounts are shown with no currency sign, written the phone's way ("1,730.00" or "1 730,00"; D15); the currency setting (D9) only decides the decimals; amounts stored in cents (NFR-12) | M |
| BU-10 | Optional reminder for a bill: on the day, 1 day or 3 days before, at 9 AM | S |
| BU-11 | Expenses from bank texts (Android, D18): pick who sends your payment texts (MoMo, M-Pesa, a bank); Daybloom reads their newest 100 texts, groups them by shape and shows each kind with an example to confirm (Payment, Money in, Skip) and, for payments, which numbers are the amount and the fee (or "No fee"). Optionally adds this month's payments already on the phone. From then on each payment is added as it arrives, named after who was paid ("Aline · MoMo"), with the payee's last category; its fee is a separate expense ("MoMo fee", category Fees). "Ask what each payment was for" (on by default) asks the moment a payment arrives: with Daybloom open, in the expense sheet; otherwise in a pop-up over whatever is on screen (name, category chips with the payee's last one picked, Later or Save) once the person allows "Appear on top", or else in a notification with a reply box that shows at the top of the screen. Money in, failed payments and offers are left out; each text is added once. Texts that look like payments but match no shape are listed to teach. Only picked senders are read; nothing leaves the phone (NFR-06). | S |

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
| ON-01 | Onboarding of short steps: welcome → your name (optional) → why reminders matter + notification permission → on Android, reading payment texts (BU-11), popping up over other apps (only once texts are allowed) and running in the background (only when the phone limits Daybloom's battery use) → done. Each page explains why, with an example, and asks for one thing; pages that don't apply are left out. Week start and time format come from the phone. Skippable; everything can be allowed later in Settings (ST-06). | M |
| ON-02 | Tour (D19): after onboarding (and once after the update that added it), a short tour over the real app dims the screen except the part being explained, with a card saying what it does: Today, + Add, the companion (when there is one), Week, Month, Habits, Budget, savings and bills, More, Search. On Android, expenses from bank texts get a card for where it starts and one each for picking a sender, checking what Daybloom understood, adding this month’s payments, saying what a payment was for, and fees and unknown texts, each with a small picture of that screen. It moves between tabs as it goes. Skip, Back, Next; Android back steps back. Finishing or skipping is remembered; Settings › Take the tour again and More › Take the tour show it again, and the bank texts screen’s How it works shows just the bank-texts part. | S |
| ON-03 | A first-run page after your name: would you like a companion? Pick a pet (with its picture) or "No thanks", name it, and choose Gentle or Cheeky, each shown with the face it makes when a habit slips. Skippable; Settings › Companion has it all later | L |
| ST-01 | Settings: first name, week start, 12/24-hour, usual reminder, reminder sound, categories (rename, recolor, reorder), colours, seasons on/off + hemisphere, currency, calm mode, reminder help, privacy & about | M |
| ST-02 | Export all data to a file (backup) | S |
| ST-04 | Colours (D16): a spring (cherry blossom, tulips, fresh leaves), summer (turquoise sea, coral, sunflower), autumn (sage, terracotta, butterscotch) or winter (icy blue, cranberry, evergreen) colour theme, or "Follow the seasons" (changes on the first day of each season where you live). The season pictured on Today, Week and Month follows the colours chosen. Every theme keeps text contrast ≥ 4.5:1. | S |
| ST-05 | Reminder sound (D17): the phone's own sound, one of Daybloom's (Chime, Bell, Birdsong, Marimba, Gentle ring) or vibrate only. Tapping one plays it; "Send a test reminder" sends one in 5 seconds with that sound. Reminders always vibrate. | M |
| ST-06 | Phone permissions (Settings): reminders, read payment texts, pop up over other apps and run in the background, each with whether it's allowed and a tap to allow it (asking the phone, or opening its settings once it no longer asks). Rows that don't apply to the phone are hidden. | M |
| ST-03 | "Reminders not arriving?" screen: live checks (notifications on, on-time reminders allowed, battery saving), step-by-step help for Samsung, Xiaomi, OnePlus/Oppo and other phones, and a "Send a test reminder" button | M |
| NT-01 | Reminder notifications: time and title first; place, details or "in 10 minutes" second; at most two actions (Snooze / Open, Done / Later, Mark as paid); urgent to-dos use the rose accent; never any marketing messages | M |
| SR-01 | Search finds events and tasks by text; results grouped by date; tapping opens the item | M |
| SR-02 | Search also covers hour notes, habits and budget entries | S |

---

## C. Post-MVP requirements

### C.1 Pet mascot

| ID | Requirement | Priority |
|---|---|---|
| MS-01 | User picks a companion (a cat, a puppy or a little dragon, each with its picture), or none, during first run (ON-03) or in Settings, and can change it or turn it off any time. Each has its own name to start (Mochi, Biscuit, Ember) and its own sound when it cheers (Purr!, Woof!, Rawr!) | L |
| MS-02 | User can name the pet; the name appears in its messages | L |
| MS-03 | Reminders show the pet's picture beside the text and a short line in its voice after the time and title ("In 10 minutes · Mochi: You've got this."); the line suits its personality and stays the same for the same reminder. Off with the pet and in Calm mode. The small status-bar icon stays the app's (Android draws it in one colour) | L |
| MS-04 | The pet reacts in the app: idle, happy (task or habit done), sleeping (10 PM to 7 AM), and celebrating once a day when the last daily habit is ticked (sparkles, two hops, its own line) | L |
| MS-05 | "Calm mode" turns off pet messages and animations; the app stays fully usable | L |
| MS-06 | Pet animations respect reduce-motion | L |
| MS-07 | The pet sends no notifications of its own, except Cheeky's nudge (D21): at most one a day, at 7 PM, about a daily habit that's slipping and already reminds; gone once the habit is ticked; never from a Gentle pet or in Calm mode | L |
| MS-08 | A new pet needs only art + a message file, with no code changes | L |
| MS-09 | The pet can live in the header, on the right next to search | L |
| MS-10 | Personality, chosen in Settings: Gentle (the default: gets a little sad when a habit slips, never scolds) or Cheeky (gets cross when a habit slips or to-dos pile up, and says so) | L |
| MS-11 | The pet's mood is worked out from the planner and never stored: sulking (sad or cross, by personality) while a daily habit goes two days without a tick or to-dos sit on earlier days, until that's put right (the habit ticked, the to-dos done or moved); otherwise happy once something is done today, content before. Finishing anything gets a happy hop and a line either way | L |
| MS-12 | It naps in a spot on each tab that covers no buttons: Today's date card, Week's intention card, the empty days of Month's grid, beside the title of Habits, beside Budget's title. It moves only while on screen, in short moves with stillness in between (battery). A tap wakes it (a yawn, a stretch) to say a short line. It follows you: stay on a tab about 5 seconds and it comes over, in from the side of the tab it was on (in the tab bar's order), leaping (the dragon flies), then has a look round and, after a few seconds and a yawn, curls up asleep; one time in four it's too sleepy and comes about 20 seconds later; at bedtime it stays where it is; with reduce motion it just appears. While sulking it always comes, awake, and says what's wrong at most every 10 minutes. When you finish something it comes straight over to cheer. Awake and happy, its eyes are open; it squeezes them shut with joy for a moment when it cheers or is tapped. Its speech bubble stays on screen: it opens beside the face on the side with room, at least a page margin (20dp) from the screen's edge, never wider than that room, and a long line wraps onto two | L |
| MS-13 | It dresses for the season the app pictures (the sticker and colours, so it follows the hemisphere and a fixed colour theme): a berry beanie and scarf in winter, a daisy crown in spring, sunglasses pushed up on its head in summer, a russet leaf and a plum scarf in autumn. Outfits sit on top of the head or round the neck only, never between the brows and the mouth, so every mood stays readable; ears still droop and flatten, a dragon's horns poke through the beanie. It wears them in every pose (asleep, stretching, leaping), in reminder pictures and in the pet pictures in Settings and the first-run page. Turning the season pictures off takes them off | L |

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
