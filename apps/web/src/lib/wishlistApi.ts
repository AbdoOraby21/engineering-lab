import type { WishlistItemDto } from '@engineering-lab/shared';
import { api } from './api';

interface Data<T> {
  data: T;
}

export async function listWishlist(): Promise<WishlistItemDto[]> {
  const response = await api.get<Data<{ items: WishlistItemDto[] }>>('/wishlist');
  return response.data.data.items;
}

export async function addWishlistItem(productId: string): Promise<WishlistItemDto> {
  const response = await api.post<Data<{ item: WishlistItemDto }>>('/wishlist', { productId });
  return response.data.data.item;
}

export async function removeWishlistItem(productId: string): Promise<void> {
  await api.delete(`/wishlist/${encodeURIComponent(productId)}`);
}
