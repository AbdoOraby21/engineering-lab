import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';
import { useUiStore } from '../../stores/ui.store';

const icons = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info,
};

const styles = {
  success: 'border-brand/40 text-brand',
  error: 'border-red-500/40 text-red-400',
  info: 'border-sky-500/40 text-sky-400',
};

export default function Toaster() {
  const toasts = useUiStore((state) => state.toasts);
  const removeToast = useUiStore((state) => state.removeToast);

  if (toasts.length === 0) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed bottom-4 end-4 z-[100] flex w-[min(92vw,360px)] flex-col gap-2">
      {toasts.map((toast) => {
        const Icon = icons[toast.type];
        return (
          <div
            key={toast.id}
            role="status"
            className={`pointer-events-auto flex animate-toast-in items-start gap-3 rounded-2xl border bg-surface p-3.5 shadow-card ${styles[toast.type]}`}
          >
            <Icon className="mt-0.5 h-5 w-5 shrink-0" />
            <p className="flex-1 text-sm text-content">{toast.message}</p>
            <button
              type="button"
              onClick={() => removeToast(toast.id)}
              className="rounded-full p-1 text-muted transition hover:text-content"
              aria-label="Close notification"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
