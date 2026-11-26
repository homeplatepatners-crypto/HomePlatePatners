import { useState } from 'react';
import { CheckCircle2, Clock, Megaphone, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { api, errMsg } from '../../api/client';
import { useFetch } from '../../components/useFetch';
import { Spinner, cx } from '../../components/ui';

export interface MenuStatus { status: 'NOT_PUBLISHED' | 'PENDING' | 'VERIFIED' | 'REJECTED'; required: boolean; ready: boolean; publishedAt?: string; remarks?: string; availableItems: number }

/** Today's menu status for the kitchen: publish -> HomePlate verifies -> orders open. */
export default function DailyMenuBanner({ refreshKey = 0 }: { refreshKey?: number }) {
  const { data, reload } = useFetch<MenuStatus>(`/kitchen/menu/status?k=${refreshKey}`);
  const [busy, setBusy] = useState(false);
  if (!data) return null;

  const publish = async () => {
    setBusy(true);
    try { await api.post('/kitchen/menu/publish'); toast.success("Today's menu sent for verification"); reload(true); }
    catch (e) { toast.error(errMsg(e)); } finally { setBusy(false); }
  };

  const cfg = {
    NOT_PUBLISHED: { tone: 'bg-amber-50 border-amber-300 text-amber-900', icon: Megaphone, title: "Publish today's menu",
      text: data.required ? 'Customers can order only after today\'s menu is published and verified by HomePlate. Mark today\'s dishes available, then publish.' : 'Publish today\'s menu so customers know what you are cooking.' },
    PENDING: { tone: 'bg-sky-50 border-sky-300 text-sky-900', icon: Clock, title: 'Waiting for verification',
      text: 'HomePlate is checking today\'s menu. Orders open as soon as it is verified - you\'ll get a notification.' },
    VERIFIED: { tone: 'bg-brand-50 border-brand-300 text-brand-900', icon: CheckCircle2, title: "Today's menu is verified",
      text: 'You are live - customers can order now. Editing a dish sends the menu for re-verification.' },
    REJECTED: { tone: 'bg-red-50 border-red-300 text-red-900', icon: XCircle, title: 'Menu needs changes',
      text: data.remarks ? `HomePlate: "${data.remarks}". Fix the menu and publish again.` : 'Fix the menu and publish again.' },
  }[data.status];

  return (
    <div className={cx('mb-6 flex flex-col gap-3 rounded-2xl border p-4 sm:flex-row sm:items-center', cfg.tone)}>
      <cfg.icon className="h-6 w-6 shrink-0" />
      <div className="flex-1">
        <p className="font-semibold">{cfg.title}</p>
        <p className="text-sm opacity-90">{cfg.text}</p>
        <p className="mt-1 text-xs opacity-75">{data.availableItems} dish(es) marked available today</p>
      </div>
      {(data.status === 'NOT_PUBLISHED' || data.status === 'REJECTED') && (
        <button className="btn-primary whitespace-nowrap" onClick={publish} disabled={busy}>{busy && <Spinner className="h-4 w-4 text-white" />}Publish today's menu</button>
      )}
    </div>
  );
}
