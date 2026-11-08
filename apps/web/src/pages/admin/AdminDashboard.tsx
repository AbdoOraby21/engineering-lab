import { useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import Card from '../../components/ui/Card';
import StatCard from '../../components/admin/StatCard';
import StatusBadge from '../../components/admin/StatusBadge';
import { getStatsOverview } from '../../lib/adminApi';
import { formatEGP } from '../../lib/format';
import { getCurrentLang } from '../../lib/localized';

interface AdminStats {
  totalOrders: number;
  revenue: number;
  averageOrderValue: number;
  newCustomers: number;
  pendingProofs: number;
  lowStock: number;
  openTickets: number;
  newContacts: number;
  ordersByStatus: { status: string; count: number }[];
  recentOrders: { id: string; orderNumber: string; contactName: string; status: string; total: number; createdAt: string }[];
}

const CARD_META = [
  { cardKey: 'revenue', labelKey: 'admin.revenue', currency: true },
  { cardKey: 'orders', labelKey: 'admin.orders', currency: false },
  { cardKey: 'aov', labelKey: 'admin.averageOrderValue', currency: true },
  { cardKey: 'customers', labelKey: 'admin.newCustomer', currency: false },
  { cardKey: 'proofs', labelKey: 'admin.pendingProofs', currency: false },
  { cardKey: 'lowstock', labelKey: 'admin.lowStock', currency: false },
  { cardKey: 'tickets', labelKey: 'admin.openTickets', currency: false },
  { cardKey: 'messages', labelKey: 'admin.newMessages', currency: false },
] as const;

export default function AdminDashboard() {
  const { t } = useTranslation();
  const { lang } = useParams<{ lang: string }>();
  const currentLang = getCurrentLang(lang);
  const [range, setRange] = useState<'7d' | '30d' | 'm'>('30d');

  const to = new Date();
  const from = useMemo(() => {
    const d = new Date();
    if (range === '7d') d.setDate(d.getDate() - 7);
    else if (range === '30d') d.setDate(d.getDate() - 30);
    else d.setDate(1);
    return d;
  }, [range]);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-stats', range],
    queryFn: () => getStatsOverview(from.toISOString(), to.toISOString()),
    refetchInterval: 30_000,
  });

  const stats = (data?.data.stats ?? {}) as AdminStats;
  const ordersByStatus = stats.ordersByStatus;

  const statValues: Record<string, number | string> = {
    revenue: stats.revenue ?? 0,
    orders: stats.totalOrders ?? 0,
    aov: stats.averageOrderValue ?? 0,
    customers: stats.newCustomers ?? 0,
    proofs: stats.pendingProofs ?? 0,
    lowstock: stats.lowStock ?? 0,
    tickets: stats.openTickets ?? 0,
    messages: stats.newContacts ?? 0,
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-content">{t('admin.title')}</h1>
          <p className="text-sm text-muted">{t('admin.overview')}</p>
        </div>
        <div className="flex items-center gap-2 border border-line rounded-xl px-3 py-2">
          {(['7d', '30d', 'm'] as const).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRange(r)}
              className={`px-3 py-1 text-xs rounded-md transition ${
                range === r ? 'bg-brand text-white' : 'text-muted hover:bg-surface2'
              }`}
            >
              {r === '7d' ? '7 days' : r === '30d' ? '30 days' : 'This month'}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-4">
        {CARD_META.map((card) => (
          <StatCard
            cardKey={card.cardKey}
            labelKey={card.labelKey}
            value={statValues[card.cardKey] ?? 0}
            currency={card.currency}
            prominent={card.cardKey === 'proofs'}
          />
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title={t('admin.latestOrders')} isLoading={isLoading}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line/50 bg-surface/30 text-xs">
                  <th className="px-4 py-3 text-left text-muted">{t('admin.orderNumber')}</th>
                  <th className="px-4 py-3 text-left text-muted">{t('admin.customer')}</th>
                  <th className="px-4 py-3 text-left text-muted">{t('admin.status')}</th>
                  <th className="px-4 py-3 text-right text-muted">{t('admin.total')}</th>
                  <th className="px-4 py-3 text-right text-muted">{t('admin.date')}</th>
                </tr>
              </thead>
              <tbody>
                {(stats.recentOrders ?? []).map((o) => (
                  <tr key={o.id} className="border-b border-line/50 hover:bg-surface/30 transition">
                    <td className="px-4 py-3 font-semibold text-content dir-ltr">{o.orderNumber}</td>
                    <td className="px-4 py-3 text-muted">{o.contactName}</td>
                    <td className="px-4 py-3"><StatusBadge status={o.status} /></td>
                    <td className="px-4 py-3 text-muted dir-ltr">{formatEGP(o.total, currentLang)}</td>
                    <td className="px-4 py-3 text-muted dir-ltr">{new Date(o.createdAt).toLocaleDateString(currentLang)}</td>
                  </tr>
                ))}
                {(stats.recentOrders ?? []).length === 0 && (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-muted">{t('admin.noResults')}</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
        <Card title="Orders by status">
          <div className="space-y-3">
            {ordersByStatus.map((s) => (
              <div key={s.status} className="flex items-center justify-between py-2">
                <span className="text-sm text-muted">{s.status}</span>
                <StatusBadge status={s.status} />
                <span className="text-sm font-semibold dir-ltr">{s.count}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
