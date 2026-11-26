import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { BadgeCheck, Ban, CheckCircle2, ClipboardCheck, ExternalLink, FileText, Mail, MapPin, Phone, Play, Power, ShieldCheck, Store, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { api, errMsg } from '../../api/client';
import { useFetch } from '../../components/useFetch';
import type { Complaint, CookingVideo, Kitchen, MenuItem, Order, TrustProfile } from '../../types';
import DataTable from '../../components/DataTable';
import StatusBadge from '../../components/StatusBadge';
import { MapView } from '../../components/Maps';
import VideoCard from '../../components/VideoCard';
import { Avatar, ConfirmDialog, EmptyState, ErrorState, PageHeader, PageLoader, Tabs, VegMark } from '../../components/ui';
import { fmtDate, fmtDateTime, fmtTime, rupee, timeAgo } from '../../utils/format';

interface Row { kitchen: Kitchen; subscriptionStatus: string; totalOrders: number; }
type Action = 'approve' | 'reject' | 'suspend' | 'activate' | 'request_docs' | 'mark_inspected';
const ACTION_LABEL: Record<Action, string> = { approve: 'Approve', reject: 'Reject', suspend: 'Suspend', activate: 'Activate', request_docs: 'Request documents', mark_inspected: 'Mark inspected' };

/** Hook + dialog for kitchen status decisions (with remarks). */
function useDecision(onDone: () => void) {
  const [state, setState] = useState<{ k: Kitchen; action: Action } | null>(null);
  const [remarks, setRemarks] = useState('');
  const [busy, setBusy] = useState(false);
  const needsRemarks = state && ['reject', 'suspend', 'request_docs'].includes(state.action);
  const run = async () => {
    if (!state) return;
    if (needsRemarks && !remarks.trim()) return toast.error('Please add remarks for the kitchen owner');
    setBusy(true);
    try {
      await api.patch(`/admin/kitchens/${state.k.id}/status`, { action: state.action, remarks });
      toast.success(`${state.k.name}: ${ACTION_LABEL[state.action]} done`);
      setState(null); setRemarks(''); onDone();
    } catch (e) { toast.error(errMsg(e)); } finally { setBusy(false); }
  };
  const dialog = (
    <ConfirmDialog open={!!state} onClose={() => setState(null)} onConfirm={run} busy={busy}
      tone={state && ['reject', 'suspend'].includes(state.action) ? 'danger' : 'primary'}
      title={state ? `${ACTION_LABEL[state.action]} ${state.k.name}?` : ''} confirmLabel={state ? ACTION_LABEL[state.action] : ''}>
      <p className="mb-3 text-sm text-charcoal-600">
        {state?.action === 'approve' && 'Documents pending review will be marked verified. The owner can then activate and start the free trial.'}
        {state?.action === 'activate' && 'The kitchen goes live immediately and the free trial starts (if not started).'}
        {state?.action === 'suspend' && 'The kitchen is hidden from customers and cannot receive orders.'}
        {state?.action === 'reject' && 'The owner is notified and can resubmit after making changes.'}
        {state?.action === 'request_docs' && 'The owner will be asked to upload additional documents.'}
        {state?.action === 'mark_inspected' && 'Records a physical inspection today on the trust profile.'}
      </p>
      <textarea className="input" value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder={needsRemarks ? 'Reason / message to the owner (required)' : 'Remarks (optional)'} />
    </ConfirmDialog>
  );
  return { open: (k: Kitchen, action: Action) => { setRemarks(''); setState({ k, action }); }, dialog };
}

function actionsFor(k: Kitchen): Action[] {
  switch (k.status) {
    case 'UNDER_REVIEW': case 'DOCS_REQUESTED': return ['approve', 'request_docs', 'reject'];
    case 'PENDING': return ['reject'];
    case 'APPROVED': return ['activate', 'suspend'];
    case 'ACTIVE': return ['suspend', 'mark_inspected'];
    case 'SUSPENDED': return ['activate'];
    case 'REJECTED': return ['approve'];
    default: return [];
  }
}

export function KitchensPage() {
  const { data, loading, error, reload } = useFetch<Row[]>('/admin/kitchens');
  const [status, setStatus] = useState('ALL');
  const nav = useNavigate();
  const d = useDecision(() => reload(true));
  if (loading) return <PageLoader />;
  if (error || !data) return <ErrorState message={error ?? ''} onRetry={reload} />;
  const statuses = ['ALL', 'ACTIVE', 'UNDER_REVIEW', 'APPROVED', 'PENDING', 'SUSPENDED', 'REJECTED'];
  const rows = data.filter((r) => status === 'ALL' || r.kitchen.status === status);

  return (
    <div>
      <PageHeader title="Kitchen management" subtitle={`${data.length} kitchens registered`} />
      <Tabs value={status} onChange={setStatus} tabs={statuses.map((s) => ({ value: s, label: s === 'ALL' ? 'All' : s.replace('_', ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()), count: s === 'ALL' ? data.length : data.filter((r) => r.kitchen.status === s).length }))} />
      <DataTable rows={rows} onRowClick={(r) => nav(`/admin/kitchens/${r.kitchen.id}`)}
        searchText={(r) => `${r.kitchen.name} ${r.kitchen.owner.fullName} ${r.kitchen.owner.phone} ${r.kitchen.area}`}
        columns={[
          { key: 'id', header: 'Kitchen ID', render: (r) => <span className="font-mono text-xs">KT{1000 + r.kitchen.id}</span> },
          { key: 'n', header: 'Kitchen', render: (r) => <div className="flex items-center gap-3"><img src={r.kitchen.coverImage || '/images/spices.jpg'} className="h-9 w-9 rounded-lg object-cover" alt="" /><b>{r.kitchen.name}</b></div> },
          { key: 'o', header: 'Owner', render: (r) => r.kitchen.owner.fullName },
          { key: 'm', header: 'Mobile', render: (r) => r.kitchen.owner.phone },
          { key: 'l', header: 'Location', render: (r) => r.kitchen.area ?? '—' },
          { key: 'd', header: 'Registered', render: (r) => fmtDate(r.kitchen.createdAt) },
          { key: 'v', header: 'Verification', render: (r) => <StatusBadge status={r.kitchen.status} /> },
          { key: 's', header: 'Subscription', render: (r) => <StatusBadge status={r.subscriptionStatus} /> },
          { key: 't', header: 'Orders', render: (r) => r.totalOrders },
          { key: 'a', header: 'Actions', render: (r) => (
            <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
              <Link to={`/admin/kitchens/${r.kitchen.id}`} className="rounded-lg px-2 py-1 text-xs font-semibold text-brand-700 hover:bg-brand-50">View</Link>
              {actionsFor(r.kitchen).filter((a) => a !== 'mark_inspected' && a !== 'request_docs').map((a) => (
                <button key={a} onClick={() => d.open(r.kitchen, a)} className={`rounded-lg px-2 py-1 text-xs font-semibold ${['reject', 'suspend'].includes(a) ? 'text-red-600 hover:bg-red-50' : 'text-brand-700 hover:bg-brand-50'}`}>{ACTION_LABEL[a]}</button>
              ))}
            </div>) },
        ]} />
      {d.dialog}
    </div>
  );
}

export function VerificationQueue() {
  const { data, loading, error, reload } = useFetch<Row[]>('/admin/kitchens');
  if (loading) return <PageLoader />;
  if (error || !data) return <ErrorState message={error ?? ''} onRetry={reload} />;
  const queue = data.filter((r) => ['UNDER_REVIEW', 'DOCS_REQUESTED'].includes(r.kitchen.status));
  return (
    <div>
      <PageHeader title="Kitchen verification" subtitle="Review identity, address, kitchen photos and food business registration before approving." />
      {queue.length === 0 ? <EmptyState icon={ShieldCheck} title="No kitchens waiting for verification" /> : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {queue.map(({ kitchen: k }) => (
            <Link key={k.id} to={`/admin/kitchens/${k.id}`} className="card overflow-hidden transition hover:shadow-lift">
              <img src={k.coverImage || '/images/spices.jpg'} alt="" className="h-36 w-full object-cover" />
              <div className="p-4">
                <div className="flex items-center justify-between"><p className="font-semibold">{k.name}</p><StatusBadge status={k.status} /></div>
                <p className="text-xs text-charcoal-400">{k.owner.fullName} · {k.area} · submitted {timeAgo(k.submittedAt)}</p>
                <div className="mt-3 flex flex-wrap gap-2 text-xs">
                  <span className="flex items-center gap-1">{k.idProofUrl ? <CheckCircle2 className="h-3.5 w-3.5 text-brand-600" /> : <XCircle className="h-3.5 w-3.5 text-red-500" />}ID proof</span>
                  <span className="flex items-center gap-1">{k.fssaiNumber ? <CheckCircle2 className="h-3.5 w-3.5 text-brand-600" /> : <XCircle className="h-3.5 w-3.5 text-amber-500" />}FSSAI</span>
                  <span className="flex items-center gap-1">{k.latitude ? <CheckCircle2 className="h-3.5 w-3.5 text-brand-600" /> : <XCircle className="h-3.5 w-3.5 text-red-500" />}GPS</span>
                  <span className="flex items-center gap-1">{k.owner.phoneVerified ? <CheckCircle2 className="h-3.5 w-3.5 text-brand-600" /> : <XCircle className="h-3.5 w-3.5 text-red-500" />}Mobile OTP</span>
                </div>
                <p className="mt-3 text-sm font-semibold text-brand-700">Open verification workspace →</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export function DocumentsPage() {
  const { data, loading, error, reload } = useFetch<Row[]>('/admin/kitchens');
  const setDoc = async (k: Kitchen, document: 'identity' | 'fssai', status: 'VERIFIED' | 'REJECTED') => {
    try { await api.patch(`/admin/kitchens/${k.id}/documents`, { document, status }); toast.success('Document status updated'); reload(true); }
    catch (e) { toast.error(errMsg(e)); }
  };
  if (loading) return <PageLoader />;
  if (error || !data) return <ErrorState message={error ?? ''} onRetry={reload} />;
  const DocCell = ({ k, doc }: { k: Kitchen; doc: 'identity' | 'fssai' }) => {
    const url = doc === 'identity' ? k.idProofUrl : k.fssaiCertificateUrl;
    const st = doc === 'identity' ? k.idProofStatus : k.fssaiStatus;
    if (!url) return <span className="text-xs text-charcoal-400">Not uploaded</span>;
    return (
      <div className="flex items-center gap-2">
        <a href={url} target="_blank" rel="noreferrer" className="text-brand-700" title="Open document"><FileText className="h-4 w-4" /></a>
        <StatusBadge status={st} />
        {st !== 'VERIFIED' && <button onClick={() => setDoc(k, doc, 'VERIFIED')} className="text-xs font-semibold text-brand-700">Verify</button>}
        {st !== 'REJECTED' && <button onClick={() => setDoc(k, doc, 'REJECTED')} className="text-xs font-semibold text-red-600">Reject</button>}
      </div>
    );
  };
  return (
    <div>
      <PageHeader title="Document verification" subtitle="Identity and food safety (FSSAI) documents are verified separately." />
      <DataTable rows={data} searchText={(r) => `${r.kitchen.name} ${r.kitchen.owner.fullName} ${r.kitchen.fssaiNumber}`} columns={[
        { key: 'k', header: 'Kitchen', render: (r) => <Link to={`/admin/kitchens/${r.kitchen.id}`} className="font-semibold hover:text-brand-700">{r.kitchen.name}</Link> },
        { key: 'id', header: 'ID type / number', render: (r) => <span className="text-xs">{r.kitchen.idProofType ?? '—'}<br />{r.kitchen.idProofNumber}</span> },
        { key: 'idd', header: 'Identity document', render: (r) => <DocCell k={r.kitchen} doc="identity" /> },
        { key: 'f', header: 'FSSAI number', render: (r) => <span className="font-mono text-xs">{r.kitchen.fssaiNumber ?? '—'}</span> },
        { key: 'fd', header: 'FSSAI certificate', render: (r) => <DocCell k={r.kitchen} doc="fssai" /> },
        { key: 's', header: 'Kitchen status', render: (r) => <StatusBadge status={r.kitchen.status} /> },
      ]} />
    </div>
  );
}

interface Detail { kitchen: Kitchen; trust: TrustProfile; subscription: { current?: { planName: string; endDate: string; status: string } | null; valid: boolean };
  menu: MenuItem[]; videos: CookingVideo[]; recentOrders: Order[]; complaints: Complaint[]; }

export function KitchenDetailAdmin() {
  const { id } = useParams();
  const { data, loading, error, reload } = useFetch<Detail>(`/admin/kitchens/${id}`);
  const [tab, setTab] = useState<'verify' | 'menu' | 'videos' | 'orders' | 'complaints'>('verify');
  const d = useDecision(() => reload(true));
  if (loading) return <PageLoader />;
  if (error || !data) return <ErrorState message={error ?? ''} onRetry={reload} />;
  const k = data.kitchen;
  const setDoc = async (document: 'identity' | 'fssai', status: 'VERIFIED' | 'REJECTED') => {
    try { await api.patch(`/admin/kitchens/${k.id}/documents`, { document, status }); toast.success('Updated'); reload(true); } catch (e) { toast.error(errMsg(e)); }
  };

  return (
    <div>
      <div className="card mt-3 overflow-hidden">
        <div className="relative h-40"><img src={k.coverImage || '/images/spices.jpg'} alt="" className="h-full w-full object-cover" /><div className="absolute inset-0 bg-gradient-to-t from-charcoal-900/80 to-transparent" /></div>
        <div className="flex flex-col gap-4 p-5 md:flex-row md:items-center">
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2"><h1 className="font-display text-2xl font-semibold">{k.name}</h1><StatusBadge status={k.status} /><span className="font-mono text-xs text-charcoal-400">KT{1000 + k.id}</span></div>
            <p className="text-sm text-charcoal-500">{k.cuisines} · {k.foodType} · {k.area}, {k.city} · registered {fmtDate(k.createdAt)}</p>
            {k.adminRemarks && <p className="mt-2 text-xs text-saffron-700">Remarks: {k.adminRemarks}</p>}
          </div>
          <div className="flex flex-wrap gap-2">
            {actionsFor(k).map((a) => (
              <button key={a} onClick={() => d.open(k, a)} className={['reject', 'suspend'].includes(a) ? 'btn-outline text-red-600' : a === 'approve' || a === 'activate' ? 'btn-primary' : 'btn-outline'}>
                {a === 'approve' && <BadgeCheck className="h-4 w-4" />}{a === 'activate' && <Power className="h-4 w-4" />}{a === 'suspend' && <Ban className="h-4 w-4" />}{a === 'mark_inspected' && <ClipboardCheck className="h-4 w-4" />}{ACTION_LABEL[a]}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-6"><Tabs value={tab} onChange={setTab} tabs={[{ value: 'verify', label: 'Verification workspace' }, { value: 'menu', label: 'Menu', count: data.menu.length }, { value: 'videos', label: 'Videos', count: data.videos.length }, { value: 'orders', label: 'Recent orders' }, { value: 'complaints', label: 'Complaints', count: data.complaints.length }]} /></div>

      {tab === 'verify' && (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="card space-y-4 p-5">
            <h3 className="font-semibold">Owner information</h3>
            <div className="flex items-center gap-3"><Avatar name={k.owner.fullName} size="h-12 w-12" /><div><p className="font-semibold">{k.owner.fullName}</p><p className="text-xs text-charcoal-400">@{k.owner.username} · joined {fmtDate(k.owner.createdAt)}</p></div></div>
            <p className="flex items-center gap-2 text-sm"><Phone className="h-4 w-4 text-charcoal-400" />{k.owner.phone} {k.owner.phoneVerified && <span className="flex items-center gap-1 text-xs font-semibold text-brand-700"><CheckCircle2 className="h-3.5 w-3.5" />OTP verified</span>}</p>
            <p className="flex items-center gap-2 text-sm"><Mail className="h-4 w-4 text-charcoal-400" />{k.owner.email ?? '—'}</p>
            <div className="border-t border-cream-200 pt-4">
              <h3 className="font-semibold">Kitchen address</h3>
              <p className="mt-2 flex gap-2 text-sm"><MapPin className="h-4 w-4 shrink-0 text-charcoal-400" />{k.address}, {k.area}, {k.city}, {k.district}, {k.state} {k.pincode}</p>
              <p className="mt-1 text-xs text-charcoal-400">GPS {k.latitude ?? '—'}, {k.longitude ?? '—'} · delivery radius {k.deliveryRadiusKm} km</p>
            </div>
            {k.latitude && <MapView center={{ lat: k.latitude, lng: k.longitude! }} radiusKm={k.deliveryRadiusKm} zoom={13} height="h-56" markers={[{ id: k.id, lat: k.latitude, lng: k.longitude!, label: k.name.split(' ')[0] }]} />}
            <div className="border-t border-cream-200 pt-4 text-sm">
              <h3 className="font-semibold">Operations</h3>
              <p className="mt-1 text-charcoal-600">{fmtTime(k.openTime)} – {fmtTime(k.closeTime)} · {k.workingDays} · max {k.maxDailyOrders}/day · {k.selfDelivery ? 'self-delivery' : 'no delivery'}</p>
            </div>
          </div>
          <div className="space-y-6">
            {(['identity', 'fssai'] as const).map((doc) => {
              const url = doc === 'identity' ? k.idProofUrl : k.fssaiCertificateUrl;
              const st = doc === 'identity' ? k.idProofStatus : k.fssaiStatus;
              return (
                <div key={doc} className="card p-5">
                  <div className="flex items-center justify-between"><h3 className="font-semibold">{doc === 'identity' ? `Identity document · ${k.idProofType ?? ''}` : `Food business registration · ${k.fssaiType ?? 'FSSAI'}`}</h3><StatusBadge status={st} /></div>
                  <p className="mt-1 font-mono text-xs text-charcoal-500">{doc === 'identity' ? k.idProofNumber : k.fssaiNumber ?? 'Not provided'}</p>
                  {url ? (url.endsWith('.pdf') ? <a href={url} target="_blank" rel="noreferrer" className="btn-outline mt-3"><FileText className="h-4 w-4" />Open PDF<ExternalLink className="h-3.5 w-3.5" /></a>
                    : <a href={url} target="_blank" rel="noreferrer"><img src={url} alt="" className="mt-3 h-44 w-full rounded-xl object-cover ring-1 ring-black/5" /></a>)
                    : <p className="mt-3 rounded-xl bg-cream-100 p-4 text-center text-sm text-charcoal-400">Not uploaded</p>}
                  {doc === 'identity' && k.idProofBackUrl && (k.idProofBackUrl.endsWith('.pdf')
                    ? <a href={k.idProofBackUrl} target="_blank" rel="noreferrer" className="btn-outline mt-2"><FileText className="h-4 w-4" />Open back side (PDF)</a>
                    : <a href={k.idProofBackUrl} target="_blank" rel="noreferrer" title="Back side"><img src={k.idProofBackUrl} alt="ID back side" className="mt-2 h-44 w-full rounded-xl object-cover ring-1 ring-black/5" /></a>)}
                  {url && <div className="mt-3 flex gap-2"><button className="btn-primary flex-1 py-2" onClick={() => setDoc(doc, 'VERIFIED')}><CheckCircle2 className="h-4 w-4" />Verify</button><button className="btn-outline flex-1 py-2 text-red-600" onClick={() => setDoc(doc, 'REJECTED')}><XCircle className="h-4 w-4" />Reject</button></div>}
                </div>
              );
            })}
            <div className="card p-5">
              <h3 className="font-semibold">Kitchen photographs</h3>
              <div className="mt-3 grid grid-cols-3 gap-2">{(k.galleryImages ?? k.coverImage ?? '').split(',').filter(Boolean).map((g) => <a key={g} href={g} target="_blank" rel="noreferrer"><img src={g} alt="" className="aspect-square rounded-xl object-cover" /></a>)}</div>
              <p className="mt-3 text-sm text-charcoal-600">{k.description}</p>
            </div>
            <div className="card grid grid-cols-2 gap-3 p-5 text-sm">
              <p>Rating <b>{data.trust.rating} ({data.trust.ratingCount})</b></p>
              <p>Orders delivered <b>{data.trust.ordersCompleted}</b></p>
              <p>Videos approved (30d) <b>{data.trust.videosApprovedLast30Days}</b></p>
              <p>Complaints <b>{data.trust.complaintsTotal}</b></p>
              <p>Subscription <b>{data.subscription.current?.planName ?? '—'}</b></p>
              <p>Last inspection <b>{fmtDate(data.trust.lastInspectionAt)}</b></p>
            </div>
          </div>
        </div>
      )}
      {tab === 'menu' && (data.menu.length === 0 ? <EmptyState icon={Store} title="No menu items yet" /> :
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{data.menu.map((m) => (
          <div key={m.id} className="card flex gap-3 p-3"><img src={m.imageUrl} alt="" className="h-16 w-16 rounded-lg object-cover" /><div className="min-w-0"><p className="flex items-center gap-1.5 text-sm font-semibold"><VegMark veg={m.veg} />{m.name}</p><p className="text-xs text-charcoal-400">{m.mealType} · {rupee(m.offerPrice ?? m.price)} · {m.available ? 'available' : 'unavailable'}</p></div></div>
        ))}</div>)}
      {tab === 'videos' && <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{data.videos.map((v) => <VideoCard key={v.id} v={v} />)}{data.videos.length === 0 && <EmptyState icon={Play} title="No videos" />}</div>}
      {tab === 'orders' && <DataTable rows={data.recentOrders} columns={[
        { key: 'n', header: 'Order', render: (o) => <b>{o.orderNumber}</b> }, { key: 'c', header: 'Customer', render: (o) => o.customer.fullName },
        { key: 'd', header: 'Date', render: (o) => fmtDateTime(o.createdAt) }, { key: 't', header: 'Total', render: (o) => rupee(o.totalAmount) },
        { key: 's', header: 'Status', render: (o) => <StatusBadge status={o.status} /> }]} />}
      {tab === 'complaints' && <div className="space-y-3">{data.complaints.map((c) => <div key={c.id} className="card p-4"><div className="flex justify-between"><b>{c.subject}</b><StatusBadge status={c.status} /></div><p className="text-sm text-charcoal-600">{c.description}</p></div>)}{data.complaints.length === 0 && <EmptyState title="No complaints" />}</div>}
      {d.dialog}
    </div>
  );
}
