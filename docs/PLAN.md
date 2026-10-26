# Daybloom: Project Plan

**Status:** v1.1, 2026-10-26. Every screen designed (`design/daybloom/`). **Phase 0 and milestones M1–M4 built** and checked on the Android emulator and the owner's phone; v2 added colour themes and reminder sounds, v3 expenses from bank texts (Android), v4 a first-run tour, permissions, small screens, tablets and foldables, v5 the companion pet (**Phase 3 done**, ahead of Phase 2), and v6 your phone's calendars in both directions (**Phase 4 step A done**). Next: Phase 2 (polish and beta).

Related documents:
- [../design/daybloom/](../design/daybloom/): **the v2 designs**, the source of truth for the build (clickable HTML prototype + screenshots)
- [DESIGN_REVIEW.md](DESIGN_REVIEW.md): what was wrong with the original design, gaps, decisions D1–D13 (accepted)
- [REQUIREMENTS.md](REQUIREMENTS.md): what the app must do, screen by screen, with IDs
- [TEST_PLAN.md](TEST_PLAN.md): how each requirement is tested
- [../design/tokens.json](../design/tokens.json): colors, fonts, sizes from the design
- [../design/stitch/](../design/stitch/): the Stitch export

---

## 1. Product in one paragraph

Daybloom is a personal planner for people who are not technical. It should feel as simple as a paper planner and schedule as easily as Google Calendar. Its two main strengths are **usability** and **beauty**: a warm "linen paper" look with sage, blush and butterscotch, serif dates, and calm spacing. The MVP design has four tabs and a money page:
- **Today:** a planner page with routines, to-dos and an hourly timeline
- **Week:** a weekly spread with priorities
- **Month:** a grid plus deadlines
- **Habits:** streaks
- **Budget:** a gentle monthly money page

Android comes first, and the code must be able to ship to iOS later. After the MVP come a **pet mascot** that delivers reminders and **Google Calendar integration**.

## 2. Guiding principles

| Principle | What it means in practice | How we check it |
|---|---|---|
| Paper-simple | One clear "+ Add" everywhere; only a title is required | First-time user adds an event in < 60 s (usability test) |
| No jargon | "Left this month", not "Remaining Net Cashflow" | Banned-words scan (DESIGN_REVIEW section 7) |
| Nothing gets lost | Offline; undo; drafts survive closing | E2E in airplane mode, kill-app tests |
| Faithful to the design | All visuals from `design/tokens.json` | Side-by-side review with Stitch, then automated baselines |
| Accessible by default | Readable sizes, contrast, big touch areas | Fixes A1–A10 in DESIGN_REVIEW, tested every release |
| Calm, encouraging | Status words never shame; whimsy can be switched off | Copy review; reduce-motion test |
| Numbers are always right | Every count, %, streak and total is calculated | Unit tests; the design's own sample numbers contained 7 errors |

## 3. Design import: done

The export has 5 screens (Today, Week, Month, Habits, Budget), the logo, a placeholder profile photo and a DESIGN.md. Full details are in [DESIGN_REVIEW.md](DESIGN_REVIEW.md). In short:

- **Good to build from:** consistent design system, clear components, and colors mostly pass contrast checks.
- **Missing before we can build the core:** the **Add/Edit Event** screen (nothing in the design creates an event), event detail, a consistent "+ Add" button, the task ⋮ menu, empty states, onboarding, Settings, and the Hub tab.
- **Accessibility fixes needed:** text as small as 8–10px, a few light-grey texts below contrast minimums, and tap targets of 20–32px.
- **Inconsistencies:** seven different words for "urgent", four styles of add button, and "Ritual" meaning two different things.
- **Decisions D1–D13:** all recommendations accepted. One change: Claude designed the missing screens (D5).
- **v2 designs** in `design/daybloom/` apply every fix and add the missing screens: Add/Edit Event, event details, the to-do menu, Agenda view, More, Settings, onboarding, and empty states. They replace the Stitch screens as the reference.

## 4. Tech stack

**Expo (React Native) with TypeScript (confirmed).** iOS builds without a Mac, the designs' Tailwind classes map almost directly to NativeWind, and fixes can go out over the air.

**Versions in use (Oct 2026):** Expo SDK 57, React Native 0.86, React 19.2, TypeScript 6, NativeWind 4.2.7, Drizzle ORM 0.45, Jest 29. Android: minimum 7.0 (API 24), target 16 (API 36). Development needs Node 22.13 or newer (Node 24 LTS used).

| Layer | Choice | Why |
|---|---|---|
| App framework | Expo (React Native) + TypeScript | One codebase, Android now, iOS later via cloud builds |
| Navigation | Expo Router (tabs + stacks + bottom sheets) | Matches the design's 5 tabs and pushed Budget screen |
| Styling | NativeWind 4.2 (Tailwind 3.4) with `design/tokens.json` | Class names from the HTML designs (`bg-surface-container-low`, `p-space-md`…) work in the app |
| Fonts | `@expo-google-fonts/literata`, `@expo-google-fonts/plus-jakarta-sans` | Bundled, work offline |
| Icons | The 96 Material Symbols the designs use, generated as SVG paths by `npm run generate:ui` | Standard icon packs lack several of them |
| Blur | expo-blur for header and tab bar | Translucent header from the design; solid fallback on slow phones |
| Illustrations | Sticker SVGs (react-native-svg), generated with the icons | No photos (D7); crisp at any size, offline |
| Bottom sheets | @gorhom/bottom-sheet | Record Entry, Add, task menu, event sheet |
| Local database | SQLite (expo-sqlite) + Drizzle ORM | Offline-first, migrations, live queries |
| App state | Zustand for UI state | Small and simple |
| Dates & repeats | date-fns (+ time zones), `rrule` | Same repeat format Google Calendar uses |
| Money | Integer cents + `Intl.NumberFormat` | No rounding errors; local currency |
| Reminders | expo-notifications (local) | No server needed |
| Animation | Reanimated (Rive later for the pet) | Smooth micro-interactions |
| Lists | FlashList | Smooth long lists on low-end phones |
| Builds | EAS Build / Submit / Update | Play Store now, App Store later |
| Crash reports | Sentry (no personal content) | Find problems early |
| Tests | Jest, React Native Testing Library, Maestro | See TEST_PLAN.md |

## 5. Architecture

### 5.1 Local-first, no account
The design has a profile photo but no sign-in, so the MVP has **no account and no server**. All data lives on the phone in **SQLite** (`expo-sqlite`, with Drizzle ORM for typed tables, migrations and live queries). Planner data is relational and is read by date range ("everything between Oct 20 and 26", "all ticks for this habit"), which SQLite does well, offline, and it survives restarts and app updates. There's no profile button; Settings (in More) holds an optional first name for greetings (D8).

### 5.2 Modules

```
src/
  app/            screens (Expo Router; every file is a route)
    _layout.tsx   fonts, splash, database migrations, stack
    (tabs)/       index (Today), week, month, habits, more + custom tab bar
    gallery.tsx   component gallery (Phase 0 check against the designs)
  features/       screen-level pieces shared by routes (TabScreen, …)
  ui/             shared components (DESIGN_REVIEW section 3) + generated icons/stickers
  theme/          typed tokens from design/tokens.json, font files, shadows
  db/             Drizzle schema, client, DatabaseProvider (web = no database)
  calendar/       date math: weeks, day of year, seasons (hemisphere)
  -- added in M1–M4 --
  planner/  recurrence/  reminders/  habits/  budget/  settings/
  -- post-MVP --
  mascot/  sync/google/
drizzle/          generated SQL migrations
scripts/          generate-ui-assets.mjs
```

### 5.3 Data model

```
Category       id, name, colorKey, sortOrder, archivedAt
Event          id, title, notes, location, icon, categoryId, urgent, allDay, start, end, timeZone,
               rrule, reminders[], source ('local'|'device'|'google'), externalId, externalEtag,
               createdAt, updatedAt, deletedAt
Task           id, title, notes, urgent, categoryId?, listLabel?, scope ('day'|'week'),
               date (the day, or the week's first day), dueTime?, reminders[], done, doneAt,
               sortOrder, createdAt, updatedAt, deletedAt          ← a "deadline" is a Task with a due date
HourNote       id, date, hour, text, done, sortOrder
WeekIntention  weekStart, text
Routine        id, name, icon, time?, reminder?, sortOrder, archivedAt
Habit          id, name, detail, icon, frequency ('daily'|'weekly'), routineId?, sortOrder, archivedAt
HabitCheck     habitId + period (a date, or a week's first day)    ← one row per tick
Goal           id, title, note, icon, kind ('savings'|'general'), targetAmount, currentAmount, month?
Entry          id, type ('expense'), amountCents, currency, description, budgetCategoryId, occurredAt,
               source ('sms'?), ref (the text's id, unique), payee
BudgetCategory id, name, icon, colorKey, sortOrder, archivedAt
Bill           id, title, amountCents, dueDate, dueDay, repeatMonths?, payment ('auto'|'manual'), lastPaidAt?
BudgetPlan     period ('month'|'week'), startsOn, amountCents?   ← from that period on
SmsSender      id, address, label, enabled, readUntil           ← bank texts (BU-11)
SmsPattern     id, senderId, kind ('spend'|'income'|'ignore'), regex, amountGroup, feeGroup, payeeGroup, example
SmsUnmatched   id, senderId, body, receivedAt                   ← texts to teach
Settings       name, photo, weekStart, timeFormat, defaultReminder, seasons, hemisphere, currency, calm
```

Rules:
- **Nothing derived is stored** (FR-13): streaks, counts, percentages, "In rhythm", budget totals are all calculated.
- `source / externalId / externalEtag` exist from day one, so Google sync needs no data migration.
- Soft delete (`deletedAt`) makes Undo easy and lets sync know what was deleted.
- Times are stored in UTC along with the event's time zone.
- Routine items are habits (D1), so one tick counts on both Today and Habits.

### 5.4 Reminder scheduling
iOS allows only **64 pending local notifications** per app. The scheduler therefore keeps a **rolling window** of the next reminders across events, tasks, routines and bills, and refills it on app open, on data change and in a background task. Android uses the same code. Notification text comes from a `ReminderContent` builder, so the pet can take over the wording later without touching the scheduler. On Android, calendar apps may use `USE_EXACT_ALARM` under Play policy; a Phase 0 spike confirms the library uses exact alarms.

## 6. Roadmap

### Phase 0: Foundations and design completion
- [x] Decisions D1–D13, stack, English only; every screen designed (`design/daybloom/`), accessibility fixes applied to `tokens.json`
- [x] Project moved out of OneDrive to `C:\Users\STUDENT\Documents\Projects\Daybloom Personal Planner mobile app`
- [x] Expo SDK 57 + TypeScript strict, ESLint, Prettier, Jest; `npm run check` passes (typecheck, lint, 11 tests)
- [x] Theme from `tokens.json` (NativeWind + typed tokens), Literata + Plus Jakarta Sans built in, 96 icons + 5 stickers generated from the designs, Daybloom app icon and splash
- [x] SQLite + Drizzle: 15 tables from section 5.3, first migration generated and checked on real SQLite; runs on app start
- [x] App shell: 5 tabs with the custom tab bar, header, "+ Add" button; Today shows the real date, season and day of year
- [x] **Component gallery** (More › Component gallery) checked on an Android 16 emulator and in the browser
- [x] CI workflow (`.github/workflows/ci.yml`) and EAS build profiles (`eas.json`) ready; they run once the repo is on GitHub / an Expo account is linked
- [x] Repeats across daylight-saving changes (unit tests, T-05.4)
- [ ] Exact-alarm reminders on Samsung (the S24 Ultra) and Xiaomi; blurred header on a low-end phone (the header is 95% opaque paper for now, without blur)

**Exit:** the component gallery runs on Android and matches the design (done on the emulator; try it on your phone with Expo Go); checks pass; decisions are made.

### Phase 1: MVP build, in 4 milestones
Each milestone ends with an installable build on a real phone.

| Milestone | Contents | Requirements |
|---|---|---|
| **M1 Core planner** | App shell; Today (date header, tasks, timeline, hour notes); event sheet + detail; Week; Month (grid, day sheet, agenda, deadlines); reminders (with the notification look and the "Reminders not arriving?" help screen); repeats; onboarding; basic Settings; empty states; search (events + tasks) | SH, TD (except routines), WK (except habits), MO, EV, ON, ST-01, ST-03, NT-01, SR-01, FR-01…14 |
| **M2 Routines & habits** | Habits tab; routines on Today; habits at a glance on Week; streaks | HB, TD-05…07, WK-11 |
| **M3 Money & goals** | Budget tab (D14); expense sheet; spending categories; savings goals; bills; More from the header; monthly goal on Month | MR, BU, MO-06 (goals) |
| **M4 Finishing** | Move-unfinished-tasks prompt, quotes, seasonal images, data export, polish | FR-15, TD-18, ST-02, S items |

**M1 status (2026-10-13):** built and tried on the emulator. Covers SH-01…06; TD-01, 03, 04, 08…17 (plus TD-02 swipe and TD-19 Up next); WK-01, 02, 04…10, 12 (plus WK-03 and WK-07); MO-01, 03…07 except the month's goal (M3) (plus MO-02); EV-01…07; FR-01…14; ON-01; ST-01; ST-03; NT-01; SR-01. Notes:
- Reminders are local notifications kept as a rolling window (section 5.4). **Expo Go on Android can't show them** (Expo removed its notification channels in SDK 53), so the app skips them there and says so on the help screen. They work in the installed app.
- Categories are reordered with Move up / Move down in their edit sheet (works with a screen reader; no drag library needed).
- Changing the time or the repeat of several occurrences drops changes made to single ones, as Google Calendar does.

**M2 status (2026-10-14):** built and tried on the emulator. Covers HB-01…09, TD-05…07 and WK-11. Notes:
- Morning Ritual (7:00 AM) and Evening Wind-Down (9:30 PM) exist from the first start; Today invites people to add a first habit to one of them.
- A routine reminds at its time, listing its habits; an Anytime habit can have its own time, or several times a day (e.g. every hour from 7 AM to 6 PM). Reminders go one week ahead, at most 24 per habit, and skip a day (or week) that is already done.
- Days before a habit was added aren't shown as missed in its history; ticking an earlier day starts the history there.
- Reordering uses Move up / Move down, as categories do.

**M3 status (2026-10-15):** Budget built and tried on the emulator (D14: it's a tab, inspired by Cashew). Covers MR-01, BU-01…10 and the month's goal (MO-06); BU-11 (bank texts) is listed in More for the next version. Notes:
- The budget is monthly or weekly, the person's choice; a change counts from the current month or week on (table `budget_plans`), so earlier periods keep theirs. Expenses only, no income.
- Over budget, the bar turns red and the card says by how much; "Careful" when spending runs 10 points ahead of the calendar.
- Bills the bank pays are added to spending at 9 AM on their day (caught up when the app opens); bills paid by hand are added when marked paid, from the app or the reminder. Paid bills go under the Bills category.
- Savings put into goals aren't counted as spending.

**M4 status (2026-10-15):** built and tried on the emulator. Covers FR-15, TD-18, ST-02, SR-02, UX-05, SH-03 and NFR-10, plus leftovers from M1. Notes:
- The month's goal can have a number to reach ("Save 800", progress added along the way) or none (ticked off). It's a `goals` row with kind 'general'.
- Unfinished to-dos from the last two weeks are offered for today; "Not now" waits until tomorrow.
- New events, to-dos, notes, expenses, habits and bills keep their typing (table `drafts`) until saved or cancelled, also when the app is closed; "Start fresh" throws it away.
- The backup is one JSON file of every table, shared with the phone's share sheet (Drive, Files, email). Restoring from it comes later.
- The header and tab bar are frosted glass on Android 12 and newer (expo-blur), plain paper before that.
- The release build is shrunk (R8, resource shrinking, compressed native libraries) and built for one processor type per phone.
- Screen tests render the real screens on an in-memory database (`src/__tests__`); end-to-end flows for Maestro are in `e2e/`.

**v3 status (2026-10-17): expenses from bank texts (BU-11, D18).** Android only. Notes:
- `src/sms/learn.ts` learns a sender's text shapes with no AI: it masks amounts, numbers, dates and ids, groups texts of one kind by aligning them word by word, guesses the kind from words like "payment" or "received", and writes a regex that both JavaScript and Java can run.
- `modules/daybloom-sms` is Daybloom's own Expo module (Kotlin): it lists senders, reads a sender's texts, and catches new ones from picked senders (a receiver for SMS_RECEIVED), queueing them in SharedPreferences and showing the "What was it for?" notification with a reply box. The app adds what's queued when it opens or comes back, and also reads the inbox since the last read.
- "What was it for?" over other apps is a native card (`PopUp.kt`, a window of type application overlay, needing "Appear on top"); the app hands it the categories, each payee's last category and the theme colours. Without the permission, a high-importance notification asks instead.
- Tables `sms_senders`, `sms_patterns`, `sms_unmatched`; expenses from texts have `source` 'sms', `ref` (the text's id, unique, so a text is added once) and `payee`.
- Google Play allows SMS reading for money management only with a permissions declaration; the declaration and a short video are needed before a Play release.

**v5 status (2026-10-25): the companion pet (Phase 3; MS-01…13, ON-03; D21–D25).** Built on the `pet` branch as an experiment, kept after the owner's phone test. Notes:
- Three pets (a cat, a puppy, a little dragon), chosen on a first-run page or in Settings, named, Gentle or Cheeky, off in Calm mode.
- Drawn in code, not Rive: flat vector layers per pose (sit, sleep, stretch, leap) and a face per mood, drawn in one Skia canvas and moved in short moves only while on screen (`src/features/pet`). A Rive version could replace the drawings later with the same poses and moods.
- Its mood comes from the planner (`src/pet/mood.ts`): happy when something is done, sad (Gentle) or cross (Cheeky) while a habit slips or to-dos sit overdue, asleep at night.
- It naps in a spot on each tab and follows you between tabs; it celebrates the day's last habit; it wears a seasonal outfit that never covers its face.
- Reminders carry its picture and a line in its voice (a small patch to expo-notifications); Cheeky adds at most one nudge a day, at 7 PM, about a slipping habit that already reminds.

**Tip:** M1 is already a usable planner. Starting the Google Play closed test right after M1 gets the mandatory 14-day clock running early.

**Exit:** every **M** requirement passes its tests; a person has approved the side-by-side visual check.

### Phase 2: Polish and beta
- Accessibility pass (TalkBack, maximum font size, contrast) and performance pass on a low-end phone.
- Two usability rounds with 5 non-technical people each.
- Play listing, privacy policy, Data Safety form.
- **Google Play closed test:** new personal developer accounts need at least 12 testers for 14 days before going public.

**Exit:** ≥ 99.5% crash-free sessions; usability targets met; production access granted.

### Phase 3: Pet mascot
Done in v5 (2026-10-25); see [section 7](#7-post-mvp-pet-mascot) and the v5 status above.

### Phase 4: Google Calendar integration
See [section 8](#8-post-mvp-google-calendar-integration). **Step A built (v6.0, 2026-10-26; GC-01…GC-08, D26), checked on the owner's phone, and it reads and writes:** Settings › Your calendars, phone events in Daybloom's events table (source 'device'), a two-way sync (`src/calendarSync`: pull, push, fingerprints) over Daybloom's own Android module (`modules/daybloom-calendar`), "Add to Google Calendar" ticked on the event form, invitations answered in event details, and a one-time copy of earlier events. Step B (sign-in, Google's API) only if something needs it: guests with invitation emails, Meet links, instant updates.

### Phase 5: iOS release
The code is iOS-ready throughout. This phase covers the Apple Developer account, iOS QA (notifications, EventKit), the store listing and review.

## 7. Post-MVP: pet mascot

**Built in v5** (see the v5 status); this was the plan. What changed: a cat, a puppy and a dragon (a bird would fly rather than nap, so it waits); drawn in code with Skia instead of Rive files; it lives in a nap spot on each tab rather than the header and empty states; Cheeky may add one nudge a day (MS-07).

**Goal:** whimsical and personal, without hurting usability.

- **Choice:** cat, puppy, bird to start, with more later. Picked in onboarding (skippable) or Settings, changeable any time, and the pet can be named.
- **Where it lives:** the design already has natural places for it.
  - The **profile photo spot in the header** (MS-09)
  - **Empty states** ("Nothing planned today, Mochi is napping")
  - The Habits "Today done" tile and streaks
  - The Week "In rhythm" capsule
  - The daily quote card (the pet "says" the quote)
- **In reminders:** the pet's image and voice, but the time and title always come first, e.g. "3:00 PM Dentist · Mochi says: don't forget your teeth! 🐾".
- **States:** idle, happy, reminding, sleeping (quiet hours), celebrating (once, not on every tick).
- **Tech:** one Rive file per pet; static images for notifications; a message file per pet personality.
- **Respect:** "Calm mode" switches it off; reduce-motion gives a still pose; the pet never adds notifications of its own.
- **Art:** drawn in the tokens palette (sage, blush, butterscotch, linen) so it belongs to the app.

## 8. Post-MVP: Google Calendar integration

**Step A, device calendar bridge (no Google sign-in), built in both directions:** Android phones already sync Google Calendar into the phone's calendar store. Daybloom shows those events, including invites, on Today, Week and Month (marked with a small calendar, in Daybloom's colours), and writes its events there too, so the phone's sync takes them to Google. It needs only the calendar permission: no OAuth, no Google verification, and it works offline. On Android it uses Daybloom's own module, since expo-calendar can't write weekday repeats or change one occurrence there; iPhone will use expo-calendar.

**Step B, Google Calendar API (full integration):**
- Sign in with Google with the narrowest calendar scope that works.
- Two-way sync with sync tokens; on `410 Gone`, a full re-sync.
- Accept, decline or "maybe" for invites; create events with guests.
- Conflicts are resolved with `etag`, and the user chooses in plain language.
- Offline edits are queued; tokens are kept in secure storage.

**Start early:** a Google Cloud project, consent screen, privacy policy, and Google's verification for calendar scopes (they're "sensitive"). Verification includes a demo video and takes weeks; until then the app is limited to 100 test users with a warning screen.

**Own server?** Not for step A or basic step B. A server is needed only for instant invite push, cloud backup, or sync between the user's devices.

## 9. Risks and open questions

| # | Item | Impact | Handling |
|---|---|---|---|
| 1 | **Scope:** the MVP is a planner + habit tracker + budget app in one | Timeline | Milestones M1→M3; Budget can move to the first update (D4) |
| 2 | Every development machine needs Node 22.13+ | Can't run the project | Install Node 24 LTS (README) |
| 3 | The prototype is HTML; the app is React Native | Small visual differences | Side-by-side review of every screen (TEST_PLAN) |
| 4 | Expo Go only has Expo's own native modules, and on Android it can't show local notifications | Reminders can't be tried in Expo Go | Try reminders in the installed app: a local build (README) or an EAS build |
| 5 | Reminders killed by phone battery savers | Trust in the app | Exact alarms, Samsung/Xiaomi testing, help screen |
| 6 | Package name `com.daybloom.app` is permanent after the first Play upload | Store identity | Confirm before the first upload |
| 7 | Blurred header slow on low-end Android | Smoothness | Phase 0 spike; solid fallback |
| 8 | English only for now | Later languages | Text kept in translation files (NFR-09), so adding one later is cheap |
| 9 | Minimum Android version is 7.0 (API 24) | Very old phones excluded | Fine for nearly all phones in use |
| 10 | Play closed test (12 testers × 14 days) | Launch date | Start right after M1 |
| 11 | Google verification for calendar scopes | Phase 4 date | Start paperwork early |
| 12 | Pet art production | Phase 3 date | Done: drawn in code in the stickers' style (D21–D22); an illustrator's Rive version can replace it later |

## 10. Next steps

1. **You:**
   - Install Node 24 LTS (`winget install OpenJS.NodeJS.LTS`), then open the new project folder in VS Code.
   - Try it on your phone: install **Expo Go** from the Play Store, run `npm start` in the project folder, scan the QR code. Open **More › Component gallery**.
   - Delete the old copy in OneDrive once you're happy with the new folder.
   - Optional: put the project on GitHub so the CI checks run on every change.
2. **Me (M1, core planner):** Today (to-dos, timeline, hour notes), the event form and details, Week, Month, reminders with repeats, onboarding, Settings basics, search, with the tests from TEST_PLAN for each.
