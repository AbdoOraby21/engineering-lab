import { Minus, Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface QuantityStepperProps {
  value: number;
  onChange: (value: number) => void;
  max?: number;
  min?: number;
  small?: boolean;
}

export default function QuantityStepper({ value, onChange, max, min = 1, small = false }: QuantityStepperProps) {
  const { t } = useTranslation();
  const size = small ? 'h-8 w-8' : 'h-11 w-11';
  return (
    <div className="inline-flex items-center rounded-full border border-line bg-surface">
      <button
        type="button"
        aria-label={t('cart.decreaseQty')}
        className={`inline-flex items-center justify-center rounded-full text-muted transition hover:text-brand disabled:opacity-40 ${size}`}
        disabled={value <= min}
        onClick={() => onChange(Math.max(min, value - 1))}
      >
        <Minus className="h-4 w-4" />
      </button>
      <span className="min-w-8 text-center text-sm font-semibold text-content" aria-live="polite">
        {value}
      </span>
      <button
        type="button"
        aria-label={t('cart.increaseQty')}
        className={`inline-flex items-center justify-center rounded-full text-muted transition hover:text-brand disabled:opacity-40 ${size}`}
        disabled={typeof max === 'number' && value >= max}
        onClick={() => onChange(typeof max === 'number' ? Math.min(max, value + 1) : value + 1)}
      >
        <Plus className="h-4 w-4" />
      </button>
    </div>
  );
}
