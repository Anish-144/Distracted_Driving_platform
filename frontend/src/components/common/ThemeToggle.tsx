import { useTheme } from '@/context/ThemeContext';
import { Sun, Moon } from 'lucide-react';
import { motion } from 'framer-motion';
import clsx from 'clsx';

interface ThemeToggleProps {
  className?: string;
}

export default function ThemeToggle({ className }: ThemeToggleProps) {
  const { theme, toggleTheme, isMounted } = useTheme();

  // Return a stable placeholder to avoid hydration mismatch
  if (!isMounted) {
    return (
      <div className={clsx("w-9 h-9 rounded-xl", className)} />
    );
  }

  const isDark = theme === 'dark';

  return (
    <motion.button
      onClick={toggleTheme}
      className={clsx(
        "relative w-9 h-9 rounded-xl flex items-center justify-center transition-colors duration-200",
        "border focus:outline-none focus:ring-2 focus:ring-brand-400 focus:ring-offset-1 focus:ring-offset-bg-app-shell",
        isDark 
          ? "bg-white/5 border-white/10 hover:bg-white/10 text-yellow-300"
          : "bg-gray-100 border-gray-200 hover:bg-gray-200 text-brand-600",
        className
      )}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      aria-label="Toggle theme"
    >
      <motion.div
        initial={false}
        animate={{ 
          rotate: isDark ? 0 : -90,
          scale: isDark ? 1 : 0,
          opacity: isDark ? 1 : 0
        }}
        transition={{ duration: 0.4, ease: "backOut" }}
        className="absolute inset-0 flex items-center justify-center"
      >
        <Moon className="w-5 h-5" />
      </motion.div>
      <motion.div
        initial={false}
        animate={{ 
          rotate: isDark ? 90 : 0,
          scale: isDark ? 0 : 1,
          opacity: isDark ? 0 : 1
        }}
        transition={{ duration: 0.4, ease: "backOut" }}
        className="absolute inset-0 flex items-center justify-center"
      >
        <Sun className="w-5 h-5" />
      </motion.div>
    </motion.button>
  );
}
