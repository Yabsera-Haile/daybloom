# Daybloom: Test Plan

**Status:** v0.3, 2026-10-12. Visual reference is now the v2 designs in `design/daybloom/`.
Requirement IDs refer to [REQUIREMENTS.md](REQUIREMENTS.md).

---

## 1. Test levels

| Level | Tool | What it covers | When it runs |
|---|---|---|---|
| Unit | Jest | Repeat rules, dates (day of year, week numbers, seasons), streaks, budget math, reminder scheduling, data layer | Every commit (CI) |
| Component | React Native Testing Library | Each shared component and screen in isolation: states, labels, interactions | Every commit (CI) |
| End-to-end | Maestro (YAML flows) on Android emulator | Real user journeys through the built app | Every pull request + nightly |
| Visual | Maestro screenshots | (1) A person compares each screen side by side with its v2 design render in `design/daybloom/`. (2) Once approved, the screenshot becomes the baseline and later builds are compared against it automatically. | Every pull request touching UI |
| Accessibility | Android Accessibility Scanner + manual TalkBack + max font size | Contrast, labels, tap targets, large text | Each release candidate |
| Reliability | Manual on real phones | Reminders under Doze, reboot, battery savers | Each release candidate |
| Performance | Release build on a low-end phone, profiler | Cold start, scroll smoothness, memory | Each release candidate |
| Usability | Moderated sessions, 5 non-technical people per round | Can real people do real tasks? | Phase 2 (2 rounds), then per major feature |
| Beta | Google Play closed testing (≥ 12 testers, 14 days) | Real-world use, crashes, feedback | Phase 2 |

The v2 renders are at real phone size (390 × 844 at 2×) with the same sample data as the test fixture, so they make a good side-by-side reference. They're HTML, not the app, so a person does the first comparison; after that, the app's own approved screenshots become the automated baseline. (The original Stitch screenshots are shrunken full-page images at mixed widths and aren't used for comparison.)

**Definition of done for any feature:** unit and component tests pass, the main flow has a Maestro test, a person has done the side-by-side check against the v2 design, accessibility labels are in place, and it's been tried on one low-end physical phone.

**Test data:** a fixture that recreates the v2 designs' sample data (week of Oct 20–26, 2024, today = Wed Oct 23, 1:15 PM; listed in `design/daybloom/habits/code.html` and visible on every screen), plus an **empty** fixture matching `today-empty/` and `empty-states/`.

## 2. Device list

| Device | Why |
|---|---|
| Android emulator: lowest supported version | Minimum-version compatibility |
| Android emulator: Android 13 | Notification permission prompt was introduced here |
| Android emulator: latest Android | Current behavior, exact-alarm rules |
| Physical Samsung (One UI) | Most common brand; own battery optimization |
| Physical Xiaomi / Redmi | Most aggressive at killing background apps |
| Physical low-end phone (~2–3 GB RAM) | Performance floor |
| Small screen (~360 dp wide) and large phone | Habit grid and month grid at both extremes |
| iOS simulator (via EAS) | Keeps the iOS path working; full iOS QA in Phase 5 |

## 3. Whole-app test cases (section A)

### Events, tasks and views

| Test ID | Covers | Type | Scenario | Expected |
|---|---|---|---|---|
| T-01.1 | FR-01 | E2E | Add "Dentist" tomorrow 3:00 PM | Appears on Today (tomorrow), Week and Month |
| T-01.2 | FR-01 | E2E | Add event with no time | Shown as all-day, above the timeline |
| T-01.3 | FR-01 | Component | Save with empty title | Save disabled or friendly hint; nothing saved |
| T-02.1 | FR-02 | E2E | Edit title and time | Changes show on all tabs |
| T-02.2 | FR-02, UX-04 | E2E | Delete event, tap Undo | Event back, with its reminders |
| T-02.3 | FR-02 | Unit | Delete without undo | Soft-deleted; reminders cancelled |
| T-03.1 | FR-03, SH-02 | E2E | Select Oct 25 in Month, go to Week, back to Month | Month still shows Oct 25 selected |
| T-06.1 | FR-06 | Component | Event in each category, urgent and not | Category color from tokens; Urgent badge separate; text ≥ 4.5:1 |
| T-07.1 | FR-07 | E2E | Add a day task and a weekly priority | Day task on Today; weekly priority in Week's "Weekly Priorities" |
| T-08.1 | FR-08 | E2E | Go 3 months ahead in Month, tap Today | Current month, today marked |
| T-13.1 | FR-13 | Unit | Every computed number (counts, %, streaks, totals) from the sample fixture | Matches values recomputed independently in the test |
| T-14.1 | FR-14 | E2E | Add task "Tax filing", due Oct 30 5:00 PM, urgent | Shows in Today (Oct 30), Week day card, Month grid label and "Upcoming deadlines" |
| T-15.1 | FR-15 | E2E | Leave 2 tasks undone yesterday, open app | Prompt offers to move them; "Move" puts them on today |

### Repeats (unit; where planners usually break)

| Test ID | Covers | Scenario | Expected |
|---|---|---|---|
| T-05.1 | FR-05 | Weekly on Tue+Thu for 6 weeks | Exactly 12 occurrences |
| T-05.2 | FR-05 | Monthly on the 31st | Months without a 31st skipped (same as Google Calendar) |
| T-05.3 | FR-05 | Yearly on Feb 29 | Only in leap years |
| T-05.4 | FR-05, FR-11 | Weekly 9:00 AM across a daylight-saving change | Stays 9:00 AM local |
| T-05.5 | FR-05 | Edit "Just this one" | Only that date changes |
| T-05.6 | FR-05 | Edit "This and following" | Series splits; earlier dates unchanged |
| T-05.7 | FR-05 | Delete one occurrence | Only that date gone; its reminder cancelled |
| T-05.8 | FR-05 | End date / end after N times | Nothing after the end |

### Reminders

| Test ID | Covers | Type | Scenario | Expected |
|---|---|---|---|---|
| T-04.1 | FR-04 | Unit | Event 3:00 PM, "10 min before" | Scheduled 2:50 PM |
| T-04.2 | FR-04 | Unit | Two reminders on one event | Two scheduled |
| T-04.3 | FR-04 | Unit | 200 future reminders | Only the next N (≤ 64, the iOS limit) scheduled; refill keeps order |
| T-04.4 | FR-04 | Unit | Change event time | Old reminder cancelled, new one scheduled |
| T-10.1 | FR-10, NFR-07 | Reliability | App swiped away, reminder in 5 min | Fires within 1 min |
| T-10.2 | FR-10 | Reliability | Phone restarted before reminder | Fires on time |
| T-10.3 | FR-10 | Reliability | Overnight idle (Doze), 7:00 AM reminder | Fires within 1 min |
| T-10.4 | FR-10 | Reliability | Samsung/Xiaomi battery saver on | Fires, or the app shows its help screen |
| T-10.5 | FR-10 | Reliability | Exact-alarm permission unavailable/revoked | Graceful fallback + plain explanation |
| T-12.1 | FR-12 | E2E | Refuse notifications at first run | App works; Settings explains how to turn them on |

### Dates, time zones, seasons, offline, persistence

| Test ID | Covers | Type | Scenario | Expected |
|---|---|---|---|---|
| T-11.1 | FR-11 | Unit + E2E | 3:00 PM event created in Nairobi; phone moved to London time | Correct London time; all-day events stay on their date |
| T-11.2 | FR-11 | Unit | Event crossing midnight | Shows on both days |
| T-11.3 | WK-01 | Unit | Week number for Oct 23, 2024 with Sunday and with Monday week start | Week 43 in both; range Oct 20–26 (Sunday) / Oct 21–27 (Monday) |
| T-11.4 | TD-01, D3 | Unit | Season for Oct 23 with a New York, a Sydney and a Johannesburg time zone | Autumn, Spring, Spring |
| T-09.1 | FR-09 | E2E | Create data, force-stop, reopen | All data present |
| T-09.2 | FR-09 | Manual | Install update over existing data | Data present; migration ran |
| T-NFR02 | NFR-02 | E2E | Full main flow in airplane mode | Everything works, images included |
| T-NFR12 | NFR-12 | Unit | Add $0.10 + $0.20, and 1,000 entries of $86.40 | Exactly $0.30 and $86,400.00 |

### Usability

| Test ID | Covers | Type | Scenario | Pass if |
|---|---|---|---|---|
| T-UX01 | UX-01 | Usability session | "Your dentist is Thursday at 3. Add it so your phone reminds you the day before." No help | ≥ 4 of 5 finish in < 60 s |
| T-UX02 | UX-02, UX-09 | E2E (tap count) | Add basic event and task from Today, Week, Month | ≤ 3 taps + typing each |
| T-UX03 | UX-03 | Automated | Scan all strings for the banned list (incl. DESIGN_REVIEW section 7 terms) | No matches |
| T-UX05 | UX-05 | E2E | Type a title (event, task, budget entry), kill app, reopen | Draft offered back |
| T-UX06 | UX-06 | Component | Every screen and section with the empty fixture | Empty state with a next step |
| T-UX07 | UX-07 | Review | All error strings | One sentence, says what to do |
| T-UX08 | UX-08 | Review | All status labels (week pace, budget, habits) at low progress | Encouraging wording only |

Each usability session also covers: find what's on next Friday; move a task to tomorrow; make a weekly event; tick a habit for yesterday; record a $6.25 coffee. Hesitations go into a findings log and get fixed before the next round.

### Accessibility, performance, visuals

| Test ID | Covers | Scenario | Pass if |
|---|---|---|---|
| T-NFR04.1 | NFR-04 | Accessibility Scanner on every screen | No contrast or tap-target errors |
| T-NFR04.2 | NFR-04 | Max system font size, 360dp phone | Nothing cut off or overlapping; habit and month grids still usable |
| T-NFR04.3 | NFR-04 | Add an event, tick a task, tick a habit, record an expense, all with TalkBack only | Possible; every control announced clearly |
| T-NFR04.4 | NFR-04 | Unit check of every text/background token pair used | ≥ 4.5:1 (≥ 3:1 for stripes and icons) |
| T-NFR04.5 | NFR-04 | Unticked checkbox and habit circle outlines against their backgrounds | ≥ 3:1 |
| T-NFR03.1 | NFR-03 | Cold start, low-end phone, release build, 10 runs | Median < 2 s |
| T-NFR03.2 | NFR-03 | Scroll Today timeline, Week spread, Month grid with the busy fixture | No visible stutter |
| T-NFR05.1 | NFR-05 | Side-by-side with Stitch screenshots (sample fixture) | Approved by a person; then automated baseline |
| T-NFR05.2 | NFR-05 | Lint: no raw colors/sizes outside tokens | No violations |
| T-NFR06.1 | NFR-06 | Network traffic during normal use | Only crash reports, no content |
| T-NFR09.1 | NFR-09 | Lint: no hard-coded strings; switch phone to 24h and en-GB | Times "13:15", dates "23 Oct" |
| T-NFR11.1 | NFR-11 | Reduce motion on | No pulsing/pinging dots; transitions instant |

## 4. Screen tests

For every screen there's also one component test per state (filled, empty, permission denied where relevant) and one side-by-side visual check.

### App shell

| Test ID | Covers | Type | Scenario | Expected |
|---|---|---|---|---|
| T-SH02.1 | SH-02 | E2E | Scroll Week halfway, switch to Month and back | Week at the same scroll position |
| T-SH04.1 | SH-04 | E2E | Android back from Budget → More → Week → Today | Budget→More, More→Today, Week→Today, Today→leaves app |
| T-SH05.1 | SH-05 | E2E | On Month select Oct 25, tap "+ Add" → Event | Event form opens with Oct 25 preset |

### Today

| Test ID | Covers | Type | Scenario | Expected |
|---|---|---|---|---|
| T-TD01.1 | TD-01 | Component | Sample fixture | "Wednesday, Oct 23"; ‹ › change day; Today returns |
| T-TD01.2 | TD-01, FR-13 | Unit | Day of year for Oct 23, 2024 and Oct 23, 2025 | "Day 297 of 366" and "Day 296 of 365" (the design's "296 of 365" is wrong for 2024) |
| T-TD04.1 | TD-04 | Component | View Oct 24 | Subtitle shows the date, not "Today"; no Now line |
| T-TD05.1 | TD-05 | Component | Tick "Morning journal entry" | Progress "4 of 4 done (100%)"; strikethrough |
| T-TD05.2 | TD-05 | E2E | Collapse Morning Ritual, restart app | Still collapsed |
| T-TD07.1 | TD-07, D1 | E2E | Tick a routine item on Today | Same habit ticked for today in Habits tab, and vice versa |
| T-TD09.1 | TD-09 | Component | 2 urgent + 2 not; tap "Urgent" | Only 2 shown; counts "All (4)", "Urgent (2)", "Not urgent (2)" update after adding one |
| T-TD10.1 | TD-10 | E2E | Add Task "Call mum", urgent, 4:00 PM via picker | Appears at top with Urgent badge and "4:00 PM" |
| T-TD10.2 | TD-10 | Component | Save with empty title | Nothing added |
| T-TD11.1 | TD-11 | E2E | Tick a task, tap Undo | Back to not done |
| T-TD12.1 | TD-12 | E2E | ⋮ → Move to tomorrow | Gone from today; on tomorrow's list |
| T-TD13.1 | TD-13, TD-14 | Component | Clock at 1:15 PM | Now line between the 1 PM and 2 PM rows (the design wrongly draws it at 11 AM); label "1:15 PM Now" |
| T-TD13.2 | TD-13 | Component | Events at 5:30 AM and 11:00 PM | Timeline extends to include them |
| T-TD15.1 | TD-15 | E2E | Tap empty 3 PM row, add note, tick it | Note in 3 PM row, ticked, readable (≥ 4.5:1) |
| T-TD16.1 | TD-16 | Component | Two events at 10 AM + one all-day | Both inside the 10 AM row; all-day above timeline |
| T-TD19.1 | TD-19 | Unit + component | Clock 1:15 PM, next event Team project review at 2:00 PM | "Up next · in 45 min", title, "2:00 – 3:00 PM · Studio Lab 4"; hidden when nothing else is planned today |

### Week

| Test ID | Covers | Type | Scenario | Expected |
|---|---|---|---|---|
| T-WK01.1 | WK-01 | Component | Sample fixture, Sunday start | "Week 43 • 2024", "Oct 20 – Oct 26", Sunday first |
| T-WK02.1 | WK-02 | E2E | Next week, next week, "This week" | Oct 27–Nov 2, Nov 3–9, back to Oct 20–26 |
| T-WK04.1 | WK-04 | Component | Tap Fri 25 in strip | Scrolls to Friday's card |
| T-WK05.1 | WK-05 | Component | 18 tasks this week, 11 done | "11 of 18 done this week" |
| T-WK06.1 | WK-06 | Component | Empty Thursday | "Nothing planned" on that card |
| T-WK07.1 | WK-07 | Unit | Past day all done / 3 done / future day with deadline | "Completed" / "3 done" / "Deadline" |
| T-WK09.1 | WK-09 | E2E | Tap Tuesday's card | Today tab opens on Tue Oct 22 |
| T-WK11.1 | WK-11 | Component | v2 fixture, Sun–Wed | Rows Morning / Evening / Anytime; Tue Morning shows "some done" (2 of 3); "75% done so far" (24 of 32); matches Habits tab data |

### Month

| Test ID | Covers | Type | Scenario | Expected |
|---|---|---|---|---|
| T-MO01.1 | MO-01 | Component | October 2024, Sunday start | Starts Sun Sep 29 (faded), Oct 1 on Tuesday, ends Sat Nov 2 |
| T-MO03.1 | MO-03 | E2E | Switch to Agenda and back | Dated list of the month; Grid restored |
| T-MO04.1 | MO-04 | Component | Day with 1 urgent + 2 normal items | Urgent label + "+2"; label ≥ 11px |
| T-MO05.1 | MO-05 | E2E | Tap Oct 25, tap "+" | Sheet shows Friday, October 25; new event lands on Oct 25 |
| T-MO06.1 | MO-06 | Component | Goal "Save $800 this month", $400 saved | "This month's goal" card, "50%", half-filled bar; urgent items listed first in the day sheet |
| T-MO07.1 | MO-07 | Component | Deadlines Oct 28 (no time), Oct 30 11:59 PM, one done | Two rows: "Mon • End of day", "Wed • 11:59 PM"; done one hidden |

### Habits

| Test ID | Covers | Type | Scenario | Expected |
|---|---|---|---|---|
| T-HB01.1 | HB-01 | Unit | Oct 23 of a 31-day month | "Day 23 of 31", bar 74% |
| T-HB02.1 | HB-02, FR-13 | Unit | Original Stitch habit data (5 daily, 3 weekly; 4 of 5 daily done today) | "Active habits 8", "Today done 4/5" (the Stitch design's "7" and "5/7" are wrong) |
| T-HB02.2 | HB-02, FR-13 | Unit | v2 fixture (8 daily in 3 routines, 3 weekly; 3 daily done today) | "Active habits 11", "Done today 3/8", best streak 18 |
| T-HB04.1 | HB-04 | E2E | Tap Friday 18 circle for "20-Min Reading" | Toggles; streak recalculates |
| T-HB05.1 | HB-05 | Unit | October 2024, Sunday start | 5 week columns (the design shows 4) |
| T-HB06.1 | HB-06 | Unit | Done every day up to yesterday, not yet today | Streak unchanged until midnight; broken the next day if still not done |
| T-HB07.1 | HB-07 | E2E | Add weekly habit "Call grandma", archive "Vitamins" | New row in weekly section; Vitamins gone, history kept |
| T-HB07.2 | HB-07 | Unit | "Drink water", reminded every hour from 7 AM to 6 PM; tick it at 1:15 PM | 12 reminders a day; none left today after the tick; at most 24 waiting for one habit |
| T-HB08.1 | HB-08 | Component | "10,000 Daily Steps" on 360dp at default and max font size | Full name visible (wraps), no "…" |

### More and Budget

| Test ID | Covers | Type | Scenario | Expected |
|---|---|---|---|---|
| T-MR01.1 | MR-01 | E2E | Tap ≡ in the header → Spending categories → back; tap "Add expenses from bank texts" | More opens; back returns; the bank-texts row explains it is coming in the next version |
| T-BU01.1 | BU-01 | E2E | Switch to September (or the previous week with a weekly budget) | All sections show that period's data |
| T-BU02.1 | BU-02, FR-13 | Unit | Budget $4,850, spent $3,120, Oct 23 | "36% of your budget left • 9 days to go" (the design's "64% preserved" is wrong) |
| T-BU03.1 | BU-03 | Unit | Budget $4,850, spent $3,120 | "Left to spend $1,730.00", spent 64.3% |
| T-BU03.2 | BU-03, UX-08 | Unit | Spending ahead of the calendar (80% spent on day 15); then $1,120 of $1,000 | "Careful" chip, gentle wording; then "Over budget by $120.00", red bar |
| T-BU05.1 | BU-05 | E2E | Add $100 to Emergency Fund ($8,200 / $10,000) | $8,300, 83% |
| T-BU06.1 | BU-06 | Component | Bills on Oct 25, Oct 28, Nov 10 with today Oct 23 | Oct 25 "Due soon"; Nov 10 hidden (beyond 14 days) |
| T-BU08.1 | BU-08 | E2E | Add expense $6.25 "Latte", Dining | Top of recent spending; spent +$6.25; Dining in "Where it went" |
| T-BU08.2 | BU-08 | Component | Save with amount 0 or empty | Not saved; friendly hint |
| T-BU08.3 | BU-08, UX-05 | E2E | Type amount, tap outside sheet | Sheet closes; reopening restores the draft |
| T-BU09.1 | BU-09 | Unit | 1,730.00 in USD and KES; 1,500 in JPY | "1,730.00" with no currency sign; yen without decimals |

### Event sheet, onboarding, settings, search

| Test ID | Covers | Type | Scenario | Expected |
|---|---|---|---|---|
| T-EV01.1 | EV-01 | Component | Set start 3:00 PM | End defaults to 4:00 PM; end before start not allowed |
| T-EV02.1 | EV-02 | E2E | Tap empty 2 PM row on Today → Event | Date and 2:00 PM preset |
| T-EV03.1 | EV-03 | Component | Open on 360dp phone at max font size | Title field and Save visible without scrolling |
| T-EV04.1 | EV-04 | E2E | Open event → Duplicate | Copy created with same fields |
| T-EV05.1 | EV-05 | Unit | Weekly on Tuesday; monthly on 23rd | "Every Tuesday", "Every month on the 23rd" |
| T-EV06.1 | EV-06 | Unit | Titles "Lunch with Sam", "Morning walk", "Zoom call", "Quarterly review" (Work) | Fork-and-knife, walking, video, and the Work category icon |
| T-EV07.1 | EV-07 | Component | Open "+ Add" → Event at 1:15 PM | Wed, Oct 23 · 2:00–3:00 PM · Personal · 10 min before; title focused |
| T-ON01.1 | ON-01 | E2E | Fresh install, go through onboarding, skip name | Lands on Today with empty state; permission asked once |
| T-ST01.1 | ST-01 | E2E | Change week start to Monday | Week, Month and Habits all start on Monday |
| T-ST04.1 | ST-04, NFR-04 | Unit | Each seasonal theme | All text colour pairs ≥ 4.5:1; "Follow the seasons" gives spring in October in the south, autumn in the north |
| T-ST05.1 | ST-05 | Manual (installed app) | Pick Birdsong, then Vibrate only; send a test reminder each time | The reminder chirps, then only buzzes; the next real reminder does the same |
| T-SR01.1 | SR-01 | E2E | Search "tax" | Finds the task and the event, grouped by date; tap opens it |

### Remaining coverage (one test per requirement not covered above)

| Test ID | Covers | Type | Scenario | Expected |
|---|---|---|---|---|
| T-SH01.1 | SH-01, SH-03 | Component + visual | Each tab on a notched emulator; scroll to bottom | "Daybloom" + section name + search only (no profile button); content scrolls under the translucent header; nothing hidden by notch or gesture bar |
| T-SH06.1 | SH-06 | E2E | More → Settings, change first name to "Ana" | Greeting on Today's first-day card says "Welcome, Ana" |
| T-TD02.1 | TD-02 | E2E | Swipe left on Today | Next day shown |
| T-TD03.1 | TD-03 | Unit | October, northern vs southern hemisphere | Autumn sticker vs spring sticker; no photo, no weather chip |
| T-TD06.1 | TD-06 | Component | Routine at 9:30 PM, clock 1:15 PM | Compact preview; tap opens checklist |
| T-TD08.1 | TD-08 | Component | Task with Urgent, due time and list label | All shown; ⋮ has a screen reader label |
| T-TD17.1 | TD-17 | E2E | Tap an event on the timeline | Event detail opens |
| T-TD18.1 | TD-18 | Unit | Quotes for 3 consecutive dates, offline | A different quote each day; the same all day |
| T-WK03.1 | WK-03 | Unit | 80% done, 50% done, next week | "In rhythm", "Finding your pace", hidden |
| T-WK08.1 | WK-08 | Component | v2 fixture | Wednesday card has sage stripe, "Today · 7 events, 4 to-dos", 3 items (urgent first, then all-day) and "8 more" |
| T-WK10.1 | WK-10 | E2E | Tick a weekly priority (1/3 done before) | "2/3 done" |
| T-WK12.1 | WK-12 | E2E | "+ Add" on Week | Offers Event, Task, Weekly priority |
| T-MO02.1 | MO-02 | Unit | v2 month fixture | "3 urgent · 12 busy days" |
| T-HB03.1 | HB-03 | E2E | Dismiss hint, restart app | Hint stays hidden |
| T-HB09.1 | HB-09 | E2E | Tap calendar button | Month history per habit |
| T-BU04.1 | BU-04 | E2E | Set monthly budget to $4,000 (spent $3,120); then switch to $500 each week | Spent shows 78%; then the tab counts this week, earlier months keep theirs |
| T-BU07.1 | BU-07 | E2E | View all → edit an entry's amount; delete another, Undo | Totals update; deleted entry restored |
| T-BU10.1 | BU-10 | Unit | Bill due Oct 25 with "1 day before" | Reminder at 9 AM on Oct 24: "Due tomorrow · Car insurance", "$420.00 · Needs paying" |
| T-BU11.1 | BU-11 | Unit | 20 made-up MoMo texts, an offer and a failed payment | Two payment shapes (16 and 1 texts); money in, the offer and the failed payment are not spending; every text has a shape |
| T-BU11.2 | BU-11 | Unit | A MoMo payment, a payment with a fee, a received text | 7,380 to Aline (fee 0); 1,200 to Eric NSHUTI, fee 20; the balance is never read as the amount |
| T-BU11.3 | BU-11 | Unit | Later payments to new people, in both shapes | Read with the new name and amount |
| T-BU11.4 | BU-11 | Unit | Save MoMo, then learn it again | One sender "MoMo" with its shapes; learning again replaces them |
| T-BU11.5 | BU-11 | Unit | Add a payment, money in and an offer | One expense "Aline · MoMo", 7,380, dated when the text came |
| T-BU11.6 | BU-11 | Unit | A payment with a fee of 20 | Two expenses: the payment and "MoMo fee" (20) in Fees |
| T-BU11.7 | BU-11 | Unit | The same text twice; again after deleting its expense | Added once; never added back |
| T-BU11.8 | BU-11 | Unit | Give a payee's expense Dining, then a new payment to them | The new one is Dining (none if Dining was deleted) |
| T-BU11.9 | BU-11 | Unit | Answer "Lunch with Sara" (then an empty answer) | The expense is renamed; an empty answer keeps the name |
| T-BU11.10 | BU-11 | Unit | A text from another number; from a sender switched off | Nothing added |
| T-BU11.11 | BU-11 | Unit | A payment text of an unknown shape, then taught | Listed to teach; once taught it's added and leaves the list |
| T-BU11.13 | BU-11 | Component | Open bank texts with no senders, tap "Pick a sender" | Explains what it does and that nothing leaves the phone; asks to read texts, then shows senders |
| T-BU11.14 | BU-11 | Component | A friend's number and MoMo in the inbox | MoMo under "Texts about money"; the friend only after "Show all senders" |
| T-BU11.15 | BU-11 | Component | Set up MoMo from its texts, untick one payment, save | "16 texts like this", "Adds 7,380.00, paid to Aline"; 16 payments and one fee added, not the unticked one |
| T-BU11.16 | BU-11 | Component | Mark the payment-with-fee kind as Skip, save | Those texts aren't added |
| T-BU11.17 | BU-11 | Component | Teach a text that wasn't understood | "Adds 2,500.00"; saved, it's added and the list is gone |
| T-BU11.12 | BU-11 | Manual (installed app, emulator `adb emu sms send`) | Set up MoMo from 20 texts; send a payment with Daybloom closed, reply "Lunch"; send one with Daybloom open | Shapes shown as above; notification "Paid 7,380 to Aline", the reply renames it; when open, "What was it for?" opens |
| T-ST02.1 | ST-02 | E2E | Export data | File contains every event, task, habit, check and entry |
| T-ST03.1 | ST-03 | E2E | Turn off Daybloom notifications in phone settings, open Reminder help | Notifications check shows "Off" with a button to fix it; "Send a test reminder" arrives within 1 minute once it's on |
| T-NT01.1 | NT-01 | Component + manual | Reminders for an event, an urgent to-do, a routine and a bill | Each shows time + title first, at most two actions; urgent uses the rose accent; Snooze never moves past the event's start |
| T-SR02.1 | SR-02 | E2E | Search "latte", then "hydration" | Finds the budget entry, then the habit |
| T-NFR01.1 | NFR-01 | CI | Smoke E2E on the minimum Android version; weekly iOS simulator build | Both pass and launch |
| T-NFR08.1 | NFR-08 | Beta | Crash-free sessions in the closed test (Sentry) | ≥ 99.5% |
| T-NFR10.1 | NFR-10 | CI | Measure the Android download size | < 40 MB, or the build fails |

## 5. Post-MVP test cases

### Pet mascot

| Test ID | Covers | Scenario | Expected |
|---|---|---|---|
| T-MS01 | MS-01 | Choose puppy, restart, switch to cat | Choice persists; switch immediate |
| T-MS03.1 | MS-03 | Reminder "Dentist 3:00 PM" with cat | Cat image; "3:00 PM Dentist" before the pet message |
| T-MS03.2 | MS-03 | Very long title | Time + title still visible; pet message shortened first |
| T-MS04 | MS-04 | Finish all habits for today | Pet celebrates once (not every tick) |
| T-MS05 | MS-05 | Calm mode on | No pet messages/animations; plain reminders still fire |
| T-MS06 | MS-06 | Reduce motion on | Pet shows a still pose |
| T-MS07 | MS-07 | A week of test data | Notification count = user reminder count |
| T-MS08 | MS-08 | Add a test pet with art + message file only | Works without code changes |
| T-MS-UX | All MS | Usability round with the pet | Charming, and adding events is not slower than in T-UX01 |

### Google Calendar, step A (device calendar)

| Test ID | Covers | Scenario | Expected |
|---|---|---|---|
| T-GC01 | GC-01, GC-02 | Phone with Google account; turn on, pick 2 calendars | Their events appear, visually distinct |
| T-GC02 | GC-02 | Receive an invite in Google Calendar | Appears after the phone syncs |
| T-GC03 | GC-03 | Turn off | Google events gone; Daybloom data untouched |
| T-GC04 | GC-04 | Refuse calendar permission | App works; explanation shown |

### Google Calendar, step B (Google API)

| Test ID | Covers | Scenario | Expected |
|---|---|---|---|
| T-GC10.1 | GC-10 | Sign in, cancel halfway | No partial state; can retry |
| T-GC10.2 | GC-10 | Revoke access from Google account page | App notices, explains, offers reconnect |
| T-GC11.1 | GC-11 | Create/edit/delete in Daybloom | Same in Google Calendar |
| T-GC11.2 | GC-11 | Create/edit/delete in Google Calendar | Same in Daybloom |
| T-GC11.3 | GC-11 | Google rejects the sync token (410 Gone) | Full re-sync, no duplicates, no loss |
| T-GC12 | GC-12 | Accept an invite in Daybloom | Organizer sees "accepted" |
| T-GC13 | GC-13 | Create event with a guest | Guest gets a Google invite |
| T-GC14 | GC-14 | Edit 3 events offline, go online | All 3 sync |
| T-GC15 | GC-15 | Same event edited offline on phone and on web | User chooses; choice wins everywhere |
| T-GC16 | GC-16 | Weekly series with one moved and one deleted date | Matches on both sides |
| T-GC17 | GC-17 | Disconnect, choose "remove Google events" | Tokens and Google events gone; Daybloom data kept |
| T-GC18 | GC-18 | Inspect app storage after sign-in | No tokens outside secure storage |

## 6. Tracking

- Each test ID becomes a test name in code (e.g. `it('T-TD01.2 day of year in a leap year', ...)`) or a Maestro flow file name, so coverage can be checked by searching for the ID.
- Manual tests (reliability, usability, accessibility, visual review) are recorded per release candidate in `docs/test-runs/<version>.md`: who, which device, pass/fail, notes.
