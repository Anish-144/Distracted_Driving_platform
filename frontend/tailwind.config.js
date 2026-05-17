/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Brand — deep teal/emerald + electric cyan
        brand: {
          50:  '#ecfdf5',
          100: '#d1fae5',
          200: '#a7f3d0',
          300: '#6ee7b7',
          400: '#34d399',
          500: '#10b981',
          600: '#059669',
          700: '#047857',
          800: '#065f46',
          900: '#064e3b',
        },
        accent: {
          50:  '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
          800: '#92400e',
          900: '#78350f',
        },
        danger: {
          400: '#f87171',
          500: '#ef4444',
          600: '#dc2626',
        },
        // Dark atmospheric surfaces
        surface: {
          950: '#040812',
          900: '#080e1c',
          800: '#0d1527',
          700: '#111c35',
          600: '#1a2845',
          500: '#1f3257',
          400: '#2d4470',
        },
        // Cyan accent for depth layering
        cyan: {
          400: '#22d3ee',
          500: '#06b6d4',
          600: '#0891b2',
          700: '#0e7490',
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      fontSize: {
        '2xs': ['0.625rem', { lineHeight: '1rem' }],
      },
      letterSpacing: {
        'cinematic': '0.15em',
        'wide-xl': '0.12em',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'brand-gradient': 'linear-gradient(135deg, #059669 0%, #0891b2 100%)',
        'dark-gradient': 'linear-gradient(180deg, #040812 0%, #0d1527 100%)',
        'mesh-brand': 'radial-gradient(at 40% 20%, rgba(5, 150, 105, 0.15) 0px, transparent 50%), radial-gradient(at 80% 0%, rgba(8, 145, 178, 0.1) 0px, transparent 50%), radial-gradient(at 0% 50%, rgba(16, 185, 129, 0.08) 0px, transparent 50%)',
        'mesh-subtle': 'radial-gradient(at 40% 20%, rgba(5, 150, 105, 0.06) 0px, transparent 50%), radial-gradient(at 80% 60%, rgba(8, 145, 178, 0.05) 0px, transparent 50%)',
      },
      animation: {
        // Legacy (keep existing references working)
        'fade-in':    'fadeIn 0.7s cubic-bezier(0.16,1,0.3,1) both',
        'slide-up':   'slideUp 0.7s cubic-bezier(0.16,1,0.3,1) both',
        'scale-in':   'scaleIn 0.7s cubic-bezier(0.16,1,0.3,1) both',
        // Cinematic
        'float-slow':   'float-slow 8s ease-in-out infinite',
        'float-medium': 'float-medium 5s ease-in-out infinite',
        'float-fast':   'float-fast 3s ease-in-out infinite',
        'drift':        'drift 12s ease-in-out infinite',
        'gradient':     'gradient-shift 8s ease infinite',
        'pulse-glow':   'pulse-glow-brand 2.5s ease-in-out infinite',
        'shimmer':      'shimmer-sweep 2.5s linear infinite',
        'particle':     'particle-drift 10s linear infinite',
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
        'pulse-glow-brand': {
          '0%, 100%': { boxShadow: '0 0 12px rgba(5,150,105,0.3), 0 0 40px rgba(5,150,105,0.1)' },
          '50%': { boxShadow: '0 0 24px rgba(5,150,105,0.5), 0 0 60px rgba(5,150,105,0.2)' },
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
        'brand':    '0 0 20px rgba(5, 150, 105, 0.35), 0 0 60px rgba(5, 150, 105, 0.1)',
        'brand-sm': '0 0 10px rgba(5, 150, 105, 0.2)',
        'glow':     '0 0 40px rgba(5, 150, 105, 0.15)',
        'card':     '0 4px 24px rgba(0, 0, 0, 0.08), 0 1px 3px rgba(0, 0, 0, 0.05)',
        'card-lg':  '0 16px 48px rgba(0, 0, 0, 0.12), 0 4px 12px rgba(0, 0, 0, 0.06)',
        'dark-card':'0 4px 32px rgba(0, 0, 0, 0.5)',
        'inset-top':'inset 0 1px 0 0 rgba(255, 255, 255, 0.08)',
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
