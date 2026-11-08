import { Star } from 'lucide-react';

interface RatingStarsProps {
  value: number;
  count?: number;
  size?: number;
}

export default function RatingStars({ value, count, size = 14 }: RatingStarsProps) {
  const rounded = Math.round(value);
  return (
    <span className="flex items-center gap-1.5" aria-label={`${value.toFixed(1)} / 5`}>
      <span className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={star <= rounded ? 'fill-current text-amber-400' : 'text-line'}
            style={{ width: size, height: size }}
            aria-hidden="true"
          />
        ))}
      </span>
      <span className="text-xs font-medium text-content">{value.toFixed(1)}</span>
      {typeof count === 'number' ? <span className="text-xs text-muted">({count})</span> : null}
    </span>
  );
}
