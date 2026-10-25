# Daybloom: Design Review of the Stitch Export

**Status:** v1, 2026-10-12. All fixes and decisions below are applied in the **v2 designs: [design/daybloom/](../design/daybloom/)**.
**Source:** `design/stitch/` (Stitch export: 5 screens, logo, avatar image, DESIGN.md)
**Outputs:** [design/tokens.json](../design/tokens.json) · screen requirements in [REQUIREMENTS.md section B](REQUIREMENTS.md#b-screen-by-screen-requirements) · screen tests in [TEST_PLAN.md section 4](TEST_PLAN.md#4-screen-tests)

---

## 1. What's in the export

| Folder | What it is | Notes |
|---|---|---|
| `daily_planner/` | **Today** tab | Date header with hero image and weather, Morning/Evening routines, Daily Intentions (tasks) with quick-add, hourly timeline, quote |
| `weekly_planner/` | **Week** tab | Week strip, weekly intention, 7 day cards, weekly priorities, habits at a glance, "Add Entry" button |
| `monthly_calendar/` | **Month** tab | Month grid, Grid/Agenda switch, selected-day sheet, upcoming deadlines |
| `habit_tracker/` | **Habits** tab | Stats, 7-day daily habit grid, weekly habits (W1–W4), "Coming soon" teaser |
| `budget_planner/` | **Budget** (opened from another screen, has a back button) | Monthly balance, savings goals, upcoming bills, recent entries, "Record Entry" bottom sheet (in the code, not the screenshot) |
| `daybloom_planner_logo/` | Logo as SVG | Copied to `design/stitch/_assets/logo.svg` |
| `warm_friendly_portrait_…/` | Placeholder profile photo | Stock-style AI portrait, not a real user |
| `warm_paper_planner/DESIGN.md` | Design system ("Warm Paper Planner") | Colors, type, radius, spacing, component rules |

The screen code loads 5 images from Google-hosted links that can expire. Four were saved to `design/stitch/_assets/` (daily hero, weekly intention, budget hero, avatar). The header logo link is private (403), so the SVG logo is used instead.

**Fonts:** Literata (serif, headings and dates) and Plus Jakarta Sans (interface text), both free (OFL). **Icons:** about 60 Material Symbols Outlined icons (Apache 2.0). React Native's standard icon sets don't include several of them (e.g. `shield_with_heart`, `candle`, `clean_hands`), so we'll ship just the icons we use as SVG components.

## 2. App structure

```
                ┌──────────────────────── Header: logo · section name · Search · Profile ─┐
Bottom tabs:    Today        Week         Month          Habits          Hub (not designed)
                  │            │            │               │               │
                  │            │            │               │               ├── Budget  (designed)
                  │            │            │               │               ├── Settings (not designed)
                  │            │            │               │               └── …?
                  └── all open: Add/Edit Event (not designed) · Task options (not designed) · Search (not designed)
```

The screens are long, scrolling "paper pages". The header and tab bar are translucent with a blur, and content scrolls underneath them.

## 3. Shared components to build once

| Component | Used on | Variants |
|---|---|---|
| App header | All | Tab version (logo, title, search, avatar); pushed-screen version (back button) |
| Bottom tab bar | 4 tabs | Active item gets a soft sage pill |
| Card / sheet | All | Surfaces: white, low, container; radius 12 or 16; warm shadow |
| Section header | All | Icon + serif title + right-side meta or action |
| Chip / badge | All | Urgency, category tag, status ("Completed", "3 done"), filter chip with count, date tile ("OCT 28") |
| Checkbox + task row | Today, Week | Rounded square; done = filled sage + strikethrough; "more" menu |
| Habit circle | Habits, Week | Toggle circle; today ringed |
| Progress bar | Habits, Month, Budget | Thin (8) and thick (12) |
| Stat tile | Habits | Bento grid of 3 |
| Date navigator | Today, Month | ‹ Today › pill |
| Segmented control | Month, Budget sheet | Grid/Agenda; Expense/Income |
| Week strip | Week | 7 days with dots; selected day filled sage |
| Day card | Week | Normal and "today" (left stripe, gradient) |
| Timeline row + event block + hour note + now line | Today | Event block: icon, title, time • place, tag |
| Month grid + day cell | Month | Number, dot, one label chip, today, other-month days faded |
| Agenda item card | Month | Left stripe, kind label, time, title, notes, optional progress |
| Deadline row | Month | Date tile, chips, title, chevron |
| Hero banner | Today, Budget | Image, gradient, overlay text, optional weather chip |
| Quote card | Today, Week | Italic serif quote |
| Floating add button | Week, Budget | Pill with icon + label |
| Bottom sheet | Budget (Record Entry), Today (quick add is inline) | Binder handle, title, close, form fields, full-width save |
| Collapsible card | Today (Morning Ritual) | Chevron rotates |
| Money row / goal card / bill card | Budget | Icon circle, amounts, progress, status label |

## 4. Accessibility findings

Measured from the design's own color tokens (WCAG 2.2; normal text needs 4.5:1).

| # | Issue | Where | Measured | Proposed fix |
|---|---|---|---|---|
| A1 | Italic hour notes almost invisible | Today timeline ("Buffer & Focus prep") | **1.66:1** | Use `onSurfaceVariant` (8.5:1); keep italics |
| A2 | Grey labels just under the minimum | Hour labels, ledger dates (`outline`) | 4.47:1 | Darken `outline` to `#676d67` (4.53:1) |
| A3 | Faded "done" text too light | Done tasks (50–70% opacity) | 3.1–3.9:1 | Use 75% opacity + strikethrough (≥ 4.5:1) |
| A4 | Text too small | Tab labels, chips, hour labels (10px); month cell labels (**8–9px**) | n/a | Minimum 12px for labels, 11px for month cell chips |
| A5 | Tap targets too small | Checkboxes 20, habit circles 28, arrows 32, "more" 26 | n/a | 48dp touch area for every control (visual size can stay). Dense grids (habit circles, month cells) at least 32dp. 7 × 48dp circles don't fit on a 360dp phone. |
| A6 | Habit names cut off | Habits tab: "Morning H…", "10,000 D…" | n/a | Allow names to wrap to 2 lines |
| A7 | Meaning shown by color only | Dots in week strip and month cells | n/a | Screen reader labels ("3 plans, 1 urgent"); urgent also gets a shape or label |
| A8 | Endless animations | Pulsing "Now" dot, pinging today dot, "In Rhythm" | n/a | Respect the phone's reduce-motion setting; stop after a few pulses |
| A9 | Fixed heights | Rows, header and tab bar sized in px | n/a | Everything grows with system font size (test at 200%) |
| A10 | Missing labels | Most habit circles and chips have no screen reader label | n/a | Label every control, e.g. "Morning Hydration, Thursday 17, done" |
| A11 | Empty checkboxes and habit circles almost invisible (found while redesigning) | Unticked boxes and circles | 1.1–1.7:1 against white (controls need 3:1) | 1.5px `outline` border (5.3:1) |

## 5. Inconsistencies to resolve before building

| # | Inconsistency | Recommendation |
|---|---|---|
| I1 | DESIGN.md's written colors (primary `#5B7E67`, canvas `#FAF7F2`, blush `#E08D79`) differ from the tokens the screens use (primary `#43654f`, surface `#fff8f5`, secondary `#8f4b3b`) | **Follow the screens** (they're what the screenshots show). tokens.json uses them. |
| I2 | Corner radius: DESIGN.md says cards 16 / sheets 24; screens use 8 / 12 / 16 | Follow the screens |
| I3 | DESIGN.md says every card has a 1px border; screens use soft shadows, no borders | Follow the screens |
| I4 | Seven different urgency words and three urgency colors: "Urgent", "Urgent Event", "High Priority", "Urgent Deadline", "Deadline", "Not Urgent", "Routine" | One **Urgent** flag (yes/no) with one style everywhere |
| I5 | Category and priority share the same chip slot ("Wellness", "Rest" vs "High Priority") | Category = color + label; Urgent = separate badge |
| I6 | "Today" is sage on Today/Week but terracotta on Month | Sage everywhere (terracotta stays for urgent) |
| I7 | Four different "add" buttons: "Add Task" (in a card), "Add Entry" (terracotta, right), "+" (icon), "Add Expense / Income" (sage, centered) | One floating **+ Add** button on Today/Week/Month that opens the same chooser; Budget keeps its own |
| I8 | Time format: "09:30 AM" (Week) vs "8:30 AM" (Today) | Format from the phone's locale settings |
| I9 | "Ritual" means two things: Today's Morning Ritual is a routine, Habits' "Daily Rituals" is habits. Week's habits also differ from the Habits tab's. | Unify: a routine is a group of habits (decision D1) |
| I10 | Timeline puts events under their start hour; blocks aren't sized by length (10:00–11:30 sits in one row) | Keep. It reads like a paper planner. Documented as intended behavior. |

## 6. Missing screens and states

The design covers the "full, happy" state of 5 screens. These are needed and not designed.

> **Update (v2 designs):** G1–G17 are all designed in `design/daybloom/`. G18 (dark mode, tablet) stays out of the MVP.

**Must exist before building the core (Phase 1, M1):**

| # | Missing | Why it matters |
|---|---|---|
| G1 | **Add / Edit Event sheet** (title, date, all-day, start–end, repeat, reminder, category, urgent, place, notes) | The most important missing piece: it's where the "Google Calendar ease" lives. Nothing in the design creates an event. |
| G2 | **Event detail** (tap an event) | View, edit, delete, duplicate |
| G3 | **One "+ Add" entry point** and chooser (Event / Task) | Today has no way to add an event |
| G4 | **Task options** (the ⋮ menu) | Edit, move to another day, urgent on/off, delete |
| G5 | **Empty states** for every tab | A new user sees empty screens first; none are designed |
| G6 | **Onboarding** (welcome, name, notifications permission, week start) | First impression and the reminder permission |
| G7 | **Settings / Profile** (avatar tap) | Week start, time format, default reminder, categories, currency |
| G8 | **Hub** tab | Is it a menu (Budget, Settings, …)? |

**Can be designed during the build:**
G9 habit add/edit/reorder/archive · G10 week back/forward and what tapping a day does · G11 Month **Agenda** view, a selected day other than today, days with several items ("+2") · G12 Search screen and results · G13 Budget: manage goals, add/edit bills, "View all" entries, edit/delete an entry, set monthly budget, switch month · G14 updating a goal's progress · G15 timeline: all-day events, overlapping events, events before 8 AM / after 8 PM · G16 notification appearance · G17 error states (reminders blocked by phone) · G18 dark mode and tablet (recommend: not in MVP)

## 7. Plain-language copy review

The cozy section names are part of the charm, so most stay. The ones below would confuse a non-technical user (UX-03), mostly in Budget.

| Design says | Proposed | Screen |
|---|---|---|
| Remaining Net Cashflow | Left this month | Budget |
| Monthly Inflow / Total Outflow | Money in / Money out | Budget |
| Fixed + flexible | Bills + spending | Budget |
| SAFE ZONE | On track | Budget |
| Sanctuary Savings | Savings goals | Budget |
| Upcoming Commitments | Upcoming bills | Budget |
| Auto-Draft / Pending approval / Flexible | Paid automatically / Needs paying / Flexible | Budget |
| Recent Ledger Entries | Recent spending | Budget |
| Category Envelope | Category | Budget sheet |
| 11 of 18 scheduled slots closed | 11 of 18 done this week | Week |
| 82% Pace | 82% done so far | Week |
| Today • 3 Focus Blocks | Today • 3 plans | Week |
| Daily Rituals (habits) | Daily habits | Habits |
| Weekly Milestones | Weekly habits | Habits |
| 78% consistency rate | 78% of habits done | Habits |
| Hub | More (or "Notebook") | Tab bar |
| "e.g. 4:00 PM" (typed time) | A time picker, no typing | Today quick add |

## 8. Demo-data errors (each one becomes a test)

The sample numbers in the design contradict each other. This confirms every number must be **calculated from the data**, never stored or typed.

| Design shows | Actually | Test |
|---|---|---|
| "Wednesday, Oct 23 • Day 296 of 365" (2024) | 2024 is a leap year: **Day 297 of 366** | T-TD01.2 |
| "1:15 PM Now", but the line is drawn at the 11 AM row | Line must sit between 1 PM and 2 PM | T-TD13.1 |
| "Active Habits 7" | 8 habits listed (5 daily + 3 weekly) | T-HB02.1 |
| "Today Done 5/7" | Grid shows 4 of 5 daily habits done today | T-HB02.1 |
| "64% of envelope preserved" | Spent is 64.3%, so about 36% is left | T-BU02.1 |
| Weekly habits show W1–W4 for October 2024 | October 2024 touches **5** Sunday-start weeks | T-HB05.1 |
| Budget "Upcoming Commitments • Next 14 Days" lists a bill on Nov 10 | Nov 10 is 18 days after Oct 23 | T-BU06.1 |

## 9. Decisions

**Accepted 2026-10-12:** every recommendation below, with these changes:
- **D5:** Claude designed the missing screens instead of you doing it in Stitch (done, `design/daybloom/`).
- **D7:** all AI-generated photos are removed. Small sticker illustrations drawn for Daybloom (`design/daybloom/_shared/stickers/`) replace them, so there's no image-rights question.
- **D8:** no profile picture or initials in the header at all (there's no sign-in). Settings keeps an optional first name, used only for greetings.

| # | Decision | Recommendation |
|---|---|---|
| D1 | Routines vs habits: separate, or a routine is a group of habits? | **Unify.** Ticking "Warm lemon water" in Morning Ritual also ticks it in Habits. One concept, one checkmark. |
| D2 | Weather chip ("64°F Gentle Autumn") | **Optional, off by default, after MVP.** It's the only feature needing location + internet, and it conflicts with "nothing leaves the phone". |
| D3 | Seasons ("Autumn" chip, autumn images and quotes) | **Automatic by hemisphere** (October is spring in Sydney or Johannesburg), with a setting to hide seasons |
| D4 | Budget in the MVP? | **Yes, but built last (M3).** If time runs short, it ships in the first update without delaying launch. |
| D5 | Who designs the missing screens (section 6)? | **You in Stitch** for G1 (event sheet), G5 (empty states), G6 (onboarding), since they set the first impression. I build the rest in code from the existing components for you to review on a phone. |
| D6 | Hub: name and contents | Rename to **"More"**: Budget, Settings, Help & feedback (later: Google Calendar, your pet) |
| D7 | Hero images are AI-generated by Stitch | Confirm you may use them commercially, or replace them. Ship a small seasonal set inside the app (no downloads). |
| D8 | Profile photo (no accounts in MVP) | Local name + optional photo, else initials. Later, the pet can sit here. |
| D9 | Currency | From the phone's region; changeable in Settings |
| D10 | Dark mode | **Not in MVP** (the paper look is light); design it later |
| D11 | Unfinished tasks from yesterday | **A gentle prompt:** "2 things left from yesterday. Move to today?" (paper planners call this migrating) |
| D12 | Grey italic hour notes: user's notes or app suggestions? | **User's own notes**; the app makes no suggestions |
| D13 | "Coming soon: Skincare, Language, Weight logs" teaser | **Remove from MVP.** Don't promise features that don't exist. |
| D14 | Budget's place and shape (2026-10-15) | **Budget is a tab** in place of More, which opens from a ≡ button in the header. Inspired by Cashew: a monthly **or weekly** budget, **expenses only** (no income), one overall budget (no per-category limits), spending by category, savings goals and bills. "Add expenses from bank texts" was listed in More as coming next (the one exception to D13, asked for by the owner); it came in v3 (D18). |
| D16 | Colour themes (2026-10-16, reworked 2026-10-24) | **Four seasons, each its own.** Autumn is the designed palette; spring, summer and winter are generated from it (scripts/generate-themes.mjs) with each colour's brightness kept, so every contrast checked for autumn holds, but with their own hues and colourfulness from common seasonal palettes: spring cherry blossom, tulip orange and fresh green on blush paper; summer turquoise, coral and sunflower on aqua-white; winter icy blue, cranberry and evergreen on cool white. Secondary stays warm and red-ish in every season (urgent, the time line, Delete); pale colours stay soft. The first version kept autumn's muted colourfulness and cream paper, so spring and summer looked like autumn. "Follow the seasons" switches by date and hemisphere, and the season pictured follows the chosen colours. Errors stay red in every season. |
| D17 | Reminder sound (2026-10-16) | **The person chooses**, default Chime. Daybloom's sounds are its own (synthesised by scripts/generate-sounds.mjs, no licences). Each sound has its own Android notification channel, because Android fixes a channel's sound once made. |
| D18 | Expenses from bank texts (2026-10-17) | **Android only, texts only, no AI.** Payment texts are made by computers from a few templates, so Daybloom learns each sender's templates on the phone (masking amounts, names and dates, grouping texts by shape) and the person confirms them with taps. Starts with MTN MoMo; works for any sender. Fees are their own expenses named after the service, so the Fees category shows what each one costs. Money in is ignored (Budget is expenses only, D14). "What was it for?" pops up over other apps (with the person's "Appear on top" permission) so a category can be picked the moment a payment comes; without it, a notification asks. iPhones don't let apps read texts. On Google Play this needs the SMS permissions declaration ("SMS-based money management"). |
| D19 | First run and tour (2026-10-24) | **Ask for every permission on its own page during onboarding, then a skippable tour.** Each permission page says why and shows an example (a reminder, a payment text becoming an expense, the pop-up); pages that don't apply are left out, and all of them live on in Settings › Phone permissions. The tour is drawn over the real app, highlighting the actual tab or button, rather than a slideshow of pictures, so people learn where things are. |
| D20 | Tablets and foldables (2026-10-24) | **Keep the phone design on phones; on a wider screen use the room, don't stretch.** Following Material's window sizes: under 600dp nothing changes; wider, pages, forms and sheets keep to a centred column (sheets at most 640dp); from 720dp each tab splits into two panes that scroll on their own, putting what you look at together side by side (the to-dos beside the day's timeline, the week beside its days, the month grid beside the chosen day, the budget beside the spending); from 840dp the tabs stand in a rail on the left, in the middle where thumbs reach. Text set large counts as less room, so it gets fewer columns. Phones stay upright; tablets and unfolded foldables turn (Android 16 requires it on big screens anyway). |
| D21 | The companion pet (2026-10-25) | **Drawn in code, in the stickers' style, behind a fixed set of poses, moods and pivots.** No library offers ready-made pets; Rive (what Duolingo uses) needs each character animated by hand in its editor, and Lottie clips don't share a style or switch moods. So each pet is flat vector layers (art/types.ts: tail, body, ears, head, a face per mood, wings for flyers), moved by code in short moves (breathe, blink, twitch, sway, hop) with stillness between, and only while on screen. A hand-animated Rive version can later replace the drawings with the same poses and moods. The mood comes from the planner (MS-11). **Gentle** (default) or **Cheeky** personality: the user asked for Duolingo-style crossness, kept optional because Daybloom is a calm planner. Off in Calm mode. Built on the `pet` branch as an experiment; `main` stays at v4.3 until it's kept. Planned next: more pets, reminders in the pet's voice, and for Cheeky at most one nudge a day about habits that already remind (MS-07 changes then). |
| D22 | The companion, after the first phone test (2026-10-25) | **One Skia canvas, cuter art, nap spots on every tab, and the pet in reminders.** Drawn as a dozen separately animated SVG views, parts of the cat sometimes vanished on the owner's phone (not on the emulator), so the whole pet is now drawn in one Skia canvas, moving each part inside the drawing (about 5 MB more app). The cat got rounder, with soft shading, sparkly eyes, a fluffy bib and a sage collar with a gold bell, plus a yawn, a stretch and a leap. It naps in a spot on each tab that covers no buttons and wanders between them (only tabs you've opened), leaping in to cheer on the tab you're on. Sulking now lasts until the slipping habit or old to-dos are dealt with ("one thing done forgives all" made it hard to see). Its speech is in a handwriting face (Patrick Hand). Reminders carry its picture and a line in its voice: local notifications in expo-notifications only take one app-wide picture, so a small patch (patches/, applied by patch-package on install) lets a reminder name its own; the status-bar icon stays the app's, as Android draws it in one colour. A first-run page offers the pet (ON-03). |
| D23 | More pets, and quieter toasts (2026-10-25) | **A puppy and a little dragon join the cat; toasts become soft sage pills that leave quickly.** The two new pets were chosen because they can do everything the cat does (sit, curl up asleep, yawn, stretch, leap between tabs) with something of their own: the puppy's floppy ears, button nose, tongue-out grin and wagging tail; the dragon's sage colour (the app's own), flapping bat wings, gold horns and puffs of steam when cross. A bird or a fairy would fly rather than walk and nap, so they'd need new behaviour and wait for later. The pet phase also brings a once-a-day celebration when every habit is done, Cheeky's single 7 PM nudge, a tour stop to meet the pet and pictures in the Settings picker. The dark Undo bar clashed with the paper look and stayed 7 seconds even for a tick: it's now a sage pill, about a second for a note that something was done, 5 seconds when it offers Undo (FR-02); ticking a to-do no longer offers Undo (untick the box). |
| D24 | The pet follows you, eyes open (2026-10-25) | **It comes to the tab you're on instead of wandering at random, and looks at you when it's awake.** The owner asked for the pet to follow: about 5 seconds on a tab (long enough to show you're staying, short enough to see it come) and it comes over, entering from the side of the tab it was on so the tab bar reads like a row of rooms; it leaps (two bounds from far off; the dragon flies, beating its wings), turned to face the way it moves, then looks round and goes back to sleep after a few seconds. Random wandering is gone (the two would undo each other), but one time in four it's too sleepy to come at once, so it doesn't feel mechanical. Sulking it always comes, so you see it, but says what's wrong at most every 10 minutes rather than on every tab. Habits' spot moved from the bottom of the page to beside the title, where you see it land. The happy face drew closed ^^ eyes, so an awake pet never looked open-eyed: happy now has big, shiny open eyes, and the squint is a moment of joy when it cheers or is tapped. |
| D25 | Seasonal outfits for the pet (2026-10-25) | **The pet dresses for the season the app already pictures, on its head and neck only.** The owner asked for a winter beanie and summer glasses without hiding the sad and cross faces. Moods show in the eyes and the slant of the brows, so sunglasses worn on the eyes would hide them: they're pushed up on its head instead. Every outfit stays above the brows or below the chin: a berry beanie with a pom-pom and a matching scarf (winter), a daisy crown (spring), sunglasses (summer), a russet leaf and a plum scarf with mustard stripes (autumn; mustard alone vanished against the ginger cat). Hats sit in front of the ears, so ears still droop and flatten with the mood; the dragon's horns are drawn again over the beanie, poking through. The outfits are drawn once (art/outfits.ts) and placed on each pet's poses by a few numbers (`fits`), so a new pet only says where its head and neck are. The season is the one the sticker and colours show (hemisphere, or a fixed colour theme), and turning the season pictures off takes the outfits off: no new setting. |
| D26 | Google Calendar through the phone's own calendars (2026-10-26) | **Read and write the calendars Android already keeps, with no Google sign-in.** Phones sync every account's calendar into one store; Daybloom reads it and writes to it with the calendar permission, and the phone's own sync carries changes to Google. That avoids a sign-in screen, Google's review of calendar access (weeks, a demo video, 100 test users meanwhile) and a server, and works offline; Step B (Google's API) waits until it's needed. **One copy of each event:** an event saved to Google lives in Daybloom's events table as a phone event (source 'device') and in the calendar, linked by its id there and a fingerprint of what both sides last agreed on, so every screen, search and reminder works unchanged and nothing doubles. **Ticked by default:** new events go to the Google account's own calendar unless unticked (the owner's choice); the events made earlier can be copied there once, which moves them (one copy each). **Who wins:** a change made in Daybloom that hasn't reached the phone yet isn't overwritten; otherwise the phone's version comes in. **Reminders:** Daybloom reminds about events whose reminder was set in Daybloom, and not about ones made elsewhere, which their calendar app already reminds about. **Read-only:** someone else's invitation or a read-only calendar (holidays) can be answered or copied, not changed. Changes to repeats follow Android's model (changed and cancelled occurrences under their series; all-day events at midnight UTC). expo-calendar can't write weekday repeats or change one occurrence on Android, so a small Daybloom module (`modules/daybloom-calendar`) talks to the calendar store; iPhone will use expo-calendar's Apple side, which can. Events from more than a year ago aren't brought in. |
| D15 | Currency sign on amounts (2026-10-15) | **None.** People use different currencies, so amounts are plain numbers in the phone's style ("1,730.00"); fields have no "$". |
