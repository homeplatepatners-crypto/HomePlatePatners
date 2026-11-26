import { useState } from 'react';
import { Pencil, Plus, Sparkles, Trash2, UtensilsCrossed } from 'lucide-react';
import toast from 'react-hot-toast';
import { api, errMsg } from '../../api/client';
import { useFetch } from '../../components/useFetch';
import type { MealType, MenuItem } from '../../types';
import FileUpload from '../../components/FileUpload';
import { Badge, ConfirmDialog, EmptyState, ErrorState, Field, Modal, PageHeader, PageLoader, Spinner, Tabs, Toggle, VegMark } from '../../components/ui';
import { mealLabel, rupee } from '../../utils/format';
import DailyMenuBanner from './DailyMenuBanner';

const MEALS: MealType[] = ['BREAKFAST', 'LUNCH', 'SNACKS', 'DINNER'];
const CATEGORIES = ['Meals', 'Variety Rice', 'Biryani', 'Gravy', 'Tiffin', 'Thali', 'Non-Veg', 'Starters', 'Snacks', 'Sweets'];
const blank = (meal: MealType): Partial<MenuItem> => ({ name: '', description: '', imageUrl: '', price: 0, offerPrice: null, veg: true, mealType: meal, category: 'Meals', quantityAvailable: 20, available: true, todaySpecial: false, servingSize: '1 plate', availableFrom: null, availableTo: null });

export default function MenuPage() {
  const { data, loading, error, reload, setData } = useFetch<MenuItem[]>('/kitchen/menu');
  const [tab, setTab] = useState<MealType | 'ALL'>('ALL');
  const [edit, setEdit] = useState<Partial<MenuItem> | null>(null);
  const [del, setDel] = useState<MenuItem | null>(null);
  const [busy, setBusy] = useState(false);
  const [menuRev, setMenuRev] = useState(0);

  if (loading) return <PageLoader />;
  if (error || !data) return <ErrorState message={error ?? ''} onRetry={reload} />;
  const items = data.filter((i) => tab === 'ALL' || i.mealType === tab);

  const save = async () => {
    if (!edit) return;
    if (!edit.name?.trim()) return toast.error('Enter item name');
    if (!edit.price || edit.price < 1) return toast.error('Enter a valid price');
    setBusy(true);
    try {
      const payload = { ...edit, offerPrice: edit.offerPrice || null };
      if (edit.id) await api.put(`/kitchen/menu/${edit.id}`, payload); else await api.post('/kitchen/menu', payload);
      toast.success(edit.id ? 'Item updated' : 'Item added to menu');
      setEdit(null); reload(true); setMenuRev((n) => n + 1);
    } catch (e) { toast.error(errMsg(e)); } finally { setBusy(false); }
  };

  const toggle = async (i: MenuItem, available: boolean) => {
    setData(data.map((x) => (x.id === i.id ? { ...x, available } : x)));
    try { setMenuRev((n) => n + 1); await api.patch(`/kitchen/menu/${i.id}/availability`, { available, quantityAvailable: available && (i.quantityAvailable ?? 0) <= 0 ? 20 : i.quantityAvailable }); reload(true); }
    catch (e) { toast.error(errMsg(e)); reload(true); }
  };

  const remove = async () => {
    if (!del) return;
    try { await api.delete(`/kitchen/menu/${del.id}`); toast.success('Item removed'); setDel(null); reload(true); }
    catch (e) { toast.error(errMsg(e)); }
  };

  return (
    <div>
      <DailyMenuBanner refreshKey={menuRev} />
      <PageHeader title="Daily menu" subtitle="Publish what you're cooking today. Customers only see available items."
        actions={<button className="btn-primary" onClick={() => setEdit(blank(tab === 'ALL' ? 'LUNCH' : tab))}><Plus className="h-4 w-4" />Add food item</button>} />
      <Tabs value={tab} onChange={setTab} tabs={[{ value: 'ALL' as const, label: 'All items', count: data.length }, ...MEALS.map((m) => ({ value: m, label: mealLabel[m], count: data.filter((i) => i.mealType === m).length }))]} />
      {items.length === 0 ? <EmptyState icon={UtensilsCrossed} title="No items here yet" text="Add the dishes you are cooking for this meal." action={<button className="btn-primary" onClick={() => setEdit(blank(tab === 'ALL' ? 'LUNCH' : tab))}>Add item</button>} /> : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((i) => (
            <div key={i.id} className={`card overflow-hidden transition ${!i.available ? 'opacity-60' : ''}`}>
              <div className="relative h-40"><img src={i.imageUrl || '/images/veg-leaf-meal.jpg'} alt="" className="h-full w-full object-cover" />
                <div className="absolute left-3 top-3 flex gap-1.5"><Badge tone="gray" className="bg-white/95">{mealLabel[i.mealType]}</Badge>{i.todaySpecial && <Badge tone="orange" icon={Sparkles} className="bg-white/95">Special</Badge>}</div></div>
              <div className="p-4">
                <div className="flex items-start gap-2"><VegMark veg={i.veg} className="mt-0.5" /><p className="flex-1 font-semibold">{i.name}</p></div>
                <p className="mt-1 line-clamp-2 text-xs text-charcoal-500">{i.description}</p>
                <div className="mt-3 flex items-center justify-between">
                  <p className="font-bold">{rupee(i.offerPrice ?? i.price)}{i.offerPrice != null && <s className="ml-1.5 text-xs font-normal text-charcoal-400">{rupee(i.price)}</s>}</p>
                  <p className="text-xs text-charcoal-500">{i.quantityAvailable ?? '∞'} left</p>
                </div>
                <div className="mt-3 flex items-center justify-between border-t border-cream-200 pt-3">
                  <Toggle checked={i.available} onChange={(v) => toggle(i, v)} label={<span className="text-xs">{i.available ? 'Available' : 'Unavailable'}</span>} />
                  <div className="flex gap-1">
                    <button className="rounded-lg p-2 hover:bg-cream-100" onClick={() => setEdit(i)} aria-label="Edit"><Pencil className="h-4 w-4" /></button>
                    <button className="rounded-lg p-2 text-red-600 hover:bg-red-50" onClick={() => setDel(i)} aria-label="Delete"><Trash2 className="h-4 w-4" /></button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit?.id ? 'Edit food item' : 'Add food item'} size="lg"
        footer={<><button className="btn-ghost" onClick={() => setEdit(null)}>Cancel</button><button className="btn-primary" onClick={save} disabled={busy}>{busy && <Spinner className="h-4 w-4 text-white" />}Save item</button></>}>
        {edit && (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2"><FileUpload value={edit.imageUrl} onChange={(u) => setEdit({ ...edit, imageUrl: u })} label="Upload food photo" aspect="aspect-[16/7]" /></div>
            <Field label="Item name" className="sm:col-span-2"><input className="input" value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} placeholder="Chicken biryani" /></Field>
            <Field label="Description" className="sm:col-span-2"><textarea className="input" value={edit.description} onChange={(e) => setEdit({ ...edit, description: e.target.value })} placeholder="What's included, portion details…" /></Field>
            <Field label="Price (₹)"><input className="input" type="number" min={1} value={edit.price || ''} onChange={(e) => setEdit({ ...edit, price: Number(e.target.value) })} /></Field>
            <Field label="Special offer price (optional)"><input className="input" type="number" min={1} value={edit.offerPrice ?? ''} onChange={(e) => setEdit({ ...edit, offerPrice: e.target.value ? Number(e.target.value) : null })} /></Field>
            <Field label="Meal"><select className="input" value={edit.mealType} onChange={(e) => setEdit({ ...edit, mealType: e.target.value as MealType })}>{MEALS.map((m) => <option key={m} value={m}>{mealLabel[m]}</option>)}</select></Field>
            <Field label="Category"><select className="input" value={edit.category} onChange={(e) => setEdit({ ...edit, category: e.target.value })}>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select></Field>
            <Field label="Quantity available today"><input className="input" type="number" min={0} value={edit.quantityAvailable ?? ''} onChange={(e) => setEdit({ ...edit, quantityAvailable: Number(e.target.value) })} /></Field>
            <Field label="Serving size"><input className="input" value={edit.servingSize ?? ''} onChange={(e) => setEdit({ ...edit, servingSize: e.target.value })} placeholder="1 plate / 500 g" /></Field>
            <Field label="Available from (optional)"><input className="input" type="date" value={edit.availableFrom ?? ''} onChange={(e) => setEdit({ ...edit, availableFrom: e.target.value || null })} /></Field>
            <Field label="Available until (optional)"><input className="input" type="date" value={edit.availableTo ?? ''} onChange={(e) => setEdit({ ...edit, availableTo: e.target.value || null })} /></Field>
            <div className="flex flex-wrap gap-6 sm:col-span-2">
              <Toggle checked={!!edit.veg} onChange={(v) => setEdit({ ...edit, veg: v })} label={<span className="flex items-center gap-1.5"><VegMark veg={!!edit.veg} />{edit.veg ? 'Vegetarian' : 'Non-vegetarian'}</span>} />
              <Toggle checked={!!edit.available} onChange={(v) => setEdit({ ...edit, available: v })} label="Available now" />
              <Toggle checked={!!edit.todaySpecial} onChange={(v) => setEdit({ ...edit, todaySpecial: v })} label="Mark as today's special" />
            </div>
          </div>
        )}
      </Modal>
      <ConfirmDialog open={!!del} onClose={() => setDel(null)} onConfirm={remove} tone="danger" title="Delete item?" confirmLabel="Delete" message={`"${del?.name}" will be removed from your menu.`} />
    </div>
  );
}
