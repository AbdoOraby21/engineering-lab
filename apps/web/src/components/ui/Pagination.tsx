import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { PaginationMeta } from '@engineering-lab/shared';

interface PaginationProps {
  pagination: PaginationMeta;
  onPageChange: (page: number) => void;
}

function pageWindow(pagination: PaginationMeta): number[] {
  const { page, totalPages } = pagination;
  const start = Math.max(1, Math.min(page - 2, totalPages - 4));
  const end = Math.min(totalPages, start + 4);
  const pages: number[] = [];
  for (let value = start; value <= end; value += 1) {
    pages.push(value);
  }
  return pages;
}

export default function Pagination({ pagination, onPageChange }: PaginationProps) {
  const { t } = useTranslation();
  const isRtl = document.documentElement.dir === 'rtl';
  const PrevIcon = isRtl ? ChevronRight : ChevronLeft;
  const NextIcon = isRtl ? ChevronLeft : ChevronRight;

  if (pagination.totalPages <= 1) {
    return null;
  }

  return (
    <nav className="flex items-center justify-center gap-2 pt-8" aria-label="pagination">
      <button
        type="button"
        className="btn-ghost px-3 py-2"
        disabled={!pagination.hasPreviousPage}
        onClick={() => onPageChange(pagination.page - 1)}
      >
        <PrevIcon className="h-4 w-4" />
        {t('pagination.previous')}
      </button>

      {pageWindow(pagination).map((value) => (
        <button
          key={value}
          type="button"
          onClick={() => onPageChange(value)}
          aria-current={value === pagination.page ? 'page' : undefined}
          className={`h-10 w-10 rounded-full text-sm font-semibold transition ${
            value === pagination.page
              ? 'bg-brand text-brand-fg shadow-glow-sm'
              : 'border border-line bg-surface text-content hover:border-brand/50 hover:text-brand'
          }`}
        >
          {value}
        </button>
      ))}

      <button
        type="button"
        className="btn-ghost px-3 py-2"
        disabled={!pagination.hasNextPage}
        onClick={() => onPageChange(pagination.page + 1)}
      >
        {t('pagination.next')}
        <NextIcon className="h-4 w-4" />
      </button>
    </nav>
  );
}
