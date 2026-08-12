import { useTheme } from '@/context/ThemeContext';
import { Sun, Moon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ThemeToggleProps { className?: string; }

export default function ThemeToggle({ className }: ThemeToggleProps) {
  const { theme, toggleTheme, isMounted } = useTheme();

  if (!isMounted) return <div className={`w-8 h-8 ${className ?? ''}`} style={{ borderRadius: '4px' }} />;

  const isDark = theme === 'dark';

  return (
    <motion.button
      onClick={toggleTheme}
      className={`relative flex items-center justify-center w-8 h-8 transition-all duration-150 focus:outline-none ${className ?? ''}`}
      style={{
        background: 'var(--bg-hover)',
        border: '1px solid var(--border-card)',
        borderRadius: '4px',
        color: 'var(--text-secondary)',
      }}
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
      whileHover={{ background: 'var(--bg-surface-raised)' }}
      whileTap={{ scale: 0.96 }}
    >
      <AnimatePresence mode="wait" initial={false}>
        {isDark ? (
          <motion.div
            key="moon"
            initial={{ opacity: 0, rotate: -20 }}
            animate={{ opacity: 1, rotate: 0 }}
            exit={{ opacity: 0, rotate: 20 }}
            transition={{ duration: 0.15 }}
          >
            <Moon className="w-3.5 h-3.5" />
          </motion.div>
        ) : (
          <motion.div
            key="sun"
            initial={{ opacity: 0, rotate: 20 }}
            animate={{ opacity: 1, rotate: 0 }}
            exit={{ opacity: 0, rotate: -20 }}
            transition={{ duration: 0.15 }}
          >
            <Sun className="w-3.5 h-3.5" />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.button>
  );
}
