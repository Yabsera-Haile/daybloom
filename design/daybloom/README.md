# Daybloom designs (v2)

The improved MVP designs, built from the Stitch export (`../stitch/`) with every fix and decision from [docs/DESIGN_REVIEW.md](../../docs/DESIGN_REVIEW.md) applied. **These replace the Stitch screens as the source of truth for the build.**

Each folder holds `code.html` (the screen) and `screen*.png` (renders at 390 × 844, a typical Android phone, at 2×).

## How to look at them
- **Pictures:** open the `screen*.png` files.
- **Clickable prototype:** open `today/code.html` in a browser. The tabs, "+ Add", event taps, the ⋮ menus and most buttons work. It needs internet for fonts and styling.
- A state can be opened directly by adding it to the address, e.g. `today/code.html#task-menu`.

## Screens

| Folder | Screen | States (add to the address) | Pictures |
|---|---|---|---|
| `onboarding/` | First-run welcome, 4 steps (new) | `#2` name, `#3` reminders, `#4` done | `screen-1…4.png` |
| `today-empty/` | Today on the very first day (new) | | `screen.png` |
| `today/` | Today | `#add` add chooser · `#add-task` new to-do · `#task-menu` to-do options · `#event-detail` event details | `screen.png`, `screen-add.png`, `screen-add-task.png`, `screen-task-menu.png`, `screen-event-detail.png` |
| `event/` | **Add / Edit Event** (new) | `#new`, `#edit`, `#edit-scope` (changing a repeating event) | `screen-new.png`, `screen-edit.png`, `screen-edit-scope.png` |
| `week/` | Week | `#add-priority` | `screen.png`, `screen-add-priority.png` |
| `month/` | Month | `#agenda` (new) | `screen.png`, `screen-agenda.png` |
| `habits/` | Habits | `#edit-list` (reorder / edit) | `screen.png`, `screen-edit-list.png` |
| `habit/` | Add / Edit habit (new) | `#new`, `#edit` | `screen-new.png`, `screen-edit.png` |
| `habit-history/` | One habit's month (new) | | `screen.png` |
| `more/` | More, replacing "Hub" (new) | | `screen.png` |
| `budget/` | Budget | `#entry` add expense/income · `#set-budget` | `screen.png`, `screen-entry.png`, `screen-set-budget.png` |
| `budget-goals/` | Savings goals (new) | `#add-money`, `#new-goal` | `screen.png`, `screen-add-money.png`, `screen-new-goal.png` |
| `budget-entries/` | All entries (new) | `#edit-entry` | `screen.png`, `screen-edit-entry.png` |
| `budget-bill/` | Add / Edit bill (new) | `#new`, `#edit` | `screen-new.png`, `screen-edit.png` |
| `settings/` | Settings (new) | `#week-start` (the picker every row uses) | `screen.png`, `screen-week-start.png` |
| `settings-categories/` | Categories (new) | `#edit-category` | `screen.png`, `screen-edit-category.png` |
| `reminder-help/` | "Reminders not arriving?" (new) | | `screen.png` |
| `search/` | Search (new) | `#recent`, `#none` | `screen.png`, `screen-recent.png`, `screen-none.png` |
| `notifications/` | How reminders look in the notification shade (spec, new) | | `screen.png` |
| `empty-states/` | Spec sheet of every empty state (new) | | `screen.png` |

Shared files: `_shared/theme.js` (tokens, mirrors `../tokens.json`), `_shared/base.css` (fonts, touch areas, reduce motion), `_shared/shell.js` (header, tab bar, "+ Add" button and chooser), `_shared/stickers/` (spring, summer, autumn, winter, savings illustrations).

## What changed from the Stitch design

**Decisions applied (D1–D13)**
- Routines are groups of habits. Habits are grouped under Morning Ritual / Evening Wind-Down / Anytime, and a tick on Today is the same tick on Habits.
- Weather chip removed. "Hub" renamed **More**. "Coming soon" teaser removed.
- **No photos and no profile button.** The AI photos are replaced by small sticker illustrations drawn for Daybloom (seasonal on Today, Week and onboarding; a savings sprout on Budget). With no sign-in, the header has only search; Settings lives in More.
- "2 things left from yesterday · Move to today" prompt on Today.
- Hour notes are the user's own, in readable text.

**Accessibility fixes (A1–A11)**
- All text is 12px or larger, except month cells, which are 11px.
- The grey hour labels, faded done items and hour notes now pass contrast.
- Every control has a 48dp touch area (32dp in the habit and month grids). In the HTML that's the `hit` / `hit-dense` classes; in the app it's `hitSlop`.
- Empty checkboxes and habit circles have a visible outline (they were nearly invisible).
- Habit names wrap instead of being cut off.
- Screen reader labels everywhere, and animations stop when reduce motion is on.

**Consistency fixes (I1–I10)**
- One **Urgent** badge (solid rose) everywhere. Categories are separate (Wellness, Work, Personal, Social, Creative).
- Today is always sage.
- One **+ Add** button on Today, Week and Month opens the same chooser.
- Times all formatted the same way.

**Wording:** the plain-language changes from DESIGN_REVIEW section 7 (Budget: "Left this month", "Money in / out", "Upcoming bills", "Recent spending", "On track").

**Sample data fixed:** one consistent fixture across all screens (Wed Oct 23, 2024, 1:15 PM):
- "Day 297 of 366"
- the "Now" line between 1 PM and 2 PM
- habit counts that match the grid (3 of 8 done today, 11 habits)
- 5 weekly columns for October
- the budget line "36% left"
- bills within the next 14 days

**New on existing screens**
- Today: an "Up next" card. Due to-dos also appear in the timeline. A routine marker shows at its hour. Empty hours can be tapped to add something.
- Week: back/forward buttons, "+7 more · Open the whole day", and "Habits at a glance" with one row per routine.
- Month: the Agenda view; one label per day plus "+n"; "This month's goal" moved out of the day list.

## Notes for the build
- **Date and time fields** open the phone's own date and time pickers. They're shown as pills here.
- **Event icons** (walk, video call, fork and knife…) are picked automatically from the title, falling back to the category's icon. The user never has to choose one.
- **Month labels** are one line ending in "…"; the day list below shows full titles.
- **Every MVP screen is now designed.** Only dark mode and tablet layouts are left, and both are outside the MVP.
- **Stickers** are SVGs, so they ship as vector images (react-native-svg) and stay crisp at any size.
