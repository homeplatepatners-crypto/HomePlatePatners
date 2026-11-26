import { useEffect, useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { api, errMsg } from '../../api/client';
import { Spinner } from '../../components/ui';

export interface OtpConfig { sms: boolean; email: boolean; emailRequired: boolean; devMode: boolean; testNumbers?: string; testCode?: string }

/** Shown on sign-up pages while test numbers are enabled (never in production). */
export function TestModeHint({ cfg }: { cfg: OtpConfig | null }) {
  if (!cfg?.testNumbers) return null;
  return (
    <div className="mt-6 rounded-xl border border-dashed border-saffron-300 bg-saffron-50 px-4 py-3 text-xs leading-relaxed text-saffron-800">
      <b>Test mode:</b> use any mobile number in <b className="whitespace-nowrap">{cfg.testNumbers}</b> with OTP <b className="tracking-widest">{cfg.testCode}</b> (no SMS is sent).
      Each number can be used for one account - customer or kitchen partner.
    </div>
  );
}

/** Which OTP channels the backend can deliver right now. */
export function useOtpConfig() {
  const [cfg, setCfg] = useState<OtpConfig | null>(null);
  useEffect(() => {
    api.get('/auth/otp/config').then(({ data }) => setCfg(data))
      .catch(() => setCfg({ sms: false, email: false, emailRequired: false, devMode: false }));
  }, []);
  return cfg;
}

const isEmail = (v: string) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v);

/**
 * Mobile (SMS via Twilio Verify) or email OTP verification.
 * A dev-mode OTP is shown only when the backend has no provider for the channel and dev-otp is on.
 */
export default function OtpField({ channel = 'sms', value, setValue, verified, setVerified, label, optional, purpose }: {
  channel?: 'sms' | 'email'; value: string; setValue: (v: string) => void;
  verified: boolean; setVerified: (v: boolean) => void; label?: string; optional?: boolean;
  /** register: number/email must be new. reset: number must already have an account. */
  purpose?: 'register' | 'reset';
}) {
  const [sent, setSent] = useState(false);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const [cool, setCool] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const sms = channel === 'sms';

  useEffect(() => { if (cool <= 0) return; const t = setTimeout(() => setCool(cool - 1), 1000); return () => clearTimeout(t); }, [cool]);

  const send = async () => {
    if (sms && !/^[6-9]\d{9}$/.test(value)) return toast.error('Enter a valid 10-digit Indian mobile number');
    if (!sms && !isEmail(value)) return toast.error('Enter a valid email address');
    setBusy(true); setError(null);
    try {
      const { data } = await api.post('/auth/otp/send', { channel, target: value, purpose });
      setSent(true); setCool(30); setCode(''); setDevOtp(data.devOtp ?? null);
      toast.success(data.message || 'OTP sent');
    } catch (e) { const m = errMsg(e); setError(m); toast.error(m); } finally { setBusy(false); }
  };

  const verify = async () => {
    setBusy(true);
    try {
      await api.post('/auth/otp/verify', { channel, target: value, code, purpose });
      setVerified(true); setError(null);
      toast.success(sms ? 'Mobile number verified' : 'Email verified');
    } catch (e) { toast.error(errMsg(e)); } finally { setBusy(false); }
  };

  /** Lets the user edit a number/email again (also after it was verified). */
  const change = () => { setVerified(false); setSent(false); setCode(''); setCool(0); setDevOtp(null); setError(null); };

  return (
    <div>
      <label className="label">{label ?? (sms ? 'Mobile number' : 'Email')}{optional && <span className="font-normal text-charcoal-400"> (optional)</span>}</label>
      <div className="flex gap-2">
        <div className="relative flex-1">
          {sms && <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-charcoal-500">+91</span>}
          <input className={`input ${sms ? 'pl-12' : ''} ${verified ? 'pr-10' : ''} ${error ? 'border-red-400 focus:border-red-500 focus:ring-red-100' : ''}`} inputMode={sms ? 'numeric' : 'email'} type={sms ? 'tel' : 'email'}
            maxLength={sms ? 10 : 120} value={value} disabled={verified} autoComplete={sms ? 'tel-national' : 'email'}
            onChange={(e) => { setValue(sms ? e.target.value.replace(/\D/g, '') : e.target.value.trim()); setSent(false); setDevOtp(null); setCool(0); setError(null); }}
            placeholder={sms ? '98765 43210' : 'you@example.com'} />
          {verified && <CheckCircle2 className="absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-brand-600" />}
        </div>
        {!verified && <button type="button" onClick={send} disabled={busy || cool > 0 || !value} className="btn-outline whitespace-nowrap">
          {busy && !sent ? <Spinner className="h-4 w-4" /> : null}{cool > 0 ? `Resend in ${cool}s` : sent ? 'Resend' : 'Send OTP'}</button>}
        {verified && <button type="button" onClick={change} className="btn-outline whitespace-nowrap">Change</button>}
      </div>
      {error && !sent && <p className="mt-1.5 text-xs font-medium text-red-600">{error}</p>}
      {sent && !verified && (
        <div className="mt-3 animate-fade-up">
          <p className="mb-2 text-xs text-charcoal-500">Enter the 6-digit code sent to {sms ? `+91 ${value}` : value}{!sms && ' (check spam too)'}.</p>
          <div className="flex gap-2">
            <input className="input tracking-[.5em]" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} placeholder="••••••" />
            <button type="button" onClick={verify} disabled={busy || code.length !== 6} className="btn-primary">Verify</button>
          </div>
          {devOtp && <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">Development mode ({sms ? 'SMS' : 'email'} provider not configured): OTP is <b className="tracking-widest">{devOtp}</b></p>}
        </div>
      )}
    </div>
  );
}
