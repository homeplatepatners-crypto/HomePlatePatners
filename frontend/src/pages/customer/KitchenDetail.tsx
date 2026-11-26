import { KitchenMealPlans } from '../../components/MealPlans';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowRight, BadgeCheck, CalendarDays, CheckCircle2, ChefHat, Clock, FileCheck2, MapPin, Minus, Phone, Plus, ShieldAlert, ShoppingBag, Star, Truck, Video, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { useFetch } from '../../components/useFetch';
import { useLocationCtx } from '../../context/LocationContext';
import { useCart } from '../../context/CartContext';
import type { KitchenDetails, MenuItem } from '../../types';
import { Avatar, Badge, ConfirmDialog, ErrorState, PageLoader, Stars, Tabs, VegMark, cx } from '../../components/ui';
import { MapView } from '../../components/Maps';
import { effPrice, fmtDate, fmtTime, mealLabel, rupee, timeAgo } from '../../utils/format';

const MEALS = ['ALL', 'BREAKFAST', 'LUNCH', 'SNACKS', 'DINNER'] as const;
const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

export default function KitchenDetail() {
  const { id } = useParams();
  const { location } = useLocationCtx();
  const cart = useCart();
  const { data: k, loading, error, reload } = useFetch<KitchenDetails>(`/public/kitchens/${id}?lat=${location.lat}&lng=${location.lng}`);
  const [meal, setMeal] = useState<(typeof MEALS)[number]>('ALL');
  const [vegOnly, setVegOnly] = useState(false);
  const [conflict, setConflict] = useState<MenuItem | null>(null);

  if (loading) return <PageLoader label="Opening the kitchen…" />;
  if (error || !k) return <div className="container-x py-10"><ErrorState message={error ?? 'Kitchen not found'} onRetry={reload} /></div>;

  const items = k.menu.filter((i) => (meal === 'ALL' || i.mealType === meal) && (!vegOnly || i.veg));
  const grouped = MEALS.slice(1).map((m) => ({ meal: m, items: items.filter((i) => i.mealType === m) })).filter((g) => g.items.length);
  const canOrder = k.acceptingNow && k.withinDeliveryRange;
  const cartHere = cart.kitchenId === k.id ? cart.lines : [];
  const cartTotal = cartHere.reduce((a, l) => a + effPrice(l.item) * l.quantity, 0);

  const add = (item: MenuItem) => {
    if (!canOrder) { toast.error(!k.withinDeliveryRange ? 'This kitchen does not deliver to your location' : 'Kitchen is not accepting orders right now'); return; }
    if (cart.add(item, k.id, k.name) === 'conflict') setConflict(item);
  };

  const t = k.trust;
  return (
    <div className="pb-28">
      {/* COVER */}
      <div className="relative h-64 sm:h-80">
        <img src={k.coverImage} alt={k.name} className="h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-charcoal-900/85 via-charcoal-900/30 to-transparent" />
        <div className="container-x absolute inset-x-0 bottom-0 pb-6 text-white">
          <div className="flex flex-wrap gap-2">
            {k.verified && <Badge tone="green" icon={BadgeCheck}>Identity verified</Badge>}
            {k.fssaiVerified && <Badge tone="blue" icon={FileCheck2}>FSSAI registered</Badge>}
            {k.lastVideoVerifiedOn && <Badge tone="purple" icon={Video}>Kitchen video checked {fmtDate(k.lastVideoVerifiedOn)}</Badge>}
          </div>
          <h1 className="mt-3 font-display text-3xl font-semibold text-white sm:text-4xl">{k.name}</h1>
          <p className="mt-1 text-sm text-white/80">{k.cuisines.join(' • ')} · {k.area}, Coimbatore</p>
        </div>
      </div>

      <div className="container-x mt-6 grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          {/* QUICK FACTS */}
          <div className="card grid grid-cols-2 divide-cream-200 sm:grid-cols-4 sm:divide-x">
            {[
              { icon: Star, label: 'Rating', value: <>{k.rating.toFixed(1)} <span className="text-xs font-normal text-charcoal-400">({k.ratingCount})</span></> },
              { icon: MapPin, label: 'Distance', value: k.distanceKm != null ? `${k.distanceKm} km` : '—' },
              { icon: Clock, label: 'Delivery in', value: `~${k.etaMinutes} min` },
              { icon: CalendarDays, label: 'Today', value: k.openNow ? <span className="text-brand-700">Open till {fmtTime(k.closeTime)}</span> : <span className="text-red-600">Closed · opens {fmtTime(k.openTime)}</span> },
            ].map((x) => (
              <div key={x.label} className="p-4">
                <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-charcoal-400"><x.icon className="h-3.5 w-3.5" />{x.label}</p>
                <p className="mt-1 font-bold">{x.value}</p>
              </div>
            ))}
          </div>

          {!k.withinDeliveryRange && <div className="flex items-center gap-3 rounded-2xl bg-red-50 p-4 text-sm text-red-700"><XCircle className="h-5 w-5 shrink-0" />This kitchen delivers within {k.deliveryRadiusKm} km. Your location ({location.label}) is outside its range.</div>}
          {k.withinDeliveryRange && k.menuReady === false && k.openNow && k.acceptingOrders && <div className="flex items-center gap-3 rounded-2xl bg-sky-50 p-4 text-sm text-sky-800"><Clock className="h-5 w-5 shrink-0" />Today's menu is being verified by HomePlate - ordering opens shortly. You can still <Link to="/request" className="font-semibold underline">request a dish</Link>.</div>}
          {k.withinDeliveryRange && !k.acceptingNow && k.menuReady !== false && <div className="flex items-center gap-3 rounded-2xl bg-amber-50 p-4 text-sm text-amber-800"><Clock className="h-5 w-5 shrink-0" />{k.openNow ? 'The kitchen has paused orders for now.' : `Kitchen is closed now. It opens at ${fmtTime(k.openTime)}.`} You can still <Link to="/request" className="font-semibold underline">request a dish</Link> for later.</div>}

          {/* MENU */}
          <section>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-display text-2xl font-semibold">Today's menu</h2>
              <label className="flex cursor-pointer items-center gap-2 text-sm font-medium"><input type="checkbox" checked={vegOnly} onChange={(e) => setVegOnly(e.target.checked)} className="h-4 w-4 accent-green-600" /><VegMark veg />Veg only</label>
            </div>
            <Tabs value={meal} onChange={setMeal} tabs={MEALS.map((m) => ({ value: m, label: m === 'ALL' ? 'All' : mealLabel[m], count: m === 'ALL' ? k.menu.length : k.menu.filter((i) => i.mealType === m).length }))} />
            {grouped.length === 0 && <p className="card p-8 text-center text-sm text-charcoal-500">No items in this section today.</p>}
            {grouped.map((g) => (
              <div key={g.meal} className="mb-6">
                <h3 className="mb-3 text-sm font-bold uppercase tracking-widest text-charcoal-400">{mealLabel[g.meal]}</h3>
                <div className="space-y-3">
                  {g.items.map((i) => {
                    const qty = cart.kitchenId === k.id ? cart.qtyOf(i.id) : 0;
                    return (
                      <div key={i.id} className="card flex gap-4 p-4">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2"><VegMark veg={i.veg} />{i.todaySpecial && <Badge tone="orange">Today's special</Badge>}</div>
                          <p className="mt-1.5 font-semibold text-charcoal-900">{i.name}</p>
                          <p className="mt-1 font-bold">{rupee(effPrice(i))}{i.offerPrice != null && <s className="ml-2 text-sm font-normal text-charcoal-400">{rupee(i.price)}</s>}
                            {i.servingSize && <span className="ml-2 text-xs font-normal text-charcoal-400">· {i.servingSize}</span>}</p>
                          <p className="mt-1.5 line-clamp-2 text-sm text-charcoal-500">{i.description}</p>
                          {i.quantityAvailable != null && i.quantityAvailable <= 5 && <p className="mt-1 text-xs font-semibold text-saffron-600">Only {i.quantityAvailable} left</p>}
                        </div>
                        <div className="relative w-32 shrink-0 sm:w-36">
                          <img src={i.imageUrl || '/images/veg-leaf-meal.jpg'} alt={i.name} className="aspect-square w-full rounded-xl object-cover" />
                          <div className="absolute -bottom-3 left-1/2 -translate-x-1/2">
                            {qty === 0 ? (
                              <button onClick={() => add(i)} className={cx('rounded-xl border bg-white px-6 py-1.5 text-sm font-bold shadow-card', canOrder ? 'border-brand-200 text-brand-700 hover:bg-brand-50' : 'border-cream-300 text-charcoal-400')}>ADD</button>
                            ) : (
                              <div className="flex items-center gap-3 rounded-xl bg-brand-600 px-2 py-1.5 text-white shadow-card">
                                <button onClick={() => cart.setQty(i.id, qty - 1)} aria-label="Decrease"><Minus className="h-4 w-4" /></button>
                                <span className="w-4 text-center text-sm font-bold">{qty}</span>
                                <button onClick={() => cart.setQty(i.id, qty + 1)} aria-label="Increase"><Plus className="h-4 w-4" /></button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </section>

          {/* ABOUT */}
          <KitchenMealPlans kitchenId={k.id} kitchenName={k.name} canDeliver={!!k.withinDeliveryRange} />

          <section className="card p-6">
            <h2 className="font-display text-xl font-semibold">About the kitchen</h2>
            <div className="mt-4 flex items-center gap-3"><Avatar name={k.ownerName} size="h-12 w-12" /><div><p className="font-semibold">{k.ownerName}</p><p className="text-xs text-charcoal-400">Home chef · member since {fmtDate(t.memberSince)}</p></div></div>
            <p className="mt-4 text-sm leading-relaxed text-charcoal-600">{k.description}</p>
            {k.gallery.length > 0 && <div className="mt-4 grid grid-cols-4 gap-2">{k.gallery.map((g) => <img key={g} src={g} alt="" className="aspect-square rounded-xl object-cover" />)}</div>}
            <div className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
              <div><p className="label">Weekly availability</p><div className="flex gap-1">{DAYS.map((d) => <span key={d} className={cx('rounded-md px-1.5 py-1 text-[11px] font-bold', k.workingDays.includes(d) ? 'bg-brand-50 text-brand-700' : 'bg-cream-100 text-charcoal-300 line-through')}>{d.slice(0, 2)}</span>)}</div></div>
              <div><p className="label">Hours & meals</p><p>{fmtTime(k.openTime)} – {fmtTime(k.closeTime)} · {[k.breakfastAvailable && 'Breakfast', k.lunchAvailable && 'Lunch', k.dinnerAvailable && 'Dinner'].filter(Boolean).join(', ')}</p></div>
            </div>
          </section>

          {/* REVIEWS */}
          <section>
            <h2 className="mb-4 font-display text-2xl font-semibold">Customer reviews</h2>
            <div className="space-y-3">
              {k.reviews.length === 0 && <p className="card p-6 text-sm text-charcoal-500">No reviews yet.</p>}
              {k.reviews.map((r) => (
                <div key={r.id} className="card p-5">
                  <div className="flex items-center justify-between"><div className="flex items-center gap-3"><Avatar name={r.customerName} size="h-8 w-8" /><p className="text-sm font-semibold">{r.customerName}</p></div><span className="text-xs text-charcoal-400">{timeAgo(r.createdAt)}</span></div>
                  <Stars value={r.rating} size="mt-3 h-4 w-4" />
                  {r.comment && <p className="mt-2 text-sm text-charcoal-600">{r.comment}</p>}
                  {r.kitchenReply && <p className="mt-3 rounded-xl bg-cream-100 p-3 text-xs text-charcoal-600"><b>Reply from kitchen:</b> {r.kitchenReply}</p>}
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* SIDEBAR */}
        <aside className="space-y-5 lg:sticky lg:top-24 lg:self-start">
          <div className="card p-5">
            <h3 className="flex items-center gap-2 font-semibold"><ShieldAlert className="h-5 w-5 text-brand-600" />Kitchen trust profile</h3>
            <ul className="mt-4 space-y-3 text-sm">
              {[
                [t.identityVerified, 'Identity document verified'],
                [t.fssaiVerified, `FSSAI registration ${t.fssaiNumber ?? ''}`],
                [t.phoneVerified, 'Mobile number verified'],
              ].map(([ok, label], i) => (
                <li key={i} className="flex items-start gap-2">{ok ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" /> : <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-charcoal-300" />}<span>{label as string}</span></li>
              ))}
              <li className="flex items-start gap-2"><Video className="mt-0.5 h-4 w-4 shrink-0 text-violet-600" /><span>{t.videosApprovedLast30Days} cooking videos approved in 30 days<br /><span className="text-xs text-charcoal-400">Last submitted {fmtDate(t.lastVideoSubmittedOn)}</span></span></li>
              <li className="flex items-start gap-2"><ChefHat className="mt-0.5 h-4 w-4 shrink-0 text-saffron-500" /><span>{t.ordersCompleted} orders delivered</span></li>
              <li className="flex items-start gap-2"><ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-charcoal-400" /><span>{t.complaintsTotal} complaints · {t.complaintsResolved} resolved</span></li>
              {t.lastInspectionAt && <li className="flex items-start gap-2"><BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-sky-600" /><span>Last inspected {fmtDate(t.lastInspectionAt)}</span></li>}
            </ul>
            <p className="mt-4 text-[11px] leading-relaxed text-charcoal-400">Verification and videos are supporting evidence, not a guarantee of food safety. Report any concern from your order page.</p>
          </div>
          {k.latitude && <div className="card p-3"><MapView center={{ lat: k.latitude, lng: k.longitude! }} height="h-48" zoom={14} markers={[{ id: k.id, lat: k.latitude, lng: k.longitude!, label: k.name.split(' ')[0] }]} />
            <p className="px-2 pt-3 text-xs text-charcoal-500"><MapPin className="mr-1 inline h-3.5 w-3.5" />{k.area} · delivers within {k.deliveryRadiusKm} km</p></div>}
          <div className="card space-y-2 p-5 text-sm">
            <p className="flex items-center gap-2"><Truck className="h-4 w-4 text-brand-600" />Delivered by the home chef</p>
            {k.ownerPhone && <a href={`tel:${k.ownerPhone}`} className="flex items-center gap-2 text-brand-700"><Phone className="h-4 w-4" />Call kitchen</a>}
            <Link to="/request" className="flex items-center gap-2 text-brand-700"><ChefHat className="h-4 w-4" />Want something not on the menu? Request it</Link>
          </div>
        </aside>
      </div>

      {cartHere.length > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-[500] p-4">
          <Link to="/cart" className="container-x flex max-w-3xl items-center justify-between rounded-2xl bg-brand-700 px-5 py-4 text-white shadow-lift">
            <span className="flex items-center gap-3"><ShoppingBag className="h-5 w-5" /><span><b>{cartHere.reduce((a, l) => a + l.quantity, 0)} items</b> · {rupee(cartTotal)}</span></span>
            <span className="flex items-center gap-1 font-semibold">View cart <ArrowRight className="h-4 w-4" /></span>
          </Link>
        </div>
      )}

      <ConfirmDialog open={!!conflict} onClose={() => setConflict(null)} title="Start a new cart?"
        message={`Your cart has items from ${cart.kitchenName}. Each home kitchen delivers separately, so you can order from one kitchen at a time. Clear the cart and add this item?`}
        confirmLabel="Clear & add" onConfirm={() => { cart.replaceWith(conflict!, k.id, k.name); setConflict(null); }} />
    </div>
  );
}
