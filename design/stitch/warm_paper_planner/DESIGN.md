---
name: Warm Paper Planner
colors:
  surface: '#fff8f5'
  surface-dim: '#e1d8d4'
  surface-bright: '#fff8f5'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#fbf2ed'
  surface-container: '#f5ece7'
  surface-container-high: '#efe6e2'
  surface-container-highest: '#e9e1dc'
  on-surface: '#1e1b18'
  on-surface-variant: '#424843'
  inverse-surface: '#34302c'
  inverse-on-surface: '#f8efea'
  outline: '#727972'
  outline-variant: '#c1c8c1'
  surface-tint: '#446650'
  primary: '#43654f'
  on-primary: '#ffffff'
  primary-container: '#5b7e67'
  on-primary-container: '#ffffff'
  inverse-primary: '#aacfb5'
  secondary: '#8f4b3b'
  on-secondary: '#ffffff'
  secondary-container: '#fda590'
  on-secondary-container: '#783929'
  tertiary: '#815404'
  on-tertiary: '#ffffff'
  tertiary-container: '#9e6c20'
  on-tertiary-container: '#ffffff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#c5ecd0'
  primary-fixed-dim: '#aacfb5'
  on-primary-fixed: '#002111'
  on-primary-fixed-variant: '#2c4e39'
  secondary-fixed: '#ffdad2'
  secondary-fixed-dim: '#ffb4a3'
  on-secondary-fixed: '#3a0a02'
  on-secondary-fixed-variant: '#723425'
  tertiary-fixed: '#ffddb5'
  tertiary-fixed-dim: '#f9bb68'
  on-tertiary-fixed: '#2a1800'
  on-tertiary-fixed-variant: '#643f00'
  background: '#fff8f5'
  on-background: '#1e1b18'
  surface-variant: '#e9e1dc'
typography:
  display-lg:
    fontFamily: Literata
    fontSize: 36px
    fontWeight: '600'
    lineHeight: 44px
    letterSpacing: -0.02em
  display-lg-mobile:
    fontFamily: Literata
    fontSize: 28px
    fontWeight: '600'
    lineHeight: 36px
    letterSpacing: -0.01em
  headline-lg:
    fontFamily: Literata
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Literata
    fontSize: 20px
    fontWeight: '500'
    lineHeight: 28px
  headline-sm:
    fontFamily: Literata
    fontSize: 18px
    fontWeight: '500'
    lineHeight: 26px
  body-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 18px
  label-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.01em
  label-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.02em
  label-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 10px
    fontWeight: '700'
    lineHeight: 14px
    letterSpacing: 0.04em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1rem
  gutter-sm: 0.75rem
  margin: 1.25rem
  margin-sm: 1rem
  margin-lg: 2rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2rem
---

## Brand & Style

This design system channels the quiet, restorative clarity of an artisan linen notebook merged with the intuitive friction-free interaction of modern scheduling tools. It evokes mindfulness, tactile warmth, and breathing room, speaking directly to mindful planners, creative professionals, and students seeking to escape sterile, mechanical enterprise tools.

The aesthetic philosophy centers on tactile paper-craft minimalism. Rather than heavy skeuomorphism with faux leather stitching or spiral bindings, the system uses organic oatmeal tones, deliberate structural borders resembling heavy cardstock, and a muted botanical palette to evoke touch, warmth, and calm intentionality. Every interaction feels soft, grounding, and gentle on the eyes.

## Colors

The palette draws inspiration from pressed flora, unbleached linen, and soft stationery. 

- **Primary (`#5B7E67`)**: A muted, tranquil Sage Green serving as the core anchor for primary actions, selected tab states, focus indicators, and positive confirmations.
- **Secondary (`#E08D79`)**: A grounded Blush Rose used for urgent deadlines, priority tags, prominent floating actions, and expressive celebration cues.
- **Tertiary (`#E3A857`)**: A creamy Butterscotch applied to warning badges, golden hour alerts, stars, and habit streak counters. A companion soft lavender (`#9B8EA9`) provides supplemental event categorization.
- **Neutral (`#2D2926`)**: An ink-inspired Soft Charcoal providing crisp, accessible legibility without the harsh, sterile shock of pure black.
- **Canvases & Surfaces**: Base viewport canvas sits on Natural Linen (`#FAF7F2`), while nested sheets and cards rest on Cream Vellum (`#F5EFEB`) and Crisp Cardstock (`#FFFFFF`). Card dividers and structural borders utilize muted Bone (`#EAE4DC`).

## Typography

The type scale combines the literary elegance of **Literata** for dates, sheet titles, and section intros with the approachable clarity of **Plus Jakarta Sans** for interface mechanics, times, schedules, and forms.

Headlines should never shout; they provide rhythmic pauses like chapter headers in a well-bound book. Body text relies on open apertures and generous x-heights to guarantee rapid scanning on mobile displays in varied light environments. Labels apply subtle letter spacing for effortless categorization across schedule blocks.

## Layout & Spacing

Layouts adopt a responsive 4-column fluid mobile grid expanding to 8 columns on tablet devices. Safe margins keep planner content cushioned from bezel edges, creating a framed stationary feel.

Vertical rhythm adheres strictly to an 8px base grid (with a 4px sub-grid for badge insets and micro-alignments). Density remains airy: schedule grids prioritize breathing room around entries over maximal visible rows, reducing visual stress and encouraging focus.

## Elevation & Depth

Visual hierarchy rejects artificial neon drop shadows and glossy glass blurs, favoring layered cardstock elevation and delicate parchment boundaries.

- **Surface Tiers**: Base screens rely on `#FAF7F2`. Floating planner cards, agenda days, and bottom sheets use pure white (`#FFFFFF`) or vellum (`#F5EFEB`).
- **Borders as Structure**: All surface cards carry a crisp 1px border in `#EAE4DC`, establishing clear card edges like heavyweight 300gsm paper.
- **Warm Ambient Shadows**: Where physical layering occurs (such as modals, active dragged blocks, or hovering action pills), shadows are soft, warm, and highly diffused using warm umber rather than grey: `0 4px 16px -2px rgba(45, 41, 38, 0.06), 0 2px 6px -1px rgba(45, 41, 38, 0.03)`.

## Shapes

The shape system balances soft geometric curves with pill-shaped interactive touch targets. 

Cards, bottom sheets, and calendar blocks feature 16px corner radii (`rounded-lg`), softening standard grid structures while preserving horizontal space for text. Badges, filter chips, status capsules, and standalone action triggers strictly adopt fully rounded pill geometry (`rounded-full`), evoking tactile stationery stickers and washi tape markers.

## Components

### Buttons
- **Primary**: Solid Sage Green (`#5B7E67`) fill with crisp white text, pill-shaped (`rounded-full`), padded with `space-sm` vertically and `space-lg` horizontally. Gentle warmth shadow on hover/tap.
- **Secondary**: Linen-tinted Cardstock (`#F5EFEB`) with 1px `#EAE4DC` border and Charcoal (`#2D2926`) text.
- **Floating Action Button (FAB)**: Blush Rose (`#E08D79`) circle or capsule, floating above agenda items with warm ambient elevation.

### Badges & Chips
- **Urgent Priority**: Soft Coral Rose wash (`#FDF1EE`) with `#C55E47` text and an optional `#F3C7BE` hairline border.
- **Not Urgent / Routine**: Whispering Sage wash (`#EFF5F1`) with `#476652` text.
- **Filter Chips**: Pill-shaped capsules with subtle `#EAE4DC` outline; when active, they fill with `#5B7E67` and white text.

### Cards & Calendar Blocks
- Constructed on `#FFFFFF` or `#F5EFEB` with 1px `#EAE4DC` boundaries and 16px corner radius.
- Timed schedule blocks feature a left accent stripe (3px width) matched to event category (e.g., Sage for Wellness, Blush for Deep Work, Lavender for Social, Butterscotch for Reminders).

### Checkboxes & Habit Toggles
- Custom rounded squares (6px radius) featuring warm linen backdrops and a 1.5px `#D1C9BE` border.
- Upon completion, fills with `#5B7E67` displaying a hand-drawn inspired soft checkmark, with task text transitioning to 50% opacity charcoal with a clean strikethrough.

### Input Fields
- Understated forms with `#FAF7F2` filled background, 1px `#EAE4DC` resting border, and smooth transition to a 1.5px `#5B7E67` focus ring. Text labels sit gracefully in `Literata` headline style above inputs.

### Planner Sheet Drawer & Modals
- Top-anchored sheet handles reminiscent of smooth binder tabs, pulling up with soft linen backdrops, rounded top corners (`rounded-xl`), and full backdrop scrim tinted with `#2D2926` at 20% opacity.