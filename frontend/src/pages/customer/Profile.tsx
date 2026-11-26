import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { MapPin, Save } from 'lucide-react';
import { api, errMsg } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { nearestArea, useLocationCtx } from '../../context/LocationContext';
import { useFetch } from '../../components/useFetch';
import { MapPicker } from '../../components/Maps';
import type { Complaint } from '../../types';
import StatusBadge from '../../components/StatusBadge';
import { Avatar, Field, PageHeader, Spinner } from '../../components/ui';
import { fmtDate } from '../../utils/format';

export default function Profile() {
  const { user, refresh } = useAuth();
  const { location, setLocation } = useLocationCtx();
  const [params] = useSearchParams();
  const nav = useNavigate();
  const setup = params.get('setup') === 'address';
  const complaints = useFetch<Complaint[]>('/customer/complaints');
  const [f, setF] = useState({ fullName: '', email: '', address: '', hometown: '' });
  const [pin, setPin] = useState<{ lat: number | null; lng: number | null }>({ lat: null, lng: null });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) return;
    setF({ fullName: user.fullName, email: user.email ?? '', address: user.address ?? '', hometown: user.hometown ?? '' });
    setPin(user.latitude != null && user.longitude != null ? { lat: user.latitude, lng: user.longitude } : { lat: null, lng: null });
  }, [user]);

  const area = pin.lat != null && pin.lng != null ? nearestArea(pin.lat, pin.lng) : null;

  const save = async () => {
    if (setup && (pin.lat == null || !f.address.trim())) return toast.error('Pin your location on the map and enter your address');
    setBusy(true);
    try {
      await api.put('/customer/profile', {
        ...f, ...(pin.lat != null ? { latitude: pin.lat, longitude: pin.lng, area: area?.far ? 'Other' : area?.name } : {}),
      });
      if (pin.lat != null && pin.lng != null) {
        // Use the saved address as the delivery location for discovery, cart and requests.
        setLocation({ label: area?.far ? 'Home' : area!.name, address: f.address.trim() || `${area?.name}, Coimbatore`, lat: pin.lat, lng: pin.lng });
      }
      await refresh();
      toast.success(setup ? 'Address saved - find kitchens near you!' : 'Profile saved');
      if (setup) nav('/kitchens');
    } catch (e) { toast.error(errMsg(e)); } finally { setBusy(false); }
  };

  return (
    <div className="container-x py-6">
      <PageHeader title={setup ? 'Set your delivery address' : 'My profile'}
        subtitle={setup ? 'Pin your home, hostel or PG on the map so we can show kitchens that deliver to you.' : undefined} />
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <div className="card p-6">
            <h3 className="mb-1 flex items-center gap-2 font-semibold"><MapPin className="h-5 w-5 text-saffron-500" />Delivery address</h3>
            <p className="mb-4 text-xs text-charcoal-500">Tap "Use my current location" or click / drag the pin to your exact building.</p>
            <MapPicker value={pin} onChange={(lat, lng) => setPin({ lat, lng })} pinLabel="Home" height="h-64"
              gpsLabel="Use my current location" />
            {area && <p className="mt-2 text-xs font-medium text-brand-700">{area.far ? 'Outside our current Coimbatore areas' : `Area: near ${area.name}`}</p>}
            <Field label="Full address" className="mt-4">
              <textarea className="input min-h-[80px]" value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })}
                placeholder="Door no, building / hostel name, street, landmark" />
            </Field>
            {!setup && pin.lat == null && location && <p className="mt-2 text-xs text-charcoal-400">Currently browsing near {location.label}.</p>}
          </div>

          {!setup && (
            <div className="card p-6">
              <div className="mb-6 flex items-center gap-4"><Avatar name={user?.fullName} size="h-16 w-16" /><div><p className="text-lg font-semibold">{user?.fullName}</p><p className="text-sm text-charcoal-400">+91 {user?.phone} · joined {fmtDate(user?.createdAt)}</p></div></div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Name"><input className="input" value={f.fullName} onChange={(e) => setF({ ...f, fullName: e.target.value })} /></Field>
                <Field label="Mobile (verified)"><input className="input bg-cream-50" value={`+91 ${user?.phone ?? ''}`} disabled /></Field>
                <Field label="Email"><input className="input" type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></Field>
                <Field label="Hometown (optional)"><input className="input" value={f.hometown} onChange={(e) => setF({ ...f, hometown: e.target.value })} placeholder="e.g. Madurai" /></Field>
              </div>
            </div>
          )}
          <button className="btn-primary" onClick={save} disabled={busy}>{busy ? <Spinner className="h-4 w-4 text-white" /> : <Save className="h-4 w-4" />}{setup ? 'Save address & find kitchens' : 'Save changes'}</button>
          {setup && <button className="btn-ghost ml-2" onClick={() => nav('/kitchens')}>Skip for now</button>}
        </div>
        {!setup && (
          <div className="card h-fit p-6">
            <h3 className="font-semibold">My complaints</h3>
            <div className="mt-3 space-y-3">
              {complaints.data?.length === 0 && <p className="text-sm text-charcoal-400">No complaints raised.</p>}
              {complaints.data?.map((c) => (
                <div key={c.id} className="rounded-xl bg-cream-50 p-3 text-sm">
                  <div className="flex items-center justify-between gap-2"><p className="font-medium">{c.subject}</p><StatusBadge status={c.status} /></div>
                  <p className="text-xs text-charcoal-400">{c.kitchen?.name} · {fmtDate(c.createdAt)}</p>
                  {c.resolution && <p className="mt-1 text-xs text-brand-700">{c.resolution}</p>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
