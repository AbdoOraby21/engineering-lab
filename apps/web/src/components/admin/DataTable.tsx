import { useMemo } from 'react';
import { ChevronDown, Download, Eye } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const PAGE_SIZES = [10, 25, 50, 100] as const;

interface Column<TData> {
  id: string;
  header: string | ((props: { column: Column<TData> }) => React.ReactNode);
  cell?: (props: { row: TData; value: unknown }) => React.ReactNode;
  sortable?: boolean;
  width?: string;
}

interface DataTableProps<TData> {
  columns: Column<TData>[];
  data: TData[];
  totalCount: number;
  pageCount: number;
  isLoading?: boolean;
  onPageChange: (page: number, pageSize: number) => void;
  onSortChange: (id: string, desc: boolean) => void;
  onFilterChange?: (filter: string) => void;
  pageIndex: number;
  pageSize: number;
  sortId: string | null;
  sortDesc: boolean;
  filter: string;
  getRowId: (row: TData) => string;
  showColumnVisibility?: boolean;
  exportFilename?: string;
  emptyMessageKey?: string;
}

export default function DataTable<TData>({
  columns,
  data,
  totalCount,
  pageCount,
  isLoading = false,
  onPageChange,
  onSortChange,
  pageIndex,
  pageSize,
  sortId,
  sortDesc,
  filter,
  getRowId,
  exportFilename,
  emptyMessageKey = 'admin.noResults',
}: DataTableProps<TData>) {
  const { t } = useTranslation();

  const sorted = useMemo(() => {
    if (!sortId) return data;
    return [...data].sort((a, b) => {
      const av = (a as Record<string, unknown>)[sortId];
      const bv = (b as Record<string, unknown>)[sortId];
      if (av == null && bv == null) return 0;
      if (av == null) return sortDesc ? 1 : -1;
      if (bv == null) return sortDesc ? -1 : 1;
      if (av < bv) return sortDesc ? 1 : -1;
      if (av > bv) return sortDesc ? -1 : 1;
      return 0;
    });
  }, [data, sortId, sortDesc]);

  const filtered = useMemo(() => {
    if (!filter) return sorted;
    const f = filter.toLowerCase();
    return sorted.filter((row) =>
      columns.some((c) => {
        const v = (row as Record<string, unknown>)[c.id];
        return v != null && String(v).toLowerCase().includes(f);
      }),
    );
  }, [sorted, filter, columns]);

  const paginated = useMemo(
    () => filtered.slice(pageIndex * pageSize, (pageIndex + 1) * pageSize),
    [filtered, pageIndex, pageSize],
  );

  const handleExport = () => {
    const headers = columns.map((c) => c.id);
    const rows = filtered.map((row) =>
      headers.map((id) => {
        const v = (row as Record<string, unknown>)[id];
        return v == null ? '' : String(v);
      }),
    );
    const csv = [
      headers.join(','),
      ...rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')),
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${exportFilename ?? 'export'}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="rounded-xl border border-line bg-surface overflow-hidden">
      <div className="border-b border-line/60 bg-surface/50 p-4 flex flex-wrap items-center justify-between gap-3 sm:justify-end sm:flex-nowrap">
        <div className="flex items-center gap-2">
          <Eye className="h-4 w-4 text-muted" />
          <span className="text-sm font-semibold text-content">{t('admin.orders')}</span>
        </div>
        {exportFilename && (
          <button
            type="button"
            onClick={handleExport}
            className="px-3 py-2 rounded-lg text-sm font-medium border border-line text-content transition hover:bg-surface2"
          >
            <Download className="h-3.5 w-3.5 mr-1.5" /> {t('admin.export')}
          </button>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr>
              {columns.map((col) => (
                <th
                  key={col.id}
                  className="h-12 px-3 text-left text-xs font-semibold text-muted uppercase tracking-wider select-none"
                  onClick={col.sortable ? () => onSortChange(col.id, sortId === col.id ? !sortDesc : false) : undefined}
                  style={{ cursor: col.sortable ? 'pointer' : 'default' }}
                >
                  <div className="flex items-center gap-1.5">
                    {typeof col.header === 'function' ? col.header({ column: col }) : col.header}
                    {sortId === col.id ? (
                      <ChevronDown className={`h-3.5 w-3.5 text-muted ${sortDesc ? 'rotate-180' : ''}`} />
                    ) : null}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginated.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="h-32 text-center text-muted">
                  {t(emptyMessageKey)}
                </td>
              </tr>
            ) : (
              paginated.map((row) => (
                <tr key={getRowId(row)} className="border-b border-line/50 hover:bg-surface/30 transition">
                  {columns.map((col) => (
                    <td key={col.id} className="px-3 py-4 text-content align-middle select-none">
                      {col.cell
                        ? col.cell({
                            row,
                            value: (row as Record<string, unknown>)[col.id],
                          })
                        : String((row as Record<string, unknown>)[col.id] ?? '')}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="border-t border-line/60 bg-surface/40 p-3 flex items-center justify-between sm:flex-row gap-2">
        <div className="flex items-center gap-3 text-xs text-muted">
          <span>
            {Math.max(pageIndex * pageSize + 1, 0)}-{' '}
            {Math.min((pageIndex + 1) * pageSize, totalCount)} of {totalCount}
          </span>
          <select
            value={pageSize}
            onChange={(e) => onPageChange(0, Number(e.target.value))}
            className="text-xs rounded-lg border border-line bg-white px-2 py-1 text-muted outline-none"
          >
            {PAGE_SIZES.map((s) => (
              <option key={s} value={s}>
                {s} {t('common.page')}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={pageIndex === 0 || isLoading}
            onClick={() => onPageChange(Math.max(0, pageIndex - 1), pageSize)}
            className="px-3 py-2 rounded-lg text-sm font-medium border border-line text-content transition disabled:opacity-50 disabled:pointer-events-none"
          >
            {t('common.prev')}
          </button>
          <button
            type="button"
            disabled={pageIndex >= Math.max(pageCount - 1, 0) || isLoading}
            onClick={() => onPageChange(pageIndex + 1, pageSize)}
            className="px-3 py-2 rounded-lg text-sm font-medium border border-line text-content transition disabled:opacity-50 disabled:pointer-events-none"
          >
            {t('common.next')}
          </button>
        </div>
      </div>
    </div>
  );
}
