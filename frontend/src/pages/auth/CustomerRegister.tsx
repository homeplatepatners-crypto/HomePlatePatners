import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import AuthShell from './AuthShell';
import OtpField, { TestModeHint, useOtpConfig } from './OtpField';
import { api, errMsg } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { Spinner } from '../../components/ui';

/** Simple customer sign-up: name, mobile (OTP), email. Address is set right after on the map. */
export default function CustomerRegister() {
  const nav = useNavigate();
  const { setSession } = useAuth();
  const cfg = useOtpConfig();
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [phoneOk, setPhoneOk] = useState(false);
  const [emailOk, setEmailOk] = useState(false);
  const [busy, setBusy] = useState(false);
  const emailNeeded = !!cfg?.emailRequired;
  const emailValid = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email);
  const ready = fullName.trim().length >= 2 && phoneOk && emailValid && (!emailNeeded || emailOk);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (fullName.trim().length < 2) return toast.error('Please enter your name');
    if (!phoneOk) return toast.error('Please verify your mobile number');
    if (!emailValid) return toast.error('Please enter a valid email');
    if (emailNeeded && !emailOk) return toast.error('Please verify your email address');
    setBusy(true);
    try {
      const { data } = await api.post('/auth/register/customer', { fullName: fullName.trim(), phone, email });
      setSession(data);
      toast.success('Welcome to HomePlate! Now set your delivery address.');
      nav('/profile?setup=address');
    } catch (err) { toast.error(errMsg(err)); } finally { setBusy(false); }
  };

  return (
    <AuthShell image="/images/thali-chapati.jpg" eyebrow="Join HomePlate" title="A taste of home, just around the corner"
      text="Moved to Coimbatore for college or work? Find verified home kitchens near your hostel or PG."
      points={['Verified home kitchens within 5 km', 'Food from your hometown - Madurai, Kerala, Andhra…', 'Affordable everyday meals']}>
      <h1 className="font-display text-3xl font-semibold">Create your account</h1>
      <p className="mt-2 text-sm text-charcoal-500">Already have one? <Link to="/login" className="font-semibold text-brand-700">Login</Link></p>
      <TestModeHint cfg={cfg} />
      <form onSubmit={submit} className="mt-6 space-y-4">
        <div><label className="label">Name</label><input className="input" required autoComplete="name" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Your full name" /></div>
        <OtpField channel="sms" purpose="register" value={phone} setValue={setPhone} verified={phoneOk} setVerified={setPhoneOk} />
        {emailNeeded
          ? <OtpField channel="email" purpose="register" value={email} setValue={setEmail} verified={emailOk} setVerified={setEmailOk} />
          : <div><label className="label">Email</label><input className="input" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value.trim())} placeholder="you@example.com" /></div>}
        <button className="btn-primary w-full py-3" disabled={busy || !ready}>{busy && <Spinner className="h-4 w-4 text-white" />}Create account</button>
        <p className="text-center text-xs text-charcoal-400">No password needed - you'll log in with an OTP on your mobile.</p>
      </form>
    </AuthShell>
  );
}
