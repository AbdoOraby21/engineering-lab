import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { ProductCardDto } from '@engineering-lab/shared';

export const COMPARE_MAX = 4;

interface CompareState {
  items: ProductCardDto[];
  toggle: (product: ProductCardDto) => { ok: boolean; message?: 'full' };
  remove: (productId: string) => void;
  clear: () => void;
  has: (productId: string) => boolean;
}

export const useCompareStore = create<CompareState>()(
  persist(
    (set, get) => ({
      items: [],
      toggle: (product) => {
        const exists = get().items.some((item) => item.id === product.id);
        if (exists) {
          set({ items: get().items.filter((item) => item.id !== product.id) });
          return { ok: true };
        }
        if (get().items.length >= COMPARE_MAX) {
          return { ok: false, message: 'full' };
        }
        set({ items: [...get().items, product] });
        return { ok: true };
      },
      remove: (productId) => set({ items: get().items.filter((item) => item.id !== productId) }),
      clear: () => set({ items: [] }),
      has: (productId) => get().items.some((item) => item.id === productId),
    }),
    {
      name: 'el_compare',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ items: state.items }) as CompareState,
    },
  ),
);
