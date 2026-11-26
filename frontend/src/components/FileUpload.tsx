import { useRef, useState } from 'react';
import { FileText, ImagePlus, UploadCloud, Video, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { errMsg, uploadFile } from '../api/client';
import { cx, Spinner } from './ui';

type Kind = 'image' | 'document' | 'video';
const accept: Record<Kind, string> = { image: 'image/*', document: 'image/*,application/pdf', video: 'video/*' };
const folder: Record<Kind, 'images' | 'documents' | 'videos'> = { image: 'images', document: 'documents', video: 'videos' };
const maxMb: Record<Kind, number> = { image: 10, document: 10, video: 200 };

/** Uploads to /api/files/upload and returns the stored URL. */
export default function FileUpload({ value, onChange, kind = 'image', label, className = '', aspect = 'aspect-video' }:
  { value?: string | null; onChange: (url: string) => void; kind?: Kind; label?: string; className?: string; aspect?: string }) {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [pct, setPct] = useState(0);

  const pick = async (f?: File) => {
    if (!f) return;
    if (f.size > maxMb[kind] * 1024 * 1024) { toast.error(`File too large (max ${maxMb[kind]} MB)`); return; }
    setBusy(true); setPct(0);
    try {
      const url = await uploadFile(f, folder[kind], setPct);
      onChange(url);
      toast.success('Uploaded');
    } catch (e) {
      toast.error(errMsg(e, 'Upload failed'));
    } finally {
      setBusy(false);
      if (ref.current) ref.current.value = '';
    }
  };

  const isPdf = value?.toLowerCase().endsWith('.pdf');
  const Icon = kind === 'video' ? Video : kind === 'document' ? FileText : ImagePlus;

  return (
    <div className={className}>
      <input ref={ref} type="file" accept={accept[kind]} className="hidden" onChange={(e) => pick(e.target.files?.[0])} />
      {value ? (
        <div className={cx('group relative overflow-hidden rounded-2xl bg-cream-100 ring-1 ring-black/5', aspect)}>
          {kind === 'video' ? <video src={value} controls className="h-full w-full bg-black object-contain" />
            : isPdf ? (
              <div className="flex h-full flex-col">
                <iframe src={`${value}#toolbar=0&view=FitH`} title="Document preview" className="w-full flex-1 bg-white" />
                <a href={value} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-1 bg-white py-1.5 text-xs font-semibold text-brand-700"><FileText className="h-3.5 w-3.5" />Open PDF</a>
              </div>)
            : <a href={value} target="_blank" rel="noreferrer" title="Open full size"><img src={value} alt="Uploaded preview" className={cx('h-full w-full', kind === 'document' ? 'bg-white object-contain' : 'object-cover')} /></a>}
          <div className="absolute right-2 top-2 flex gap-1.5">
            <button type="button" onClick={() => ref.current?.click()} className="rounded-lg bg-white/95 px-2.5 py-1 text-xs font-semibold shadow">Replace</button>
            <button type="button" onClick={() => onChange('')} className="rounded-lg bg-white/95 p-1 shadow" aria-label="Remove"><X className="h-4 w-4" /></button>
          </div>
        </div>
      ) : (
        <button type="button" onClick={() => ref.current?.click()} disabled={busy}
          onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); pick(e.dataTransfer.files?.[0]); }}
          className={cx('flex w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-cream-300 bg-cream-50 p-4 text-center transition hover:border-brand-400 hover:bg-brand-50/40', aspect)}>
          {busy ? (
            <>
              <Spinner className="h-7 w-7" />
              <span className="text-sm font-medium text-charcoal-600">Uploading… {pct}%</span>
              <span className="h-1.5 w-40 overflow-hidden rounded-full bg-cream-200"><span className="block h-full bg-brand-500 transition-all" style={{ width: `${pct}%` }} /></span>
            </>
          ) : (
            <>
              <span className="rounded-full bg-white p-3 shadow-card"><Icon className="h-6 w-6 text-brand-600" /></span>
              <span className="text-sm font-semibold text-charcoal-700">{label ?? 'Upload file'}</span>
              <span className="flex items-center gap-1 text-xs text-charcoal-400"><UploadCloud className="h-3.5 w-3.5" />Click or drag & drop · max {maxMb[kind]} MB</span>
            </>
          )}
        </button>
      )}
    </div>
  );
}
