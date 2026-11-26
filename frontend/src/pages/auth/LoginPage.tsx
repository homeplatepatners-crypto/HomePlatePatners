import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff, LogIn } from 'lucide-react';
import toast from 'react-hot-toast';
import AuthShell from './AuthShell';
import { useAuth } from '../../context/AuthContext';
import { api, errMsg } from '../../api/client';
import { TestModeHint, useOtpConfig } from './OtpField';
import { Spinner } from '../../components/ui';

const config = {
  customer: {
    image: '/images/veg-leaf-meal.jpg', eyebrow: 'Welcome back', title: 'Missing the taste of home?',
    text: 'Fresh homemade meals from verified home chefs, delivered from kitchens within 5 km of you.',
    heading: 'Login to HomePlate', home: '/',
    points: ['Order today\'s homemade menu', 'Request any dish your way', 'Track your order live'],
  },
  kitchen: {
    image: '/images/pan-cooking.jpg', eyebrow: 'Kitchen Partner', title: 'Turn your home kitchen into a business',
    text: 'Publish your daily menu, accept custom requests and grow your earnings - with a 30-day free trial.',
    heading: 'Kitchen partner login', home: '/kitchen',
    points: ['Daily menu & orders in one place', 'Custom request quotations', 'Earnings & subscription tracking'],
  },
  admin: {
    image: '/images/spices.jpg', eyebrow: 'Super Admin', title: 'Run the HomePlate platform',
    text: 'Verify kitchens, review cooking videos, manage subscriptions and monitor revenue.',
    heading: 'Admin login', home: '/admin',
    points: ['KYC & FSSAI verification', 'Cooking video reviews', 'Revenue & commission analytics'],
  },
} as const;

export default function LoginPage({ portal }: { portal: 'customer' | 'kitchen' | 'admin' }) {
  const c = config[portal];
  const { login, setSession } = useAuth();
  const cfg = useOtpConfig();
  // Customers log in with mobile OTP by default; kitchen partners can choose OTP or password; admin uses password.
  const [mode, setMode] = useState<'otp' | 'password'>(portal === 'customer' ? 'otp' : 'password');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [sent, setSent] = useState(false);
  const nav = useNavigate();
  const [params] = useSearchParams();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) return toast.error('Enter username and password');
    setBusy(true);
    try {
      const u = await login(username, password, portal);
      toast.success(`Welcome, ${u.fullName.split(' ')[0]}!`);
      nav(params.get('next') || c.home, { replace: true });
    } catch (err) {
      toast.error(errMsg(err, 'Login failed'));
    } finally {
      setBusy(false);
    }
  };

  const sendLoginOtp = async () => {
    if (!/^[6-9]\d{9}$/.test(phone)) return toast.error('Enter your 10-digit mobile number');
    setBusy(true);
    try {
      const { data } = await api.post('/auth/otp/send', { channel: 'sms', target: phone, purpose: 'login' });
      setSent(true); toast.success(data.message || 'OTP sent');
    } catch (err) { toast.error(errMsg(err)); } finally { setBusy(false); }
  };
  const otpLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const { data } = await api.post('/auth/login/otp', { phone, code, portal });
      setSession(data);
      toast.success(`Welcome, ${data.user.fullName.split(' ')[0]}!`);
      nav(params.get('next') || c.home, { replace: true });
    } catch (err) { toast.error(errMsg(err, 'Login failed')); } finally { setBusy(false); }
  };

  return (
    <AuthShell image={c.image} eyebrow={c.eyebrow} title={c.title} text={c.text} points={[...c.points]}>
      <h1 className="font-display text-3xl font-semibold">{c.heading}</h1>
      <p className="mt-2 text-sm text-charcoal-500">
        {portal === 'customer' && <>New here? <Link to="/register" className="font-semibold text-brand-700">Create an account</Link></>}
        {portal === 'kitchen' && <>Not a partner yet? <Link to="/kitchen/register" className="font-semibold text-brand-700">Register your kitchen</Link></>}
        {portal === 'admin' && 'Restricted to HomePlate platform administrators.'}
      </p>
      {mode === 'otp' && <TestModeHint cfg={cfg} />}
      {mode === 'otp' ? (
        <form onSubmit={otpLogin} className="mt-6 space-y-4">
          <div>
            <label className="label">Mobile number</label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-charcoal-500">+91</span>
                <input className="input pl-12" inputMode="numeric" maxLength={10} autoFocus autoComplete="tel-national" value={phone}
                  onChange={(e) => { setPhone(e.target.value.replace(/\D/g, '')); setSent(false); setCode(''); }} placeholder="98765 43210" />
              </div>
              <button type="button" onClick={sendLoginOtp} disabled={busy || phone.length !== 10} className="btn-outline whitespace-nowrap">{sent ? 'Resend' : 'Send OTP'}</button>
            </div>
          </div>
          {sent && (
            <div className="animate-fade-up">
              <label className="label">OTP</label>
              <input className="input tracking-[.5em]" inputMode="numeric" autoComplete="one-time-code" maxLength={6} autoFocus value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} placeholder="••••••" />
            </div>
          )}
          <button className="btn-primary w-full py-3" disabled={busy || !sent || code.length !== 6}>{busy ? <Spinner className="h-4 w-4 text-white" /> : <LogIn className="h-4 w-4" />}Login</button>
        </form>
      ) : (
      <form onSubmit={submit} className="mt-8 space-y-4">
        <div>
          <label className="label">Username</label>
          <input className="input" autoFocus autoComplete="username" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Your username" />
        </div>
        <div>
          <label className="label">Password</label>
          <div className="relative">
            <input className="input pr-10" type={show ? 'text' : 'password'} autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
            <button type="button" onClick={() => setShow(!show)} className="absolute right-3 top-1/2 -translate-y-1/2 text-charcoal-400" aria-label="Show password">
              {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>
        <button className="btn-primary w-full py-3" disabled={busy}>{busy ? <Spinner className="h-4 w-4 text-white" /> : <LogIn className="h-4 w-4" />}Login</button>
      </form>
      )}
      {portal !== 'admin' && (
        <p className="mt-4 text-center text-sm">
          <button type="button" onClick={() => setMode(mode === 'otp' ? 'password' : 'otp')} className="font-medium text-brand-700 hover:underline">
            {mode === 'otp' ? 'Login with username & password instead' : 'Login with mobile OTP instead'}
          </button>
        </p>
      )}
      {portal !== 'admin' && mode === 'password' && (
        <p className="mt-4 text-center text-sm">
          <Link to={portal === 'kitchen' ? '/kitchen/forgot-password' : '/forgot-password'} className="font-medium text-brand-700 hover:underline">Forgot password?</Link>
        </p>
      )}
      <div className="mt-8 flex flex-wrap justify-center gap-4 text-xs text-charcoal-400">
        {portal !== 'customer' && <Link to="/login" className="hover:text-brand-700">Customer login</Link>}
        {portal !== 'kitchen' && <Link to="/kitchen/login" className="hover:text-brand-700">Kitchen partner login</Link>}
        {portal !== 'admin' && <Link to="/admin/login" className="hover:text-brand-700">Admin login</Link>}
        <Link to="/" className="hover:text-brand-700">← Back to home</Link>
      </div>
    </AuthShell>
  );
}
