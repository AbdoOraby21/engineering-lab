import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  titleKey?: string;
  bodyKey?: string;
  confirmKey?: string;
  cancelKey?: string;
  destructive?: boolean;
  children?: ReactNode;
}

export default function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  titleKey = 'admin.confirm',
  bodyKey = 'admin.confirmBody',
  confirmKey = 'admin.confirm',
  cancelKey = 'admin.cancel',
  destructive = false,
  children,
}: ConfirmDialogProps) {
  const { t } = useTranslation();
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center"
      role="dialog"
      aria-modal="true"
    >
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className="relative w-full max-w-md mx-4 rounded-2xl border border-line bg-surface p-6 shadow-card"
      >
        <h2 className="text-lg font-bold text-content">{children ?? t(titleKey)}</h2>
        <p className="mt-2 text-sm text-muted">{t(bodyKey)}</p>
        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm font-medium text-muted transition hover:bg-surface2"
          >
            {t(cancelKey)}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition ${
              destructive
                ? 'text-white bg-red-600 hover:bg-red-700'
                : 'text-white bg-brand hover:bg-brand/90'
            }`}
          >
            {t(confirmKey)}
          </button>
        </div>
      </div>
    </div>
  );
}
