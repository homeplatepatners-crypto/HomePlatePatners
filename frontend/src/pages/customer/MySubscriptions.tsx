import { Link } from 'react-router-dom';
import { CalendarCheck, Pause, Play, Repeat, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { api, errMsg } from '../../api/client';
import { useFetch } from '../../components/useFetch';
import StatusBadge from '../../components/StatusBadge';
import { EmptyState, ErrorState, PageHeader, PageLoader, VegMark } from '../../components/ui';
import { fmtDate, mealLabel, rupee } from '../../utils/format';
import type { Kitchen, MealType } from '../../types';

export interface MealSub {
  id: number; kitchen: Kitchen; planName: string; mealSlot: MealType; veg: boolean; deliveryDays: string;
  startDate: string; endDate: string; status: 'ACTIVE' | 'PAUSED' | 'CANCELLED' | 'COMPLETED'; amount: number;
  deliveryAddress: string; paymentReference?: string; customer?: { fullName: string; phone?: string };
}
interface Row { subscription: MealSub; mealsLeft: number; totalMeals: number }

/** Customer: regular meal subscriptions with pause / resume / cancel. */
export default function MySubscriptions() {
  const { data, loading, error, reload } = useFetch<Row[]>('/customer/meal-subscriptions');

  const act = async (id: number, action: 'pause' | 'resume' | 'cancel') => {
    if (action === 'cancel' && !window.confirm('Cancel this subscription? Remaining meals will not be delivered.')) return;
    try { await api.post(`/customer/meal-subscriptions/${id}/${action}`); toast.success(`Subscription ${action === 'pause' ? 'paused' : action === 'resume' ? 'resumed' : 'cancelled'}`); reload(true); }
    catch (e) { toast.error(errMsg(e)); }
  };

  return (
    <div className="container-x py-6">
      <PageHeader title="My meal subscriptions" subtitle="Regular homemade meals from kitchens you love" />
      {loading ? <PageLoader /> : error ? <ErrorState message={error} onRetry={reload} /> : !data?.length ? (
        <EmptyState icon={Repeat} title="No subscriptions yet" text="Open a kitchen you like and pick a weekly or monthly meal plan."
          action={<Link to="/kitchens" className="btn-primary">Find a kitchen</Link>} />
      ) : (
        <div className="space-y-3">
          {data.map(({ subscription: s, mealsLeft, totalMeals }) => (
            <div key={s.id} className="card flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
              <div className="hidden h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-brand-50 sm:flex"><CalendarCheck className="h-7 w-7 text-brand-600" /></div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2"><VegMark veg={s.veg} /><p className="font-semibold">{s.planName}</p><StatusBadge status={s.status} /></div>
                <p className="mt-1 text-sm text-charcoal-500"><Link to={`/kitchens/${s.kitchen.id}`} className="font-medium text-brand-700 hover:underline">{s.kitchen.name}</Link> · {mealLabel[s.mealSlot]} · {fmtDate(s.startDate)} → {fmtDate(s.endDate)}</p>
                <p className="mt-1 text-xs text-charcoal-400">{mealsLeft} of {totalMeals} meals left · {rupee(s.amount)} paid{s.paymentReference ? ` · ${s.paymentReference}` : ''}</p>
              </div>
              <div className="flex gap-2">
                {s.status === 'ACTIVE' && <button className="btn-outline py-2" onClick={() => act(s.id, 'pause')}><Pause className="h-4 w-4" />Pause</button>}
                {s.status === 'PAUSED' && <button className="btn-primary py-2" onClick={() => act(s.id, 'resume')}><Play className="h-4 w-4" />Resume</button>}
                {(s.status === 'ACTIVE' || s.status === 'PAUSED') && <button className="btn-ghost py-2 text-red-600" onClick={() => act(s.id, 'cancel')}><X className="h-4 w-4" />Cancel</button>}
                {(s.status === 'COMPLETED' || s.status === 'CANCELLED') && <Link to={`/kitchens/${s.kitchen.id}`} className="btn-outline py-2">Subscribe again</Link>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
