import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ThemeOption = 'light' | 'dark' | 'wald' | 'system';

interface ThemeStore {
  theme: ThemeOption;
  compact: boolean;
  // Legacy-Compat: isDark wird abgeleitet
  isDark: boolean;
  setTheme: (theme: ThemeOption) => void;
  setCompact: (compact: boolean) => void;
  toggleTheme: () => void;
  // Effektives Theme nach System-Auflösung
  resolvedTheme: ThemeOption;
  setResolvedTheme: (t: ThemeOption) => void;
}

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set, get) => ({
      theme: 'system',
      compact: false,
      isDark: true,
      resolvedTheme: 'dark',

      setTheme: (theme) => {
        const isDark = theme === 'dark' || theme === 'wald';
        set({ theme, isDark });
      },

      setCompact: (compact) => set({ compact }),

      toggleTheme: () => {
        const current = get().theme;
        const next: ThemeOption = current === 'dark' ? 'light' : 'dark';
        set({ theme: next, isDark: next !== 'light' });
      },

      setResolvedTheme: (resolvedTheme) => {
        const isDark = resolvedTheme === 'dark' || resolvedTheme === 'wald';
        set({ resolvedTheme, isDark });
      },
    }),
    {
      name: 'mc-theme-storage',
      partialize: (state) => ({
        theme: state.theme,
        compact: state.compact,
      }),
    }
  )
);
