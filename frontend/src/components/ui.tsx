import { useEffect, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2, X, Inbox, AlertTriangle, type LucideIcon } from 'lucide-react';

export function cx(...c: (string | false | null | undefined)[]) { return c.filter(Boolean).join(' '); }

export function Spinner({ className = '' }: { className?: string }) {
  return <Loader2 className={cx('animate-spin text-brand-600', className || 'h-5 w-5')} />;
}

export function PageLoader({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-charcoal-400">
      <Spinner className="h-8 w-8" />
      <span className="text-sm">{label}</span>
    </div>
  );
}

export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={cx('animate-pulse rounded-xl bg-cream-200', className)} />;
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="card flex flex-col items-center gap-3 p-10 text-center">
      <AlertTriangle className="h-10 w-10 text-saffron-500" />
      <p className="max-w-md text-sm text-charcoal-500">{message}</p>
      {onRetry && <button className="btn-outline" onClick={onRetry}>Try again</button>}
    </div>
  );
}

export function EmptyState({ icon: Icon = Inbox, title, text, action, image }:
  { icon?: LucideIcon; title: string; text?: string; action?: ReactNode; image?: string }) {
  return (
    <div className="card flex flex-col items-center gap-3 px-6 py-12 text-center">
      {image ? <img src={image} alt="" className="h-28 w-28 rounded-full object-cover ring-8 ring-cream-100" />
        : <div className="rounded-full bg-cream-100 p-4"><Icon className="h-8 w-8 text-charcoal-400" /></div>}
      <h3 className="text-lg font-semibold">{title}</h3>
      {text && <p className="max-w-md text-sm text-charcoal-500">{text}</p>}
      {action}
    </div>
  );
}

const badgeTones = {
  green: 'bg-brand-50 text-brand-700 ring-brand-200',
  orange: 'bg-saffron-50 text-saffron-700 ring-saffron-200',
  red: 'bg-red-50 text-red-700 ring-red-200',
  blue: 'bg-sky-50 text-sky-700 ring-sky-200',
  gray: 'bg-cream-100 text-charcoal-600 ring-cream-300',
  purple: 'bg-violet-50 text-violet-700 ring-violet-200',
  yellow: 'bg-amber-50 text-amber-700 ring-amber-200',
};
export type Tone = keyof typeof badgeTones;

export function Badge({ tone = 'gray', children, className = '', icon: Icon }:
  { tone?: Tone; children: ReactNode; className?: string; icon?: LucideIcon }) {
  return (
    <span className={cx('inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset', badgeTones[tone], className)}>
      {Icon && <Icon className="h-3 w-3" />}{children}
    </span>
  );
}

export function VegMark({ veg, className = '' }: { veg: boolean; className?: string }) {
  return (
    <span title={veg ? 'Vegetarian' : 'Non-vegetarian'}
      className={cx('inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-[3px] border-2 bg-white', veg ? 'border-green-600' : 'border-red-700', className)}>
      <span className={cx('h-1.5 w-1.5 rounded-full', veg ? 'bg-green-600' : 'bg-red-700')} />
    </span>
  );
}

export function Modal({ open, onClose, title, children, footer, size = 'md' }:
  { open: boolean; onClose: () => void; title?: ReactNode; children: ReactNode; footer?: ReactNode; size?: 'sm' | 'md' | 'lg' | 'xl' }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
  }, [open, onClose]);
  if (!open) return null;
  const w = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' }[size];
  return (
    <div className="fixed inset-0 z-[1000] flex items-end justify-center bg-charcoal-900/50 p-0 backdrop-blur-sm sm:items-center sm:p-4" onClick={onClose}>
      <div className={cx('animate-fade-up flex max-h-[92vh] w-full flex-col rounded-t-3xl bg-white shadow-lift sm:rounded-3xl', w)} onClick={(e) => e.stopPropagation()}>
        {title && (
          <div className="flex items-center justify-between border-b border-cream-200 px-6 py-4">
            <h3 className="text-lg font-semibold">{title}</h3>
            <button className="rounded-full p-1.5 text-charcoal-400 hover:bg-cream-100" onClick={onClose} aria-label="Close"><X className="h-5 w-5" /></button>
          </div>
        )}
        <div className="overflow-y-auto px-6 py-5">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-cream-200 px-6 py-4">{footer}</div>}
      </div>
    </div>
  );
}

export function ConfirmDialog({ open, onClose, onConfirm, title, message, confirmLabel = 'Confirm', tone = 'primary', busy, children }:
  { open: boolean; onClose: () => void; onConfirm: () => void; title: string; message?: ReactNode; confirmLabel?: string;
    tone?: 'primary' | 'danger'; busy?: boolean; children?: ReactNode }) {
  return (
    <Modal open={open} onClose={onClose} title={title} size="sm"
      footer={<>
        <button className="btn-ghost" onClick={onClose}>Cancel</button>
        <button className={tone === 'danger' ? 'btn-danger' : 'btn-primary'} onClick={onConfirm} disabled={busy}>
          {busy && <Spinner className="h-4 w-4 text-white" />}{confirmLabel}
        </button>
      </>}>
      {message && <p className="text-sm text-charcoal-600">{message}</p>}
      {children}
    </Modal>
  );
}

export function StatCard({ label, value, icon: Icon, tone = 'green', hint, trend }:
  { label: string; value: ReactNode; icon: LucideIcon; tone?: 'green' | 'orange' | 'blue' | 'purple' | 'red' | 'yellow'; hint?: ReactNode; trend?: ReactNode }) {
  const tones = {
    green: 'bg-brand-50 text-brand-600', orange: 'bg-saffron-50 text-saffron-600', blue: 'bg-sky-50 text-sky-600',
    purple: 'bg-violet-50 text-violet-600', red: 'bg-red-50 text-red-600', yellow: 'bg-amber-50 text-amber-600',
  };
  return (
    <div className="card animate-fade-up p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 overflow-hidden">
          <p className="text-xs font-semibold uppercase tracking-wide text-charcoal-400">{label}</p>
          <p className="mt-2 whitespace-nowrap text-xl font-bold text-charcoal-900 sm:text-2xl">{value}</p>
        </div>
        <div className={cx('rounded-xl p-2.5', tones[tone])}><Icon className="h-5 w-5" /></div>
      </div>
      {(hint || trend) && <div className="mt-3 flex items-center gap-2 text-xs text-charcoal-500">{trend}{hint}</div>}
    </div>
  );
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="font-display text-2xl font-semibold sm:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-charcoal-500">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Tabs<T extends string>({ tabs, value, onChange }:
  { tabs: { value: T; label: ReactNode; count?: number }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="scrollbar-none -mx-1 mb-5 flex gap-1 overflow-x-auto px-1">
      {tabs.map((t) => (
        <button key={t.value} onClick={() => onChange(t.value)}
          className={cx('chip whitespace-nowrap', value === t.value && 'chip-active')}>
          {t.label}
          {t.count != null && <span className={cx('rounded-full px-1.5 text-xs', value === t.value ? 'bg-white/20' : 'bg-cream-200')}>{t.count}</span>}
        </button>
      ))}
    </div>
  );
}

export function Toggle({ checked, onChange, label, disabled }: { checked: boolean; onChange: (v: boolean) => void; label?: ReactNode; disabled?: boolean }) {
  return (
    <label className={cx('inline-flex cursor-pointer select-none items-center gap-2.5', disabled && 'opacity-50')}>
      <button type="button" role="switch" aria-checked={checked} disabled={disabled} onClick={() => onChange(!checked)}
        className={cx('relative h-6 w-11 shrink-0 rounded-full transition', checked ? 'bg-brand-600' : 'bg-cream-300')}>
        <span className={cx('absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all', checked ? 'left-[22px]' : 'left-0.5')} />
      </button>
      {label && <span className="text-sm text-charcoal-700">{label}</span>}
    </label>
  );
}

export function Field({ label, children, hint, error, className = '' }:
  { label: string; children: ReactNode; hint?: ReactNode; error?: string; className?: string }) {
  return (
    <div className={className}>
      <label className="label">{label}</label>
      {children}
      {error ? <p className="mt-1 text-xs text-red-600">{error}</p> : hint ? <p className="mt-1 text-xs text-charcoal-400">{hint}</p> : null}
    </div>
  );
}

export function Stars({ value, size = 'h-4 w-4' }: { value: number; size?: string }) {
  return (
    <span className="inline-flex">
      {[1, 2, 3, 4, 5].map((i) => (
        <svg key={i} viewBox="0 0 20 20" className={cx(size, i <= Math.round(value) ? 'text-amber-400' : 'text-cream-300')} fill="currentColor">
          <path d="M10 1.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L10 14.9l-5.2 2.7 1-5.8L1.5 7.7l5.9-.9L10 1.5z" />
        </svg>
      ))}
    </span>
  );
}

export function Avatar({ name, src, size = 'h-9 w-9' }: { name?: string; src?: string; size?: string }) {
  const initials = (name || '?').split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();
  return src
    ? <img src={src} alt={name} className={cx(size, 'rounded-full object-cover')} />
    : <span className={cx(size, 'inline-flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-xs font-bold text-white')}>{initials}</span>;
}

/** In-app back arrow: goes to the previous page, or to `fallback` when the page was opened directly. */
export function BackButton({ fallback = '/', label = 'Back', className = '' }: { fallback?: string; label?: string; className?: string }) {
  const navigate = useNavigate();
  const go = () => {
    const idx = (window.history.state as { idx?: number } | null)?.idx ?? 0;
    if (idx > 0) navigate(-1); else navigate(fallback);
  };
  return (
    <button type="button" onClick={go} aria-label={label}
      className={cx('inline-flex items-center gap-1.5 rounded-xl px-2 py-1.5 text-sm font-semibold text-charcoal-600 transition hover:bg-cream-200 hover:text-charcoal-900', className)}>
      <ArrowLeft className="h-4 w-4" /><span className="hidden sm:inline">{label}</span>
    </button>
  );
}
