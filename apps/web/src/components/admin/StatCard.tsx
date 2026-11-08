import { useTranslation } from 'react-i18next';
import { formatEGP } from '../../lib/format';
import { TrendingUp, Clock, ShieldAlert, Users, ArrowUpRight } from 'lucide-react';

const ICONS: Record<string, React.ReactNode> = {
  revenue: <TrendingUp className="h-5 w-5" />,
  orders: <ShoppingCartIcon className="h-5 w-5" />,
  aov: <ArrowUpRight className="h-5 w-5" />,
  customers: <Users className="h-5 w-5" />,
  proofs: <Clock className="h-5 w-5" />,
  lowstock: <ShieldAlert className="h-5 w-5" />,
  tickets: <Users className="h-5 w-5" />,
  messages: <Clock className="h-5 w-5" />,
};

function ShoppingCartIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
    >
      <path
        fillRule="evenodd"
        d="M3 1a1 1 0 001 1h2v2a1 1 0 001 1h8a1 1 0 001-1V2h1a1 1 0 011 1v2a1 1 0 01-1.448.894L13.392 4H4.608l-1.214 2.428A1 1 0 003 7.414V9a1 1 0 001 1h4a1 1 0 011 1v3a1 1 0 01-1 1H4a1 1 0 01-1-1V2a1 1 0 011-1z"
        clipRule="evenodd"
      />
    </svg>
  );
}

interface StatCardProps {
  cardKey: string;
  labelKey: string;
  value: number | string;
  currency?: boolean;
  prominent?: boolean;
}

export default function StatCard({
  cardKey,
  labelKey,
  value,
  currency = false,
  prominent = false,
}: StatCardProps) {
  const { t } = useTranslation();
  const label = t(labelKey);
  const displayValue =
    typeof value === 'number' && currency ? formatEGP(value, 'en') : String(value);
  const icon = ICONS[cardKey] ?? <Clock className="h-5 w-5" />;

  return (
    <div
      className={`rounded-2xl border border-line p-5 ${
        prominent ? 'border-brand bg-brand/5' : 'bg-surface/40'
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 p-2 rounded-xl bg-surface2 text-muted">
          {icon}
        </div>
      </div>
      <div className="mt-3 flex items-baseline gap-1">
        <span className="text-2xl font-bold text-content">{displayValue}</span>
        {currency && <span className="text-muted text-xs">EGP</span>}
      </div>
      <p className="mt-1 text-sm text-muted">{label}</p>
    </div>
  );
}
