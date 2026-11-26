import { useEffect, useRef, useState } from 'react';
import { Navigation, Square } from 'lucide-react';
import toast from 'react-hot-toast';
import { api, errMsg } from '../../api/client';

const MIN_GAP_MS = 5000;

/**
 * Shares the delivery person's phone GPS for one order while it is out for delivery.
 * Open this page on the phone that goes with the food; the customer sees the scooter move on their map.
 */
export default function LiveLocationShare({ orderId }: { orderId: number }) {
  const [on, setOn] = useState(false);
  const [last, setLast] = useState<Date | null>(null);
  const watch = useRef<number | null>(null);
  const lastSent = useRef(0);

  const stop = () => {
    if (watch.current != null) navigator.geolocation.clearWatch(watch.current);
    watch.current = null; setOn(false);
  };

  const start = () => {
    if (!navigator.geolocation) return toast.error('This device does not support GPS location');
    setOn(true);
    watch.current = navigator.geolocation.watchPosition(
      async (p) => {
        if (Date.now() - lastSent.current < MIN_GAP_MS) return;
        lastSent.current = Date.now();
        try {
          await api.post(`/kitchen/orders/${orderId}/location`, { lat: +p.coords.latitude.toFixed(6), lng: +p.coords.longitude.toFixed(6) });
          setLast(new Date());
        } catch (e) { toast.error(errMsg(e)); stop(); }
      },
      () => { toast.error('Location permission denied - allow location to share live tracking'); stop(); },
      { enableHighAccuracy: true, maximumAge: 3000, timeout: 20000 },
    );
    toast.success('Live location sharing started');
  };

  useEffect(() => () => { if (watch.current != null) navigator.geolocation.clearWatch(watch.current); }, []);

  return on ? (
    <button onClick={stop} className="btn-outline w-full py-2 text-xs">
      <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" /><Square className="h-3.5 w-3.5" />
      Sharing live location{last ? ` · ${last.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}` : '…'}
    </button>
  ) : (
    <button onClick={start} className="btn w-full bg-saffron-500 py-2 text-xs text-white hover:bg-saffron-600">
      <Navigation className="h-3.5 w-3.5" />Share live location with customer
    </button>
  );
}
