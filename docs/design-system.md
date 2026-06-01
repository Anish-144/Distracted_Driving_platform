---
name: Premium Behavioral Mobility Intelligence
colors:
  # ── Light Mode (Default) ──────────────────────────────────────────
  surface: '#FCFBF8'           # Warm ivory
  surface-dim: '#F4F2EC'
  surface-bright: '#FEFDFB'
  surface-container-lowest: '#FFFFFF'
  surface-container-low: '#FCFBF8'
  surface-container: '#F6F4EE' # Warm off-white
  surface-container-high: '#EFECE5'
  surface-container-highest: '#E4DFD6'
  on-surface: '#3F4249'        # Soft Slate
  on-surface-variant: '#646873'
  inverse-surface: '#2E3138'
  inverse-on-surface: '#F4F2EC'
  outline: '#D3CECC'
  outline-variant: '#E4DFD6'
  surface-tint: '#EFECE5'
  primary: '#4A6D82'           # Calm desaturated blue — trust, clarity
  on-primary: '#FFFFFF'
  primary-container: '#E1EAF0'
  on-primary-container: '#2C4455'
  inverse-primary: '#B8CFDA'
  secondary: '#6B8A6B'         # Muted sage — wellness, safety
  on-secondary: '#FFFFFF'
  secondary-container: '#E5EFE5'
  on-secondary-container: '#3D5A3D'
  tertiary: '#8E7E74'          # Warm stone — grounded, human
  on-tertiary: '#FFFFFF'
  tertiary-container: '#EDE6E1'
  on-tertiary-container: '#504540'
  error: '#A85C5C'             # Soft desaturated red
  on-error: '#FFFFFF'
  error-container: '#F5E8E8'
  on-error-container: '#6B3535'
  background: '#F6F4EE'
  on-background: '#3F4249'
  ivory: '#FCFBF8'
  warm-gray: '#9A8E85'
  soft-slate: '#3F4249'
  desaturated-blue: '#4A6D82'
  muted-sage: '#6B8A6B'
  warm-stone: '#8E7E74'

  # ── Dark Mode ─────────────────────────────────────────────────────
  # Warm deep slate — NOT obsidian/cyber black. Evokes a calm night drive.
  dark-surface: '#1A1D22'
  dark-surface-dim: '#141619'
  dark-surface-container: '#21252C'
  dark-surface-container-high: '#2A2F37'
  dark-on-surface: '#EAE7E2'   # Warm off-white text
  dark-on-surface-variant: '#9099A6'
  dark-primary: '#8AB0C4'      # Calm blue lifted for dark mode
  dark-secondary: '#96B496'    # Sage lifted
  dark-outline: '#3E4550'
  dark-outline-variant: '#2E3340'

typography:
  display-lg:
    fontFamily: Inter, DM Sans, system-ui, sans-serif
    fontSize: 48px
    fontWeight: '400'
    lineHeight: '1.15'
    letterSpacing: -0.025em
  headline-md:
    fontFamily: Inter, DM Sans, system-ui, sans-serif
    fontSize: 24px
    fontWeight: '500'
    lineHeight: '1.35'
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Inter, DM Sans, system-ui, sans-serif
    fontSize: 18px
    fontWeight: '500'
    lineHeight: '1.5'
    letterSpacing: 0em
  body-lg:
    fontFamily: Inter, system-ui, sans-serif
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.8'
    letterSpacing: 0.005em
  body-sm:
    fontFamily: Inter, system-ui, sans-serif
    fontSize: 14px
    fontWeight: '400'
    lineHeight: '1.7'
    letterSpacing: 0.005em
  label-caps:
    fontFamily: Inter, system-ui, sans-serif
    fontSize: 12px
    fontWeight: '600'
    lineHeight: '1'
    letterSpacing: 0.06em
    # NOTE: Use Inter for labels — NOT monospace fonts.
    # Monospace signals "developer tool" — this platform is human-centered.
  data-metric:
    fontFamily: Inter, system-ui, sans-serif
    fontSize: 13px
    fontWeight: '500'
    lineHeight: '1.4'
    letterSpacing: 0.01em
    # Only use for numeric readouts (scores, percentages), never for UI labels.

rounded:
  sm: 0.375rem
  DEFAULT: 0.625rem
  md: 0.875rem
  lg: 1.25rem
  xl: 1.75rem
  2xl: 2.5rem
  full: 9999px

spacing:
  container-max: 820px
  gutter: 48px
  card-padding: 40px
  section-margin: 80px
  unit: 8px
---

## Brand & Visual Identity

The **Premium Behavioral Mobility Intelligence** platform serves drivers, fleet managers, and behavioral researchers. The product's emotional register is:

**Calm. Grounded. Trustworthy. Human. Intelligent.**

It should feel like a **premium automotive companion app** — the kind of software you'd find in a Volvo or a Waymo safety platform. NOT a SOC dashboard, NOT a developer terminal, NOT a cybersecurity product.

---

## STRICTLY AVOID

The following are **categorically prohibited** in this design system:

- **Grid matrix backgrounds** — no dot-grids, no hex-grids, no topographic lines used as "atmosphere"
- **Cyber color palettes** — no neon greens, no neon cyan, no obsidian black `#000–#111` as primary backgrounds
- **Tactical status language** — no ACTIVE / ONLINE / SECURED / STANDBY / INITIALIZED labels
- **Terminal/monospace aesthetic** — JetBrains Mono, Geist Mono, Fira Code are NOT to be used for UI labels or body copy. Reserve monospace only for literal code blocks if ever needed.
- **Scan-line / scan-sweep animations** — no cinematic "initializing system" overlays
- **Hacker/SOC visual metaphors** — no blinking cursors on labels, no green-on-black terminal readouts
- **Pure black** (`#000000`) or near-pure black (`#0a0a0a`) as large surface fills
- **Neon glows** — no `box-shadow: 0 0 40px rgba(green, 0.5)` on UI elements
- **"Behavioral Intelligence System"** as a subtitle — this reads as surveillance/tactical. Use human product copy instead.

---

## Colors

### Light Mode Philosophy
The interface breathes. Backgrounds are warm off-white — not sterile clinical white, not dark:
- **Primary Background:** `#F6F4EE` — warm paper, reduces cognitive fatigue
- **Card Surfaces:** `#FCFBF8` (ivory) — gently elevated from the background
- **Elevated Surfaces:** `#FFFFFF` — used sparingly, only for modals/focused interactions
- **Primary Text:** `#3F4249` (soft slate) — not pure black; visually softer, warmer
- **Secondary Text:** `#646873` — readable, de-emphasized
- **Accent (Primary):** `#4A6D82` (calm desaturated blue) — trust, clarity, automotive
- **Accent (Secondary):** `#6B8A6B` (muted sage) — wellness, safety consciousness
- **Tertiary:** `#8E7E74` (warm stone) — grounded, human warmth

### Dark Mode Philosophy
Dark mode is a **calm night-drive palette** — not a hacker terminal:
- **Base:** `#1A1D22` — warm deep slate (blue-gray undertone, not pure black)
- **Card:** `#21252C` — lifted from base
- **Text:** `#EAE7E2` — warm ivory (not pure white)
- **Muted:** `#9099A6` — readable, cool-muted
- **Accent:** `#8AB0C4` — the desaturated blue lifts appropriately for dark mode

---

## Typography

All text uses **Inter** — modern, humanist, trustworthy. Do NOT use monospace for any UI label.

- **Display:** Large, light-weight (400), wide line-height — confident but not aggressive
- **Headlines:** Medium weight (500), slightly tracked tight
- **Body:** Regular (400), generous line-height (1.7–1.8) — comfortable for reading behavioral insights
- **Labels:** Small caps variant in Inter (600 weight, 0.06em letter-spacing) — professional without feeling military

Typography must feel **human and trustworthy**, not infrastructural.

---

## Layout & Components

- **Rounded Cards:** Large rounded corners (`rounded-2xl`) — soft, approachable, premium automotive UX
- **Whitespace:** Generous. The platform handles complex behavioral data — the UI must provide cognitive breathing room.
- **Subtle Separation:** Avoid harsh borders. Prefer `outline-variant` (`#E4DFD6`) in light mode, `#2E3340` in dark mode.
- **No Harsh Borders:** 1px lines should be barely visible — they organize, not divide.
- **Shadows:** Soft, diffuse (not neon glows). `box-shadow: 0 2px 12px rgba(0,0,0,0.06)` for light mode cards.

### Auth Flow Specific
- Entry experience: **calm, welcoming, warm** — the user is beginning a behavioral safety journey
- Left panel: brand statement + human-centered feature description. No status indicators.
- Right panel: clean form. Plenty of breathing room. Semantic color tokens throughout.
- Both panels adapt fully to light and dark mode via CSS custom properties — **zero hardcoded colors** in component files.

### Status Indicators (When Needed)
If a status must be shown (e.g., "Analysis complete"), use:
- Soft badge: `background: var(--secondary-container)`, `color: var(--on-secondary-container)`
- Human copy: "Ready" not "ONLINE", "Processing" not "ACTIVE", "Secure" not "SECURED"
- Small colored dot is acceptable, but paired with human-readable text, not tactical ALL-CAPS labels
