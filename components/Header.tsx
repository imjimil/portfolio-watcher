'use client';

import { Moon, Sun, TrendingUp } from 'lucide-react';
import { useTheme } from './ThemeProvider';

export default function Header() {
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-white/80 dark:bg-gray-900/80 backdrop-blur supports-[backdrop-filter]:bg-white/60 dark:supports-[backdrop-filter]:bg-gray-900/60">
      <div className="container flex h-14 sm:h-16 items-center justify-between px-3 sm:px-4 max-w-7xl mx-auto">
        <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
          <TrendingUp className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600 dark:text-blue-400 flex-shrink-0" />
          <h1 className="text-lg sm:text-xl font-bold truncate">Portfolio Tracker</h1>
        </div>
        
        <button
          onClick={toggleTheme}
          className="p-1.5 sm:p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex-shrink-0"
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? (
            <Sun className="h-4 w-4 sm:h-5 sm:w-5" />
          ) : (
            <Moon className="h-4 w-4 sm:h-5 sm:w-5" />
          )}
        </button>
      </div>
    </header>
  );
}

