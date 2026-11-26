import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlarmClock, CheckCircle2, ChefHat, Circle, Flame, Send, Sparkles } from 'lucide-react';
import DishSearch from '../../components/DishSearch';
import toast from 'react-hot-toast';
import { api, errMsg } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useLocationCtx } from '../../context/LocationContext';
import { useFetch } from '../../components/useFetch';
import type { PublicConfig } from '../../types';
import { Field, Spinner, VegMark, cx } from '../../components/ui';
import { addDaysISO, fmtTime, todayISO } from '../../utils/format';

const SPICE = ['Mild', 'Medium', 'Spicy', 'Extra spicy'];
const STYLES = ['Any', 'Kongu', 'Chettinad', 'Madurai', 'Kerala', 'Andhra', 'North Indian'];
const SLOTS = [
  { v: 'BREAKFAST', label: 'Breakfast', time: '08:30' }, { v: 'LUNCH', label: 'Lunch', time: '13:00' },
  { v: 'SNACKS', label: 'Evening snacks', time: '17:00' }, { v: 'DINNER', label: 'Dinner', time: '20:00' },
] as const;

/** Client-side mirror of the backend cutoff rule (backend is the source of truth). */
function cutoffMessage(date: string, slot: string, cfg?: PublicConfig | null) {
  if (date !== todayISO()) return null;
  const now = new Date();
  const hhmm = now.getHours() * 60 + now.getMinutes();
  const toMin = (s?: string) => { const [h, m] = (s || '11:00').split(':').map(Number); return h * 60 + m; };
  if (slot === 'BREAKFAST') return 'Breakfast requests must be placed by the previous day.';
  if (slot === 'LUNCH' && hhmm >= toMin(cfg?.customLunchCutoff)) return `Same-day custom lunch requests close at ${fmtTime(cfg?.customLunchCutoff ?? '11:00')}. Choose tomorrow, or order from a kitchen's available menu.`;
  if ((slot === 'DINNER' || slot === 'SNACKS') && hhmm >= toMin(cfg?.customDinnerCutoff)) return `Same-day ${slot.toLowerCase()} requests close at ${fmtTime(cfg?.customDinnerCutoff ?? '16:00')}.`;
  return null;
}

export default function CustomRequestPage() {
  const { user } = useAuth();
  const { location } = useLocationCtx();
  const nav = useNavigate();
  const { data: cfg } = useFetch<PublicConfig>('/public/config');
  const [busy, setBusy] = useState(false);
  const lunchPassed = cfg?.lunchCutoffPassed ?? new Date().getHours() >= 11;
  const [f, setF] = useState({
    dishName: '', quantity: '500 g', servings: 1, spiceLevel: 'Medium', veg: false, cuisineStyle: 'Any',
    requiredDate: '', mealSlot: 'LUNCH', preferredTime: '13:00', instructions: '', budget: '',
    deliveryAddress: user?.address ?? '',
  });
  // The saved address arrives after login loads - fill it in if the field is still empty.
  useEffect(() => { if (user?.address) setF((s) => (s.deliveryAddress ? s : { ...s, deliveryAddress: user.address! })); }, [user?.address]);
  const date = f.requiredDate || (lunchPassed ? addDaysISO(1) : todayISO());
  const blocked = useMemo(() => cutoffMessage(date, f.mealSlot, cfg), [date, f.mealSlot, cfg]);
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((s) => ({ ...s, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) { nav('/login?next=/request'); return; }
    if (user.role !== 'CUSTOMER') return toast.error('Please login with a customer account');
    if (blocked) return toast.error(blocked);
    if (!f.dishName.trim()) return toast.error('Tell us which dish you want');
    if (f.deliveryAddress.trim().length < 8) return toast.error('Enter the complete delivery address');
    setBusy(true);
    try {
      const { data } = await api.post('/customer/requests', {
        ...f, requiredDate: date, budget: f.budget ? Number(f.budget) : null, cuisineStyle: f.cuisineStyle === 'Any' ? null : f.cuisineStyle,
        preferredTime: f.preferredTime ? `${f.preferredTime}:00` : null,
        deliveryArea: location.label, latitude: location.lat, longitude: location.lng,
      });
      toast.success('Request sent to nearby home kitchens!');
      nav(`/my-requests/${data.id}`);
    } catch (err) { toast.error(errMsg(err)); } finally { setBusy(false); }
  };

  return (
    <div>
      <section className="relative overflow-hidden bg-brand-800">
        <img src="/images/pan-cooking.jpg" alt="" className="absolute inset-0 h-full w-full object-cover opacity-25" />
        <div className="container-x relative py-12 text-white">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold"><Sparkles className="h-3.5 w-3.5 text-saffron-300" />Request Your Homemade Food</span>
          <h1 className="mt-4 max-w-2xl font-display text-4xl font-semibold text-white">Your food, your way — cooked by a home chef near you</h1>
          <p className="mt-3 max-w-xl text-brand-50/85">Describe the dish. Verified kitchens within 5 km of {location.label} will send you their price and preparation time.</p>
        </div>
      </section>

      <div className="container-x -mt-6 grid gap-6 pb-10 lg:grid-cols-[1fr_340px]">
        <form onSubmit={submit} className="card relative space-y-6 p-6 sm:p-8">
          <div>
            <Field label="Which dish do you want? *">
              <DishSearch value={f.dishName} onChange={(v) => set('dishName', v)} onPick={(h) => setF((s) => ({ ...s, dishName: h.name, veg: h.veg }))} />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Quantity *"><input className="input" value={f.quantity} onChange={(e) => set('quantity', e.target.value)} placeholder="500 g / 2 plates" /></Field>
            <Field label="Serves (people)"><input className="input" type="number" min={1} max={30} value={f.servings} onChange={(e) => set('servings', Number(e.target.value))} /></Field>
            <Field label="Your budget (optional)"><input className="input" type="number" min={0} value={f.budget} onChange={(e) => set('budget', e.target.value)} placeholder="₹" /></Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Veg / Non-veg">
              <div className="flex gap-2">
                {[true, false].map((v) => (
                  <button type="button" key={String(v)} onClick={() => set('veg', v)} className={cx('chip flex-1 justify-center py-2.5', f.veg === v && 'chip-active')}>
                    <VegMark veg={v} />{v ? 'Veg' : 'Non-veg'}
                  </button>
                ))}
              </div>
            </Field>
            <Field label="Spice level">
              <div className="flex gap-1.5">{SPICE.map((s) => <button type="button" key={s} onClick={() => set('spiceLevel', s)} className={cx('chip flex-1 justify-center px-2 py-2.5 text-xs', f.spiceLevel === s && 'chip-active')}>{s === 'Extra spicy' ? <Flame className="h-3.5 w-3.5" /> : null}{s}</button>)}</div>
            </Field>
          </div>

          <Field label="Cooking style">
            <div className="flex flex-wrap gap-1.5">{STYLES.map((s) => <button type="button" key={s} onClick={() => set('cuisineStyle', s)} className={cx('chip py-1.5 text-sm', f.cuisineStyle === s && 'chip-active')}>{s}</button>)}</div>
          </Field>

          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Required date *"><input className="input" type="date" min={todayISO()} max={addDaysISO(7)} value={date} onChange={(e) => set('requiredDate', e.target.value)} /></Field>
            <Field label="Meal">
              <select className="input" value={f.mealSlot} onChange={(e) => { const s = SLOTS.find((x) => x.v === e.target.value)!; setF((p) => ({ ...p, mealSlot: s.v, preferredTime: s.time })); }}>
                {SLOTS.map((s) => <option key={s.v} value={s.v}>{s.label}</option>)}
              </select>
            </Field>
            <Field label="Preferred delivery time"><input className="input" type="time" value={f.preferredTime} onChange={(e) => set('preferredTime', e.target.value)} /></Field>
          </div>

          {blocked && <div className="flex gap-3 rounded-2xl bg-amber-50 p-4 text-sm text-amber-800"><AlarmClock className="h-5 w-5 shrink-0" /><div>{blocked} <Link to="/kitchens" className="font-semibold underline">See today's menus</Link></div></div>}

          <Field label="Special instructions"><textarea className="input min-h-[90px]" maxLength={1000} value={f.instructions} onChange={(e) => set('instructions', e.target.value)} placeholder="Less oil, bone-in pieces, add 2 chapatis, no coconut…" /></Field>
          <Field label={`Delivery address * · ${location.label}`} hint="Change the area from the location selector at the top.">
            <textarea className="input min-h-[70px]" value={f.deliveryAddress} onChange={(e) => set('deliveryAddress', e.target.value)} placeholder="Door no, street, landmark" />
          </Field>

          <button className="btn-accent w-full py-3.5 text-base" disabled={busy || !!blocked}>
            {busy ? <Spinner className="h-5 w-5 text-white" /> : <Send className="h-5 w-5" />}{user ? 'Send request to nearby kitchens' : 'Login to send request'}
          </button>
        </form>

        <aside className="space-y-4">
          <div className="card p-5 lg:sticky lg:top-24">
            <h3 className="font-semibold">Your request needs</h3>
            <ul className="mt-3 space-y-2 text-sm">
              {[
                { ok: f.dishName.trim().length >= 3, label: 'Dish name', hint: f.dishName.trim() || 'Search or type the dish' },
                { ok: f.quantity.trim().length > 0, label: 'Quantity', hint: f.quantity || 'e.g. 500 g / 2 plates' },
                { ok: !blocked, label: 'Date & meal', hint: blocked ? 'Too late for this slot - pick another date' : `${date} · ${SLOTS.find((s) => s.v === f.mealSlot)?.label}` },
                { ok: f.deliveryAddress.trim().length >= 8, label: 'Delivery address', hint: f.deliveryAddress.trim() ? 'Added' : 'Door no, street, landmark' },
                { ok: !!user, label: 'Login', hint: user ? user.fullName : 'Login to send the request' },
              ].map((c) => (
                <li key={c.label} className="flex gap-2">
                  {c.ok ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" /> : <Circle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />}
                  <span><span className={cx('font-medium', !c.ok && 'text-red-600')}>{c.label}</span><span className="block text-xs text-charcoal-500">{c.hint}</span></span>
                </li>
              ))}
            </ul>
          </div>
          <div className="card p-5">
            <h3 className="flex items-center gap-2 font-semibold"><ChefHat className="h-5 w-5 text-brand-600" />How it works</h3>
            <ol className="mt-4 space-y-3 text-sm">
              {['Submitted — nearby kitchens get notified', 'Kitchen offers — compare price & prep time', 'Select an offer & pay securely', 'Kitchen cooks fresh & delivers'].map((s, i) => (
                <li key={s} className="flex gap-3"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-50 text-xs font-bold text-brand-700">{i + 1}</span>{s}</li>
              ))}
            </ol>
          </div>
          <div className="card overflow-hidden">
            <img src="/images/chicken-gravy.jpg" alt="" className="h-40 w-full object-cover" />
            <div className="p-5 text-sm">
              <p className="flex items-center gap-2 font-semibold"><AlarmClock className="h-4 w-4 text-saffron-500" />11:00 AM lunch cutoff</p>
              <p className="mt-1 text-charcoal-500">Home chefs need time to shop and cook. Same-day custom lunch requests close at 11 AM; after that you can still order from today's available menus.</p>
            </div>
          </div>
          {user && <Link to="/my-requests" className="btn-outline w-full">View my requests</Link>}
        </aside>
      </div>
    </div>
  );
}
