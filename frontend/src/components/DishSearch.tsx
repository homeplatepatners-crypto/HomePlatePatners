import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Search, ShoppingBag, XCircle } from 'lucide-react';
import { api } from '../api/client';
import { useLocationCtx } from '../context/LocationContext';
import { Spinner, VegMark, cx } from './ui';
import { rupee } from '../utils/format';

interface Hit { itemId: number; name: string; price: number; veg: boolean; imageUrl?: string; kitchenId: number; kitchenName: string; distanceKm?: number; reason?: string | null }
interface Result { query: string; available: Hit[]; unavailable: Hit[] }

const POPULAR = ['Chicken gravy', 'Mutton biryani', 'Chicken biryani', 'Sambar rice', 'Curd rice', 'Chapati', 'Parotta', 'Fish curry', 'Idli', 'Dosa', 'Dal khichdi', 'Veg meals'];

/**
 * Dish name input with live search: shows which nearby kitchens have the dish available today
 * (order straight away) and which have it but can't serve it now - so the customer knows when a custom request is needed.
 */
export default function DishSearch({ value, onChange, onPick }: { value: string; onChange: (v: string) => void; onPick?: (h: { name: string; veg: boolean }) => void }) {
  const { location } = useLocationCtx();
  const [res, setRes] = useState<Result | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const q = value.trim();
    if (q.length < 2) { setRes(null); return; }
    setBusy(true);
    const t = setTimeout(() => {
      api.get<Result>('/public/dishes/search', { params: { q, lat: location.lat, lng: location.lng } })
        .then(({ data }) => setRes(data)).catch(() => setRes(null)).finally(() => setBusy(false));
    }, 350);
    return () => clearTimeout(t);
  }, [value, location.lat, location.lng]);

  const noMatch = res && res.available.length === 0 && res.unavailable.length === 0;

  return (
    <div>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-charcoal-400" />
        <input className="input pl-11 text-base" value={value} onChange={(e) => onChange(e.target.value)} placeholder="Search a dish - e.g. chicken gravy, biryani, chapati" maxLength={120} autoComplete="off" />
        {busy && <Spinner className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2" />}
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {POPULAR.map((p) => <button type="button" key={p} onClick={() => onChange(p)} className={cx('chip py-1 text-xs', value.toLowerCase() === p.toLowerCase() && 'chip-active')}>{p}</button>)}
      </div>

      {res && (
        <div className="mt-3 space-y-3 rounded-2xl border border-cream-300 bg-cream-50 p-3">
          {res.available.length > 0 && (
            <div>
              <p className="mb-1.5 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-brand-700"><CheckCircle2 className="h-4 w-4" />Available today near you - order now, no waiting</p>
              <div className="space-y-1.5">
                {res.available.map((h) => (
                  <div key={h.itemId} className="flex items-center gap-3 rounded-xl bg-white p-2">
                    {h.imageUrl && <img src={h.imageUrl} alt="" className="h-10 w-10 rounded-lg object-cover" />}
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-1.5 truncate text-sm font-medium"><VegMark veg={h.veg} />{h.name}</p>
                      <p className="text-xs text-charcoal-500">{h.kitchenName}{h.distanceKm != null ? ` · ${h.distanceKm} km` : ''} · {rupee(h.price)}</p>
                    </div>
                    <Link to={`/kitchens/${h.kitchenId}`} className="btn-primary px-3 py-1.5 text-xs"><ShoppingBag className="h-3.5 w-3.5" />Order</Link>
                  </div>
                ))}
              </div>
            </div>
          )}
          {res.unavailable.length > 0 && (
            <div>
              <p className="mb-1.5 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-amber-700"><XCircle className="h-4 w-4" />On menus but not available now</p>
              <div className="space-y-1.5">
                {res.unavailable.map((h) => (
                  <button type="button" key={h.itemId} onClick={() => onPick?.({ name: h.name, veg: h.veg })} className="flex w-full items-center gap-3 rounded-xl bg-white p-2 text-left hover:ring-1 hover:ring-brand-300">
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-1.5 truncate text-sm font-medium"><VegMark veg={h.veg} />{h.name}</p>
                      <p className="text-xs text-charcoal-500">{h.kitchenName}{h.distanceKm != null ? ` · ${h.distanceKm} km` : ''}</p>
                    </div>
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800">{h.reason}</span>
                  </button>
                ))}
              </div>
              <p className="mt-1.5 text-xs text-charcoal-500">Tap one to request it - the kitchens will send you an offer.</p>
            </div>
          )}
          {noMatch && <p className="text-sm text-charcoal-600"><b>"{res.query}"</b> isn't on any nearby menu today - send a custom request below and home chefs will offer to cook it for you.</p>}
          {!noMatch && res.available.length === 0 && <p className="text-xs text-charcoal-500">Not available to order right now - send a custom request below.</p>}
        </div>
      )}
    </div>
  );
}
