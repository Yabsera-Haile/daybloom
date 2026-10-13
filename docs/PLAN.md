# Daybloom: Project Plan

**Status:** v0.4, 2026-10-12. Every screen designed (`design/daybloom/`). **Phase 0 done:** the Expo app is set up in `C:\Users\STUDENT\Documents\Projects\Daybloom Personal Planner mobile app` (out of OneDrive) and runs on Android with the component gallery. Next: milestone M1.

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
Entry          id, type ('expense'|'income'), amountCents, currency, description, budgetCategoryId, occurredAt
BudgetCategory id, name, icon, colorKey
Bill           id, title, note, amountCents, dueDate, rrule?, payment ('auto'|'manual'|'flexible'), paidAt?
MonthBudget    month, amountCents
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
- [ ] Spikes, moved into M1: exact-alarm reminders on Samsung and Xiaomi; repeats across daylight-saving changes; blurred header on a low-end phone

**Exit:** the component gallery runs on Android and matches the design (done on the emulator; try it on your phone with Expo Go); checks pass; decisions are made.

### Phase 1: MVP build, in 4 milestones
Each milestone ends with an installable build on a real phone.

| Milestone | Contents | Requirements |
|---|---|---|
| **M1 Core planner** | App shell; Today (date header, tasks, timeline, hour notes); event sheet + detail; Week; Month (grid, day sheet, agenda, deadlines); reminders; repeats; onboarding; basic Settings; empty states; search (events + tasks) | SH, TD (except routines), WK (except habits), MO, EV, ON, ST-01, SR-01, FR-01…14 |
| **M2 Routines & habits** | Habits tab; routines on Today; habits at a glance on Week; streaks | HB, TD-05…07, WK-11 |
| **M3 Money & goals** | More tab; Budget; Record Entry; savings goals; bills; monthly goal on Month | MR, BU, MO-06 (goals) |
| **M4 Finishing** | Move-unfinished-tasks prompt, quotes, seasonal images, data export, polish | FR-15, TD-18, ST-02, S items |

**Tip:** M1 is already a usable planner. Starting the Google Play closed test right after M1 gets the mandatory 14-day clock running early.

**Exit:** every **M** requirement passes its tests; a person has approved the side-by-side visual check.

### Phase 2: Polish and beta
- Accessibility pass (TalkBack, maximum font size, contrast) and performance pass on a low-end phone.
- Two usability rounds with 5 non-technical people each.
- Play listing, privacy policy, Data Safety form.
- **Google Play closed test:** new personal developer accounts need at least 12 testers for 14 days before going public.

**Exit:** ≥ 99.5% crash-free sessions; usability targets met; production access granted.

### Phase 3: Pet mascot
See [section 7](#7-post-mvp-pet-mascot).

### Phase 4: Google Calendar integration
See [section 8](#8-post-mvp-google-calendar-integration).

### Phase 5: iOS release
The code is iOS-ready throughout. This phase covers the Apple Developer account, iOS QA (notifications, EventKit), the store listing and review.

## 7. Post-MVP: pet mascot

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

**Step A, device calendar bridge (no Google sign-in):** Android phones already sync Google Calendar into the phone's calendar store. Through `expo-calendar`, Daybloom shows those events, including invites, on Today, Week and Month with a distinct look (a small Google-calendar marker and the calendar's own color as the stripe). It needs only the calendar permission: no OAuth, no Google verification, and it works offline.

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
| 4 | Expo Go only has Expo's own native modules | Some M1+ features (exact alarms, widgets) may need more | Switch to an EAS development build when the first such module is added |
| 5 | Reminders killed by phone battery savers | Trust in the app | Exact alarms, Samsung/Xiaomi testing, help screen |
| 6 | Package name `com.daybloom.app` is permanent after the first Play upload | Store identity | Confirm before the first upload |
| 7 | Blurred header slow on low-end Android | Smoothness | Phase 0 spike; solid fallback |
| 8 | English only for now | Later languages | Text kept in translation files (NFR-09), so adding one later is cheap |
| 9 | Minimum Android version is 7.0 (API 24) | Very old phones excluded | Fine for nearly all phones in use |
| 10 | Play closed test (12 testers × 14 days) | Launch date | Start right after M1 |
| 11 | Google verification for calendar scopes | Phase 4 date | Start paperwork early |
| 12 | Pet art production | Phase 3 date | Brief an illustrator once the MVP look is final |

## 10. Next steps

1. **You:**
   - Install Node 24 LTS (`winget install OpenJS.NodeJS.LTS`), then open the new project folder in VS Code.
   - Try it on your phone: install **Expo Go** from the Play Store, run `npm start` in the project folder, scan the QR code. Open **More › Component gallery**.
   - Delete the old copy in OneDrive once you're happy with the new folder.
   - Optional: put the project on GitHub so the CI checks run on every change.
2. **Me (M1, core planner):** Today (to-dos, timeline, hour notes), the event form and details, Week, Month, reminders with repeats, onboarding, Settings basics, search, with the tests from TEST_PLAN for each.
