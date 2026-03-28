import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ThemeStore {
  isDark: boolean;
  toggleTheme: () => void;
  setTheme: (isDark: boolean) => void;
}

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set) => ({
      isDark: true, // Default: Dark (passt zu Waldgrün)
      toggleTheme: () => set((state) => ({ isDark: !state.isDark })),
      setTheme: (isDark) => set({ isDark }),
    }),
    { 
      name: 'mc-theme-storage',
      // Persist nur auf Client-Seite
      partialize: (state) => ({ isDark: state.isDark }),
    }
  )
);
