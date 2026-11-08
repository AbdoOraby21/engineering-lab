import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { addWishlistItem, listWishlist, removeWishlistItem } from '../lib/wishlistApi';
import { useAuthStore } from '../stores/auth.store';
import { useUiStore } from '../stores/ui.store';
import i18n from '../lib/i18n';

export function useWishlistIds(): Set<string> | undefined {
  const status = useAuthStore((state) => state.status);
  const query = useQuery({
    queryKey: ['wishlist', 'ids'],
    queryFn: async () => (await listWishlist()).map((item) => item.product.id),
    enabled: status === 'authenticated',
    staleTime: 30_000,
    select: (ids) => new Set(ids),
  });
  return query.data;
}

export function useToggleWishlist(productId: string) {
  const queryClient = useQueryClient();
  const status = useAuthStore((state) => state.status);
  const addToast = useUiStore((state) => state.addToast);
  const setLoginPrompt = useUiStore((state) => state.setLoginPrompt);
  const ids = useWishlistIds();
  const isWishlisted = ids?.has(productId) ?? false;

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['wishlist'] });
  };

  const mutation = useMutation({
    mutationFn: async (next: boolean) => {
      if (next) {
        await addWishlistItem(productId);
      } else {
        await removeWishlistItem(productId);
      }
    },
    onSuccess: invalidate,
    onError: () =>
      addToast(
        i18n.language === 'en' ? 'Could not update your wishlist.' : 'تعذر تحديث قائمة الأمنيات.',
        'error',
      ),
  });

  function toggle(): void {
    if (status !== 'authenticated') {
      setLoginPrompt(true, window.location.pathname + window.location.search);
      return;
    }
    mutation.mutate(!isWishlisted);
  }

  return { isWishlisted, toggle, isPending: mutation.isPending };
}
