import { OffersStrip } from '../../components/Offers';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, BadgeCheck, ChefHat, Clock, FileCheck2, HeartHandshake, MapPin, MessageSquareQuote, Search, ShieldCheck, Sparkles, Star, Video } from 'lucide-react';
import LocationPicker from '../../components/LocationPicker';
import KitchenCard from '../../components/KitchenCard';
import { useLocationCtx } from '../../context/LocationContext';
import { useFetch } from '../../components/useFetch';
import type { KitchenCard as K, MenuItem, Review } from '../../types';
import { Skeleton, Stars, VegMark } from '../../components/ui';
import { rupee, timeAgo } from '../../utils/format';

interface Special { item: MenuItem; kitchenId: number; kitchenName: string; area: string; distanceKm?: number; rating: number; }

const categories = [
  { title: 'Homemade Veg Meals', sub: 'Fresh everyday cooking', img: '/images/veg-leaf-meal.jpg', to: '/kitchens?foodType=VEG' },
  { title: 'Homemade Non-Veg', sub: 'Traditional recipes', img: '/images/chicken-curry.jpg', to: '/kitchens?foodType=NON_VEG' },
  { title: 'Everyday Specials', sub: "Today's kitchen menu", img: '/images/thali-chapati.jpg', to: '/#specials' },
  { title: 'Request Your Dish', sub: 'Your food, your preference', img: '/images/pan-cooking.jpg', to: '/request' },
];

const hometowns = [
  { name: 'Kongu', img: '/images/pepper-chicken.jpg' }, { name: 'Chettinad', img: '/images/chicken-gravy.jpg' },
  { name: 'Madurai', img: '/images/mutton-curry.jpg' }, { name: 'Kerala', img: '/images/fish-curry.jpg' },
  { name: 'Andhra', img: '/images/biryani.jpg' }, { name: 'North Indian', img: '/images/paneer-butter-masala.jpg' },
  { name: 'Tiffin', img: '/images/masala-dosa.jpg' },
];

export default function Home() {
  const { location } = useLocationCtx();
  const nav = useNavigate();
  const [q, setQ] = useState('');
  const qs = `lat=${location.lat}&lng=${location.lng}`;
  const kitchens = useFetch<K[]>(`/public/kitchens?${qs}`);
  const specials = useFetch<Special[]>(`/public/specials?${qs}`);
  const reviews = useFetch<Review[]>('/public/reviews/recent');

  return (
    <div>
      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="absolute -right-40 -top-40 h-[480px] w-[480px] rounded-full bg-saffron-100/60 blur-3xl" />
        <div className="absolute -left-40 top-40 h-[380px] w-[380px] rounded-full bg-brand-100/70 blur-3xl" />
        <div className="container-x relative grid items-center gap-10 py-10 lg:grid-cols-[1.05fr_1fr] lg:py-16">
          <div className="animate-fade-up">
            <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-brand-700 shadow-card">
              <Sparkles className="h-3.5 w-3.5 text-saffron-500" /> Now serving Coimbatore
            </span>
            <h1 className="mt-5 font-display text-4xl font-semibold leading-[1.08] sm:text-5xl lg:text-6xl">
              Missing the <span className="relative whitespace-nowrap text-brand-700">taste of home?
                <svg className="absolute -bottom-2 left-0 w-full" viewBox="0 0 300 12" fill="none"><path d="M2 9c60-6 180-8 296-3" stroke="#F07315" strokeWidth="4" strokeLinecap="round" /></svg></span>
            </h1>
            <p className="mt-5 max-w-xl text-lg text-charcoal-500">
              Discover fresh, homemade meals prepared by verified home chefs near you — not restaurants, real home kitchens.
            </p>
            <div className="card mt-8 flex flex-col gap-2 p-2 sm:flex-row">
              <div className="sm:w-56"><LocationPicker variant="hero" /></div>
              <form className="relative flex-1" onSubmit={(e) => { e.preventDefault(); nav(`/kitchens${q ? `?q=${encodeURIComponent(q)}` : ''}`); }}>
                <Search className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-charcoal-400" />
                <input value={q} onChange={(e) => setQ(e.target.value)} className="h-full w-full rounded-xl bg-transparent py-3 pl-11 pr-3 text-sm outline-none" placeholder="Search sambar rice, chicken gravy, chapati…" />
              </form>
              <Link to="/kitchens" className="btn-accent px-6 py-3">Explore Kitchens <ArrowRight className="h-4 w-4" /></Link>
            </div>
            <div className="mt-8 flex flex-wrap gap-x-8 gap-y-3 text-sm text-charcoal-500">
              <span className="flex items-center gap-2"><BadgeCheck className="h-5 w-5 text-brand-600" />KYC & FSSAI verified</span>
              <span className="flex items-center gap-2"><Video className="h-5 w-5 text-brand-600" />Daily kitchen videos</span>
              <span className="flex items-center gap-2"><MapPin className="h-5 w-5 text-brand-600" />Kitchens within 5 km</span>
            </div>
          </div>
          <div className="relative grid grid-cols-5 grid-rows-2 gap-3 lg:h-[520px]">
            <img src="/images/hero-leaf-meal.jpg" alt="Homemade South Indian meal on banana leaf" className="col-span-3 row-span-2 h-full w-full rounded-3xl object-cover shadow-lift" />
            <img src="/images/pan-cooking.jpg" alt="Home chef cooking" className="col-span-2 h-full w-full rounded-3xl object-cover shadow-card" />
            <img src="/images/thali-chapati.jpg" alt="Chapati thali" className="col-span-2 h-full w-full rounded-3xl object-cover shadow-card" />
            <div className="absolute -bottom-4 left-4 flex items-center gap-3 rounded-2xl bg-white p-3 pr-5 shadow-lift sm:left-8">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50"><ChefHat className="h-6 w-6 text-brand-600" /></span>
              <div><p className="text-sm font-bold">{kitchens.data?.length ?? '…'} home kitchens</p><p className="text-xs text-charcoal-400">cooking near {location.label} today</p></div>
            </div>
          </div>
        </div>
      </section>

      {/* CATEGORIES */}
      <section className="container-x mt-8">
        <h2 className="mb-3 font-display text-xl font-semibold">Offers for you</h2>
        <OffersStrip />
      </section>

      <section className="container-x mt-10">
        <h2 className="font-display text-2xl font-semibold sm:text-3xl">Discover homemade food</h2>
        <div className="mt-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {categories.map((c) => (
            <Link key={c.title} to={c.to} onClick={() => c.to === '/#specials' && document.getElementById('specials')?.scrollIntoView({ behavior: 'smooth' })} className="group">
              <div className="aspect-[4/3] overflow-hidden rounded-2xl shadow-card">
                <img src={c.img} alt={c.title} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
              </div>
              <p className="mt-3 font-bold text-charcoal-900">{c.title}</p>
              <p className="text-sm text-charcoal-500">{c.sub}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* TODAY'S SPECIALS */}
      <section id="specials" className="container-x mt-16 scroll-mt-24">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-saffron-600">Cooked fresh today</p>
            <h2 className="font-display text-2xl font-semibold sm:text-3xl">Today's Homemade Specials</h2>
          </div>
        </div>
        <div className="scrollbar-none -mx-4 mt-5 flex snap-x gap-4 overflow-x-auto px-4 pb-2">
          {specials.loading && [1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-64 w-64 shrink-0" />)}
          {specials.data?.map((s) => (
            <Link key={s.item.id} to={`/kitchens/${s.kitchenId}`} className="card group w-64 shrink-0 snap-start overflow-hidden">
              <div className="relative h-40 overflow-hidden">
                <img src={s.item.imageUrl} alt={s.item.name} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
                {s.item.offerPrice != null && <span className="absolute left-3 top-3 rounded-full bg-saffron-500 px-2 py-0.5 text-xs font-bold text-white">
                  {Math.round((1 - s.item.offerPrice / s.item.price) * 100)}% OFF</span>}
              </div>
              <div className="p-4">
                <div className="flex items-start gap-2"><VegMark veg={s.item.veg} className="mt-0.5" /><p className="line-clamp-1 font-semibold">{s.item.name}</p></div>
                <p className="mt-1 line-clamp-1 text-xs text-charcoal-400">{s.kitchenName} · {s.distanceKm} km</p>
                <div className="mt-3 flex items-center justify-between">
                  <span className="font-bold">{rupee(s.item.offerPrice ?? s.item.price)} {s.item.offerPrice != null && <s className="ml-1 text-xs font-normal text-charcoal-400">{rupee(s.item.price)}</s>}</span>
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-brand-700"><Star className="h-3 w-3 fill-current" />{s.rating}</span>
                </div>
              </div>
            </Link>
          ))}
          {specials.data?.length === 0 && <p className="text-sm text-charcoal-500">No specials near {location.label} yet.</p>}
        </div>
      </section>

      {/* NEARBY KITCHENS */}
      <section className="container-x mt-16">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-saffron-600">Within 5 km of {location.label}</p>
            <h2 className="font-display text-2xl font-semibold sm:text-3xl">Home kitchens near you</h2>
          </div>
          <Link to="/kitchens" className="btn-outline shrink-0">View all <ArrowRight className="h-4 w-4" /></Link>
        </div>
        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {kitchens.loading && [1, 2, 3].map((i) => <Skeleton key={i} className="h-80" />)}
          {kitchens.data?.slice(0, 6).map((k) => <KitchenCard key={k.id} k={k} />)}
        </div>
        {kitchens.data?.length === 0 && (
          <div className="card mt-6 p-8 text-center text-charcoal-500">No home kitchens deliver to {location.label} yet. Try another area — or <Link to="/request" className="font-semibold text-brand-700">request a dish</Link>.</div>
        )}
      </section>

      {/* REQUEST YOUR DISH */}
      <section className="container-x mt-16">
        <div className="relative overflow-hidden rounded-3xl bg-brand-800">
          <img src="/images/chicken-gravy.jpg" alt="" className="absolute inset-0 h-full w-full object-cover opacity-30" />
          <div className="absolute inset-0 bg-gradient-to-r from-brand-900 via-brand-900/90 to-brand-900/30" />
          <div className="relative grid gap-8 p-8 sm:p-12 lg:grid-cols-2">
            <div>
              <span className="rounded-full bg-saffron-500 px-3 py-1 text-xs font-bold uppercase tracking-wide text-white">Only on HomePlate</span>
              <h2 className="mt-4 font-display text-3xl font-semibold text-white sm:text-4xl">Craving amma's chicken gravy? Just ask.</h2>
              <p className="mt-4 text-brand-50/85">Tell us the dish, quantity and spice level. Nearby home chefs send you their price — you pick the best offer.</p>
              <Link to="/request" className="btn-accent mt-6 px-6 py-3">Request your homemade food <ArrowRight className="h-4 w-4" /></Link>
            </div>
            <div className="grid gap-3 self-center">
              {[
                ['1', 'Describe your dish', '500 g chicken gravy, medium spicy, for lunch'],
                ['2', 'Kitchens send offers', 'Compare price, prep time & ratings'],
                ['3', 'Pick, pay & enjoy', 'Freshly cooked and delivered by the home chef'],
              ].map(([n, t, d]) => (
                <div key={n} className="flex gap-4 rounded-2xl bg-white/10 p-4 backdrop-blur">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white font-bold text-brand-800">{n}</span>
                  <div><p className="font-semibold text-white">{t}</p><p className="text-sm text-brand-50/75">{d}</p></div>
                </div>
              ))}
              <p className="flex items-center gap-2 text-xs text-brand-50/70"><Clock className="h-4 w-4" />Same-day lunch requests close at 11:00 AM</p>
            </div>
          </div>
        </div>
      </section>

      {/* HOMETOWN */}
      <section className="container-x mt-16">
        <p className="text-xs font-bold uppercase tracking-widest text-saffron-600">Food from my hometown</p>
        <h2 className="font-display text-2xl font-semibold sm:text-3xl">Search by regional style</h2>
        <div className="scrollbar-none -mx-4 mt-5 flex gap-4 overflow-x-auto px-4 pb-2">
          {hometowns.map((h) => (
            <Link key={h.name} to={`/kitchens?cuisine=${encodeURIComponent(h.name)}`} className="group w-32 shrink-0 text-center">
              <div className="mx-auto h-28 w-28 overflow-hidden rounded-full ring-4 ring-white shadow-card">
                <img src={h.img} alt={h.name} className="h-full w-full object-cover transition group-hover:scale-110" />
              </div>
              <p className="mt-3 text-sm font-semibold">{h.name}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* TRUST */}
      <section className="container-x mt-16">
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <div className="relative">
            <img src="/images/clean-kitchen.jpg" alt="Clean home kitchen" className="aspect-[4/3] w-full rounded-3xl object-cover shadow-lift" />
            <div className="absolute bottom-4 left-4 right-4 flex items-center gap-3 rounded-2xl bg-white/95 p-4 shadow-lift backdrop-blur">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-50"><Video className="h-6 w-6 text-violet-600" /></span>
              <div className="text-sm"><p className="font-bold">Daily kitchen video</p><p className="text-charcoal-500">Reviewed by our team for cleanliness, storage and hygiene.</p></div>
            </div>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-saffron-600">Transparent trust</p>
            <h2 className="font-display text-2xl font-semibold sm:text-3xl">Know exactly who is cooking your food</h2>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {[
                { icon: FileCheck2, t: 'Identity & FSSAI checks', d: 'Every kitchen submits ID proof and food business registration before going live.' },
                { icon: Video, t: 'Cooking videos', d: 'Kitchens upload preparation videos which our team reviews.' },
                { icon: MessageSquareQuote, t: 'Honest ratings', d: 'Only customers who ordered can review. Complaints are tracked publicly.' },
                { icon: ShieldCheck, t: 'Periodic inspections', d: 'We visit kitchens and act fast on hygiene complaints.' },
              ].map((x) => (
                <div key={x.t} className="card p-5">
                  <x.icon className="h-6 w-6 text-brand-600" />
                  <p className="mt-3 font-semibold">{x.t}</p>
                  <p className="mt-1 text-sm text-charcoal-500">{x.d}</p>
                </div>
              ))}
            </div>
            <p className="mt-4 text-xs text-charcoal-400">Verification is supporting evidence, not a guarantee. Each kitchen's trust profile shows its documents, videos, ratings and complaint history so you can decide.</p>
          </div>
        </div>
      </section>

      {/* REVIEWS */}
      {reviews.data && reviews.data.length > 0 && (
        <section className="container-x mt-16">
          <h2 className="font-display text-2xl font-semibold sm:text-3xl">Loved by people who moved away from home</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {reviews.data.slice(0, 6).map((r) => (
              <div key={r.id} className="card p-5">
                <Stars value={r.rating} />
                <p className="mt-3 text-sm text-charcoal-700">"{r.comment}"</p>
                <p className="mt-4 text-xs text-charcoal-400"><b className="text-charcoal-700">{r.customerName}</b> · {r.kitchenName} · {timeAgo(r.createdAt)}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* PARTNER CTA */}
      <section className="container-x mt-16">
        <div className="card grid items-center gap-6 overflow-hidden p-0 md:grid-cols-2">
          <img src="/images/fresh-vegetables.jpg" alt="" className="h-64 w-full object-cover md:h-full" />
          <div className="p-8">
            <HeartHandshake className="h-8 w-8 text-saffron-500" />
            <h2 className="mt-3 font-display text-2xl font-semibold">Love cooking? Earn from your home kitchen.</h2>
            <p className="mt-2 text-sm text-charcoal-500">Publish your daily menu, accept custom requests and deliver to neighbours. First month free.</p>
            <Link to="/kitchen/register" className="btn-primary mt-5">Become a kitchen partner <ArrowRight className="h-4 w-4" /></Link>
          </div>
        </div>
      </section>
    </div>
  );
}
