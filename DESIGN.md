# WhatsApp AI Platform — Linear-Inspired Design System

## Theme: Dark (Command Deck Aesthetic)

A midnight command deck for managing WhatsApp AI agents: a near-black canvas, razor-thin type, and one acid-lime accent that cuts through the dark like a status light.

### Color Palette

| Token | Hex | Usage |
|-------|-----|-------|
| `--color-onyx` | `#08090a` | Page background, primary canvas |
| `--color-charcoal` | `#0f1011` | Navigation sidebar, elevated surfaces |
| `--color-obsidian` | `#161718` | Card backgrounds, modal overlays |
| `--color-graphite` | `#23252a` | Hairline borders, dividers |
| `--color-iron` | `#323334` | Medium borders, separators |
| `--color-steel` | `#383b3f` | Input field backgrounds |
| `--color-slate` | `#62666d` | Muted text, placeholders |
| `--color-fog` | `#8a8f98` | Secondary text, captions |
| `--color-mist` | `#d0d6e0` | Tertiary text, low-emphasis |
| `--color-platinum` | `#e5e5e6` | High-contrast borders |
| `--color-snow` | `#f7f8f8` | Primary text, primary icons |
| `--color-acid-lime` | `#e4f222` | Primary action buttons, CTAs |
| `--color-indigo` | `#5e6ad2` | Links, icon accents, brand elements |
| `--color-emerald` | `#27a644` | Success states, connected indicators |
| `--color-crimson` | `#eb5757` | Danger, disconnect, errors |
| `--color-cyan` | `#02b8cc` | Highlight accents |

### Typography

| Property | Value |
|----------|-------|
| UI Font | Inter Variable (weights 300, 400, 510, 590) |
| Code Font | Berkeley Mono (weight 400) |
| Body | 14px, line-height 1.71, color #8a8f98 |
| Primary Text | 14px, line-height 1.6, color #f7f8f8 |
| Headings | 20-32px, tight negative tracking |

### Spacing

Base unit: 4px. Scale: 4, 8, 12, 16, 20, 24, 28, 32, 36, 40, 48, 56, 64, 80, 96, 128

### Border Radius

| Element | Radius |
|---------|--------|
| Buttons | 6px |
| Inputs | 6px |
| Cards | 12px |
| Badges | 2px |
| Pills | 9999px |

### Surfaces

| Level | Color | Usage |
|-------|-------|-------|
| Canvas | `#08090a` | Page background |
| Nav | `#0f1011` | Sidebar, header |
| Card | `#161718` | Content cards |
| Input | `#383b3f` | Form fields |

## Components

### Primary Button
`#e4f222` background, `#08090a` text, 6px radius, weight 510 Inter, compact padding. The single chromatic element on screen.

### Ghost Button
Transparent background, `#8a8f98` text, hover to `#f7f8f8`. For secondary actions.

### Card
`#161718` background, 1px `#23252a` border, 12px radius. Main content container.

### Input
`#383b3f` background, 6px radius, inset shadow. `#f7f8f8` text, `#62666d` placeholder.

### Status Badge
Inline label with colored dot. Inline styling using Tailwind classes.

### Sidebar Navigation
Fixed width 224px, `#0f1011` background, right border in `#23252a`. Active state: `#161718` background.
