import { Link } from 'react-router-dom';
import { ChefHat, ChevronRight, Plus, Timer } from 'lucide-react';
import { useFetch } from '../../components/useFetch';
import type { CustomRequest, Order } from '../../types';
import StatusBadge from '../../components/StatusBadge';
import { EmptyState, ErrorState, PageHeader, PageLoader, VegMark } from '../../components/ui';
import { fmtDate, mealLabel, rupee, timeAgo } from '../../utils/format';

interface Row { request: CustomRequest; offerCount: number; lowestOffer?: number; order?: Order | null;
  fastestPrepMinutes?: number | null; selectedPrepMinutes?: number | null; selectedKitchen?: string; }

const prepText = (m?: number | null) => (m == null ? '' : m >= 60 ? `${Math.floor(m / 60)} h ${m % 60 ? `${m % 60} min` : ''}`.trim() : `${m} min`);

export default function MyRequests() {
  const { data, loading, error, reload } = useFetch<Row[]>('/customer/requests');
  return (
    <div className="container-x py-8">
      <PageHeader title="My dish requests" subtitle="Custom homemade food requests and the offers you received"
        actions={<Link to="/request" className="btn-accent"><Plus className="h-4 w-4" />New request</Link>} />
      {loading ? <PageLoader /> : error ? <ErrorState message={error} onRetry={reload} /> : !data?.length ? (
        <EmptyState icon={ChefHat} title="No requests yet" text="Ask nearby home chefs to cook exactly what you're craving." action={<Link to="/request" className="btn-primary">Request a dish</Link>} />
      ) : (
        <div className="space-y-3">
          {data.map(({ request: r, offerCount, lowestOffer, order, fastestPrepMinutes, selectedPrepMinutes, selectedKitchen }) => (
            <Link key={r.id} to={`/my-requests/${r.id}`} className="card flex items-center gap-4 p-5 transition hover:shadow-lift">
              <div className="hidden h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-saffron-50 sm:flex"><ChefHat className="h-7 w-7 text-saffron-600" /></div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2"><VegMark veg={r.veg} /><p className="font-semibold">{r.dishName}</p><StatusBadge status={order && r.status === 'CONFIRMED' ? order.status : r.status} /></div>
                <p className="mt-1 text-sm text-charcoal-500">{r.quantity} · {r.spiceLevel} · {mealLabel[r.mealSlot]} on {fmtDate(r.requiredDate)}</p>
                <p className="mt-1 text-xs text-charcoal-400">{r.requestNumber} · {timeAgo(r.createdAt)}</p>
                {(selectedPrepMinutes != null || fastestPrepMinutes != null) && (
                  <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-700">
                    <Timer className="h-3.5 w-3.5" />
                    {selectedPrepMinutes != null
                      ? `Preparation time: ${prepText(selectedPrepMinutes)}${selectedKitchen ? ` · ${selectedKitchen}` : ''}`
                      : `Fastest offer: ready in ${prepText(fastestPrepMinutes)}`}
                  </p>
                )}
              </div>
              <div className="text-right">
                {offerCount > 0 ? <><p className="text-sm font-bold text-brand-700">{offerCount} offer{offerCount > 1 ? 's' : ''}</p><p className="text-xs text-charcoal-400">from {rupee(lowestOffer)}</p></>
                  : <p className="text-xs text-charcoal-400">Waiting for offers</p>}
              </div>
              <ChevronRight className="h-5 w-5 text-charcoal-300" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
