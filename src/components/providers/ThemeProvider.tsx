'use client';

import { useThemeStore } from '@/store/useThemeStore';
import { useEffect, useState } from 'react';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { isDark } = useThemeStore();
  const [mounted, setMounted] = useState(false);

  // Apply theme to document root
  useEffect(() => {
    setMounted(true);
    
    const htmlElement = document.documentElement;
    if (isDark) {
      htmlElement.classList.add('dark');
    } else {
      htmlElement.classList.remove('dark');
    }
  }, [isDark]);

  // Prevent hydration mismatch
  if (!mounted) {
    return <>{children}</>;
  }

  return <>{children}</>;
}
