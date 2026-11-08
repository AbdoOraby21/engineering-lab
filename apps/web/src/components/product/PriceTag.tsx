import type { AppLanguage } from '../../lib/i18n';
import { formatEGP } from '../../lib/format';

interface PriceTagProps {
  price: number;
  compareAtPrice?: number | null;
  lang: AppLanguage;
  size?: 'sm' | 'md' | 'lg';
}

export default function PriceTag({ price, compareAtPrice, lang, size = 'md' }: PriceTagProps) {
  const onSale = compareAtPrice !== null && compareAtPrice !== undefined && compareAtPrice > price;
  const money = formatEGP(price, lang);
  const className = size === 'lg' ? 'text-3xl font-extrabold' : size === 'sm' ? 'text-sm font-bold' : 'text-base font-bold';
  return (
    <span className="inline-flex flex-wrap items-baseline gap-2">
      <span className={`${className} text-content`}>{money}</span>
      {onSale ? (
        <span className="text-sm text-muted line-through">{formatEGP(compareAtPrice!, lang)}</span>
      ) : null}
    </span>
  );
}
