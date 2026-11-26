import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { BadgeCheck, Clock, MapPin, RefreshCw, Star, Timer } from 'lucide-react';
import toast from 'react-hot-toast';
import { api, errMsg } from '../../api/client';
import { useFetch } from '../../components/useFetch';
import type { CustomRequest, KitchenCard, Order, Quotation } from '../../types';
import StatusBadge from '../../components/StatusBadge';
import Timeline from '../../components/Timeline';
import { ConfirmDialog, EmptyState, ErrorState, PageLoader, VegMark, cx } from '../../components/ui';
import { fmtDate, fmtTime, mealLabel, rupee, timeAgo } from '../../utils/format';
import PaymentModal from './PaymentModal';

interface View { request: CustomRequest; offers: { quotation: Quotation; kitchen: KitchenCard }[]; order?: Order | null; eligibleKitchens: number; }

const STEPS = ['Submitted', 'Kitchen Offers', 'Offer Selected', 'Payment Pending', 'Confirmed', 'Preparing', 'Ready', 'Out for Delivery', 'Delivered'];

function stepIndex(v: View): number {
  const r = v.request; const o = v.order;
  if (r.status === 'SUBMITTED') return 0;
  if (r.status === 'OFFERS_RECEIVED') return 1;
  if (!o) return 2;
  switch (o.status) {
    case 'PAYMENT_PENDING': return 3;
    case 'PLACED': case 'CONFIRMED': return 4;
    case 'PREPARING': return 5;
    case 'READY': return 6;
    case 'OUT_FOR_DELIVERY': return 7;
    case 'DELIVERED': return 8;
    default: return 4;
  }
}

export default function RequestDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const { data: v, loading, error, reload } = useFetch<View>(`/customer/requests/${id}`);
  const [selecting, setSelecting] = useState<Quotation | null>(null);
  const [busy, setBusy] = useState(false);
  const [payOrder, setPayOrder] = useState<Order | null>(null);
  const [cancelOpen, setCancelOpen] = useState(false);

  // Poll for new offers while waiting
  useEffect(() => {
    if (!v || !['SUBMITTED', 'OFFERS_RECEIVED'].includes(v.request.status)) return;
    const t = setInterval(() => reload(true), 15000);
    return () => clearInterval(t);
  }, [v, reload]);

  if (loading) return <PageLoader />;
  if (error || !v) return <div className="container-x py-10"><ErrorState message={error ?? 'Not found'} onRetry={reload} /></div>;
  const r = v.request;
  const idx = stepIndex(v);
  const cancelled = r.status === 'CANCELLED' || v.order?.status === 'CANCELLED' || v.order?.status === 'REJECTED';

  const select = async () => {
    if (!selecting) return;
    setBusy(true);
    try {
      const { data } = await api.post<Order>(`/customer/requests/${r.id}/select/${selecting.id}`);
      setSelecting(null);
      setPayOrder(data);
      reload(true);
    } catch (e) { toast.error(errMsg(e)); } finally { setBusy(false); }
  };

  const pay = async (method: 'UPI' | 'CARD' | 'NET_BANKING' | 'COD') => {
    const order = payOrder ?? v.order;
    if (!order) return;
    try {
      await api.post(`/customer/orders/${order.id}/pay`, { paymentMethod: method });
      toast.success('Payment successful! The kitchen will start cooking.');
      setPayOrder(null);
      nav(`/orders/${order.id}`);
    } catch (e) { toast.error(errMsg(e)); }
  };

  const cancel = async () => {
    try { await api.post(`/customer/requests/${r.id}/cancel`); toast.success('Request cancelled'); setCancelOpen(false); reload(); }
    catch (e) { toast.error(errMsg(e)); }
  };

  return (
    <div className="container-x py-8">
      <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold text-charcoal-400">{r.requestNumber} · submitted {timeAgo(r.createdAt)}</p>
          <h1 className="mt-1 flex items-center gap-3 font-display text-3xl font-semibold"><VegMark veg={r.veg} className="h-5 w-5" />{r.dishName}</h1>
          <p className="mt-1 text-sm text-charcoal-500">{r.quantity} · serves {r.servings} · {r.spiceLevel}{r.cuisineStyle ? ` · ${r.cuisineStyle} style` : ''}</p>
        </div>
        <div className="flex gap-2">
          <StatusBadge status={cancelled ? 'CANCELLED' : r.status} className="text-sm" />
          {['SUBMITTED', 'OFFERS_RECEIVED'].includes(r.status) && <button className="btn-ghost text-red-600" onClick={() => setCancelOpen(true)}>Cancel request</button>}
        </div>
      </div>

      {!cancelled && <div className="card mt-6 overflow-x-auto p-6"><div className="min-w-[860px]"><Timeline steps={STEPS.map((s) => ({ key: s, label: s }))} currentIndex={idx} /></div></div>}

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
        <div>
          {v.order && v.order.status === 'PAYMENT_PENDING' && (
            <div className="card mb-5 flex flex-wrap items-center justify-between gap-3 border-2 border-saffron-300 p-5">
              <div><p className="font-semibold">Offer selected from {v.order.kitchen.name}</p><p className="text-sm text-charcoal-500">Complete payment of {rupee(v.order.totalAmount, 2)} to confirm the order.</p></div>
              <button className="btn-accent" onClick={() => setPayOrder(v.order!)}>Pay now</button>
            </div>
          )}
          {v.order && v.order.status !== 'PAYMENT_PENDING' && (
            <Link to={`/orders/${v.order.id}`} className="card mb-5 flex items-center justify-between gap-3 p-5 hover:shadow-lift">
              <div><p className="font-semibold">Order {v.order.orderNumber} · {v.order.kitchen.name}</p><p className="text-sm text-charcoal-500">Track preparation and delivery</p></div>
              <StatusBadge status={v.order.status} />
            </Link>
          )}

          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-2xl font-semibold">Kitchen offers</h2>
            {['SUBMITTED', 'OFFERS_RECEIVED'].includes(r.status) && <button onClick={() => reload()} className="btn-ghost text-xs"><RefreshCw className="h-3.5 w-3.5" />Refresh</button>}
          </div>
          {v.offers.length === 0 ? (
            <EmptyState image="/images/pan-cooking.jpg" title="Waiting for kitchens to respond"
              text={v.eligibleKitchens > 0 ? `Your request was sent to ${v.eligibleKitchens} home kitchen${v.eligibleKitchens > 1 ? 's' : ''} near ${r.deliveryArea}. Offers usually arrive within 30 minutes.` : 'No eligible kitchens deliver to this location yet. Try a different area.'} />
          ) : (
            <div className="space-y-3">
              {v.offers.map(({ quotation: q, kitchen: k }, i) => (
                <div key={q.id} className={cx('card flex flex-col gap-4 p-5 sm:flex-row sm:items-center', q.status === 'SELECTED' && 'ring-2 ring-brand-500', q.status === 'NOT_SELECTED' && 'opacity-60')}>
                  <img src={k.coverImage} alt="" className="h-20 w-full rounded-xl object-cover sm:w-28" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link to={`/kitchens/${k.id}`} className="font-semibold hover:text-brand-700">{k.name}</Link>
                      {k.verified && <BadgeCheck className="h-4 w-4 text-brand-600" />}
                      {i === 0 && r.status === 'OFFERS_RECEIVED' && <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[11px] font-bold text-brand-700">Lowest price</span>}
                      {q.status !== 'PENDING' && <StatusBadge status={q.status} />}
                    </div>
                    <p className="mt-1 flex flex-wrap gap-x-3 text-xs text-charcoal-500">
                      <span className="inline-flex items-center gap-1"><Star className="h-3 w-3 fill-amber-400 text-amber-400" />{k.rating} ({k.ratingCount})</span>
                      <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{q.distanceKm} km</span>
                      <span className="inline-flex items-center gap-1"><Timer className="h-3 w-3" />{q.prepTimeMinutes} min prep</span>
                    </p>
                    {q.unavailableItems && <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800"><b>Not available / substitution:</b> {q.unavailableItems}</p>}
                    {q.note && <p className="mt-2 rounded-lg bg-cream-100 px-3 py-2 text-sm text-charcoal-600">"{q.note}"</p>}
                  </div>
                  <div className="flex items-center gap-4 sm:flex-col sm:items-end">
                    <p className="text-2xl font-bold">{rupee(q.price)}</p>
                    {r.status === 'OFFERS_RECEIVED' && <button className="btn-primary" onClick={() => setSelecting(q)}>Select offer</button>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <aside className="card h-fit space-y-3 p-5 text-sm">
          <h3 className="font-semibold">Request details</h3>
          <p className="flex gap-2"><Clock className="h-4 w-4 shrink-0 text-charcoal-400" />{mealLabel[r.mealSlot]} · {fmtDate(r.requiredDate)}{r.preferredTime && ` · ${fmtTime(r.preferredTime)}`}</p>
          <p className="flex gap-2"><MapPin className="h-4 w-4 shrink-0 text-charcoal-400" />{r.deliveryAddress}</p>
          {r.budget && <p>Budget: <b>{rupee(r.budget)}</b></p>}
          {r.instructions && <p className="rounded-xl bg-cream-100 p-3 text-charcoal-600">{r.instructions}</p>}
        </aside>
      </div>

      <ConfirmDialog open={!!selecting} onClose={() => setSelecting(null)} onConfirm={select} busy={busy} title="Select this offer?" confirmLabel="Select & continue to pay"
        message={selecting ? `${selecting.kitchen.name} will cook your ${r.dishName} for ${rupee(selecting.price)} (plus delivery & platform fee). Other offers will be declined.` : ''} />
      <ConfirmDialog open={cancelOpen} onClose={() => setCancelOpen(false)} onConfirm={cancel} title="Cancel this request?" tone="danger" confirmLabel="Cancel request" message="Kitchens will no longer be able to send offers." />
      <PaymentModal open={!!payOrder} amount={(payOrder ?? v.order)?.totalAmount ?? 0} onClose={() => setPayOrder(null)} onPay={pay} />
    </div>
  );
}
