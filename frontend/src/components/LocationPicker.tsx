import { useState } from 'react';
import { ChevronDown, LocateFixed, MapPin } from 'lucide-react';
import { useLocationCtx } from '../context/LocationContext';
import { Modal, Spinner, cx } from './ui';

const AREAS = [
  { name: 'SITRA', lat: 11.0335, lng: 77.031 }, { name: 'Saravanampatti', lat: 11.079, lng: 76.999 },
  { name: 'Peelamedu', lat: 11.027, lng: 77.006 }, { name: 'Gandhipuram', lat: 11.0168, lng: 76.9674 },
  { name: 'Kalapatti', lat: 11.061, lng: 77.04 }, { name: 'Hope College', lat: 11.0265, lng: 77.0185 },
  { name: 'Singanallur', lat: 10.999, lng: 77.032 }, { name: 'Vilankurichi', lat: 11.064, lng: 77.017 },
  { name: 'RS Puram', lat: 11.008, lng: 76.95 }, { name: 'Ganapathy', lat: 11.04, lng: 76.975 },
];

export function useAreaList() { return AREAS; }

export default function LocationPicker({ variant = 'nav' }: { variant?: 'nav' | 'hero' }) {
  const { location, setLocation, detect, detecting } = useLocationCtx();
  const [open, setOpen] = useState(false);

  return (
    <>
      <button onClick={() => setOpen(true)}
        className={cx('flex min-w-0 items-center gap-2 text-left', variant === 'hero'
          ? 'w-full rounded-xl bg-cream-50 px-3 py-3 ring-1 ring-cream-300 hover:ring-brand-300'
          : 'w-full rounded-full border border-cream-300 bg-white px-3 py-1.5 shadow-sm hover:border-brand-300')}>
        <MapPin className="h-5 w-5 shrink-0 text-saffron-500" />
        <span className="min-w-0">
          <span className="block truncate text-sm font-bold text-charcoal-900">{location.label}</span>
          <span className="block truncate text-xs text-charcoal-400">{location.address}</span>
        </span>
        <ChevronDown className="h-4 w-4 shrink-0 text-charcoal-400" />
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="Choose delivery location">
        <button className="btn-outline mb-4 w-full justify-start py-3" disabled={detecting}
          onClick={async () => { await detect(); setOpen(false); }}>
          {detecting ? <Spinner className="h-5 w-5" /> : <LocateFixed className="h-5 w-5 text-brand-600" />}
          <span className="text-left">
            <span className="block">Detect my current location</span>
            <span className="block text-xs font-normal text-charcoal-400">Uses your device GPS (asks permission)</span>
          </span>
        </button>
        <p className="label">Popular areas in Coimbatore</p>
        <div className="grid grid-cols-2 gap-2">
          {AREAS.map((a) => (
            <button key={a.name} onClick={() => { setLocation({ label: a.name, address: `${a.name}, Coimbatore`, lat: a.lat, lng: a.lng }); setOpen(false); }}
              className={cx('rounded-xl border px-3 py-2.5 text-left text-sm font-medium transition',
                location.label === a.name ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-cream-300 hover:border-brand-300')}>
              {a.name}
            </button>
          ))}
        </div>
      </Modal>
    </>
  );
}
