import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import AuthShell from './AuthShell';
import OtpField, { TestModeHint, useOtpConfig } from './OtpField';
import { api, errMsg } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { Spinner } from '../../components/ui';

/** Step 1 of kitchen onboarding (account + OTP). Steps 2-6 continue inside the kitchen portal. */
export default function KitchenRegister() {
  const nav = useNavigate();
  const { setSession } = useAuth();
  const cfg = useOtpConfig();
  const [f, setF] = useState({ fullName: '', kitchenName: '', username: '', password: '' });
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [phoneOk, setPhoneOk] = useState(false);
  const [emailOk, setEmailOk] = useState(false);
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });
  const emailNeeded = !!cfg?.emailRequired;
  const ready = phoneOk && (!emailNeeded || emailOk) && !!email;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneOk) return toast.error('Please verify your mobile number with OTP');
    if (emailNeeded && !emailOk) return toast.error('Please verify your email address');
    if (f.password.length < 6) return toast.error('Password must be at least 6 characters');
    setBusy(true);
    try {
      const { data } = await api.post('/auth/register/kitchen', { ...f, phone, email });
      setSession(data);
      toast.success('Account created! Let\'s set up your kitchen.');
      nav('/kitchen/onboarding');
    } catch (err) { toast.error(errMsg(err)); } finally { setBusy(false); }
  };

  return (
    <AuthShell image="/images/fresh-vegetables.jpg" eyebrow="Become a kitchen partner" title="Cook what you love. Earn from home."
      text="Join Coimbatore's trusted network of home chefs. Free for the first 30 days after approval."
      points={['1. Personal info & OTP', '2. Kitchen details & photos', '3. Address & GPS location', '4. Identity & FSSAI documents', '5. Opening hours & capacity', '6. Review & submit for approval']}>
      <p className="text-xs font-bold uppercase tracking-widest text-saffron-600">Step 1 of 6</p>
      <h1 className="mt-1 font-display text-3xl font-semibold">Register your kitchen</h1>
      <p className="mt-2 text-sm text-charcoal-500">Already registered? <Link to="/kitchen/login" className="font-semibold text-brand-700">Login</Link></p>
      <TestModeHint cfg={cfg} />
      <form onSubmit={submit} className="mt-6 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div><label className="label">Owner name</label><input className="input" required value={f.fullName} onChange={set('fullName')} placeholder="Your full name" /></div>
          <div><label className="label">Kitchen name</label><input className="input" required value={f.kitchenName} onChange={set('kitchenName')} placeholder="e.g. Amma's Kitchen" /></div>
        </div>
        <OtpField channel="sms" purpose="register" value={phone} setValue={setPhone} verified={phoneOk} setVerified={setPhoneOk} />
        {emailNeeded
          ? <OtpField channel="email" purpose="register" value={email} setValue={setEmail} verified={emailOk} setVerified={setEmailOk} />
          : <div><label className="label">Email</label><input className="input" type="email" required value={email} onChange={(e) => setEmail(e.target.value.trim())} placeholder="you@example.com" /></div>}
        <div className="grid grid-cols-2 gap-3">
          <div><label className="label">Username</label><input className="input" required minLength={3} autoComplete="username" value={f.username} onChange={set('username')} /></div>
          <div><label className="label">Password</label><input className="input" type="password" required minLength={6} autoComplete="new-password" value={f.password} onChange={set('password')} placeholder="Min 6 characters" /></div>
        </div>
        <button className="btn-primary w-full py-3" disabled={busy || !ready}>{busy && <Spinner className="h-4 w-4 text-white" />}Continue to kitchen details</button>
      </form>
    </AuthShell>
  );
}
