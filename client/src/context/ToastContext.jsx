import { CircleAlert, CircleCheck, Info, X } from 'lucide-react';
import { createContext, useCallback, useContext, useMemo, useState } from 'react';

const ToastContext = createContext(null);

const TONES = {
  success: { style: 'border-emerald-200 bg-white/95 text-ink', icon: CircleCheck, iconColor: 'text-emerald-500' },
  error: { style: 'border-red-200 bg-white/95 text-ink', icon: CircleAlert, iconColor: 'text-danger' },
  info: { style: 'border-rule bg-white/95 text-ink', icon: Info, iconColor: 'text-brand-600' },
};

/** Small notifications in the corner, e.g. "Contact saved". An optional action adds a button (Undo). */
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => setToasts((list) => list.filter((toast) => toast.id !== id)), []);

  const show = useCallback(
    (message, tone = 'info', action) => {
      const id = crypto.randomUUID();
      setToasts((list) => [...list.slice(-3), { id, message, tone, action }]);
      setTimeout(() => dismiss(id), action ? 7000 : 4000);
    },
    [dismiss],
  );

  const value = useMemo(
    () => ({
      success: (message, action) => show(message, 'success', action),
      error: (messageOrError) => show(messageOrError?.message ?? String(messageOrError), 'error'),
      info: (message, action) => show(message, 'info', action),
    }),
    [show],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed right-4 bottom-4 z-50 flex w-80 flex-col gap-2" role="status" aria-live="polite">
        {toasts.map((toast) => {
          const { style, icon: Icon, iconColor } = TONES[toast.tone];
          return (
          <div key={toast.id} className={`flex animate-pop items-center gap-3 rounded-xl border px-4 py-3 text-sm font-medium shadow-[0_16px_40px_-12px_rgb(24_35_61/0.35)] backdrop-blur ${style}`}>
            <Icon size={18} className={`shrink-0 ${iconColor}`} />
            <span className="flex-1">{toast.message}</span>
            {toast.action && (
              <button
                type="button"
                className="rounded-lg bg-brand-50 px-2 py-1 font-bold text-brand-700 hover:bg-brand-100"
                onClick={() => {
                  toast.action.onClick();
                  dismiss(toast.id);
                }}
              >
                {toast.action.label}
              </button>
            )}
            <button type="button" className="text-faint hover:text-ink" onClick={() => dismiss(toast.id)} aria-label="Dismiss">
              <X size={16} />
            </button>
          </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used inside <ToastProvider>');
  return context;
}
