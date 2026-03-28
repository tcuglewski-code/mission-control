import { create } from "zustand";

interface KeyboardShortcutsModalStore {
  open: boolean;
  setOpen: (open: boolean) => void;
  toggle: () => void;
}

export const useKeyboardShortcutsModal = create<KeyboardShortcutsModalStore>((set) => ({
  open: false,
  setOpen: (open) => set({ open }),
  toggle: () => set((state) => ({ open: !state.open })),
}));
