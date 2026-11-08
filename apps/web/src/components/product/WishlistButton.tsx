import { Heart } from 'lucide-react';
import { useToggleWishlist } from '../../hooks/useWishlist';

interface WishlistButtonProps {
  productId: string;
  className?: string;
}

export default function WishlistButton({ productId, className }: WishlistButtonProps) {
  const { isWishlisted, toggle, isPending } = useToggleWishlist(productId);

  return (
    <button
      type="button"
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        toggle();
      }}
      disabled={isPending}
      aria-pressed={isWishlisted}
      aria-label={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
      className={`flex h-9 w-9 items-center justify-center rounded-full border border-line bg-surface/90 text-muted shadow-card backdrop-blur transition hover:border-brand/50 hover:text-brand disabled:opacity-60 ${
        isWishlisted ? 'text-brand' : ''
      } ${className ?? ''}`}
    >
      <Heart className={`h-4 w-4 ${isWishlisted ? 'fill-current' : ''}`} />
    </button>
  );
}
