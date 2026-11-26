import { BadgePercent, Check, Tag } from 'lucide-react';
import { useFetch } from './useFetch';
import type { Offer } from '../types';
import { cx } from './ui';
import { rupee } from '../utils/format';

export function useOffers() { return useFetch<Offer[]>('/public/offers'); }

/** Discount an offer gives on a food total (same rule as the backend). */
export function offerSaving(o: Offer, food: number) {
  if (o.minOrder && food < o.minOrder) return 0;
  const d = Math.round(food * o.discountPercent) / 100;
  return o.maxDiscount != null ? Math.min(d, o.maxDiscount) : d;
}

export const offerTitle = (o: Offer) => `${o.discountPercent}% OFF${o.maxDiscount ? ` up to ${rupee(o.maxDiscount)}` : ''}`;

/** Horizontal strip of live offers for the home / kitchen pages. */
export function OffersStrip({ className = '' }: { className?: string }) {
  const { data } = useOffers();
  if (!data?.length) return null;
  return (
    <div className={cx('flex gap-3 overflow-x-auto pb-1', className)}>
      {data.map((o) => (
        <div key={o.id} className="flex min-w-[240px] items-center gap-3 rounded-2xl border border-dashed border-saffron-300 bg-gradient-to-r from-saffron-50 to-white p-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-saffron-500 text-white"><BadgePercent className="h-6 w-6" /></span>
          <div className="min-w-0">
            <p className="text-sm font-bold text-charcoal-900">{offerTitle(o)}</p>
            <p className="truncate text-xs text-charcoal-500">{o.description || `On orders above ${rupee(o.minOrder ?? 0)}`}</p>
            <p className="mt-0.5 text-[11px] font-semibold text-saffron-700">Code {o.code}{o.minOrder ? ` · min ${rupee(o.minOrder)}` : ''} · auto-applied</p>
          </div>
        </div>
      ))}
    </div>
  );
}

/** Offer list in the cart: shows what each coupon saves on this cart and lets the customer switch. */
export function CartOffers({ food, applied, onApply }: { food: number; applied?: string | null; onApply: (code: string) => void }) {
  const { data } = useOffers();
  if (!data?.length) return null;
  const sorted = [...data].sort((a, b) => offerSaving(b, food) - offerSaving(a, food));
  return (
    <div className="space-y-2">
      <p className="label flex items-center gap-1.5"><Tag className="h-3.5 w-3.5" />Available offers</p>
      {sorted.map((o) => {
        const save = offerSaving(o, food);
        const short = o.minOrder && food < o.minOrder ? o.minOrder - food : 0;
        const isApplied = applied?.toUpperCase() === o.code.toUpperCase();
        return (
          <div key={o.id} className={cx('flex items-center gap-3 rounded-xl border p-2.5', isApplied ? 'border-brand-400 bg-brand-50' : 'border-cream-300')}>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold">{o.code} · {offerTitle(o)}</p>
              <p className={cx('text-[11px]', short ? 'text-charcoal-400' : 'text-brand-700')}>
                {short ? `Add ${rupee(Math.ceil(short))} more to unlock` : `You save ${rupee(save, 2)}`}
              </p>
            </div>
            {isApplied ? <span className="inline-flex items-center gap-1 text-xs font-semibold text-brand-700"><Check className="h-3.5 w-3.5" />Applied</span>
              : <button className="btn-outline px-3 py-1 text-xs" disabled={!!short} onClick={() => onApply(o.code)}>Apply</button>}
          </div>
        );
      })}
    </div>
  );
}
