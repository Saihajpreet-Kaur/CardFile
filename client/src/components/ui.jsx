import { ChevronLeft, ChevronRight, Inbox, TriangleAlert, X } from 'lucide-react';
import { useEffect } from 'react';
import { useCountUp } from '../hooks/useCountUp';
import { initials } from '../utils/format';

export function Spinner({ label = 'Loading…' }) {
  return (
    <div className="flex items-center justify-center gap-3 py-14 text-sm font-medium text-muted" role="status">
      <span className="size-5 animate-spin rounded-full border-2 border-brand-100 border-t-brand-600" />
      {label}
    </div>
  );
}

/** Grey shimmering placeholder rows while a list loads. */
export function SkeletonRows({ rows = 5 }) {
  return (
    <div className="flex flex-col gap-3 p-4" aria-hidden>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-3">
          <div className="skeleton size-10 rounded-full" />
          <div className="flex-1 space-y-2">
            <div className="skeleton h-3 w-1/3" />
            <div className="skeleton h-3 w-1/5" />
          </div>
          <div className="skeleton hidden h-3 w-24 sm:block" />
        </div>
      ))}
    </div>
  );
}

export function EmptyState({ icon: Icon = Inbox, title, message, action }) {
  return (
    <div className="flex flex-col items-center gap-2 px-6 py-14 text-center">
      <div className="relative mb-2">
        <div className="absolute inset-0 animate-ping rounded-2xl bg-brand-200 opacity-30 [animation-duration:2.5s]" />
        <div className="relative flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-50 to-brand-100 text-brand-600 shadow-inner">
          <Icon size={26} strokeWidth={1.8} />
        </div>
      </div>
      <h3 className="text-base font-bold">{title}</h3>
      {message && <p className="max-w-sm text-sm text-muted">{message}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}

export function ErrorBanner({ error, onRetry }) {
  if (!error) return null;
  return (
    <div className="mb-4 flex animate-pop items-center gap-3 rounded-xl border border-red-200 bg-red-50/90 px-4 py-3 text-sm text-red-800 backdrop-blur" role="alert">
      <TriangleAlert size={18} className="shrink-0" />
      <span className="flex-1">{error.message ?? String(error)}</span>
      {onRetry && (
        <button type="button" className="btn btn-secondary py-1.5" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  );
}

/** Page title with an icon badge, a subtitle and action buttons. */
export function PageHeader({ icon: Icon, title, subtitle, actions }) {
  return (
    <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
      <div className="flex items-start gap-4">
        {Icon && (
          <span className="mt-1 hidden size-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-[0_10px_24px_-10px_rgb(47_91_211/0.8)] sm:flex">
            <Icon size={22} strokeWidth={2} />
          </span>
        )}
        <div>
          <h1 className="text-2xl font-extrabold tracking-[-0.03em] sm:text-[32px]">{title}</h1>
          {subtitle && <p className="mt-1 max-w-2xl text-sm text-muted">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

const AVATAR_COLORS = [
  'from-blue-100 to-blue-200 text-blue-800',
  'from-emerald-100 to-emerald-200 text-emerald-800',
  'from-amber-100 to-amber-200 text-amber-800',
  'from-violet-100 to-violet-200 text-violet-800',
  'from-rose-100 to-rose-200 text-rose-800',
];

export function Avatar({ contact, size = 'size-10', text = 'text-sm' }) {
  if (contact?.photoUrl) {
    return <img src={contact.photoUrl} alt="" className={`${size} shrink-0 rounded-full object-cover ring-2 ring-white`} />;
  }
  const seed = [...(contact?.firstName ?? '')].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return (
    <span className={`${size} inline-flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${text} font-bold ring-2 ring-white ${AVATAR_COLORS[seed % AVATAR_COLORS.length]}`}>
      {initials(contact)}
    </span>
  );
}

export function TagChips({ tags = [], onClick }) {
  if (tags.length === 0) return <span className="text-faint">—</span>;
  return (
    <div className="flex flex-wrap gap-1">
      {tags.map((tag) =>
        onClick ? (
          <button key={tag} type="button" className="chip hover:bg-brand-100" onClick={() => onClick(tag)}>
            #{tag}
          </button>
        ) : (
          <span key={tag} className="chip">
            #{tag}
          </span>
        ),
      )}
    </div>
  );
}

export function Pagination({ pagination, onPageChange }) {
  if (!pagination) return null;
  const { page, totalPages, total, limit } = pagination;
  const from = total === 0 ? 0 : (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-rule/70 px-4 py-3 text-sm">
      <span className="text-muted">
        Showing <b className="text-ink">{from}–{to}</b> of <b className="text-ink">{total}</b>
      </span>
      <div className="flex items-center gap-2">
        <button type="button" className="btn btn-secondary px-2.5" disabled={!pagination.hasPrevPage} onClick={() => onPageChange(page - 1)} aria-label="Previous page">
          <ChevronLeft size={16} />
        </button>
        <span className="min-w-20 text-center font-medium text-muted">
          {page} / {totalPages}
        </span>
        <button type="button" className="btn btn-secondary px-2.5" disabled={!pagination.hasNextPage} onClick={() => onPageChange(page + 1)} aria-label="Next page">
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}

export function ProgressBar({ value }) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-brand-50" role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={100}>
      <div className="h-full rounded-full bg-gradient-to-r from-brand-500 to-brand-700 transition-all duration-300" style={{ width: `${value}%` }} />
    </div>
  );
}

/** A dialog box. Escape or a click on the backdrop closes it. */
export function Modal({ title, onClose, children, wide = false }) {
  useEffect(() => {
    const onKey = (event) => event.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-40 flex items-start justify-center overflow-y-auto bg-navy/35 p-4 backdrop-blur-sm sm:p-10" onMouseDown={onClose}>
      <div
        className={`w-full ${wide ? 'max-w-2xl' : 'max-w-md'} animate-pop rounded-2xl border border-white/70 bg-white p-6 shadow-[0_30px_80px_-20px_rgb(24_35_61/0.5)]`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-extrabold tracking-tight">{title}</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function ConfirmDialog({ title, message, confirmLabel = 'Confirm', danger = false, busy = false, onConfirm, onClose }) {
  return (
    <Modal title={title} onClose={onClose}>
      <p className="text-sm text-muted">{message}</p>
      <div className="mt-6 flex justify-end gap-2">
        <button type="button" className="btn btn-secondary" onClick={onClose}>
          Cancel
        </button>
        <button type="button" className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`} disabled={busy} onClick={onConfirm}>
          {busy ? 'Please wait…' : confirmLabel}
        </button>
      </div>
    </Modal>
  );
}

const STAT_TONES = {
  blue: { badge: 'from-brand-500 to-brand-700', glow: 'bg-brand-500' },
  green: { badge: 'from-emerald-400 to-emerald-600', glow: 'bg-emerald-400' },
  red: { badge: 'from-rose-400 to-red-600', glow: 'bg-rose-400' },
  amber: { badge: 'from-amber-300 to-amber-500', glow: 'bg-amber-300' },
};

/** Dashboard number card: icon badge, count-up number and a coloured glow in the corner. */
export function StatCard({ icon: Icon, label, value, hint, tone = 'blue', hintTone = 'text-muted' }) {
  const shown = useCountUp(value);
  const colors = STAT_TONES[tone];
  return (
    <div className="card spot overflow-hidden p-5">
      <div className={`absolute -top-10 -right-10 size-28 rounded-full opacity-20 blur-2xl ${colors.glow}`} />
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-muted">{label}</p>
        {Icon && (
          <span className={`flex size-9 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-md ${colors.badge}`}>
            <Icon size={18} strokeWidth={2.2} />
          </span>
        )}
      </div>
      <p className="mt-3 text-4xl font-extrabold tracking-tight tabular-nums">{shown}</p>
      {hint && <p className={`mt-1 text-xs font-medium ${hintTone}`}>{hint}</p>}
    </div>
  );
}
