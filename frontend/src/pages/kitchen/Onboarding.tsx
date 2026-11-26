import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, Send } from 'lucide-react';
import toast from 'react-hot-toast';
import { api, errMsg } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { PageLoader, Spinner, cx } from '../../components/ui';
import { ComplianceSection, complianceError, KitchenInfoSection, LocationSection, OperationsSection, toForm, toPayload, type KitchenFormState } from './KitchenForm';
import { fmtTime } from '../../utils/format';

const STEPS = ['Personal info', 'Kitchen info', 'Address & location', 'Identity & compliance', 'Operations', 'Review & submit'];

function validate(step: number, f: KitchenFormState): string | null {
  if (step === 2) {
    if (!f.name.trim()) return 'Kitchen name is required';
    if (f.description.trim().length < 30) return 'Description should be at least 30 characters';
    if (!f.cuisines.length) return 'Select at least one food category';
    if (!f.coverImage) return 'Upload a cover photo';
  }
  if (step === 3) {
    if (!f.area) return 'Select your area';
    if (f.address.trim().length < 10) return 'Enter the full address';
    if (f.latitude == null) return 'Pin your kitchen location on the map';
  }
  if (step === 4) return complianceError(f);
  if (step === 5 && !f.workingDays.length) return 'Select at least one working day';
  return null;
}

export default function Onboarding() {
  const { kitchen, user, refresh } = useAuth();
  const nav = useNavigate();
  const [f, setF] = useState<KitchenFormState | null>(null);
  const [step, setStep] = useState(2);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (kitchen && !f) {
      setF(toForm(kitchen));
      setStep(Math.min(Math.max(kitchen.onboardingStep || 2, 2), 6));
    }
  }, [kitchen]); // eslint-disable-line

  if (!kitchen || !f) return <PageLoader />;
  if (kitchen.status === 'UNDER_REVIEW' || kitchen.status === 'ACTIVE' || kitchen.status === 'APPROVED') {
    return <div className="card p-10 text-center"><h2 className="font-display text-2xl">Onboarding complete</h2><p className="mt-2 text-sm text-charcoal-500">Your application has been submitted.</p><button className="btn-primary mt-4" onClick={() => nav('/kitchen')}>Go to dashboard</button></div>;
  }
  const set = <K extends keyof KitchenFormState>(k: K, v: KitchenFormState[K]) => setF((s) => (s ? { ...s, [k]: v } : s));

  const saveAndNext = async () => {
    const err = validate(step, f);
    if (err) return toast.error(err);
    setBusy(true);
    try {
      await api.put('/kitchen/onboarding', toPayload(f, step + 1));
      await refresh();
      setStep(step + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (e) { toast.error(errMsg(e)); } finally { setBusy(false); }
  };

  const submit = async () => {
    setBusy(true);
    try {
      await api.put('/kitchen/onboarding', toPayload(f, 6));
      await api.post('/kitchen/onboarding/submit');
      await refresh();
      toast.success('Application submitted for verification!');
      nav('/kitchen');
    } catch (e) { toast.error(errMsg(e)); } finally { setBusy(false); }
  };

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="font-display text-3xl font-semibold">Set up your kitchen</h1>
      <p className="mt-1 text-sm text-charcoal-500">Your progress is saved after every step. Your kitchen stays hidden until the admin approves it.</p>
      {kitchen.adminRemarks && (kitchen.status === 'DOCS_REQUESTED' || kitchen.status === 'REJECTED') &&
        <div className="mt-4 rounded-2xl bg-saffron-50 p-4 text-sm text-saffron-800"><b>Message from HomePlate team:</b> {kitchen.adminRemarks}</div>}

      <ol className="mt-6 grid grid-cols-6 gap-1.5">
        {STEPS.map((s, i) => {
          const n = i + 1; const done = n < step; const cur = n === step;
          return (
            <li key={s} className="text-center">
              <button type="button" disabled={n === 1 || n > step} onClick={() => setStep(n)} className="w-full">
                <span className={cx('block h-1.5 rounded-full', done ? 'bg-brand-600' : cur ? 'bg-saffron-500' : 'bg-cream-300')} />
                <span className={cx('mt-2 hidden text-[11px] font-semibold sm:block', cur ? 'text-charcoal-900' : 'text-charcoal-400')}>{done && <Check className="mr-0.5 inline h-3 w-3" />}{n}. {s}</span>
              </button>
            </li>
          );
        })}
      </ol>

      <div className="card mt-6 p-6 sm:p-8">
        <p className="text-xs font-bold uppercase tracking-widest text-saffron-600">Step {step} of 6</p>
        <h2 className="mb-6 mt-1 text-xl font-semibold">{STEPS[step - 1]}</h2>
        {step === 2 && <KitchenInfoSection f={f} set={set} />}
        {step === 3 && <LocationSection f={f} set={set} />}
        {step === 4 && <ComplianceSection f={f} set={set} />}
        {step === 5 && <OperationsSection f={f} set={set} />}
        {step === 6 && (
          <div className="space-y-4 text-sm">
            <div className="flex gap-4 rounded-2xl bg-cream-50 p-4">
              {f.coverImage && <img src={f.coverImage} alt="" className="h-24 w-32 rounded-xl object-cover" />}
              <div><p className="text-lg font-semibold">{f.name}</p><p className="text-charcoal-500">by {f.ownerName || user?.fullName} · {f.cuisines.join(', ')}</p><p className="mt-1 text-charcoal-500">{f.area}, {f.city} · delivers within {f.deliveryRadiusKm} km</p></div>
            </div>
            <dl className="grid gap-3 sm:grid-cols-2">
              {[
                ['Mobile', `${user?.phone} ✓ verified`], ['Food type', f.foodType], ['Address', f.address], ['GPS', f.latitude ? `${f.latitude}, ${f.longitude}` : 'Missing'],
                ['Identity proof', f.idProofUrl ? `${f.idProofType} ${f.idProofNumber} - uploaded${f.idProofBackUrl ? ' (front + back)' : ''}` : 'Missing'], ['FSSAI', f.fssaiNumber || 'Not provided'],
                ['Hours', `${fmtTime(f.openTime)} – ${fmtTime(f.closeTime)}`], ['Working days', f.workingDays.join(', ')],
                ['Meals', [f.breakfastAvailable && 'Breakfast', f.lunchAvailable && 'Lunch', f.dinnerAvailable && 'Dinner'].filter(Boolean).join(', ')], ['Capacity', `${f.maxDailyOrders} orders/day`],
              ].map(([k, v]) => <div key={k} className="rounded-xl border border-cream-200 p-3"><dt className="text-xs font-semibold uppercase text-charcoal-400">{k}</dt><dd className="mt-0.5 font-medium">{v}</dd></div>)}
            </dl>
            <p className="rounded-xl bg-brand-50 p-4 text-brand-800">After approval you get a <b>30-day free trial</b>. Then choose a monthly or annual plan. A small commission applies on each order.</p>
          </div>
        )}

        <div className="mt-8 flex justify-between border-t border-cream-200 pt-5">
          <button className="btn-ghost" disabled={step <= 2} onClick={() => setStep(step - 1)}><ArrowLeft className="h-4 w-4" />Back</button>
          {step < 6 ? <button className="btn-primary" onClick={saveAndNext} disabled={busy}>{busy && <Spinner className="h-4 w-4 text-white" />}Save & continue<ArrowRight className="h-4 w-4" /></button>
            : <button className="btn-accent" onClick={submit} disabled={busy}>{busy ? <Spinner className="h-4 w-4 text-white" /> : <Send className="h-4 w-4" />}Submit for verification</button>}
        </div>
      </div>
    </div>
  );
}
