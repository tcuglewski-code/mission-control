import { create } from "zustand";

interface QuickAddStore {
  open: boolean;
  setOpen: (open: boolean) => void;
  toggle: () => void;
}

export const useQuickAdd = create<QuickAddStore>((set) => ({
  open: false,
  setOpen: (open) => set({ open }),
  toggle: () => set((state) => ({ open: !state.open })),
}));
