import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Bike, Clock, Flag, MapPin, Navigation, Phone, Receipt, Star } from 'lucide-react';
import toast from 'react-hot-toast';
import { api, errMsg } from '../../api/client';
import { useFetch } from '../../components/useFetch';
import type { Order, PaymentMethod } from '../../types';
import StatusBadge from '../../components/StatusBadge';
import Timeline from '../../components/Timeline';
import { ConfirmDialog, ErrorState, Field, Modal, PageLoader, Spinner, VegMark, cx } from '../../components/ui';
import { fmtDateTime, fmtTime, rupee, titleCase } from '../../utils/format';
import PaymentModal from './PaymentModal';
import { LiveTrackingMap, distanceKm } from '../../components/Maps';

const STEPS = [
  { key: 'PLACED', label: 'Order placed', time: (o: Order) => o.createdAt },
  { key: 'CONFIRMED', label: 'Accepted by kitchen', time: (o: Order) => o.confirmedAt },
  { key: 'PREPARING', label: 'Preparing', time: (o: Order) => o.preparingAt },
  { key: 'READY', label: 'Ready', time: (o: Order) => o.readyAt },
  { key: 'OUT_FOR_DELIVERY', label: 'Out for delivery', time: (o: Order) => o.outForDeliveryAt },
  { key: 'DELIVERED', label: 'Delivered', time: (o: Order) => o.deliveredAt },
];

export default function OrderTracking() {
  const { id } = useParams();
  const { data: o, loading, error, reload } = useFetch<Order>(`/customer/orders/${id}`);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [complaintOpen, setComplaintOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [payOpen, setPayOpen] = useState(false);

  useEffect(() => {
    if (!o || ['DELIVERED', 'CANCELLED', 'REJECTED'].includes(o.status)) return;
    // Live refresh: every 5 s while the food is on the way (rider position), otherwise every 10 s.
    const t = setInterval(() => reload(true), o.status === 'OUT_FOR_DELIVERY' ? 5000 : 10000);
    return () => clearInterval(t);
  }, [o, reload]);

  if (loading) return <PageLoader />;
  if (error || !o) return <div className="container-x py-10"><ErrorState message={error ?? 'Order not found'} onRetry={reload} /></div>;

  const failed = o.status === 'CANCELLED' || o.status === 'REJECTED';
  const idx = o.status === 'PAYMENT_PENDING' ? 0 : Math.max(0, STEPS.findIndex((s) => s.key === o.status));
  const failIdx = failed ? (o.confirmedAt ? 1 : 0) + (o.preparingAt ? 1 : 0) : idx;

  const cancel = async () => {
    try { await api.post(`/customer/orders/${o.id}/cancel`, { reason: 'Cancelled by customer' }); toast.success('Order cancelled'); setCancelOpen(false); reload(); }
    catch (e) { toast.error(errMsg(e)); }
  };
  const pay = async (m: PaymentMethod) => {
    try { await api.post(`/customer/orders/${o.id}/pay`, { paymentMethod: m }); toast.success('Payment successful'); setPayOpen(false); reload(); }
    catch (e) { toast.error(errMsg(e)); }
  };

  return (
    <div className="container-x py-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold text-charcoal-400">Order {o.orderNumber} · {fmtDateTime(o.createdAt)}</p>
          <h1 className="mt-1 font-display text-3xl font-semibold">{o.kitchen.name}</h1>
        </div>
        <StatusBadge status={o.status} className="text-sm" />
      </div>

      <div className="card mt-6 overflow-hidden">
        <div className={cx('flex flex-wrap items-center gap-4 p-5 text-white', failed ? 'bg-red-600' : o.status === 'DELIVERED' ? 'bg-brand-700' : 'bg-gradient-to-r from-brand-700 to-brand-600')}>
          {o.status === 'OUT_FOR_DELIVERY' ? <Bike className="h-8 w-8" /> : <Clock className="h-8 w-8" />}
          <div className="flex-1">
            <p className="text-lg font-semibold">
              {failed ? `Order ${titleCase(o.status)}` : o.status === 'DELIVERED' ? 'Delivered. Enjoy your meal!' : o.status === 'PAYMENT_PENDING' ? 'Waiting for payment'
                : o.status === 'PLACED' ? 'Waiting for the kitchen to accept' : o.status === 'OUT_FOR_DELIVERY' ? 'Your food is on the way!' : `${titleCase(o.status)}…`}
            </p>
            <p className="text-sm text-white/80">{failed ? (o.cancelReason || '') : o.status === 'DELIVERED' ? `Delivered at ${fmtTime(o.deliveredAt)}` : `Estimated delivery ${fmtDateTime(o.estimatedDeliveryAt)}`}</p>
          </div>
          {o.status === 'PAYMENT_PENDING' && <button className="btn bg-white text-brand-700" onClick={() => setPayOpen(true)}>Pay {rupee(o.totalAmount)}</button>}
        </div>
        <div className="overflow-x-auto p-6"><div className="min-w-[640px]">
          <Timeline steps={STEPS.map((s) => ({ key: s.key, label: s.label, time: s.time(o) }))} currentIndex={failed ? failIdx : idx} failed={failed ? titleCase(o.status) : undefined} />
        </div></div>
      </div>

      {['CONFIRMED', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY'].includes(o.status) && <LiveTracking o={o} />}

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="card p-5">
          <h2 className="flex items-center gap-2 font-semibold"><Receipt className="h-5 w-5 text-brand-600" />Bill details</h2>
          <div className="mt-4 divide-y divide-cream-200">
            {o.items.map((i) => (
              <div key={i.id} className="flex items-center gap-3 py-3">
                <VegMark veg={i.veg} /><p className="flex-1 text-sm">{i.quantity} × {i.name}</p><p className="text-sm font-medium">{rupee(i.lineTotal, 2)}</p>
              </div>
            ))}
          </div>
          <div className="mt-2 space-y-1.5 border-t border-dashed border-cream-300 pt-3 text-sm">
            <Line l="Food total" v={rupee(o.foodTotal, 2)} />
            <Line l="Delivery" v={o.deliveryCharge > 0 ? rupee(o.deliveryCharge, 2) : 'FREE'} />
            <Line l="Platform fee" v={rupee(o.platformFee, 2)} />
            {o.discount > 0 && <Line l={`Discount ${o.couponCode ? `(${o.couponCode})` : ''}`} v={`−${rupee(o.discount, 2)}`} />}
            <div className="flex justify-between border-t border-cream-200 pt-2 text-base font-bold"><span>Total</span><span>{rupee(o.totalAmount, 2)}</span></div>
            <p className="text-xs text-charcoal-400">Paid via {titleCase(o.paymentMethod)} · <StatusBadge status={o.paymentStatus} />{o.paymentReference && ` · Ref ${o.paymentReference}`}</p>
          </div>
          {o.notes && <p className="mt-4 rounded-xl bg-cream-100 p-3 text-sm text-charcoal-600"><b>Note:</b> {o.notes}</p>}
        </div>
        <aside className="space-y-4">
          <div className="card space-y-3 p-5 text-sm">
            <p className="flex gap-2"><MapPin className="h-4 w-4 shrink-0 text-saffron-500" />{o.deliveryAddress}</p>
            {o.distanceKm != null && <p className="text-xs text-charcoal-400">{o.distanceKm} km from the kitchen · self-delivered by the home chef</p>}
            {o.kitchen.owner?.phone && <a href={`tel:${o.kitchen.owner.phone}`} className="btn-outline w-full"><Phone className="h-4 w-4" />Call {o.kitchen.owner.fullName.split(' ')[0]}</a>}
          </div>
          {['PLACED', 'PAYMENT_PENDING'].includes(o.status) && <button className="btn-outline w-full text-red-600" onClick={() => setCancelOpen(true)}>Cancel order</button>}
          {o.status === 'DELIVERED' && !o.reviewed && <button className="btn-accent w-full" onClick={() => setReviewOpen(true)}><Star className="h-4 w-4" />Rate this meal</button>}
          {o.status === 'DELIVERED' && o.reviewed && <p className="rounded-xl bg-brand-50 p-3 text-center text-sm text-brand-700">Thanks for your review!</p>}
          <button className="btn-ghost w-full text-xs" onClick={() => setComplaintOpen(true)}><Flag className="h-3.5 w-3.5" />Report a problem</button>
          <Link to={`/kitchens/${o.kitchen.id}`} className="btn-outline w-full">Order again from {o.kitchen.name.split(' ')[0]}</Link>
        </aside>
      </div>

      <ReviewModal open={reviewOpen} onClose={() => setReviewOpen(false)} orderId={o.id} onDone={() => reload()} />
      <ComplaintModal open={complaintOpen} onClose={() => setComplaintOpen(false)} orderId={o.id} />
      <ConfirmDialog open={cancelOpen} onClose={() => setCancelOpen(false)} onConfirm={cancel} tone="danger" title="Cancel order?" confirmLabel="Yes, cancel"
        message="You can cancel until the kitchen accepts your order. Online payments are refunded to the original method." />
      <PaymentModal open={payOpen} amount={o.totalAmount} onClose={() => setPayOpen(false)} onPay={pay} />
    </div>
  );
}

function Line({ l, v }: { l: string; v: string }) { return <div className="flex justify-between"><span className="text-charcoal-500">{l}</span><span>{v}</span></div>; }

function ReviewModal({ open, onClose, orderId, onDone }: { open: boolean; onClose: () => void; orderId: number; onDone: () => void }) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    setBusy(true);
    try { await api.post(`/customer/orders/${orderId}/review`, { rating, comment }); toast.success('Thanks for the review!'); onClose(); onDone(); }
    catch (e) { toast.error(errMsg(e)); } finally { setBusy(false); }
  };
  return (
    <Modal open={open} onClose={onClose} title="How was your meal?" size="sm"
      footer={<><button className="btn-ghost" onClick={onClose}>Later</button><button className="btn-primary" onClick={submit} disabled={busy}>{busy && <Spinner className="h-4 w-4 text-white" />}Submit</button></>}>
      <div className="flex justify-center gap-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <button key={i} onClick={() => setRating(i)} aria-label={`${i} stars`}><Star className={cx('h-10 w-10', i <= rating ? 'fill-amber-400 text-amber-400' : 'text-cream-300')} /></button>
        ))}
      </div>
      <textarea className="input mt-5 min-h-[100px]" value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Tell other customers about the taste, quantity and packing…" />
    </Modal>
  );
}

function ComplaintModal({ open, onClose, orderId }: { open: boolean; onClose: () => void; orderId: number }) {
  const [f, setF] = useState({ category: 'Quality', subject: '', description: '' });
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    if (!f.subject || !f.description) return toast.error('Fill in all fields');
    setBusy(true);
    try { await api.post('/customer/complaints', { ...f, orderId }); toast.success('Complaint registered. Our team will contact you.'); onClose(); }
    catch (e) { toast.error(errMsg(e)); } finally { setBusy(false); }
  };
  return (
    <Modal open={open} onClose={onClose} title="Report a problem"
      footer={<><button className="btn-ghost" onClick={onClose}>Cancel</button><button className="btn-danger" onClick={submit} disabled={busy}>Submit complaint</button></>}>
      <div className="space-y-4">
        <Field label="Category"><select className="input" value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })}>{['Quality', 'Hygiene', 'Delivery', 'Payment', 'Other'].map((c) => <option key={c}>{c}</option>)}</select></Field>
        <Field label="Subject"><input className="input" value={f.subject} onChange={(e) => setF({ ...f, subject: e.target.value })} /></Field>
        <Field label="Describe the issue"><textarea className="input min-h-[100px]" value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></Field>
      </div>
    </Modal>
  );
}

/** Live delivery tracking card (like food-delivery apps): moving rider marker, remaining distance and ETA. */
function LiveTracking({ o }: { o: Order }) {
  const onTheWay = o.status === 'OUT_FOR_DELIVERY';
  const home = { lat: o.deliveryLatitude, lng: o.deliveryLongitude };
  const rider = onTheWay && o.riderLatitude != null ? { lat: o.riderLatitude, lng: o.riderLongitude } : null;
  const left = rider && home.lat != null && home.lng != null ? distanceKm(rider.lat!, rider.lng!, home.lat, home.lng) : null;
  const etaMin = left != null ? Math.max(1, Math.round((left / 18) * 60) + 1) : null; // ~18 km/h city two-wheeler speed
  const updated = o.riderUpdatedAt ? Math.round((Date.now() - new Date(o.riderUpdatedAt).getTime()) / 1000) : null;
  return (
    <div className="card mt-6 overflow-hidden">
      <div className="flex flex-wrap items-center gap-3 border-b border-cream-200 p-4">
        <Navigation className="h-5 w-5 text-saffron-500" />
        <div className="flex-1">
          <p className="font-semibold">{onTheWay ? 'Live delivery tracking' : 'Your order route'}</p>
          <p className="text-xs text-charcoal-500">
            {onTheWay
              ? (left != null ? `${left.toFixed(1)} km away · arriving in about ${etaMin} min` : 'Waiting for the delivery partner\'s location…')
              : 'Live tracking starts as soon as your food is out for delivery.'}
          </p>
        </div>
        {onTheWay && updated != null && (
          <span className="flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700">
            <span className="h-2 w-2 animate-pulse rounded-full bg-brand-500" />{updated < 60 ? 'Live' : `Updated ${Math.round(updated / 60)} min ago`}
          </span>
        )}
      </div>
      <LiveTrackingMap kitchen={{ lat: o.kitchen.latitude, lng: o.kitchen.longitude, name: o.kitchen.name }} home={home} rider={rider} height="h-72" />
    </div>
  );
}
