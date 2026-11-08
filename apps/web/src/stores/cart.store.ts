import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { ProductCardDto } from '@engineering-lab/shared';

export interface CartItem {
  id: string;
  productId: string;
  slug: string;
  nameAr: string;
  nameEn: string;
  imageUrl: string | null;
  price: number;
  priceDelta: number;
  compareAtPrice: number | null;
  variantId: string | null;
  variantNameAr: string | null;
  variantNameEn: string | null;
  sku: string;
  qty: number;
  maxStock: number;
  isBundle: boolean;
}

export interface AddCartItem {
  product: ProductCardDto | {
    id: string;
    slug: string;
    nameAr: string;
    nameEn: string;
    primaryImage: { url: string } | null;
    price: number;
    compareAtPrice: number | null;
    stock: number;
    isBundle: boolean;
  };
  variant?: { id: string; nameAr: string; nameEn: string; priceDelta: number; stock: number; sku?: string } | null;
  qty: number;
}

export function cartItemId(productId: string, variantId?: string | null): string {
  return variantId ? `${productId}::${variantId}` : productId;
}

export function cartSubtotal(items: CartItem[]): number {
  return items.reduce((sum, item) => sum + item.price * item.qty, 0);
}

export function cartCount(items: CartItem[]): number {
  return items.reduce((sum, item) => sum + item.qty, 0);
}

interface CartState {
  items: CartItem[];
  open: boolean;
  setOpen: (open: boolean) => void;
  addItem: (input: AddCartItem) => void;
  updateQty: (id: string, qty: number) => void;
  removeItem: (id: string) => void;
  clear: () => void;
  syncProducts: (products: ProductCardDto[]) => void;
}

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      open: false,
      setOpen: (open) => set({ open }),
      addItem: ({ product, variant = null, qty }) => {
        const productPrice = 'price' in product ? product.price : 0;
        const productStock = 'stock' in product ? product.stock : 0;
        const price = variant ? productPrice + variant.priceDelta : productPrice;
        const maxStock = variant ? variant.stock : productStock;
        const id = cartItemId(product.id, variant?.id);
        set((state) => {
          const existing = state.items.find((item) => item.id === id);
          const nextQty = Math.max(1, Math.min(maxStock, (existing?.qty ?? 0) + qty));
          const item: CartItem = {
            id,
            productId: product.id,
            slug: product.slug,
            nameAr: product.nameAr,
            nameEn: product.nameEn,
            imageUrl: product.primaryImage?.url ?? null,
            price,
            priceDelta: variant?.priceDelta ?? 0,
            compareAtPrice: 'compareAtPrice' in product ? product.compareAtPrice : null,
            variantId: variant?.id ?? null,
            variantNameAr: variant?.nameAr ?? null,
            variantNameEn: variant?.nameEn ?? null,
            sku: variant?.sku ?? (product as { sku?: string }).sku ?? '',
            qty: nextQty,
            maxStock,
            isBundle: product.isBundle,
          };
          const others = state.items.filter((entry) => entry.id !== id);
          return { items: [...others, item] };
        });
      },
      updateQty: (id, qty) =>
        set((state) => ({
          items: state.items.flatMap((item) => {
            if (item.id !== id) return [item];
            if (qty <= 0) return [];
            return [{ ...item, qty: Math.min(item.maxStock, qty) }];
          }),
        })),
      removeItem: (id) => set((state) => ({ items: state.items.filter((item) => item.id !== id) })),
      clear: () => set({ items: [] }),
      syncProducts: (products) =>
        set((state) => {
          const byId = new Map(products.map((product) => [product.id, product]));
          const items = state.items.flatMap((item) => {
            const product = byId.get(item.productId);
            if (!product || product.stock <= 0) return [];
            return [
              {
                ...item,
                slug: product.slug,
                nameAr: product.nameAr,
                nameEn: product.nameEn,
                imageUrl: product.primaryImage?.url ?? item.imageUrl,
                price: product.price + (item.priceDelta ?? 0),
                compareAtPrice: product.compareAtPrice,
                maxStock: product.stock,
                qty: Math.min(item.qty, product.stock),
                isBundle: product.isBundle,
              },
            ];
          });
          return { items };
        }),
    }),
    {
      name: 'el_cart',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ items: state.items }) as CartState,
    },
  ),
);
