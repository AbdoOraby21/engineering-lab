import { useTranslation } from 'react-i18next';

type StatusVariant =
  | 'PENDING_PAYMENT'
  | 'PENDING_PAYMENT_REVIEW'
  | 'CONFIRMED'
  | 'PROCESSING'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'EXPIRED'
  | 'RETURN_REQUESTED'
  | 'RETURNED'
  | 'REFUNDED'
  | 'SUBMITTED'
  | 'APPROVED'
  | 'REJECTED'
  | 'REQUESTED'
  | 'RECEIVED';

const VARIANT_CLASSES: Record<StatusVariant, string> = {
  PENDING_PAYMENT: 'text-amber-700 bg-amber-50 border-amber-100',
  PENDING_PAYMENT_REVIEW: 'text-amber-700 bg-amber-50 border-amber-100',
  CONFIRMED: 'text-brand bg-brand/10 border-brand/20',
  PROCESSING: 'text-blue-700 bg-blue-50 border-blue-100',
  SHIPPED: 'text-blue-700 bg-blue-50 border-blue-100',
  DELIVERED: 'text-green-700 bg-green-50 border-green-100',
  CANCELLED: 'text-red-700 bg-red-50 border-red-100',
  EXPIRED: 'text-red-700 bg-red-50 border-red-100',
  RETURN_REQUESTED: 'text-purple-700 bg-purple-50 border-purple-100',
  RETURNED: 'text-purple-700 bg-purple-50 border-purple-100',
  REFUNDED: 'text-purple-700 bg-purple-50 border-purple-100',
  SUBMITTED: 'text-amber-700 bg-amber-50 border-amber-100',
  APPROVED: 'text-brand bg-brand/10 border-brand/20',
  REJECTED: 'text-red-700 bg-red-50 border-red-100',
  REQUESTED: 'text-amber-700 bg-amber-50 border-amber-100',
  RECEIVED: 'text-blue-700 bg-blue-50 border-blue-100',
};

const LABEL_KEYS: Record<StatusVariant, string> = {
  PENDING_PAYMENT: 'admin.statusPendingPayment',
  PENDING_PAYMENT_REVIEW: 'admin.statusPendingReview',
  CONFIRMED: 'admin.statusConfirmed',
  PROCESSING: 'admin.statusProcessing',
  SHIPPED: 'admin.statusShipped',
  DELIVERED: 'admin.statusDelivered',
  CANCELLED: 'admin.statusCancelled',
  EXPIRED: 'admin.statusExpired',
  RETURN_REQUESTED: 'admin.statusReturnRequested',
  RETURNED: 'admin.statusReturned',
  REFUNDED: 'admin.statusRefunded',
  SUBMITTED: 'admin.statusSubmitted',
  APPROVED: 'admin.statusApproved',
  REJECTED: 'admin.statusRejected',
  REQUESTED: 'admin.statusRequested',
  RECEIVED: 'admin.statusReceived',
};

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export default function StatusBadge({ status, className }: StatusBadgeProps) {
  const { t } = useTranslation();
  const variant = status as StatusVariant;
  const base = VARIANT_CLASSES[variant] ?? 'text-muted bg-surface2 border-line';
      const label = t(LABEL_KEYS[variant] ?? 'admin.statusUnknown') ?? status;
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${base} ${className ?? ''}`}
    >
      {label}
    </span>
  );
}
