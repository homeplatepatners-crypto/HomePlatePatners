import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import AuthShell from './AuthShell';
import OtpField, { TestModeHint, useOtpConfig } from './OtpField';
import { api, errMsg } from '../../api/client';
import { Spinner } from '../../components/ui';

/** Reset password with an OTP sent to the registered mobile number. */
export default function ForgotPassword({ portal }: { portal: 'customer' | 'kitchen' }) {
  const nav = useNavigate();
  const cfg = useOtpConfig();
  const [phone, setPhone] = useState('');
  const [verified, setVerified] = useState(false);
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [busy, setBusy] = useState(false);
  const loginPath = portal === 'kitchen' ? '/kitchen/login' : '/login';

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pw.length < 6) return toast.error('Password must be at least 6 characters');
    if (pw !== pw2) return toast.error('Passwords do not match');
    setBusy(true);
    try {
      const { data } = await api.post('/auth/password/reset', { phone, newPassword: pw });
      toast.success(`Password updated. Login as ${data.username}`);
      nav(loginPath);
    } catch (err) { toast.error(errMsg(err)); } finally { setBusy(false); }
  };

  return (
    <AuthShell image="/images/veg-leaf-meal.jpg" eyebrow="Account recovery" title="Locked out? We'll get you back in."
      text="Verify the mobile number you registered with and choose a new password." points={['OTP sent by SMS', 'Valid for 10 minutes', 'Your orders and data stay safe']}>
      <h1 className="font-display text-3xl font-semibold">Reset password</h1>
      <p className="mt-2 text-sm text-charcoal-500">Remembered it? <Link to={loginPath} className="font-semibold text-brand-700">Login</Link></p>
      <TestModeHint cfg={cfg} />
      <form onSubmit={submit} className="mt-6 space-y-4">
        <OtpField channel="sms" purpose="reset" label="Registered mobile number" value={phone} setValue={setPhone} verified={verified} setVerified={setVerified} />
        {verified && <>
          <div><label className="label">New password</label><input className="input" type="password" autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="Min 6 characters" /></div>
          <div><label className="label">Confirm password</label><input className="input" type="password" autoComplete="new-password" value={pw2} onChange={(e) => setPw2(e.target.value)} /></div>
        </>}
        <button className="btn-primary w-full py-3" disabled={busy || !verified}>{busy && <Spinner className="h-4 w-4 text-white" />}Update password</button>
      </form>
    </AuthShell>
  );
}
