import { useState } from 'react';
import { Pencil, Plus, Repeat, Trash2, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import { api, errMsg } from '../../api/client';
import { useFetch } from '../../components/useFetch';
import { DAY_KEYS, mealsInPlan, type MealPlan } from '../../components/MealPlans';
import type { MealSub } from '../customer/MySubscriptions';
import StatusBadge from '../../components/StatusBadge';
import { EmptyState, ErrorState, Field, Modal, PageHeader, PageLoader, Spinner, Tabs, Toggle, VegMark, cx } from '../../components/ui';
import { fmtDate, mealLabel, rupee } from '../../utils/format';
import type { MealType } from '../../types';

interface Data { plans: MealPlan[]; subscribers: { subscription: MealSub; mealToday: boolean; mealsLeft: number }[] }
const blank: Partial<MealPlan> = { name: '', description: '', mealSlot: 'LUNCH', veg: true, durationDays: 30, deliveryDays: 'MON,TUE,WED,THU,FRI,SAT', price: 0, active: true };

/** Kitchen: create weekly / monthly meal plans and see subscribers (with today's delivery list). */
export default function MealPlansPage() {
  const { data, loading, error, reload } = useFetch<Data>('/kitchen/meal-plans');
  const [tab, setTab] = useState<'today' | 'plans' | 'subscribers'>('today');
  const [edit, setEdit] = useState<Partial<MealPlan> | null>(null);
  const [busy, setBusy] = useState(false);

  if (loading) return <PageLoader />;
  if (error || !data) return <ErrorState message={error ?? ''} onRetry={reload} />;
  const today = data.subscribers.filter((s) => s.mealToday);
  const activeSubs = data.subscribers.filter((s) => s.subscription.status === 'ACTIVE' || s.subscription.status === 'PAUSED');

  const save = async () => {
    if (!edit) return;
    setBusy(true);
    try {
      if (edit.id) await api.put(`/kitchen/meal-plans/${edit.id}`, edit); else await api.post('/kitchen/meal-plans', edit);
      toast.success('Plan saved'); setEdit(null); reload(true);
    } catch (e) { toast.error(errMsg(e)); } finally { setBusy(false); }
  };
  const remove = async (p: MealPlan) => {
    if (!window.confirm(`Delete plan "${p.name}"? Existing subscribers keep their meals.`)) return;
    try { await api.delete(`/kitchen/meal-plans/${p.id}`); reload(true); } catch (e) { toast.error(errMsg(e)); }
  };

  return (
    <div>
      <PageHeader title="Meal plans & subscribers" subtitle="Regular customers = steady income. Offer weekly or monthly meal plans."
        actions={<button className="btn-primary" onClick={() => setEdit({ ...blank })}><Plus className="h-4 w-4" />New plan</button>} />
      <Tabs value={tab} onChange={setTab} tabs={[
        { value: 'today', label: "Today's deliveries", count: today.length },
        { value: 'plans', label: 'My plans', count: data.plans.length },
        { value: 'subscribers', label: 'Subscribers', count: activeSubs.length },
      ]} />

      {tab === 'today' && (today.length === 0 ? <EmptyState icon={Users} title="No subscription meals today" text="Subscribers' meals for today will be listed here." /> : (
        <div className="grid gap-3 md:grid-cols-2">
          {today.map(({ subscription: s, mealsLeft }) => (
            <div key={s.id} className="card p-4">
              <div className="flex items-center gap-2"><VegMark veg={s.veg} /><p className="font-semibold">{s.customer?.fullName}</p><span className="ml-auto text-xs font-semibold text-saffron-600">{mealLabel[s.mealSlot]}</span></div>
              <p className="mt-1 text-sm text-charcoal-600">{s.planName}</p>
              <p className="mt-1 text-xs text-charcoal-500">{s.deliveryAddress}</p>
              <p className="mt-1 text-xs text-charcoal-400">{s.customer?.phone && <a className="text-brand-700" href={`tel:${s.customer.phone}`}>{s.customer.phone}</a>} · {mealsLeft} meals left</p>
            </div>
          ))}
        </div>
      ))}

      {tab === 'plans' && (data.plans.length === 0 ? <EmptyState icon={Repeat} title="No meal plans yet" text="Create a plan like 'Monthly lunch box - Rs.2,400 for 26 meals'." action={<button className="btn-primary" onClick={() => setEdit({ ...blank })}>Create a plan</button>} /> : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {data.plans.map((p) => (
            <div key={p.id} className={cx('card p-4', !p.active && 'opacity-60')}>
              <div className="flex items-center gap-2"><VegMark veg={p.veg} /><p className="font-semibold">{p.name}</p>{!p.active && <span className="ml-auto text-xs text-charcoal-400">Hidden</span>}</div>
              <p className="mt-1 text-xs text-charcoal-500">{mealLabel[p.mealSlot]} · {p.durationDays} days · {mealsInPlan(p)} meals</p>
              <p className="mt-2 text-xl font-bold">{rupee(p.price)} <span className="text-xs font-normal text-charcoal-400">({rupee(p.price / Math.max(1, mealsInPlan(p)))} / meal)</span></p>
              <div className="mt-3 flex gap-2">
                <button className="btn-outline flex-1 py-1.5 text-xs" onClick={() => setEdit(p)}><Pencil className="h-3.5 w-3.5" />Edit</button>
                <button className="btn-ghost py-1.5 text-xs text-red-600" onClick={() => remove(p)}><Trash2 className="h-3.5 w-3.5" /></button>
              </div>
            </div>
          ))}
        </div>
      ))}

      {tab === 'subscribers' && (data.subscribers.length === 0 ? <EmptyState icon={Users} title="No subscribers yet" text="Customers see your plans on your kitchen page." /> : (
        <div className="card divide-y divide-cream-200">
          {data.subscribers.map(({ subscription: s, mealsLeft }) => (
            <div key={s.id} className="flex flex-wrap items-center gap-3 p-4">
              <div className="min-w-0 flex-1"><p className="font-semibold">{s.customer?.fullName} <span className="text-sm font-normal text-charcoal-400">· {s.planName}</span></p>
                <p className="text-xs text-charcoal-500">{fmtDate(s.startDate)} → {fmtDate(s.endDate)} · {mealsLeft} meals left · {rupee(s.amount)}</p></div>
              <StatusBadge status={s.status} />
            </div>
          ))}
        </div>
      ))}

      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit?.id ? 'Edit meal plan' : 'New meal plan'}>
        {edit && (
          <div className="space-y-4">
            <Field label="Plan name"><input className="input" value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} placeholder="Monthly lunch box" /></Field>
            <Field label="What's included"><textarea className="input min-h-[70px]" value={edit.description ?? ''} onChange={(e) => setEdit({ ...edit, description: e.target.value })} placeholder="Rice, sambar, rasam, poriyal, curd - menu changes daily" /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Meal"><select className="input" value={edit.mealSlot} onChange={(e) => setEdit({ ...edit, mealSlot: e.target.value as MealType })}>{(['BREAKFAST', 'LUNCH', 'SNACKS', 'DINNER'] as MealType[]).map((m) => <option key={m} value={m}>{mealLabel[m]}</option>)}</select></Field>
              <Field label="Length"><select className="input" value={edit.durationDays} onChange={(e) => setEdit({ ...edit, durationDays: Number(e.target.value) })}>{[7, 15, 30].map((d) => <option key={d} value={d}>{d} days</option>)}</select></Field>
            </div>
            <Field label="Delivery days">
              <div className="flex flex-wrap gap-2">{DAY_KEYS.map((d) => {
                const on = (edit.deliveryDays ?? '').split(',').includes(d);
                return <button key={d} type="button" className={cx('chip w-12 justify-center', on && 'chip-active')}
                  onClick={() => { const cur = (edit.deliveryDays ?? '').split(',').filter(Boolean); setEdit({ ...edit, deliveryDays: (on ? cur.filter((x) => x !== d) : [...cur, d]).sort((a, b) => DAY_KEYS.indexOf(a) - DAY_KEYS.indexOf(b)).join(',') }); }}>{d.slice(0, 2)}</button>;
              })}</div>
            </Field>
            <Field label={`Total price for the plan${edit.durationDays && edit.deliveryDays ? ` (${mealsInPlan(edit as MealPlan)} meals)` : ''}`}>
              <input className="input" type="number" min={100} value={edit.price || ''} onChange={(e) => setEdit({ ...edit, price: Number(e.target.value) })} placeholder="2400" />
            </Field>
            <div className="flex flex-wrap gap-4">
              <Toggle checked={!!edit.veg} onChange={(v) => setEdit({ ...edit, veg: v })} label="Pure veg" />
              <Toggle checked={edit.active !== false} onChange={(v) => setEdit({ ...edit, active: v })} label="Visible to customers" />
            </div>
            <button className="btn-primary w-full" onClick={save} disabled={busy}>{busy && <Spinner className="h-4 w-4 text-white" />}Save plan</button>
          </div>
        )}
      </Modal>
    </div>
  );
}
