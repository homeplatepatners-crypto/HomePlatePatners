import FileUpload from '../../components/FileUpload';
import { MapPicker } from '../../components/Maps';
import { useAreaList } from '../../components/LocationPicker';
import { Field, Toggle, VegMark, cx } from '../../components/ui';
import type { Kitchen } from '../../types';

export type KitchenFormState = {
  ownerName: string; email: string; name: string; description: string; coverImage: string; gallery: string[];
  cuisines: string[]; foodType: 'VEG' | 'NON_VEG' | 'BOTH';
  state: string; district: string; city: string; area: string; address: string; pincode: string;
  latitude: number | null; longitude: number | null; deliveryRadiusKm: number;
  idProofType: string; idProofNumber: string; idProofUrl: string; idProofBackUrl: string; fssaiNumber: string; fssaiType: string; fssaiCertificateUrl: string;
  openTime: string; closeTime: string; workingDays: string[]; breakfastAvailable: boolean; lunchAvailable: boolean; dinnerAvailable: boolean;
  maxDailyOrders: number; selfDelivery: boolean; avgPrepMinutes: number; todaySpecial: string;
};

export const CUISINES = ['South Indian', 'Kongu', 'Chettinad', 'Madurai', 'Kerala', 'Andhra', 'North Indian', 'Tiffin', 'Snacks'];
export const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
const AREAS = ['SITRA', 'Saravanampatti', 'Peelamedu', 'Gandhipuram', 'Kalapatti', 'Hope College', 'Singanallur', 'Vilankurichi', 'RS Puram', 'Ganapathy', 'Other'];

export function toForm(k: Kitchen): KitchenFormState {
  return {
    ownerName: k.owner?.fullName ?? '', email: k.owner?.email ?? '', name: k.name ?? '', description: k.description ?? '',
    coverImage: k.coverImage ?? '', gallery: (k.galleryImages ?? '').split(',').filter(Boolean),
    cuisines: (k.cuisines ?? '').split(',').map((c) => c.trim()).filter(Boolean), foodType: k.foodType ?? 'BOTH',
    state: k.state ?? 'Tamil Nadu', district: k.district ?? 'Coimbatore', city: k.city ?? 'Coimbatore', area: k.area ?? '',
    address: k.address ?? '', pincode: k.pincode ?? '', latitude: k.latitude ?? null, longitude: k.longitude ?? null,
    deliveryRadiusKm: k.deliveryRadiusKm ?? 5, idProofType: k.idProofType ?? 'Aadhaar', idProofNumber: k.idProofNumber ?? '',
    idProofUrl: k.idProofUrl ?? '', idProofBackUrl: k.idProofBackUrl ?? '', fssaiNumber: k.fssaiNumber ?? '', fssaiType: k.fssaiType ?? 'FSSAI Basic Registration',
    fssaiCertificateUrl: k.fssaiCertificateUrl ?? '', openTime: (k.openTime ?? '07:00').slice(0, 5), closeTime: (k.closeTime ?? '21:00').slice(0, 5),
    workingDays: (k.workingDays ?? 'MON,TUE,WED,THU,FRI,SAT').split(','), breakfastAvailable: k.breakfastAvailable ?? true,
    lunchAvailable: k.lunchAvailable ?? true, dinnerAvailable: k.dinnerAvailable ?? true, maxDailyOrders: k.maxDailyOrders ?? 40,
    selfDelivery: k.selfDelivery ?? true, avgPrepMinutes: k.avgPrepMinutes ?? 35, todaySpecial: k.todaySpecial ?? '',
  };
}

export function toPayload(f: KitchenFormState, step?: number) {
  return {
    ...f, gallery: undefined, galleryImages: f.gallery.join(','), cuisines: f.cuisines.join(','), workingDays: f.workingDays.join(','),
    openTime: f.openTime.length === 5 ? `${f.openTime}:00` : f.openTime, closeTime: f.closeTime.length === 5 ? `${f.closeTime}:00` : f.closeTime,
    onboardingStep: step,
  };
}

type Props = { f: KitchenFormState; set: <K extends keyof KitchenFormState>(k: K, v: KitchenFormState[K]) => void };

export function KitchenInfoSection({ f, set }: Props) {
  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Kitchen name"><input className="input" value={f.name} onChange={(e) => set('name', e.target.value)} /></Field>
        <Field label="Owner name"><input className="input" value={f.ownerName} onChange={(e) => set('ownerName', e.target.value)} /></Field>
      </div>
      <Field label="Kitchen description" hint="Tell customers what makes your food special (min 30 characters).">
        <textarea className="input min-h-[110px]" value={f.description} onChange={(e) => set('description', e.target.value)} placeholder="Home-style Kongu cooking with fresh vegetables from the local market…" />
      </Field>
      <Field label="Food type">
        <div className="flex gap-2">
          {(['VEG', 'NON_VEG', 'BOTH'] as const).map((t) => (
            <button key={t} type="button" onClick={() => set('foodType', t)} className={cx('chip flex-1 justify-center py-2.5', f.foodType === t && 'chip-active')}>
              {t !== 'NON_VEG' && <VegMark veg />}{t !== 'VEG' && <VegMark veg={false} />}{t === 'VEG' ? 'Pure veg' : t === 'NON_VEG' ? 'Non-veg' : 'Both'}
            </button>
          ))}
        </div>
      </Field>
      <Field label="Food categories / cuisines">
        <div className="flex flex-wrap gap-2">
          {CUISINES.map((c) => (
            <button key={c} type="button" onClick={() => set('cuisines', f.cuisines.includes(c) ? f.cuisines.filter((x) => x !== c) : [...f.cuisines, c])}
              className={cx('chip py-1.5', f.cuisines.includes(c) && 'chip-active')}>{c}</button>
          ))}
        </div>
      </Field>
      <div className="grid gap-4 sm:grid-cols-[1.2fr_1fr]">
        <Field label="Cover photo (shown to customers)"><FileUpload value={f.coverImage} onChange={(u) => set('coverImage', u)} label="Upload your best food photo" /></Field>
        <Field label="Kitchen photos">
          <div className="grid grid-cols-2 gap-2">
            {f.gallery.map((g, i) => (
              <div key={g + i} className="relative"><img src={g} alt="" className="aspect-square w-full rounded-xl object-cover" />
                <button type="button" onClick={() => set('gallery', f.gallery.filter((_, j) => j !== i))} className="absolute right-1 top-1 rounded-md bg-white/90 px-1.5 text-xs font-bold">✕</button></div>
            ))}
            {f.gallery.length < 6 && <FileUpload aspect="aspect-square" value="" onChange={(u) => u && set('gallery', [...f.gallery, u])} label="Add" />}
          </div>
        </Field>
      </div>
    </div>
  );
}

/** Straight-line distance in km (same formula as the backend). */
function km(aLat: number, aLng: number, bLat: number, bLng: number) {
  const r = (d: number) => (d * Math.PI) / 180;
  const h = Math.sin(r(bLat - aLat) / 2) ** 2 + Math.cos(r(aLat)) * Math.cos(r(bLat)) * Math.sin(r(bLng - aLng) / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

export function LocationSection({ f, set }: Props) {
  const areaPoint = useAreaList().find((a) => a.name === f.area);
  const away = areaPoint && f.latitude != null && f.longitude != null ? km(areaPoint.lat, areaPoint.lng, f.latitude, f.longitude) : null;
  const useArea = () => { if (areaPoint) { set('latitude', areaPoint.lat); set('longitude', areaPoint.lng); } };
  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="State"><input className="input" value={f.state} onChange={(e) => set('state', e.target.value)} /></Field>
        <Field label="District"><input className="input" value={f.district} onChange={(e) => set('district', e.target.value)} /></Field>
        <Field label="City"><input className="input" value={f.city} onChange={(e) => set('city', e.target.value)} /></Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-[1fr_160px]">
        <Field label="Area"><select className="input" value={f.area} onChange={(e) => set('area', e.target.value)}><option value="">Select area</option>{AREAS.map((a) => <option key={a}>{a}</option>)}</select></Field>
        <Field label="Pincode"><input className="input" maxLength={6} value={f.pincode} onChange={(e) => set('pincode', e.target.value.replace(/\D/g, ''))} /></Field>
      </div>
      <Field label="Full address"><textarea className="input min-h-[70px]" value={f.address} onChange={(e) => set('address', e.target.value)} placeholder="Door no, street, landmark" /></Field>
      <Field label="GPS location (pin your kitchen)">
        <MapPicker value={{ lat: f.latitude, lng: f.longitude }} radiusKm={f.deliveryRadiusKm} onChange={(lat, lng) => { set('latitude', lat); set('longitude', lng); }} />
        {areaPoint && f.latitude == null && (
          <button type="button" onClick={useArea} className="mt-2 text-xs font-semibold text-brand-700 hover:underline">Start the pin at {f.area} and adjust it to your exact door →</button>
        )}
        {away != null && away > 2 && (
          <div className="mt-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900">
            <b>Check your pin:</b> it is <b>{away.toFixed(1)} km</b> from {f.area}. Customers only see kitchens within 5 km of them,
            so a wrong pin hides your kitchen from {f.area} customers.{' '}
            <button type="button" onClick={useArea} className="font-semibold underline">Move pin to {f.area}</button>
          </div>
        )}
      </Field>
      <Field label={`Delivery radius: ${f.deliveryRadiusKm} km`} hint="You deliver yourself, so choose a distance you're comfortable with (max 10 km). Customers see kitchens within 5 km.">
        <input type="range" min={1} max={10} step={0.5} value={f.deliveryRadiusKm} onChange={(e) => set('deliveryRadiusKm', Number(e.target.value))} className="w-full accent-green-700" />
      </Field>
    </div>
  );
}

/** Identity document rules per type (kept in sync with backend DocumentRules.java). */
export const ID_TYPES: Record<string, { label: string; placeholder: string; pattern: RegExp; format: string; back: boolean; frontLabel: string; backLabel?: string; maxLen: number }> = {
  Aadhaar: { label: 'Aadhaar number', placeholder: '1234 5678 9012', pattern: /^[2-9]\d{11}$/, format: '12 digits', back: true, frontLabel: 'Aadhaar - front side', backLabel: 'Aadhaar - back side (address)', maxLen: 14 },
  PAN: { label: 'PAN number', placeholder: 'ABCDE1234F', pattern: /^[A-Z]{5}\d{4}[A-Z]$/, format: '5 letters, 4 digits, 1 letter', back: false, frontLabel: 'PAN card', maxLen: 10 },
  'Voter ID': { label: 'Voter ID (EPIC) number', placeholder: 'ABC1234567', pattern: /^[A-Z]{3}\d{7}$/, format: '3 letters + 7 digits', back: true, frontLabel: 'Voter ID - front', backLabel: 'Voter ID - back', maxLen: 10 },
  'Driving Licence': { label: 'Driving licence number', placeholder: 'TN01 20190001234', pattern: /^[A-Z]{2}\d{2}\d{11}$/, format: 'State code + 13 digits, e.g. TN0120190001234', back: true, frontLabel: 'Licence - front', backLabel: 'Licence - back', maxLen: 18 },
  Passport: { label: 'Passport number', placeholder: 'A1234567', pattern: /^[A-Z]\d{7}$/, format: '1 letter + 7 digits', back: false, frontLabel: 'Passport - photo page', maxLen: 8 },
};
export const FSSAI_TYPES = ['FSSAI Basic Registration', 'FSSAI State Licence', 'Applied - pending'];
export const normId = (v: string) => v.replace(/[\s-]/g, '').toUpperCase();
export const fssaiRequired = (t: string) => !t.startsWith('Applied');

/** Returns the first problem with the documents step, or null when it is complete. */
export function complianceError(f: KitchenFormState): string | null {
  const t = ID_TYPES[f.idProofType];
  if (!t) return 'Select an ID proof type';
  if (!t.pattern.test(normId(f.idProofNumber))) return `Enter a valid ${t.label} (${t.format})`;
  if (!f.idProofUrl) return `Upload ${t.frontLabel}`;
  if (t.back && !f.idProofBackUrl) return `Upload ${t.backLabel}`;
  if (fssaiRequired(f.fssaiType)) {
    if (!/^[12]\d{13}$/.test(f.fssaiNumber)) return 'Enter the 14-digit FSSAI number';
    if (!f.fssaiCertificateUrl) return 'Upload the FSSAI certificate';
  }
  return null;
}

export function ComplianceSection({ f, set }: Props) {
  const t = ID_TYPES[f.idProofType] ?? ID_TYPES.Aadhaar;
  const idOk = t.pattern.test(normId(f.idProofNumber));
  const fssaiNeeded = fssaiRequired(f.fssaiType);
  const fssaiOk = /^[12]\d{13}$/.test(f.fssaiNumber);
  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-sky-50 p-4 text-sm text-sky-800">Identity verification and food safety verification are reviewed separately. Your documents are visible only to the HomePlate verification team.</div>
      <div>
        <h3 className="mb-3 font-semibold">1. Identity proof</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="ID proof type">
            <select className="input" value={f.idProofType} onChange={(e) => { set('idProofType', e.target.value); set('idProofNumber', ''); set('idProofBackUrl', ''); }}>
              {Object.keys(ID_TYPES).map((k) => <option key={k}>{k}</option>)}
            </select>
          </Field>
          <Field label={t.label} hint={`Format: ${t.format}`}>
            <input className={cx('input uppercase', f.idProofNumber && !idOk && 'border-red-400')} maxLength={t.maxLen} value={f.idProofNumber}
              onChange={(e) => set('idProofNumber', f.idProofType === 'Aadhaar' ? e.target.value.replace(/[^\d ]/g, '') : e.target.value.toUpperCase())}
              placeholder={t.placeholder} />
            {f.idProofNumber && !idOk && <p className="mt-1 text-xs text-red-600">Invalid format - expected {t.format}</p>}
          </Field>
        </div>
        <div className={cx('mt-3 grid gap-3', t.back && 'sm:grid-cols-2')}>
          <div><p className="label">{t.frontLabel}</p>
            <FileUpload kind="document" value={f.idProofUrl} onChange={(u) => set('idProofUrl', u)} label={`Upload ${t.frontLabel}`} aspect="aspect-[16/10]" /></div>
          {t.back && <div><p className="label">{t.backLabel}</p>
            <FileUpload kind="document" value={f.idProofBackUrl} onChange={(u) => set('idProofBackUrl', u)} label={`Upload ${t.backLabel}`} aspect="aspect-[16/10]" /></div>}
        </div>
      </div>
      <div>
        <h3 className="mb-3 font-semibold">2. FSSAI registration / licence</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Type"><select className="input" value={f.fssaiType} onChange={(e) => set('fssaiType', e.target.value)}>{FSSAI_TYPES.map((x) => <option key={x}>{x}</option>)}</select></Field>
          <Field label={`FSSAI number${fssaiNeeded ? '' : ' (if available)'}`} hint="14 digits, starts with 1 or 2">
            <input className={cx('input', f.fssaiNumber && !fssaiOk && 'border-red-400')} maxLength={14} value={f.fssaiNumber}
              onChange={(e) => set('fssaiNumber', e.target.value.replace(/\D/g, ''))} placeholder="14-digit number" />
            {f.fssaiNumber && !fssaiOk && <p className="mt-1 text-xs text-red-600">FSSAI number must be 14 digits</p>}
          </Field>
        </div>
        {!fssaiNeeded && <p className="mt-2 text-xs text-amber-700">You can submit now and upload the FSSAI registration later - your kitchen stays under review for food safety until it is verified.</p>}
        <p className="label mt-3">{fssaiNeeded ? 'FSSAI certificate' : 'FSSAI application acknowledgement (optional)'}</p>
        <FileUpload kind="document" value={f.fssaiCertificateUrl} onChange={(u) => set('fssaiCertificateUrl', u)} label="Upload FSSAI certificate" aspect="aspect-[16/10]" className="sm:max-w-md" />
      </div>
    </div>
  );
}

export function OperationsSection({ f, set }: Props) {
  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Opening time"><input className="input" type="time" value={f.openTime} onChange={(e) => set('openTime', e.target.value)} /></Field>
        <Field label="Closing time"><input className="input" type="time" value={f.closeTime} onChange={(e) => set('closeTime', e.target.value)} /></Field>
      </div>
      <Field label="Weekly working days">
        <div className="flex flex-wrap gap-2">{DAYS.map((d) => (
          <button key={d} type="button" onClick={() => set('workingDays', f.workingDays.includes(d) ? f.workingDays.filter((x) => x !== d) : [...f.workingDays, d])}
            className={cx('chip w-14 justify-center', f.workingDays.includes(d) && 'chip-active')}>{d.slice(0, 3)}</button>
        ))}</div>
      </Field>
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-cream-300 p-3"><Toggle checked={f.breakfastAvailable} onChange={(v) => set('breakfastAvailable', v)} label="Breakfast" /></div>
        <div className="rounded-xl border border-cream-300 p-3"><Toggle checked={f.lunchAvailable} onChange={(v) => set('lunchAvailable', v)} label="Lunch" /></div>
        <div className="rounded-xl border border-cream-300 p-3"><Toggle checked={f.dinnerAvailable} onChange={(v) => set('dinnerAvailable', v)} label="Dinner" /></div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Maximum orders per day"><input className="input" type="number" min={1} value={f.maxDailyOrders} onChange={(e) => set('maxDailyOrders', Number(e.target.value))} /></Field>
        <Field label="Average preparation time (min)"><input className="input" type="number" min={5} value={f.avgPrepMinutes} onChange={(e) => set('avgPrepMinutes', Number(e.target.value))} /></Field>
      </div>
      <div className="rounded-xl border border-cream-300 p-3"><Toggle checked={f.selfDelivery} onChange={(v) => set('selfDelivery', v)} label="I will deliver orders myself (required for version 1)" /></div>
    </div>
  );
}
