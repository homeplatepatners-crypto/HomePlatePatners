import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { cx } from './ui';
import { timeAgo } from '../utils/format';

interface Notif { id: number; title: string; message?: string; link?: string; type?: string; read: boolean; createdAt: string }

const POLL_MS = 15000;

/** Bell with unread count. Polls the server and pops a toast for every new notification (order confirmed, status updates, offers). */
export default function NotificationBell() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [items, setItems] = useState<Notif[]>([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const lastSeen = useRef<number | null>(null);
  const box = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get<{ items: Notif[]; unread: number }>('/notifications');
      setItems(data.items); setUnread(data.unread);
      const newest = data.items[0]?.id ?? 0;
      if (lastSeen.current != null) {
        data.items.filter((n) => n.id > lastSeen.current! && !n.read).reverse().slice(-3).forEach((n) =>
          toast(<span><b>{n.title}</b>{n.message && <><br /><span className="text-xs">{n.message}</span></>}</span>, { icon: '🔔', duration: 6000 }));
      }
      lastSeen.current = Math.max(newest, lastSeen.current ?? 0);
    } catch { /* offline / logged out - ignore */ }
  }, []);

  useEffect(() => {
    if (!user) return;
    lastSeen.current = null;
    load();
    const t = setInterval(() => { if (document.visibilityState === 'visible') load(); }, POLL_MS);
    return () => clearInterval(t);
  }, [user?.id, load]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const close = (e: MouseEvent) => { if (box.current && !box.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  if (!user) return null;

  const openItem = async (n: Notif) => {
    setOpen(false);
    if (!n.read) { api.post(`/notifications/${n.id}/read`).then(load).catch(() => {}); }
    if (n.link) nav(n.link);
  };
  const readAll = async () => { await api.post('/notifications/read-all').catch(() => {}); load(); };

  return (
    <div className="relative" ref={box}>
      <button onClick={() => setOpen(!open)} className="relative rounded-xl p-2 text-charcoal-700 hover:bg-cream-200" aria-label="Notifications">
        <Bell className="h-6 w-6" />
        {unread > 0 && <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[11px] font-bold text-white">{unread > 9 ? '9+' : unread}</span>}
      </button>
      {open && (
        <div className="absolute right-0 top-full z-[950] mt-2 w-[22rem] max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl bg-white shadow-lift ring-1 ring-black/5">
          <div className="flex items-center justify-between border-b border-cream-200 px-4 py-3">
            <p className="font-semibold">Notifications</p>
            {unread > 0 && <button onClick={readAll} className="inline-flex items-center gap-1 text-xs font-semibold text-brand-700 hover:underline"><CheckCheck className="h-3.5 w-3.5" />Mark all read</button>}
          </div>
          <div className="max-h-[26rem] overflow-y-auto">
            {items.length === 0 && <p className="px-4 py-8 text-center text-sm text-charcoal-400">No notifications yet</p>}
            {items.map((n) => (
              <button key={n.id} onClick={() => openItem(n)}
                className={cx('flex w-full gap-3 border-b border-cream-100 px-4 py-3 text-left transition hover:bg-cream-50', !n.read && 'bg-brand-50/50')}>
                <span className={cx('mt-1.5 h-2 w-2 shrink-0 rounded-full', n.read ? 'bg-transparent' : 'bg-brand-500')} />
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-charcoal-900">{n.title}</span>
                  {n.message && <span className="mt-0.5 block text-xs text-charcoal-500">{n.message}</span>}
                  <span className="mt-1 block text-[11px] text-charcoal-400">{timeAgo(n.createdAt)}</span>
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
