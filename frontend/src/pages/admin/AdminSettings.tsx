import { useEffect, useState } from 'react';
import { Save } from 'lucide-react';
import toast from 'react-hot-toast';
import { api, errMsg } from '../../api/client';
import { useFetch } from '../../components/useFetch';
import type { PlatformSettings } from '../../types';
import { ErrorState, Field, PageHeader, PageLoader, Spinner, Toggle } from '../../components/ui';
import SettingsPage from '../kitchen/SettingsPage';

export default function AdminSettings() {
  const { data, loading, error, reload } = useFetch<PlatformSettings>('/admin/settings');
  const [s, setS] = useState<PlatformSettings | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (data) setS(data); }, [data]);
  if (loading || (!s && !error)) return <PageLoader />;
  if (error || !s) return <ErrorState message={error ?? ''} onRetry={reload} />;
  const num = (k: keyof PlatformSettings) => (e: React.ChangeEvent<HTMLInputElement>) => setS({ ...s, [k]: Number(e.target.value) });
  const time = (k: keyof PlatformSettings) => (e: React.ChangeEvent<HTMLInputElement>) => setS({ ...s, [k]: `${e.target.value}:00` });

  const save = async () => {
    setBusy(true);
    try { await api.put('/admin/settings', s); toast.success('Platform settings saved'); reload(true); }
    catch (e) { toast.error(errMsg(e)); } finally { setBusy(false); }
  };

  return (
    <div>
      <PageHeader title="Platform settings" subtitle="Business rules applied across all three portals"
        actions={<button className="btn-primary" onClick={save} disabled={busy}>{busy ? <Spinner className="h-4 w-4 text-white" /> : <Save className="h-4 w-4" />}Save settings</button>} />
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card space-y-4 p-6">
          <h3 className="font-semibold">Subscriptions & commission</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Free trial (days)"><input className="input" type="number" value={s.freeTrialDays} onChange={num('freeTrialDays')} /></Field>
            <Field label="Platform commission (%)" hint="Deducted from each order's food total"><input className="input" type="number" step="0.5" value={s.commissionPercent} onChange={num('commissionPercent')} /></Field>
            <Field label="Monthly price (₹) (reference)"><input className="input" type="number" value={s.monthlyPrice} onChange={num('monthlyPrice')} /></Field>
            <Field label="Annual price (₹) (reference)"><input className="input" type="number" value={s.annualPrice} onChange={num('annualPrice')} /></Field>
            <Field label="Grace period after expiry (days)" hint="Kitchen stays visible during grace"><input className="input" type="number" value={s.gracePeriodDays} onChange={num('gracePeriodDays')} /></Field>
          </div>
          <p className="text-xs text-charcoal-400">Plan prices shown to kitchens are managed under Subscriptions → Plans.</p>
        </div>
        <div className="card space-y-4 p-6">
          <h3 className="font-semibold">Ordering rules</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Discovery radius (km)"><input className="input" type="number" step="0.5" value={s.discoveryRadiusKm} onChange={num('discoveryRadiusKm')} /></Field>
            <Field label="Delivery charge (₹)"><input className="input" type="number" value={s.deliveryCharge} onChange={num('deliveryCharge')} /></Field>
            <Field label="Free delivery above (₹)"><input className="input" type="number" value={s.freeDeliveryAbove} onChange={num('freeDeliveryAbove')} /></Field>
            <Field label="Platform fee per order (₹)"><input className="input" type="number" value={s.platformFee} onChange={num('platformFee')} /></Field>
            <Field label="Custom lunch cutoff"><input className="input" type="time" value={s.customLunchCutoff.slice(0, 5)} onChange={time('customLunchCutoff')} /></Field>
            <Field label="Custom dinner cutoff"><input className="input" type="time" value={s.customDinnerCutoff.slice(0, 5)} onChange={time('customDinnerCutoff')} /></Field>
          </div>
          <Toggle checked={s.requireDailyVideo} onChange={(v) => setS({ ...s, requireDailyVideo: v })} label="Require daily cooking video from kitchens" />
          <Toggle checked={s.requireMenuVerification !== false} onChange={(v) => setS({ ...s, requireMenuVerification: v })} label="Verify daily menus (kitchens take orders only after today's menu is verified)" />
        </div>
        <div className="card space-y-4 p-6">
          <h3 className="font-semibold">Support contact</h3>
          <Field label="Support phone"><input className="input" value={s.supportPhone} onChange={(e) => setS({ ...s, supportPhone: e.target.value })} /></Field>
          <Field label="Support email"><input className="input" value={s.supportEmail} onChange={(e) => setS({ ...s, supportEmail: e.target.value })} /></Field>
        </div>
      </div>
      <div className="mt-10"><SettingsPage /></div>
    </div>
  );
}
