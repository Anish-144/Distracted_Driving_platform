/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      backgroundColor: {
        primary:     'var(--bg-primary)',
        secondary:   'var(--bg-secondary)',
        tertiary:    'var(--bg-tertiary)',
        'app-shell': 'var(--bg-app-shell)',
        canvas:      'var(--bg-canvas)',
        surface:     'var(--bg-surface)',
        card:        'var(--bg-card)',
        elevated:    'var(--bg-card-elevated)',
        panel:       'var(--bg-panel)',
        input:       'var(--bg-input)',
        hover:       'var(--bg-hover)',
        overlay:     'var(--overlay-light)',
        accent:      'var(--color-primary)',
      },
      textColor: {
        primary:       'var(--text-primary)',
        secondary:     'var(--text-secondary)',
        muted:         'var(--text-muted)',
        input:         'var(--input-text)',
        accent:        'var(--color-primary)',
        'on-accent':   'var(--color-primary-text)',
        success:       'var(--text-success)',
        warning:       'var(--text-warning)',
        destructive:   'var(--text-destructive)',
        overlay:       'var(--text-overlay)',
      },
      borderColor: {
        subtle:  'var(--border-subtle)',
        card:    'var(--border-card)',
        strong:  'var(--border-strong)',
        input:   'var(--input-border)',
        brand:   'var(--color-primary)',
        focus:   'var(--border-focus)',
      },
      placeholderColor: {
        input: 'var(--input-placeholder)',
      },
      colors: {
        // ── Electric Chartreuse — the ONLY accent ──────────────────────
        brand: {
          50:  '#F7FFD6',
          100: '#EEFFAD',
          200: '#DAFF40',
          300: '#C8FF00',  // PRIMARY
          400: '#B4E800',
          500: '#9FCC00',
          600: '#7DA300',
          700: '#5C7A00',
          800: '#3D5200',
          900: '#1F2900',
        },
        // ── Warm Parchment surfaces ─────────────────────────────────────
        parchment: {
          50:  '#F8F6F0',
          100: '#F0EDE6',  // canvas
          200: '#E8E4DC',  // surface
          300: '#DEDAD1',  // raised
          400: '#D4D0C8',
          500: '#C8C4BC',
          600: '#B8B4AC',
          700: '#9A9690',
          800: '#7A7670',
          900: '#5A5650',
        },
        // ── Near-black warm ─────────────────────────────────────────────
        ink: {
          50:  '#F0EDE6',
          100: '#D8D4CC',
          200: '#9A9690',
          300: '#5A5650',
          400: '#3A3830',
          500: '#2D2A24',
          600: '#1A1814',  // PRIMARY TEXT
          700: '#141210',
          800: '#0E0D0A',
          900: '#080706',
        },
      },
      fontFamily: {
        sans:      ['Space Grotesk', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display:   ['Space Grotesk', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        editorial: ['Space Grotesk', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono:      ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      fontSize: {
        '2xs': ['0.625rem', { lineHeight: '1rem' }],
        '3xl': ['1.875rem', { lineHeight: '2.25rem', letterSpacing: '-0.02em' }],
        '4xl': ['2.25rem', { lineHeight: '2.5rem', letterSpacing: '-0.03em' }],
        '5xl': ['3rem', { lineHeight: '1', letterSpacing: '-0.04em' }],
        '6xl': ['3.75rem', { lineHeight: '1', letterSpacing: '-0.04em' }],
        '7xl': ['4.5rem', { lineHeight: '1', letterSpacing: '-0.04em' }],
        '8xl': ['6rem', { lineHeight: '1', letterSpacing: '-0.04em' }],
      },
      letterSpacing: {
        'label':     '0.08em',
        'label-xl':  '0.12em',
        'editorial': '-0.04em',
        'tight':     '-0.02em',
        'tighter':   '-0.03em',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'stripe-subtle':   'repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(26,24,20,0.015) 4px, rgba(26,24,20,0.015) 5px)',
      },
      animation: {
        'fade-in':       'fadeIn 0.3s cubic-bezier(0.16,1,0.3,1) both',
        'slide-in-left': 'slideInLeft 0.3s cubic-bezier(0.16,1,0.3,1) both',
        'scale-in':      'scaleIn 0.25s cubic-bezier(0.16,1,0.3,1) both',
        'skeleton':      'skeletonPulse 1.6s ease-in-out infinite',
      },
      keyframes: {
        fadeIn:        { from: { opacity: '0', transform: 'translateY(8px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        slideInLeft:   { from: { opacity: '0', transform: 'translateX(-8px)' }, to: { opacity: '1', transform: 'translateX(0)' } },
        scaleIn:       { from: { opacity: '0', transform: 'scale(0.97)' }, to: { opacity: '1', transform: 'scale(1)' } },
        skeletonPulse: { '0%, 100%': { opacity: '1' }, '50%': { opacity: '0.5' } },
      },
      borderRadius: {
        DEFAULT: '4px',
        sm: '3px',
        md: '4px',
        lg: '6px',
        xl: '8px',
        '2xl': '10px',
        full: '9999px',
      },
      boxShadow: {
        // NO glow shadows. Only structural shadows.
        card:     '0 1px 3px rgba(26,24,20,0.06)',
        'card-sm': '0 1px 2px rgba(26,24,20,0.04)',
        modal:    '0 8px 32px rgba(26,24,20,0.12)',
      },
      transitionTimingFunction: {
        'expo-out': 'cubic-bezier(0.16, 1, 0.3, 1)',
        'smooth':   'cubic-bezier(0.4, 0, 0.2, 1)',
      },
      transitionDuration: {
        '400': '400ms',
        '600': '600ms',
      },
    },
  },
  plugins: [],
};
