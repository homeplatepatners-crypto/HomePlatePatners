import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarCheck, Repeat } from 'lucide-react';
import toast from 'react-hot-toast';
import { api, errMsg } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useLocationCtx } from '../context/LocationContext';
import { useFetch } from './useFetch';
import { Field, Modal, Spinner, VegMark, cx } from './ui';
import { addDaysISO, mealLabel, rupee } from '../utils/format';
import type { MealType, PaymentMethod } from '../types';

export interface MealPlan {
  id: number; kitchenId: number; name: string; description?: string; mealSlot: MealType; veg: boolean;
  durationDays: number; deliveryDays: string; price: number; active: boolean;
}

export const DAY_KEYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

/** Number of delivery days in the plan length (same rule as the backend). */
export function mealsInPlan(p: Pick<MealPlan, 'durationDays' | 'deliveryDays'>, start = new Date()) {
  let n = 0;
  for (let i = 0; i < p.durationDays; i++) {
    const d = new Date(start); d.setDate(d.getDate() + i);
    if (p.deliveryDays.includes(DAY_KEYS[(d.getDay() + 6) % 7])) n++;
  }
  return n;
}

/** "Subscribe & save" section on a kitchen page: regular meals from a kitchen you like. */
export function KitchenMealPlans({ kitchenId, kitchenName, canDeliver }: { kitchenId: number; kitchenName: string; canDeliver: boolean }) {
  const { data } = useFetch<MealPlan[]>(`/public/kitchens/${kitchenId}/meal-plans`);
  const [chosen, setChosen] = useState<MealPlan | null>(null);
  if (!data?.length) return null;
  return (
    <section className="card overflow-hidden">
      <div className="flex items-center gap-3 bg-gradient-to-r from-brand-700 to-brand-600 p-5 text-white">
        <Repeat className="h-7 w-7" />
        <div><h2 className="font-display text-xl font-semibold">Subscribe for regular meals</h2>
          <p className="text-sm text-white/85">Love {kitchenName}'s food? Get it delivered every day - pay once, pause anytime.</p></div>
      </div>
      <div className="grid gap-3 p-5 sm:grid-cols-2">
        {data.map((p) => {
          const meals = mealsInPlan(p);
          return (
            <div key={p.id} className="flex flex-col rounded-2xl border border-cream-300 p-4">
              <div className="flex items-center gap-2"><VegMark veg={p.veg} /><p className="font-semibold">{p.name}</p></div>
              <p className="mt-1 text-xs text-charcoal-500">{mealLabel[p.mealSlot]} · {p.durationDays} days · {meals} meals · {p.deliveryDays.split(',').map((d) => d.slice(0, 2)).join(' ')}</p>
              {p.description && <p className="mt-2 line-clamp-3 text-sm text-charcoal-600">{p.description}</p>}
              <div className="mt-auto flex items-end justify-between pt-3">
                <div><p className="text-xl font-bold">{rupee(p.price)}</p><p className="text-xs text-brand-700">{rupee(p.price / Math.max(1, meals))} per meal</p></div>
                <button className="btn-primary py-2" disabled={!canDeliver} onClick={() => setChosen(p)}>Subscribe</button>
              </div>
            </div>
          );
        })}
      </div>
      {!canDeliver && <p className="px-5 pb-4 text-xs text-charcoal-400">This kitchen doesn't deliver to your current location.</p>}
      {chosen && <SubscribeModal plan={chosen} kitchenName={kitchenName} onClose={() => setChosen(null)} />}
    </section>
  );
}

function SubscribeModal({ plan, kitchenName, onClose }: { plan: MealPlan; kitchenName: string; onClose: () => void }) {
  const { user } = useAuth();
  const { location } = useLocationCtx();
  const nav = useNavigate();
  const [start, setStart] = useState(addDaysISO(1));
  const [address, setAddress] = useState(user?.address ?? '');
  const [notes, setNotes] = useState('');
  const [method, setMethod] = useState<PaymentMethod>('UPI');
  const [busy, setBusy] = useState(false);

  const subscribe = async () => {
    if (!user) return nav(`/login?next=${encodeURIComponent(window.location.pathname)}`);
    if (!address.trim()) return toast.error('Enter your delivery address');
    setBusy(true);
    try {
      await api.post('/customer/meal-subscriptions', {
        planId: plan.id, startDate: start, deliveryAddress: address, latitude: location.lat, longitude: location.lng, notes, paymentMethod: method,
      });
      toast.success(`Subscribed! ${kitchenName} starts delivering on ${start}.`);
      onClose(); nav('/subscriptions');
    } catch (e) { toast.error(errMsg(e)); } finally { setBusy(false); }
  };

  return (
    <Modal open onClose={onClose} title={`Subscribe - ${plan.name}`}>
      <div className="space-y-4">
        <div className="rounded-xl bg-cream-50 p-3 text-sm">
          <p className="font-semibold">{kitchenName}</p>
          <p className="text-xs text-charcoal-500">{mealLabel[plan.mealSlot]} · {plan.durationDays} days · {mealsInPlan(plan, new Date(start))} meals · {rupee(plan.price)}</p>
        </div>
        <Field label="Start date"><input className="input" type="date" min={addDaysISO(1)} max={addDaysISO(30)} value={start} onChange={(e) => setStart(e.target.value)} /></Field>
        <Field label={`Delivery address (${location.label})`}><textarea className="input min-h-[70px]" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Door no, building, landmark" /></Field>
        <Field label="Notes for the kitchen (optional)"><input className="input" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. less spicy, no onion" /></Field>
        <div>
          <p className="label">Pay with</p>
          <div className="grid grid-cols-3 gap-2">{(['UPI', 'CARD', 'NET_BANKING'] as PaymentMethod[]).map((m) => (
            <button key={m} type="button" onClick={() => setMethod(m)} className={cx('chip justify-center', method === m && 'chip-active')}>{m === 'NET_BANKING' ? 'Net banking' : m}</button>
          ))}</div>
          <p className="mt-1 text-[11px] text-charcoal-400">Test mode payment. Pause anytime - paused days are added to the end.</p>
        </div>
        <button className="btn-accent w-full py-3" disabled={busy} onClick={subscribe}>{busy ? <Spinner className="h-4 w-4 text-white" /> : <CalendarCheck className="h-4 w-4" />}{user ? `Pay ${rupee(plan.price)} & subscribe` : 'Login to subscribe'}</button>
      </div>
    </Modal>
  );
}
