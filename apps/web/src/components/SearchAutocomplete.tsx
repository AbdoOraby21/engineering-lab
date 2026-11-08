import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { History, Search, Tags, LayoutGrid, Package } from 'lucide-react';
import { fetchSuggestions } from '../lib/catalogApi';
import { formatEGP } from '../lib/format';
import { getCurrentLang, pick } from '../lib/localized';

const RECENT_KEY = 'el_recent_searches';

function loadRecent(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : [];
  } catch {
    return [];
  }
}

function saveRecent(term: string): void {
  try {
    const current = loadRecent().filter((item) => item !== term);
    localStorage.setItem(RECENT_KEY, JSON.stringify([term, ...current].slice(0, 8)));
  } catch {
    return;
  }
}

interface SearchAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (value: string) => void;
  autoFocus?: boolean;
  id?: string;
}

export default function SearchAutocomplete({ value, onChange, onSubmit, autoFocus = false, id = 'site-search' }: SearchAutocompleteProps) {
  const { t } = useTranslation();
  const { lang } = useParams<{ lang: string }>();
  const navigate = useNavigate();
  const currentLang = getCurrentLang(lang);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [recent, setRecent] = useState<string[]>(() => loadRecent());
  const containerRef = useRef<HTMLDivElement>(null);

  const query = value.trim();
  const suggestionsQuery = useQuery({
    queryKey: ['suggest', query, currentLang],
    queryFn: () => fetchSuggestions(query, 8),
    enabled: open && query.length >= 2,
    staleTime: 30_000,
  });

  useEffect(() => setActiveIndex(-1), [query]);

  useEffect(() => {
    const handler = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const navigable = (suggestionsQuery.data ?? []).map((item) => {
    const label = pick(item.nameAr, item.nameEn, currentLang);
    const href =
      item.kind === 'product'
        ? `/${currentLang}/products/${item.slug}`
        : item.kind === 'category'
          ? `/${currentLang}/catalog?category=${item.slug}`
          : `/${currentLang}/catalog?brand=${item.slug}`;
    return { ...item, label, href };
  });

  const categoriesAndBrands = navigable.filter((item) => item.kind !== 'product');
  const productsOnly = navigable.filter((item) => item.kind === 'product');

  function submit(term: string): void {
    const trimmed = term.trim();
    if (!trimmed) return;
    saveRecent(trimmed);
    setRecent(loadRecent());
    setOpen(false);
    onSubmit(trimmed);
  }

  function onKeyDown(event: React.KeyboardEvent) {
    if (event.key === 'ArrowDown' && navigable.length > 0) {
      event.preventDefault();
      setActiveIndex((index) => (index + 1) % navigable.length);
    } else if (event.key === 'ArrowUp' && navigable.length > 0) {
      event.preventDefault();
      setActiveIndex((index) => (index - 1 + navigable.length) % navigable.length);
    } else if (event.key === 'Enter' && activeIndex >= 0 && navigable[activeIndex]) {
      event.preventDefault();
      setOpen(false);
      navigate(navigable[activeIndex]!.href);
    } else if (event.key === 'Escape') {
      setOpen(false);
    }
  }

  return (
    <div ref={containerRef} className="relative w-full">
      <Search className="pointer-events-none absolute start-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
      <input
        id={id}
        type="search"
        role="combobox"
        aria-expanded={open}
        aria-controls={`${id}-listbox`}
        aria-activedescendant={activeIndex >= 0 ? `${id}-option-${activeIndex}` : undefined}
        autoComplete="off"
        value={value}
        autoFocus={autoFocus}
        onChange={(event) => {
          onChange(event.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        placeholder={t('header.searchPlaceholder')}
        aria-label={t('common.search')}
        className="w-full rounded-full border border-line bg-surface2 py-2.5 pe-4 ps-11 text-sm text-content placeholder:text-muted/70 transition focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
      />
      {open ? (
        <div className="absolute inset-x-0 top-full z-50 mt-2 max-h-[32rem] overflow-auto rounded-2xl border border-line bg-surface p-2 shadow-card">
          {query.length < 2 ? (
            recent.length > 0 ? (
              <div>
                <p className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted">
                  {t('search.recent')}
                </p>
                {recent.map((term) => (
                  <button
                    key={term}
                    type="button"
                    onClick={() => submit(term)}
                    className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-start text-sm text-content hover:bg-surface2"
                  >
                    <History className="h-4 w-4 shrink-0 text-muted" />
                    {term}
                  </button>
                ))}
              </div>
            ) : (
              <p className="px-3 py-6 text-center text-xs text-muted">{t('search.typeToSearch')}</p>
            )
          ) : suggestionsQuery.isLoading ? (
            <p className="px-3 py-6 text-center text-xs text-muted">{t('common.loading')}</p>
          ) : navigable.length === 0 ? (
            <div className="px-3 py-6 text-center">
              <p className="text-sm text-muted">{t('search.noResults')}</p>
              <button type="button" onClick={() => submit(query)} className="btn-primary mt-3 px-4 py-2">
                {t('search.viewResults')}
              </button>
            </div>
          ) : (
            <div id={`${id}-listbox`} role="listbox">
              {productsOnly.length > 0 ? (
                <div>
                  <p className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted">
                    {t('search.products')}
                  </p>
                  {productsOnly.map((item) => {
                    const navIndex = navigable.findIndex((entry) => entry.id === item.id && entry.kind === item.kind);
                    return (
                      <Link
                        key={`p-${item.id}`}
                        to={item.href}
                        id={`${id}-option-${navIndex}`}
                        role="option"
                        aria-selected={activeIndex === navIndex}
                        onClick={() => setOpen(false)}
                        className={`flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-surface2 ${activeIndex === navIndex ? 'bg-brand/10' : ''}`}
                      >
                        <span className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-lg bg-surface2 text-muted">
                          {item.imageUrl ? (
                            <img src={item.imageUrl} alt="" loading="lazy" className="h-full w-full object-cover" />
                          ) : (
                            <Package className="h-4 w-4" />
                          )}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium text-content">{item.label}</span>
                          {typeof item.price === 'number' ? (
                            <span className="block text-xs text-brand" dir="ltr">
                              {formatEGP(item.price, currentLang)}
                            </span>
                          ) : null}
                        </span>
                      </Link>
                    );
                  })}
                </div>
              ) : null}
              {categoriesAndBrands.length > 0 ? (
                <div className="mt-2 grid gap-1 border-t border-line pt-2 sm:grid-cols-2">
                  {categoriesAndBrands.map((item) => {
                    const navIndex = navigable.findIndex((entry) => entry.id === item.id && entry.kind === item.kind);
                    const Icon = item.kind === 'category' ? LayoutGrid : Tags;
                    return (
                      <Link
                        key={`${item.kind}-${item.id}`}
                        to={item.href}
                        id={`${id}-option-${navIndex}`}
                        role="option"
                        aria-selected={activeIndex === navIndex}
                        onClick={() => setOpen(false)}
                        className={`flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm text-content hover:bg-surface2 ${activeIndex === navIndex ? 'bg-brand/10' : ''}`}
                      >
                        <Icon className="h-4 w-4 text-brand" />
                        <span className="truncate">{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              ) : null}
              <button type="button" onClick={() => submit(query)} className="btn-secondary mt-2 w-full">
                {t('search.viewResults')}
              </button>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
