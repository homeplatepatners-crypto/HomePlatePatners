import { CartOffers } from '../../components/Offers';
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MapPin, Minus, Plus, ShoppingBag, Tag, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { useLocationCtx } from '../../context/LocationContext';
import { api, errMsg } from '../../api/client';
import { EmptyState, Field, Spinner, VegMark } from '../../components/ui';
import { effPrice, rupee } from '../../utils/format';
import PaymentModal from './PaymentModal';
import type { Order, PaymentMethod } from '../../types';

interface Totals { foodTotal: number; deliveryCharge: number; platformFee: number; discount: number; total: number; couponCode?: string; couponMessage?: string; }

export default function Cart() {
  const cart = useCart();
  const { user } = useAuth();
  const { location } = useLocationCtx();
  const nav = useNavigate();
  const [address, setAddress] = useState(user?.address || '');
  const [notes, setNotes] = useState('');
  const [coupon, setCoupon] = useState('');
  const [applied, setApplied] = useState('');
  const [totals, setTotals] = useState<Totals | null>(null);
  const [loadingTotals, setLoadingTotals] = useState(false);
  const [payOpen, setPayOpen] = useState(false);

  useEffect(() => { if (user?.address && !address) setAddress(user.address); }, [user]); // eslint-disable-line

  const linesKey = cart.lines.map((l) => `${l.item.id}:${l.quantity}`).join(',');
  useEffect(() => {
    if (!cart.kitchenId || !cart.lines.length || !user) { setTotals(null); return; }
    setLoadingTotals(true);
    api.post('/customer/cart/totals', { kitchenId: cart.kitchenId, items: cart.lines.map((l) => ({ menuItemId: l.item.id, quantity: l.quantity })), couponCode: applied || null })
      .then(({ data }) => { setTotals(data); if (applied && applied !== 'NONE' && !data.couponCode) toast.error(data.couponMessage); })
      .catch((e) => toast.error(errMsg(e)))
      .finally(() => setLoadingTotals(false));
  }, [linesKey, applied, user]); // eslint-disable-line

  if (!cart.lines.length) {
    return <div className="container-x py-12"><EmptyState image="/images/veg-leaf-meal.jpg" title="Your cart is empty" text="Explore home kitchens near you and add something delicious."
      action={<Link to="/kitchens" className="btn-primary">Explore kitchens</Link>} /></div>;
  }

  const localFood = cart.lines.reduce((a, l) => a + effPrice(l.item) * l.quantity, 0);

  const placeOrder = async (method: PaymentMethod) => {
    try {
      const { data: order } = await api.post<Order>('/customer/orders', {
        kitchenId: cart.kitchenId, items: cart.lines.map((l) => ({ menuItemId: l.item.id, quantity: l.quantity })),
        deliveryAddress: address, deliveryArea: location.label, latitude: location.lat, longitude: location.lng,
        paymentMethod: method, couponCode: applied || null, notes,
      });
      if (method !== 'COD') await api.post(`/customer/orders/${order.id}/pay`, { paymentMethod: method });
      cart.clear();
      setPayOpen(false);
      toast.success(method === 'COD' ? 'Order placed!' : 'Payment successful! Order placed.');
      nav(`/orders/${order.id}`);
    } catch (e) {
      toast.error(errMsg(e, 'Could not place order'));
    }
  };

  const checkout = () => {
    if (!user) { nav('/login?next=/cart'); return; }
    if (user.role !== 'CUSTOMER') { toast.error('Please login with a customer account'); return; }
    if (address.trim().length < 8) { toast.error('Enter your complete delivery address'); return; }
    setPayOpen(true);
  };

  return (
    <div className="container-x py-8">
      <h1 className="mt-3 font-display text-3xl font-semibold">Checkout</h1>
      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="space-y-5">
          <div className="card p-5">
            <div className="flex items-center justify-between"><h2 className="font-semibold">Items from {cart.kitchenName}</h2><button onClick={cart.clear} className="text-xs font-semibold text-red-600"><Trash2 className="mr-1 inline h-3.5 w-3.5" />Clear</button></div>
            <div className="mt-4 divide-y divide-cream-200">
              {cart.lines.map((l) => (
                <div key={l.item.id} className="flex items-center gap-4 py-3">
                  <img src={l.item.imageUrl} alt="" className="h-14 w-14 rounded-xl object-cover" />
                  <div className="min-w-0 flex-1"><div className="flex items-center gap-2"><VegMark veg={l.item.veg} /><p className="truncate text-sm font-semibold">{l.item.name}</p></div><p className="text-xs text-charcoal-400">{rupee(effPrice(l.item))} each</p></div>
                  <div className="flex items-center gap-3 rounded-xl border border-brand-200 px-2 py-1 text-brand-700">
                    <button onClick={() => cart.setQty(l.item.id, l.quantity - 1)} aria-label="Decrease"><Minus className="h-4 w-4" /></button>
                    <span className="w-4 text-center text-sm font-bold">{l.quantity}</span>
                    <button onClick={() => cart.setQty(l.item.id, l.quantity + 1)} aria-label="Increase"><Plus className="h-4 w-4" /></button>
                  </div>
                  <p className="w-16 text-right text-sm font-semibold">{rupee(effPrice(l.item) * l.quantity)}</p>
                </div>
              ))}
            </div>
            <Field label="Note for the kitchen" className="mt-4"><input className="input" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. less spicy, no onion" /></Field>
          </div>
          <div className="card p-5">
            <h2 className="flex items-center gap-2 font-semibold"><MapPin className="h-5 w-5 text-saffron-500" />Delivery address</h2>
            <p className="mt-1 text-xs text-charcoal-500">Delivering to <b>{location.label}</b> ({location.address}). Change the area from the top bar.</p>
            <textarea className="input mt-3 min-h-[80px]" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Door no, street, landmark, hostel / PG name" />
          </div>
        </div>

        <aside className="card h-fit space-y-4 p-5 lg:sticky lg:top-24">
          <div>
            <label className="label">Coupon code</label>
            <div className="flex gap-2">
              <div className="relative flex-1"><Tag className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-charcoal-400" /><input className="input pl-9 uppercase" value={coupon} onChange={(e) => setCoupon(e.target.value)} placeholder="Have a code?" /></div>
              <button className="btn-outline" onClick={() => { if (!user) return nav('/login?next=/cart'); setApplied(coupon.trim().toUpperCase()); }} disabled={!coupon.trim()}>Apply</button>
            </div>
            {totals?.couponCode && (
              <div className="mt-2 flex items-center justify-between gap-2 rounded-xl bg-brand-50 px-3 py-2">
                <p className="text-xs font-semibold text-brand-700">{totals.couponMessage}</p>
                <button className="text-xs font-semibold text-red-600 hover:underline" onClick={() => { setApplied('NONE'); setCoupon(''); }}>Remove</button>
              </div>
            )}
            {applied === 'NONE' && <button className="mt-2 text-xs font-semibold text-brand-700 hover:underline" onClick={() => setApplied('')}>Apply the best offer automatically</button>}
          </div>
          {user && <CartOffers food={totals?.foodTotal ?? localFood} applied={totals?.couponCode} onApply={(c) => { setApplied(c); setCoupon(''); }} />}
          <div className="space-y-2 border-t border-dashed border-cream-300 pt-4 text-sm">
            <Row label="Food total" value={rupee(totals?.foodTotal ?? localFood, 2)} />
            <Row label="Delivery charge" value={totals ? (totals.deliveryCharge > 0 ? rupee(totals.deliveryCharge, 2) : <span className="text-brand-700">FREE</span>) : '—'} />
            <Row label="Platform fee" value={totals ? rupee(totals.platformFee, 2) : '—'} />
            {totals && totals.discount > 0 && <Row label={`Discount (${totals.couponCode})`} value={<span className="text-brand-700">−{rupee(totals.discount, 2)}</span>} />}
          </div>
          <div className="flex items-center justify-between border-t border-cream-200 pt-4">
            <span className="font-semibold">To pay</span>
            <span className="text-xl font-bold">{loadingTotals ? <Spinner className="h-5 w-5" /> : rupee(totals?.total ?? localFood, 2)}</span>
          </div>
          <button className="btn-accent w-full py-3.5 text-base" onClick={checkout}><ShoppingBag className="h-5 w-5" />{user ? 'Proceed to pay' : 'Login to checkout'}</button>
          <p className="text-center text-[11px] text-charcoal-400">Self-delivered by the home chef. Free delivery above ₹299.</p>
        </aside>
      </div>
      <PaymentModal open={payOpen} amount={totals?.total ?? localFood} onClose={() => setPayOpen(false)} onPay={placeOrder} />
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return <div className="flex justify-between"><span className="text-charcoal-500">{label}</span><span className="font-medium">{value}</span></div>;
}
