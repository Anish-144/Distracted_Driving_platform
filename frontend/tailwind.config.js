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
        primary: 'var(--bg-primary)',
        secondary: 'var(--bg-secondary)',
        tertiary: 'var(--bg-tertiary)',
        'app-shell': 'var(--bg-app-shell)',
        overlay: 'var(--overlay-light)',
        'overlay-heavy': 'var(--overlay-heavy)',
        input: 'var(--input-bg)',
      },
      textColor: {
        primary: 'var(--text-primary)',
        secondary: 'var(--text-secondary)',
        muted: 'var(--text-muted)',
        input: 'var(--input-text)',
        accent: 'var(--text-accent)',
        success: 'var(--text-success)',
        warning: 'var(--text-warning)',
        destructive: 'var(--text-destructive)',
        overlay: 'var(--text-overlay)',
      },
      borderColor: {
        subtle: 'var(--border-subtle)',
        strong: 'var(--border-strong)',
        card: 'var(--card-border)',
        input: 'var(--input-border)',
      },
      placeholderColor: {
        input: 'var(--input-placeholder)',
      },
      colors: {
        // Brand — calm desaturated blue (trust, automotive, clarity)
        brand: {
          50:  '#EDF3F7',
          100: '#D4E4ED',
          200: '#B8CFDA',
          300: '#93B3C5',
          400: '#6B93A8',
          500: '#4A6D82', // Primary
          600: '#3A5769',
          700: '#2C4455',
          800: '#1E2E3A',
          900: '#111C24',
        },
        // Secondary — muted sage (wellness, safety)
        sage: {
          50:  '#EFF5EF',
          100: '#D8EAD8',
          200: '#B8D4B8',
          300: '#96B996',
          400: '#7DA17D',
          500: '#6B8A6B', // Secondary
          600: '#536B53',
          700: '#3D5A3D',
          800: '#294029',
          900: '#172717',
        },
        // Tertiary — warm stone (grounded, human)
        stone: {
          50:  '#F5F2F0',
          100: '#EDE6E1',
          200: '#D9CEC7',
          300: '#C0B0A7',
          400: '#A89088',
          500: '#8E7E74', // Tertiary
          600: '#6F625A',
          700: '#534740',
          800: '#3A312C',
          900: '#241E1A',
        },
        danger: {
          400: '#C47A7A',
          500: '#A85C5C',
          600: '#8B4444',
        },
        // Design system palette — matches DESIGN.md exactly
        design: {
          'ivory':              '#FCFBF8',
          'warm-off-white':     '#F6F4EE',
          'paper':              '#F3F0E9',
          'surface-dim':        '#F4F2EC',
          'surface-container':  '#EFECE5',
          'soft-slate':         '#3F4249',
          'on-surface-variant': '#646873',
          'warm-gray':          '#9A8E85',
          'outline':            '#D3CECC',
          'outline-variant':    '#E4DFD6',
          // Dark mode warm slate
          'dark-base':          '#1A1D22',
          'dark-panel':         '#21252C',
          'dark-elevated':      '#2A2F37',
          'dark-outline':       '#3E4550',
          'warm-ivory-text':    '#EAE7E2',
          'cool-muted':         '#9099A6',
        }
      },
      fontFamily: {
        // Inter is the human-centered primary. Geist/JetBrains are NOT used for UI labels.
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['ui-monospace', 'monospace'], // Reserved for literal code blocks only
      },
      fontSize: {
        '2xs': ['0.625rem', { lineHeight: '1rem' }],
      },
      letterSpacing: {
        'label-wide': '0.06em',   // Inter label-caps style
        'label-xl':   '0.10em',   // For extra-wide label treatment
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        // Premium mobility — calm blue to sage, NOT neon cyber gradients
        'brand-gradient': 'linear-gradient(135deg, #4A6D82 0%, #6B8A6B 100%)',
        'brand-gradient-subtle': 'linear-gradient(135deg, rgba(74,109,130,0.08) 0%, rgba(107,138,107,0.06) 100%)',
        // Warm ambient mesh — replaces dark-gradient and cyber mesh
        'ambient-warm': 'radial-gradient(ellipse at 20% 30%, rgba(74,109,130,0.08) 0px, transparent 60%), radial-gradient(ellipse at 80% 70%, rgba(107,138,107,0.06) 0px, transparent 60%)',
        'ambient-warm-dark': 'radial-gradient(ellipse at 20% 30%, rgba(138,176,196,0.06) 0px, transparent 60%), radial-gradient(ellipse at 80% 70%, rgba(150,180,150,0.05) 0px, transparent 60%)',
      },
      animation: {
        // Entrance
        'fade-in':    'fadeIn 0.6s cubic-bezier(0.25,0.46,0.45,0.94) both',
        'slide-up':   'slideUp 0.6s cubic-bezier(0.25,0.46,0.45,0.94) both',
        'scale-in':   'scaleIn 0.6s cubic-bezier(0.25,0.46,0.45,0.94) both',
        // Ambient — human-feeling, gentle
        'float-slow':   'float-slow 10s ease-in-out infinite',
        'float-medium': 'float-medium 7s ease-in-out infinite',
        'float-fast':   'float-fast 4s ease-in-out infinite',
        'drift':        'drift 15s ease-in-out infinite',
        'gradient':     'gradient-shift 8s ease infinite',
        'pulse-soft':   'pulse-soft 3s ease-in-out infinite',
        'shimmer':      'shimmer-sweep 2.5s linear infinite',
        // Micro
        'bounce-soft':  'bounceSoft 0.6s cubic-bezier(0.34,1.56,0.64,1)',
        'ping-once':    'ping 0.8s cubic-bezier(0,0,0.2,1)',
      },
      keyframes: {
        fadeIn:  { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        slideUp: { '0%': { opacity: '0', transform: 'translateY(24px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        scaleIn: { '0%': { opacity: '0', transform: 'scale(0.94)' }, '100%': { opacity: '1', transform: 'scale(1)' } },
        'float-slow': {
          '0%, 100%': { transform: 'translateY(0) translateX(0) scale(1)' },
          '33%':  { transform: 'translateY(-30px) translateX(15px) scale(1.02)' },
          '66%':  { transform: 'translateY(-15px) translateX(-10px) scale(0.98)' },
        },
        'float-medium': {
          '0%, 100%': { transform: 'translateY(0) translateX(0)' },
          '50%':  { transform: 'translateY(-20px) translateX(-20px)' },
        },
        'float-fast': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%':  { transform: 'translateY(-12px)' },
        },
        'drift': {
          '0%':   { transform: 'rotate(0deg) scale(1)' },
          '50%':  { transform: 'rotate(2deg) scale(1.04)' },
          '100%': { transform: 'rotate(0deg) scale(1)' },
        },
        'gradient-shift': {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
        // Calm ambient pulse — warm blue, NOT neon cyber green
        'pulse-soft': {
          '0%, 100%': { boxShadow: '0 4px 16px rgba(74,109,130,0.12)' },
          '50%':       { boxShadow: '0 8px 32px rgba(74,109,130,0.22)' },
        },
        'shimmer-sweep': {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'particle-drift': {
          '0%':   { transform: 'translateY(0) translateX(0) rotate(0deg)', opacity: '0' },
          '10%':  { opacity: '1' },
          '90%':  { opacity: '0.6' },
          '100%': { transform: 'translateY(-120vh) translateX(30px) rotate(360deg)', opacity: '0' },
        },
        bounceSoft: {
          '0%, 100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.05)' },
        },
      },
      boxShadow: {
        'none': 'none',
      },
      backdropBlur: {
        xs: '2px',
        '2xl': '40px',
      },
      transitionTimingFunction: {
        'expo-out':    'cubic-bezier(0.16, 1, 0.3, 1)',
        'expo-in-out': 'cubic-bezier(0.87, 0, 0.13, 1)',
        'elastic':     'cubic-bezier(0.34, 1.56, 0.64, 1)',
      },
      transitionDuration: {
        '400': '400ms',
        '600': '600ms',
        '800': '800ms',
        '1200': '1200ms',
      },
    },
  },
  plugins: [],
};
