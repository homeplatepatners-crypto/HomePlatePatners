import { useState } from 'react';
import { CheckCircle2, UtensilsCrossed, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { api, errMsg } from '../../api/client';
import { useFetch } from '../../components/useFetch';
import type { MenuItem } from '../../types';
import StatusBadge from '../../components/StatusBadge';
import { EmptyState, ErrorState, Modal, PageHeader, PageLoader, VegMark } from '../../components/ui';
import { fmtTime, mealLabel, rupee } from '../../utils/format';

interface Row { kitchenId: number; kitchenName: string; ownerName: string; area?: string; status: string; required: boolean; publishedAt?: string; remarks?: string; items: MenuItem[] }

const LABEL: Record<string, string> = { PENDING: 'Awaiting verification', VERIFIED: 'Verified', REJECTED: 'Changes requested', NOT_PUBLISHED: 'Not published' };

/** Admin: verify each kitchen's daily menu. Unverified kitchens can't take daily-menu orders. */
export default function AdminMenus() {
  const { data, loading, error, reload } = useFetch<Row[]>('/admin/menus');
  const [rejecting, setRejecting] = useState<Row | null>(null);
  const [remarks, setRemarks] = useState('');

  const review = async (r: Row, action: 'VERIFY' | 'REJECT', why?: string) => {
    try {
      await api.post(`/admin/kitchens/${r.kitchenId}/menu-review`, { action, remarks: why });
      toast.success(action === 'VERIFY' ? `${r.kitchenName}: menu verified` : `${r.kitchenName}: changes requested`);
      setRejecting(null); setRemarks(''); reload(true);
    } catch (e) { toast.error(errMsg(e)); }
  };

  if (loading) return <PageLoader />;
  if (error || !data) return <ErrorState message={error ?? ''} onRetry={reload} />;
  const pending = data.filter((r) => r.status === 'PENDING').length;

  return (
    <div>
      <PageHeader title="Daily menu verification" subtitle={`Kitchens can take orders only after today's menu is verified. ${pending} waiting now.`} />
      {data.length === 0 ? <EmptyState icon={UtensilsCrossed} title="No active kitchens" text="Menus appear here once kitchens are active." /> : (
        <div className="space-y-4">
          {data.map((r) => (
            <div key={r.kitchenId} className="card p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold">{r.kitchenName} <span className="text-sm font-normal text-charcoal-400">· {r.ownerName}{r.area ? ` · ${r.area}` : ''}</span></p>
                  <p className="text-xs text-charcoal-500">{r.publishedAt ? `Published at ${fmtTime(r.publishedAt)}` : 'Not published today'}{r.remarks ? ` · Remarks: ${r.remarks}` : ''}</p>
                </div>
                <StatusBadge status={r.status === 'NOT_PUBLISHED' ? 'DRAFT' : r.status === 'VERIFIED' ? 'VERIFIED' : r.status === 'REJECTED' ? 'REJECTED' : 'PENDING'} />
              </div>
              <p className="mt-1 text-xs font-semibold text-charcoal-500">{LABEL[r.status]}</p>
              {r.status !== 'NOT_PUBLISHED' && (
                <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {r.items.map((i) => (
                    <div key={i.id} className="flex items-center gap-3 rounded-xl bg-cream-50 p-2">
                      {i.imageUrl ? <img src={i.imageUrl} alt="" className="h-12 w-12 rounded-lg object-cover" /> : <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-cream-200"><UtensilsCrossed className="h-5 w-5 text-charcoal-400" /></span>}
                      <div className="min-w-0 flex-1">
                        <p className="flex items-center gap-1.5 truncate text-sm font-medium"><VegMark veg={i.veg} />{i.name}</p>
                        <p className="text-xs text-charcoal-500">{mealLabel[i.mealType]} · {rupee(i.offerPrice ?? i.price)} · {i.quantityAvailable ?? '∞'} portions</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {(r.status === 'PENDING' || r.status === 'VERIFIED' || r.status === 'REJECTED') && (
                <div className="mt-4 flex gap-2">
                  {r.status !== 'VERIFIED' && <button className="btn-primary py-2" onClick={() => review(r, 'VERIFY')}><CheckCircle2 className="h-4 w-4" />Verify menu</button>}
                  {r.status !== 'REJECTED' && <button className="btn-outline py-2 text-red-600" onClick={() => setRejecting(r)}><XCircle className="h-4 w-4" />Request changes</button>}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      <Modal open={!!rejecting} onClose={() => setRejecting(null)} title={`Request changes - ${rejecting?.kitchenName ?? ''}`}>
        <p className="mb-2 text-sm text-charcoal-600">The kitchen is notified and can't take orders until it fixes and republishes the menu.</p>
        <textarea className="input min-h-[90px]" value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="e.g. Price of Chicken Biryani looks wrong / photo is not of the actual dish" />
        <button className="btn-primary mt-3 w-full" disabled={!remarks.trim()} onClick={() => rejecting && review(rejecting, 'REJECT', remarks)}>Send to kitchen</button>
      </Modal>
    </div>
  );
}
