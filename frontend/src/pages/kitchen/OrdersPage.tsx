import LiveLocationShare from './LiveLocationShare';
import { useEffect, useState } from 'react';
import { Bike, Check, ChefHat, Clock, MapPin, Package, Phone, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { api, errMsg } from '../../api/client';
import { useFetch } from '../../components/useFetch';
import type { Order, OrderStatus } from '../../types';
import StatusBadge from '../../components/StatusBadge';
import DataTable from '../../components/DataTable';
import { ConfirmDialog, EmptyState, ErrorState, PageHeader, PageLoader, Spinner, Tabs, VegMark } from '../../components/ui';
import { fmtDateTime, fmtTime, mealLabel, rupee, timeAgo, titleCase } from '../../utils/format';

const NEXT: Partial<Record<OrderStatus, { to: OrderStatus; label: string; icon: typeof Check }>> = {
  PLACED: { to: 'CONFIRMED', label: 'Accept order', icon: Check },
  CONFIRMED: { to: 'PREPARING', label: 'Start preparing', icon: ChefHat },
  PREPARING: { to: 'READY', label: 'Mark ready', icon: Package },
  READY: { to: 'OUT_FOR_DELIVERY', label: 'Out for delivery', icon: Bike },
  OUT_FOR_DELIVERY: { to: 'DELIVERED', label: 'Mark delivered', icon: Check },
};
const COLUMNS: { key: string; label: string; statuses: OrderStatus[] }[] = [
  { key: 'new', label: 'New', statuses: ['PLACED'] },
  { key: 'kitchen', label: 'In kitchen', statuses: ['CONFIRMED', 'PREPARING'] },
  { key: 'ready', label: 'Ready / on the way', statuses: ['READY', 'OUT_FOR_DELIVERY'] },
];

export default function OrdersPage() {
  const { data, loading, error, reload } = useFetch<Order[]>('/kitchen/orders');
  const [tab, setTab] = useState<'live' | 'all'>('live');
  const [busyId, setBusyId] = useState<number | null>(null);
  const [rejecting, setRejecting] = useState<Order | null>(null);
  const [reason, setReason] = useState('Kitchen at full capacity');

  useEffect(() => { const t = setInterval(() => reload(true), 20000); return () => clearInterval(t); }, [reload]);

  if (loading) return <PageLoader />;
  if (error || !data) return <ErrorState message={error ?? ''} onRetry={reload} />;
  const live = data.filter((o) => ['PLACED', 'CONFIRMED', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY'].includes(o.status));

  const move = async (o: Order, to: OrderStatus, why?: string) => {
    setBusyId(o.id);
    try {
      await api.patch(`/kitchen/orders/${o.id}/status`, { status: to, reason: why });
      toast.success(`Order ${o.orderNumber}: ${titleCase(to)}`);
      reload(true);
    } catch (e) { toast.error(errMsg(e)); } finally { setBusyId(null); }
  };

  return (
    <div>
      <PageHeader title="Orders" subtitle="Accept, prepare and deliver. Customers see every status change instantly." />
      <Tabs value={tab} onChange={setTab} tabs={[{ value: 'live', label: 'Live board', count: live.length }, { value: 'all', label: 'All orders', count: data.length }]} />
      {tab === 'live' ? (
        live.length === 0 ? <EmptyState image="/images/clean-kitchen-2.jpg" title="No live orders" text="New orders will appear here. Keep the 'Accepting orders' switch on at the top." /> : (
          <div className="grid gap-5 lg:grid-cols-3">
            {COLUMNS.map((c) => {
              const col = live.filter((o) => c.statuses.includes(o.status));
              return (
                <div key={c.key} className="rounded-2xl bg-cream-200/60 p-3">
                  <p className="mb-3 flex items-center justify-between px-1 text-sm font-semibold">{c.label}<span className="rounded-full bg-white px-2 text-xs">{col.length}</span></p>
                  <div className="space-y-3">
                    {col.map((o) => {
                      const next = NEXT[o.status];
                      return (
                        <div key={o.id} className="card animate-fade-up p-4">
                          <div className="flex items-start justify-between gap-2">
                            <div><p className="font-semibold">{o.customer.fullName}</p><p className="text-xs text-charcoal-400">{o.orderNumber} · {timeAgo(o.createdAt)}</p></div>
                            <StatusBadge status={o.status} />
                          </div>
                          {o.orderType === 'CUSTOM_REQUEST' && <p className="mt-2 text-[11px] font-bold uppercase text-saffron-600">Custom request · {o.mealSlot && mealLabel[o.mealSlot]}</p>}
                          <ul className="mt-3 space-y-1 text-sm">{o.items.map((i) => <li key={i.id} className="flex items-center gap-2"><VegMark veg={i.veg} /><b>{i.quantity}×</b> {i.name}</li>)}</ul>
                          {o.notes && <p className="mt-2 rounded-lg bg-amber-50 px-2 py-1 text-xs text-amber-800">Note: {o.notes}</p>}
                          <div className="mt-3 space-y-1 text-xs text-charcoal-500">
                            <p className="flex gap-1.5"><MapPin className="h-3.5 w-3.5 shrink-0" />{o.deliveryAddress} {o.distanceKm != null && `(${o.distanceKm} km)`}</p>
                            <p className="flex gap-1.5"><Clock className="h-3.5 w-3.5" />Deliver by {fmtTime(o.estimatedDeliveryAt)}</p>
                            {o.customer.phone && <a href={`tel:${o.customer.phone}`} className="flex gap-1.5 text-brand-700"><Phone className="h-3.5 w-3.5" />{o.customer.phone}</a>}
                          </div>
                          <div className="mt-3 flex items-center justify-between border-t border-cream-200 pt-3">
                            <span className="text-sm"><b>{rupee(o.totalAmount)}</b> <span className="text-xs text-charcoal-400">{o.paymentStatus === 'COD_PENDING' ? '· collect cash' : '· paid'}</span></span>
                          </div>
                          <div className="mt-3 flex gap-2">
                            {next && <button className="btn-primary flex-1 py-2" disabled={busyId === o.id} onClick={() => move(o, next.to)}>{busyId === o.id ? <Spinner className="h-4 w-4 text-white" /> : <next.icon className="h-4 w-4" />}{next.label}</button>}
                            {o.status === 'PLACED' && <button className="btn-outline py-2 text-red-600" onClick={() => setRejecting(o)} aria-label="Reject"><X className="h-4 w-4" /></button>}
                          </div>
                          {o.status === 'OUT_FOR_DELIVERY' && <div className="mt-2"><LiveLocationShare orderId={o.id} /></div>}
                        </div>
                      );
                    })}
                    {col.length === 0 && <p className="py-6 text-center text-xs text-charcoal-400">Nothing here</p>}
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : (
        <DataTable rows={data} searchText={(o) => `${o.orderNumber} ${o.customer.fullName} ${o.items.map((i) => i.name).join(' ')} ${o.status}`}
          columns={[
            { key: 'no', header: 'Order', render: (o) => <><p className="font-semibold">{o.orderNumber}</p><p className="text-xs text-charcoal-400">{fmtDateTime(o.createdAt)}</p></> },
            { key: 'c', header: 'Customer', render: (o) => o.customer.fullName },
            { key: 'i', header: 'Items', render: (o) => <span className="line-clamp-1 max-w-xs">{o.items.map((i) => `${i.quantity}× ${i.name}`).join(', ')}</span> },
            { key: 't', header: 'Total', render: (o) => rupee(o.totalAmount) },
            { key: 'e', header: 'Your earning', render: (o) => <b>{rupee(o.kitchenEarning)}</b> },
            { key: 's', header: 'Status', render: (o) => <StatusBadge status={o.status} /> },
          ]} />
      )}
      <ConfirmDialog open={!!rejecting} onClose={() => setRejecting(null)} tone="danger" title={`Reject order ${rejecting?.orderNumber}?`} confirmLabel="Reject order"
        onConfirm={async () => { await move(rejecting!, 'REJECTED', reason); setRejecting(null); }}>
        <p className="mb-3 text-sm text-charcoal-600">The customer will be notified and refunded if they paid online.</p>
        <select className="input" value={reason} onChange={(e) => setReason(e.target.value)}>
          {['Kitchen at full capacity', 'Item ran out', 'Unable to deliver to this address', 'Kitchen closing early'].map((r) => <option key={r}>{r}</option>)}
        </select>
      </ConfirmDialog>
    </div>
  );
}
