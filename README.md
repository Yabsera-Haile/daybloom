# Daybloom

A calm personal planner for Android (iOS later): the simplicity of a paper planner with the scheduling ease of a calendar app. Built with Expo (React Native), TypeScript, NativeWind and SQLite. Everything stays on the phone; there is no account.

## What's where

| Folder | What it holds |
|---|---|
| `docs/` | Plan, requirements, test plan, design review |
| `design/daybloom/` | **The designs**: a clickable HTML prototype plus screenshots of every screen (source of truth for the build) |
| `design/tokens.json` | Colors, type, spacing; the app's theme is generated from this file |
| `design/stitch/` | The original Stitch export, kept for reference |
| `src/app/` | Screens (Expo Router: every file is a route) |
| `src/ui/` | Shared components (buttons, chips, checkboxes, cards, tab bar…) |
| `src/theme/` | Typed design tokens, fonts, shadows |
| `src/db/` | SQLite schema (Drizzle) and database setup |
| `src/calendar/` | Date logic: weeks, day of year, seasons, time zones |
| `src/planner/` | Events (with repeats), to-dos, hour notes, categories, search |
| `src/recurrence/` | Repeat rules (the format Google Calendar uses) and their plain-words labels |
| `src/reminders/` | Which reminders to schedule, and keeping the phone's notifications in step |
| `src/features/` | Pieces of screens: Today's parts, sheets, the event form |
| `src/i18n/` | All interface text (English) and date/time formatting |
| `drizzle/` | Generated database migrations |
| `scripts/` | `generate-ui-assets.mjs` builds the icon set and stickers from the designs |

## Run it

You need **Node.js 22.13 or newer** (Node 24 LTS recommended: `winget install OpenJS.NodeJS.LTS`, or download from nodejs.org).

```bash
npm install
npm start          # then scan the QR code with the Expo Go app on an Android phone (same Wi-Fi)
npm run android    # or open it on a running Android emulator
```

In the app: **More › Component gallery** shows every building block, to compare with `design/daybloom/`.

**Reminders don't ring in Expo Go on Android** (Expo removed notification support there). Everything else works in Expo Go. To try reminders, install the app itself (below).

## Install it on a phone without an account

```bash
npx expo prebuild --platform android          # makes the android/ folder (not kept in Git); then undo its package.json change
cd android && ./gradlew assembleRelease -PreactNativeArchitectures=arm64-v8a
# → android/app/build/outputs/apk/release/app-release.apk; copy it to the phone and open it
```

On Windows, the native build fails ("build.ninja still dirty") when the project's path contains spaces. Build from a copy at a path without spaces, e.g. `robocopy "<project folder>" C:\dev\daybloom-build /MIR /XD .git`, then run Gradle in `C:\dev\daybloom-build\android`. A mapped drive (`subst`) or a junction doesn't help.

## Check your work

```bash
npm run check      # type check + lint + tests
```

## Making changes

- **Colors, type, spacing:** edit `design/tokens.json`. Tailwind classes such as `bg-surface-container-low` and `p-space-md` come from it, matching the class names in the HTML designs.
- **Text:** use `<Text variant="headlineMd">` (from `@/ui`) so the right font file is used for each weight.
- **Icons and stickers:** after adding an icon or sticker to the designs, run `npm run generate:ui`.
- **Database:** edit `src/db/schema.ts`, then run `npm run db:generate` to create a migration. The app applies migrations on start.
- **Tests:** name tests after the test plan IDs (e.g. `it('T-TD01.2 …')`) so coverage can be traced.

## Building for the Play Store (later)

Builds run in the cloud with EAS (free Expo account needed):

```bash
npx eas-cli@latest build --platform android --profile preview      # installable test APK
npx eas-cli@latest build --platform android --profile production   # Play Store bundle
```

The Android package name is `com.daybloom.app` (in `app.json`). It can't change after the first Play Store upload, so change it before then if you prefer another.
