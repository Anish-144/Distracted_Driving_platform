---
name: Soft Premium Clinical Workspace
colors:
  surface: '#FCFBF8' # Ivory
  surface-dim: '#F4F2EC'
  surface-bright: '#FEFDFB'
  surface-container-lowest: '#FFFFFF'
  surface-container-low: '#FCFBF8'
  surface-container: '#F6F4EE' # Warm off-white
  surface-container-high: '#EFECE5'
  surface-container-highest: '#E4DFD6'
  on-surface: '#3F4249' # Soft Slate
  on-surface-variant: '#646873'
  inverse-surface: '#464951'
  inverse-on-surface: '#F4F2EC'
  outline: '#D3CECC'
  outline-variant: '#E4DFD6'
  surface-tint: '#EFECE5'
  primary: '#5B7A8B' # Desaturated Blue
  on-primary: '#FFFFFF'
  primary-container: '#E5EDF0'
  on-primary-container: '#3B4E59'
  inverse-primary: '#F2F6F8'
  secondary: '#7A8C7A' # Muted Sage Green
  on-secondary: '#FFFFFF'
  secondary-container: '#E8EFE8'
  on-secondary-container: '#4A574A'
  tertiary: '#9A8E85' # Warm Gray
  on-tertiary: '#FFFFFF'
  tertiary-container: '#F0EBE6'
  on-tertiary-container: '#544D48'
  error: '#B26666' # Soft desaturated red
  on-error: '#FFFFFF'
  error-container: '#F5E6E6'
  on-error-container: '#6B3D3D'
  background: '#F6F4EE' # Warm off-white
  on-background: '#3F4249' # Soft Slate
  ivory: '#FCFBF8'
  warm-gray: '#9A8E85'
  soft-slate: '#3F4249'
  desaturated-blue: '#5B7A8B'
  muted-sage-green: '#7A8C7A'
typography:
  display-lg:
    fontFamily: Inter, system-ui, sans-serif
    fontSize: 48px
    fontWeight: '400'
    lineHeight: '1.2'
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Inter, system-ui, sans-serif
    fontSize: 24px
    fontWeight: '500'
    lineHeight: '1.4'
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Inter, system-ui, sans-serif
    fontSize: 18px
    fontWeight: '500'
    lineHeight: '1.5'
    letterSpacing: 0em
  body-lg:
    fontFamily: Inter, system-ui, sans-serif
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.8'
    letterSpacing: 0.01em
  body-sm:
    fontFamily: Inter, system-ui, sans-serif
    fontSize: 14px
    fontWeight: '400'
    lineHeight: '1.7'
    letterSpacing: 0.01em
  label-caps:
    fontFamily: Inter, system-ui, sans-serif
    fontSize: 12px
    fontWeight: '500'
    lineHeight: '1'
    letterSpacing: 0.08em
rounded:
  sm: 0.375rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  2xl: 2rem
  full: 9999px
spacing:
  container-max: 800px
  gutter: 48px
  card-padding: 48px
  section-margin: 96px
  unit: 12px
---

## Brand & Style

The **Soft Premium Clinical Workspace** uses an ambient, comfortable aesthetic optimized for long usage. We strictly avoid high-contrast "pure white" and "pure black" combinations, opting instead for a soothing, eye-friendly palette.

**STRICTLY AVOID:**
- Pure whites (`#FFFFFF`) as large background fills
- Pure blacks (`#000000` or `#111827`)
- Neon colors or bright saturated blues
- Glowing gradients or high contrast themes
- Developer/Terminal aesthetics

## Colors

- **Backgrounds:** `warm off-white` (`#F6F4EE`) to reduce eye strain.
- **Surfaces:** `ivory` (`#FCFBF8`) for cards to create an incredibly gentle separation from the background. 
- **Typography:** `soft slate` (`#3F4249`) is used for primary text, and `warm gray` (`#9A8E85`) for secondary/tertiary text. This eliminates harsh black-on-white contrast.
- **Accents:** `desaturated blue` (`#5B7A8B`) and `muted sage green` (`#7A8C7A`) are used extremely sparingly for primary actions, badges, or subtle visual interest.

## Layout & Components

- **Rounded Cards:** Information is grouped into elegant, large rounded cards (`rounded-2xl`) using the `ivory` surface color.
- **Subtle Separation:** Avoid harsh borders. If separation is needed, use `outline-variant` (`#E4DFD6`) or extremely diffuse drop shadows.
- **Ultra Minimal Density:** Maintain the 50% density reduction with massive whitespace and progressive disclosure. The UI should feel like a polished consumer-grade product experience, not an admin dashboard.
