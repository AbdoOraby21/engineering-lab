import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { GitCompareArrows, X } from 'lucide-react';
import { useCompareStore } from '../../stores/compare.store';
import { getCurrentLang, localizedName } from '../../lib/localized';

export default function CompareTray() {
  const { t } = useTranslation();
  const { lang } = useParams<{ lang: string }>();
  const currentLang = getCurrentLang(lang);
  const items = useCompareStore((state) => state.items);
  const remove = useCompareStore((state) => state.remove);
  const clear = useCompareStore((state) => state.clear);

  if (items.length === 0) return null;

  return (
    <div className="fixed inset-x-3 bottom-3 z-40 rounded-2xl border border-line bg-surface/95 p-3 shadow-card backdrop-blur sm:inset-x-6 lg:inset-x-auto lg:end-6 lg:w-[30rem]" role="region" aria-label={t('compare.title')}>
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {items.map((product) => (
          <div key={product.id} className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-surface2">
            {product.primaryImage ? (
              <img src={product.primaryImage.url} alt={localizedName(product, currentLang)} loading="lazy" className="h-full w-full object-cover" />
            ) : null}
            <button
              type="button"
              onClick={() => remove(product.id)}
              aria-label={`${t('cart.remove')} ${localizedName(product, currentLang)}`}
              className="absolute end-0.5 top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-black/70 text-white"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}
        {items.length < 4 ? <span className="h-16 w-16 shrink-0 rounded-xl border border-dashed border-line" aria-hidden="true" /> : null}
        <Link to={`/${currentLang}/compare`} className="btn-primary ml-auto shrink-0 px-3 py-2 text-xs">
          <GitCompareArrows className="h-3.5 w-3.5" />
          {t('compare.compare')} ({items.length}/4)
        </Link>
        <button type="button" onClick={clear} className="btn-ghost shrink-0 px-3 py-2 text-xs">
          {t('common.clear')}
        </button>
      </div>
    </div>
  );
}
