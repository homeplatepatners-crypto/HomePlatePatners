import { useState } from 'react';
import { CalendarClock, ChefHat, Flame, IndianRupee, MapPin, MessageSquare, Send, Users, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { api, errMsg } from '../../api/client';
import { useFetch } from '../../components/useFetch';
import type { CustomRequest, Quotation } from '../../types';
import StatusBadge from '../../components/StatusBadge';
import { ConfirmDialog, EmptyState, ErrorState, Field, Modal, PageHeader, PageLoader, Spinner, Tabs, VegMark } from '../../components/ui';
import { fmtDate, fmtTime, mealLabel, rupee, timeAgo } from '../../utils/format';

interface Row { request: CustomRequest; customerName: string; distanceKm: number; myQuote: Quotation | null; offerCount: number; }

export default function RequestsPage() {
  const open = useFetch<Row[]>('/kitchen/requests');
  const history = useFetch<Row[]>('/kitchen/requests/history');
  const [tab, setTab] = useState<'new' | 'quoted' | 'history'>('new');
  const [quoting, setQuoting] = useState<Row | null>(null);
  const [declining, setDeclining] = useState<Row | null>(null);
  const [q, setQ] = useState({ price: '', prepTimeMinutes: '60', note: '', unavailableItems: '' });
  const [busy, setBusy] = useState(false);

  if (open.loading) return <PageLoader />;
  if (open.error) return <ErrorState message={open.error} onRetry={open.reload} />;
  const fresh = (open.data ?? []).filter((r) => !r.myQuote);
  const quoted = (open.data ?? []).filter((r) => r.myQuote && r.myQuote.status !== 'DECLINED');
  const rows = tab === 'new' ? fresh : tab === 'quoted' ? quoted : (history.data ?? []);

  const startQuote = (r: Row) => {
    setQuoting(r);
    setQ({ price: r.myQuote && r.myQuote.price > 0 ? String(r.myQuote.price) : r.request.budget ? String(r.request.budget) : '', prepTimeMinutes: String(r.myQuote?.prepTimeMinutes || 60), note: r.myQuote?.note ?? '', unavailableItems: r.myQuote?.unavailableItems ?? '' });
  };
  const submitQuote = async () => {
    if (!quoting) return;
    if (!Number(q.price)) return toast.error('Enter your price');
    setBusy(true);
    try {
      await api.post(`/kitchen/requests/${quoting.request.id}/quote`, { price: Number(q.price), prepTimeMinutes: Number(q.prepTimeMinutes), note: q.note, unavailableItems: q.unavailableItems });
      toast.success('Quotation sent to the customer!');
      setQuoting(null); open.reload(true); history.reload(true);
    } catch (e) { toast.error(errMsg(e)); } finally { setBusy(false); }
  };
  const decline = async () => {
    if (!declining) return;
    try { await api.post(`/kitchen/requests/${declining.request.id}/decline`); toast('Request declined'); setDeclining(null); open.reload(true); }
    catch (e) { toast.error(errMsg(e)); }
  };

  return (
    <div>
      <PageHeader title="Custom food requests" subtitle="Customers near you asking for homemade dishes. Send your price and preparation time." />
      <Tabs value={tab} onChange={setTab} tabs={[{ value: 'new', label: 'New requests', count: fresh.length }, { value: 'quoted', label: 'Quoted · awaiting customer', count: quoted.length }, { value: 'history', label: 'History', count: history.data?.length }]} />
      {rows.length === 0 ? <EmptyState icon={ChefHat} title={tab === 'new' ? 'No new requests right now' : 'Nothing here yet'} text="New requests from customers within your delivery radius appear here automatically." /> : (
        <div className="grid gap-4 lg:grid-cols-2">
          {rows.map((r) => {
            const req = r.request;
            return (
              <div key={req.id} className="card flex flex-col p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2"><VegMark veg={req.veg} /><h3 className="text-lg font-semibold">{req.dishName}</h3></div>
                    <p className="mt-0.5 text-xs text-charcoal-400">{req.requestNumber} · {r.customerName} · {timeAgo(req.createdAt)}</p>
                  </div>
                  {r.myQuote ? <StatusBadge status={r.myQuote.status === 'PENDING' ? 'SUBMITTED' : r.myQuote.status} /> : <span className="rounded-full bg-saffron-50 px-2.5 py-1 text-xs font-bold text-saffron-700">{r.offerCount} offers so far</span>}
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <p className="flex items-center gap-2"><Users className="h-4 w-4 text-charcoal-400" />{req.quantity} · serves {req.servings}</p>
                  <p className="flex items-center gap-2"><Flame className="h-4 w-4 text-charcoal-400" />{req.spiceLevel}{req.cuisineStyle && ` · ${req.cuisineStyle}`}</p>
                  <p className="flex items-center gap-2"><CalendarClock className="h-4 w-4 text-charcoal-400" />{mealLabel[req.mealSlot]} · {fmtDate(req.requiredDate)}{req.preferredTime && `, ${fmtTime(req.preferredTime)}`}</p>
                  <p className="flex items-center gap-2"><MapPin className="h-4 w-4 text-charcoal-400" />{r.distanceKm} km · {req.deliveryArea}</p>
                  {req.budget && <p className="flex items-center gap-2"><IndianRupee className="h-4 w-4 text-charcoal-400" />Budget {rupee(req.budget)}</p>}
                </div>
                {req.instructions && <p className="mt-3 flex gap-2 rounded-xl bg-cream-100 p-3 text-sm text-charcoal-600"><MessageSquare className="mt-0.5 h-4 w-4 shrink-0 text-charcoal-400" />{req.instructions}</p>}
                <p className="mt-2 text-xs text-charcoal-400">Deliver to: {req.deliveryAddress}</p>
                {r.myQuote && r.myQuote.status !== 'DECLINED' && <p className="mt-3 rounded-xl bg-brand-50 p-3 text-sm text-brand-800">Your quote: <b>{rupee(r.myQuote.price)}</b> · {r.myQuote.prepTimeMinutes} min prep</p>}
                {tab !== 'history' && (
                  <div className="mt-auto flex gap-2 pt-4">
                    <button className="btn-primary flex-1" onClick={() => startQuote(r)}><Send className="h-4 w-4" />{r.myQuote ? 'Update quote' : 'Accept & quote price'}</button>
                    {!r.myQuote && <button className="btn-outline text-red-600" onClick={() => setDeclining(r)}><X className="h-4 w-4" />Reject</button>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <Modal open={!!quoting} onClose={() => setQuoting(null)} title={`Quote for ${quoting?.request.dishName}`} size="sm"
        footer={<><button className="btn-ghost" onClick={() => setQuoting(null)}>Cancel</button><button className="btn-primary" onClick={submitQuote} disabled={busy}>{busy && <Spinner className="h-4 w-4 text-white" />}Send quotation</button></>}>
        <div className="space-y-4">
          <p className="rounded-xl bg-cream-100 p-3 text-sm">{quoting?.request.quantity} · {quoting?.request.spiceLevel} · {quoting && mealLabel[quoting.request.mealSlot]} on {fmtDate(quoting?.request.requiredDate)}</p>
          <Field label="Your price for this dish (₹)" hint="Delivery charge and platform fee are added separately for the customer."><input className="input text-lg font-semibold" type="number" min={1} value={q.price} onChange={(e) => setQ({ ...q, price: e.target.value })} autoFocus /></Field>
          <Field label="Preparation time (minutes)"><input className="input" type="number" min={5} value={q.prepTimeMinutes} onChange={(e) => setQ({ ...q, prepTimeMinutes: e.target.value })} /></Field>
          <Field label="Items you can't provide / substitutions (optional)" hint="Shown clearly to the customer before they choose your offer.">
            <input className="input" value={q.unavailableItems} onChange={(e) => setQ({ ...q, unavailableItems: e.target.value })} placeholder="e.g. No country chicken today - will use broiler" />
          </Field>
          <Field label="Message to customer"><textarea className="input" value={q.note} onChange={(e) => setQ({ ...q, note: e.target.value })} placeholder="I'll cook it Chettinad style with country chicken…" /></Field>
        </div>
      </Modal>
      <ConfirmDialog open={!!declining} onClose={() => setDeclining(null)} onConfirm={decline} tone="danger" title="Reject this request?" confirmLabel="Reject" message="The request will be hidden from your list." />
    </div>
  );
}
