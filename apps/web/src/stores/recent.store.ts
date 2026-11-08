import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

const MAX_RECENT = 12;

interface RecentState {
  ids: string[];
  add: (productId: string) => void;
  clear: () => void;
}

export const useRecentStore = create<RecentState>()(
  persist(
    (set) => ({
      ids: [],
      add: (productId) =>
        set((state) => ({
          ids: [productId, ...state.ids.filter((id) => id !== productId)].slice(0, MAX_RECENT),
        })),
      clear: () => set({ ids: [] }),
    }),
    {
      name: 'el_recent',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ ids: state.ids }) as RecentState,
    },
  ),
);
