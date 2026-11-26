import { useFetch } from '../../components/useFetch';
import DataTable from '../../components/DataTable';
import StatusBadge from '../../components/StatusBadge';
import { ErrorState, PageHeader, PageLoader, StatCard } from '../../components/ui';
import { fmtDate, mealLabel, rupee } from '../../utils/format';
import type { MealSub } from '../customer/MySubscriptions';
import { CalendarCheck, IndianRupee, Repeat } from 'lucide-react';

type Row = MealSub & { commission: number; kitchenEarning: number; createdAt: string };

/** Admin: customer meal subscriptions across all kitchens. */
export default function AdminMealSubscriptions() {
  const { data, loading, error, reload } = useFetch<Row[]>('/admin/meal-subscriptions');
  if (loading) return <PageLoader />;
  if (error || !data) return <ErrorState message={error ?? ''} onRetry={reload} />;
  const active = data.filter((s) => s.status === 'ACTIVE' || s.status === 'PAUSED');
  return (
    <div>
      <PageHeader title="Customer meal subscriptions" subtitle="Regular customers subscribed to kitchens' weekly / monthly meal plans" />
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard label="Active subscriptions" value={active.length} icon={Repeat} />
        <StatCard label="Subscription sales" value={rupee(data.reduce((a, s) => a + Number(s.amount || 0), 0))} icon={CalendarCheck} />
        <StatCard label="HomePlate commission" value={rupee(data.reduce((a, s) => a + Number(s.commission || 0), 0))} icon={IndianRupee} />
      </div>
      <DataTable rows={data} searchText={(s) => `${s.planName} ${s.kitchen.name} ${s.customer?.fullName} ${s.status}`}
        columns={[
          { key: 'c', header: 'Customer', render: (s) => s.customer?.fullName },
          { key: 'k', header: 'Kitchen', render: (s) => s.kitchen.name },
          { key: 'p', header: 'Plan', render: (s) => <>{s.planName}<p className="text-xs text-charcoal-400">{mealLabel[s.mealSlot]}</p></> },
          { key: 'd', header: 'Period', render: (s) => `${fmtDate(s.startDate)} → ${fmtDate(s.endDate)}` },
          { key: 'a', header: 'Amount', render: (s) => rupee(s.amount) },
          { key: 's', header: 'Status', render: (s) => <StatusBadge status={s.status} /> },
        ]} />
    </div>
  );
}
