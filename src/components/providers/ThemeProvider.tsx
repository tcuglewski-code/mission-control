'use client';

import { useThemeStore, ThemeOption } from '@/store/useThemeStore';
import { useEffect, useState } from 'react';

/**
 * Wendet das aktuelle Theme auf <html> und <body> an.
 * - Unterstützt: "light", "dark", "wald", "system"
 * - System-Preference wird via prefers-color-scheme erkannt
 * - Kompaktmodus setzt .compact auf <body>
 * - Lädt gespeichertes Theme vom Server beim ersten Render
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { theme, compact, setTheme, setCompact, setResolvedTheme } = useThemeStore();
  const [mounted, setMounted] = useState(false);

  // System-Preference-Listener
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');

    function apply(currentTheme: ThemeOption) {
      const html = document.documentElement;
      const body = document.body;

      // Alle Theme-Klassen entfernen
      html.classList.remove('dark', 'theme-wald', 'theme-light');

      let resolved: ThemeOption = currentTheme;

      if (currentTheme === 'system') {
        resolved = mq.matches ? 'dark' : 'light';
      }

      if (resolved === 'dark') {
        html.classList.add('dark');
      } else if (resolved === 'wald') {
        html.classList.add('dark', 'theme-wald');
      } else {
        html.classList.add('theme-light');
      }

      setResolvedTheme(resolved);

      // Kompaktmodus
      if (compact) {
        body.classList.add('compact');
      } else {
        body.classList.remove('compact');
      }
    }

    apply(theme);

    // System-Preference-Änderungen live verfolgen
    const handler = () => {
      if (theme === 'system') apply('system');
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [theme, compact, setResolvedTheme]);

  // DB-Theme beim ersten Laden holen
  useEffect(() => {
    setMounted(true);

    fetch('/api/settings/profile')
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (!data) return;
        if (data.theme && data.theme !== theme) {
          setTheme(data.theme as ThemeOption);
        }
        if (typeof data.compact === 'boolean' && data.compact !== compact) {
          setCompact(data.compact);
        }
      })
      .catch(() => {/* nicht authentifiziert — ignorieren */});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Hydration-Guard: kurz leer rendern bis Client-State bekannt
  if (!mounted) {
    return <>{children}</>;
  }

  return <>{children}</>;
}
