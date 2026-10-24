'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import {
  MapPin, Minus, Plus, ChevronRight, Search, Car, CheckCircle2,
  Navigation, X, ClipboardList, ArrowLeft, ShoppingCart, Wallet, Trophy,
  Sparkles, PlusCircle, Share2,
} from 'lucide-react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { FoodRescue } from '@/components/FoodRescue';
import { useGetBazarsQuery, useGetNearbyBazarsQuery } from '../../../store/api/bazarApi';
import { useGetPricesQuery } from '../../../store/api/priceApi';
import { useGetShoppingListsQuery, useCreateShoppingListMutation } from '../../../store/api/shoppingListApi';
import { useUserLocation } from '../../../hooks/useUserLocation';
import { useAppSelector } from '../../../store/hooks';
import { distanceKm } from '../../../lib/distance';

const SAVINGS_KEY = 'bazar_savings';

function persistSaving(amount: number) {
  try {
    const prev = JSON.parse(localStorage.getItem(SAVINGS_KEY) || '[]');
    prev.push({ amount, date: new Date().toISOString() });
    localStorage.setItem(SAVINGS_KEY, JSON.stringify(prev));
  } catch {}
}

const STEP_TITLES: Record<1 | 2 | 3, string> = {
  1: 'ধাপ ১: পণ্য যোগ করা',
  2: 'ধাপ ২: বাজার তুলনা',
  3: 'ধাপ ৩: সেভ করুন',
};

function WizardHeader({ step, onBack }: { step: 1 | 2 | 3; onBack: () => void }) {
  return (
    <div className="glass-card p-4 sm:p-5 flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-500 shrink-0 transition-colors">
          <ArrowLeft className="w-4 h-4" strokeWidth={2} />
        </button>
        <h1 className="text-base sm:text-lg font-bold text-[#064E3B] flex-1 truncate">{STEP_TITLES[step]}</h1>
      </div>
      <div className="flex items-center">
        {([1, 2, 3] as const).map(n => (
          <div key={n} className="flex items-center flex-1 last:flex-none">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-colors ${
              n === step ? 'bg-[#064E3B] text-white' : n < step ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'
            }`}>
              {n < step ? '✓' : n}
            </div>
            {n < 3 && <div className={`flex-1 h-0.5 mx-1.5 rounded-full ${n < step ? 'bg-emerald-300' : 'bg-slate-100'}`} />}
          </div>
        ))}
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, highlight }: { icon: React.ReactNode; label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`rounded-2xl p-3 flex flex-col items-center text-center gap-1 ${highlight ? 'bg-amber-50 border border-amber-200' : 'bg-slate-50'}`}>
      <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${highlight ? 'bg-amber-100 text-amber-600' : 'bg-white text-[#064E3B]'}`}>
        {icon}
      </div>
      <span className="text-sm sm:text-base font-black text-[#064E3B]">{value}</span>
      <span className="text-[10px] text-slate-400 font-medium leading-tight">{label}</span>
    </div>
  );
}

function QuickAction({ icon, label, onClick, disabled, badge }: {
  icon: React.ReactNode; label: string; onClick?: () => void; disabled?: boolean; badge?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`relative flex flex-col items-center gap-1.5 p-2.5 rounded-2xl transition-colors ${
        disabled ? 'opacity-60 cursor-not-allowed bg-slate-50' : 'bg-slate-50 hover:bg-emerald-50 active:scale-95'
      }`}
    >
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${disabled ? 'bg-white text-slate-300' : 'bg-white text-[#064E3B]'}`}>
        {icon}
      </div>
      <span className="text-[10px] font-semibold text-slate-600 text-center leading-tight">{label}</span>
      {badge && (
        <span className="absolute -top-1 -right-1 text-[8px] font-bold bg-slate-200 text-slate-500 px-1.5 py-0.5 rounded-full whitespace-nowrap">
          {badge}
        </span>
      )}
    </button>
  );
}

function SummaryRow({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-slate-500">{label}</span>
      <span className={`text-sm ${bold ? 'font-black text-[#064E3B] text-base' : 'font-semibold text-slate-700'}`}>{value}</span>
    </div>
  );
}

export function Planner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [activeTab, setActiveTab]               = useState(searchParams.get('tab') === 'rescue' ? 'rescue' : 'planner');
  const [selectedProducts, setSelectedProducts] = useState<Record<string, number>>({});
  const [searchQuery, setSearchQuery]           = useState('');
  const [bazarSearch, setBazarSearch]           = useState('');
  const [bazarDropdownOpen, setBazarDropdownOpen] = useState(false);
  const [selectedBazarId, setSelectedBazarId]   = useState('');
  const bazarRef = useRef<HTMLDivElement>(null);
  const myPlansRef = useRef<HTMLDivElement>(null);
  const [travelCost, setTravelCost]             = useState('');

  // ── Bazar Plan home ⇄ Product-add wizard ──────────────────────────────────
  const [plannerView, setPlannerView] = useState<'home' | 'wizard'>('home');
  const [wizardStep, setWizardStep]   = useState<1 | 2 | 3>(1);
  const [planName, setPlanName]       = useState('');

  const { location: userLocation } = useUserLocation();
  const isAuthenticated = useAppSelector(s => s.auth.isAuthenticated);
  const [createShoppingList] = useCreateShoppingListMutation();
  const { data: savedPlansRes } = useGetShoppingListsQuery(
    { limit: 5 },
    { skip: !isAuthenticated },
  );
  const savedPlans: any[] = savedPlansRes?.data?.attributes?.data || [];

  // When location available: nearby bazars within 25km (covers all reachable bazars)
  // When no location: server-side text search so any bazar can be found regardless of DB size
  const { data: bazarsRes, isLoading: loadingBazars1 } = useGetBazarsQuery(
    { search: bazarSearch || undefined, limit: 50 },
    { skip: !!userLocation },
  );
  const { data: nearbyBazarsRes, isLoading: loadingBazars2 } = useGetNearbyBazarsQuery(
    { lat: userLocation?.lat ?? 0, lng: userLocation?.lng ?? 0, radius: 25, limit: 100 },
    { skip: !userLocation },
  );
  const loadingBazars = loadingBazars1 || loadingBazars2;

  const { data: allPricesRes,   isFetching: loadingAllPrices } = useGetPricesQuery({ limit: 200 });
  const { data: bazarPricesRes, isFetching: loadingBazarPrices } = useGetPricesQuery(
    { bazarId: selectedBazarId, limit: 200 },
    { skip: !selectedBazarId }
  );

  // Full list used for comparison and bazar name lookup
  const bazars: any[] = userLocation
    ? (nearbyBazarsRes?.data?.attributes || [])
    : (bazarsRes?.data?.attributes?.data || []);

  // Autocomplete options: filter by typed text, but show all when search matches selected bazar name
  const selectedBazarName = selectedBazarId
    ? (bazars.find((b: any) => b._id === selectedBazarId)?.nameBn ||
       bazars.find((b: any) => b._id === selectedBazarId)?.name || '')
    : '';
  const bazarOptions = bazarSearch && bazarSearch !== selectedBazarName
    ? bazars.filter((b: any) =>
        b.name?.toLowerCase().includes(bazarSearch.toLowerCase()) ||
        b.nameBn?.includes(bazarSearch) ||
        b.area?.toLowerCase().includes(bazarSearch.toLowerCase())
      )
    : bazars;

  const selectedBazarDisplayName = selectedBazarId
    ? (bazars.find((b: any) => b._id === selectedBazarId)?.nameBn ||
       bazars.find((b: any) => b._id === selectedBazarId)?.name || 'সব বাজার')
    : 'সব বাজার';

  useEffect(() => {
    const saved = localStorage.getItem('defaultBazarId');
    if (saved) setSelectedBazarId(saved);
  }, []);

  // When bazars load, populate search field with selected bazar name
  useEffect(() => {
    if (selectedBazarId && !bazarSearch && bazars.length > 0) {
      const b = bazars.find((b: any) => b._id === selectedBazarId);
      if (b) setBazarSearch(b.nameBn || b.name || '');
    }
  }, [bazars, selectedBazarId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const params = new URLSearchParams();
    params.set('tab', activeTab);
    router.replace(`/planner?${params.toString()}`);
  }, [activeTab, router]);

  // Suggest a name for the plan once the user reaches the save step
  useEffect(() => {
    if (wizardStep === 3 && !planName) {
      setPlanName(selectedBazarDisplayName !== 'সব বাজার' ? `${selectedBazarDisplayName} বাজার` : 'সাপ্তাহিক বাজার');
    }
  }, [wizardStep]); // eslint-disable-line react-hooks/exhaustive-deps

  const TODAY_MS = 24 * 60 * 60 * 1000;
  const rawPrices: any[] = (selectedBazarId
    ? bazarPricesRes?.data?.attributes?.data
    : allPricesRes?.data?.attributes?.data) || [];
  const allPrices: any[] = allPricesRes?.data?.attributes?.data || [];

  const refPrices = useMemo(() => {
    const grouped: Record<string, number[]> = {};
    allPrices.forEach((p: any) => {
      const pid = typeof p.productId === 'object' ? p.productId?._id : p.productId;
      if (!pid) return;
      if (!grouped[pid]) grouped[pid] = [];
      grouped[pid].push(p.price);
    });
    const result: Record<string, number> = {};
    Object.entries(grouped).forEach(([pid, prices]) => {
      const sorted = [...prices].sort((a, b) => a - b);
      const mid = Math.floor(sorted.length / 2);
      result[pid] = sorted.length % 2 !== 0 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
    });
    return result;
  }, [allPrices]);

  const bazarProductPriceMap = useMemo(() => {
    const bpp: Record<string, Record<string, number>> = {};
    allPrices.forEach((p: any) => {
      const bid = typeof p.bazarId === 'object' ? p.bazarId?._id : p.bazarId;
      const pid = typeof p.productId === 'object' ? p.productId?._id : p.productId;
      if (!bid || !pid) return;
      if (!bpp[bid]) bpp[bid] = {};
      if (bpp[bid][pid] === undefined) bpp[bid][pid] = p.price;
    });
    return bpp;
  }, [allPrices]);

  const products = useMemo(() => {
    const todayPrices = rawPrices.filter(
      (p: any) => Date.now() - new Date(p.createdAt).getTime() < TODAY_MS
    );
    const seen = new Set<string>();
    return todayPrices
      .filter((p: any) => {
        const pid = typeof p.productId === 'object' ? p.productId?._id : p.productId;
        if (!pid || seen.has(pid)) return false;
        seen.add(pid);
        return true;
      })
      .map((p: any) => ({
        ...(typeof p.productId === 'object' ? p.productId : { _id: p.productId }),
        currentPrice: p.price,
        priceEntry: p,
      }));
  }, [rawPrices]);

  const loadingProducts = selectedBazarId ? loadingBazarPrices : loadingAllPrices;
  const getDisplayPrice = (product: any) => product.currentPrice ?? product.defaultPrice ?? 0;

  const filteredProducts = useMemo(() => {
    if (!searchQuery.trim()) return products;
    return products.filter((p: any) =>
      p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.nameBn?.includes(searchQuery)
    );
  }, [searchQuery, products]);

  const bazarComparisons = useMemo(() => {
    const totalSelected = Object.keys(selectedProducts).length;
    if (totalSelected === 0 || bazars.length === 0) return [];
    return bazars
      .map((b: any) => {
        const priceMap = bazarProductPriceMap[b._id] || {};
        let total = 0, matched = 0;
        Object.entries(selectedProducts).forEach(([pid, qty]) => {
          if (priceMap[pid] !== undefined) {
            total += priceMap[pid] * (qty as number);
            matched++;
          }
        });
        const coverage = matched / totalSelected;
        const dist = userLocation && b.lat && b.lng
          ? distanceKm(userLocation.lat, userLocation.lng, b.lat, b.lng)
          : null;
        return { bazar: b, total: Math.round(total), matched, coverage, dist };
      })
      .filter(r => r.coverage >= 0.5 && r.total > 0)
      .sort((a, b) => a.total - b.total);
  }, [selectedProducts, bazarProductPriceMap, bazars, userLocation]);

  const selectedComp  = bazarComparisons.find(r => r.bazar._id === selectedBazarId);
  const cheapest      = bazarComparisons[0];
  const isAlreadyBest = cheapest?.bazar._id === selectedBazarId;

  const savingVsAvg = useMemo(() => {
    if (!isAlreadyBest || !selectedComp || bazarComparisons.length < 2) return null;
    const others = bazarComparisons.filter(r => r.bazar._id !== selectedBazarId);
    const avg = others.reduce((s, r) => s + r.total, 0) / others.length;
    return Math.round(avg - selectedComp.total);
  }, [isAlreadyBest, selectedComp, bazarComparisons, selectedBazarId]);

  const savingIfSwitch = !isAlreadyBest && selectedComp && cheapest
    ? Math.round(selectedComp.total - cheapest.total)
    : null;

  const handleToggle = (id: string) => {
    setSelectedProducts(prev => {
      if (prev[id]) { const n = { ...prev }; delete n[id]; return n; }
      return { ...prev, [id]: 1 };
    });
  };
  const handleQty = (id: string, delta: number) => {
    setSelectedProducts(prev => {
      const next = (prev[id] || 0) + delta;
      if (next <= 0) { const n = { ...prev }; delete n[id]; return n; }
      return { ...prev, [id]: next };
    });
  };

  const getSaving = (productId: string, currentPrice: number, qty: number) => {
    const ref = refPrices[productId] || 0;
    return ref > currentPrice ? Math.round((ref - currentPrice) * qty) : 0;
  };

  const productCost = Object.entries(selectedProducts).reduce((sum, [id, qty]) => {
    const p = products.find((pr: any) => pr._id === id);
    return sum + (getDisplayPrice(p || {}) * qty);
  }, 0);
  const travel      = parseFloat(travelCost) || 0;
  const totalCost   = productCost + travel;
  const grossSaving = Object.entries(selectedProducts).reduce((sum, [id, qty]) => {
    const p = products.find((pr: any) => pr._id === id);
    return sum + (p ? getSaving(p._id, getDisplayPrice(p), qty) : 0);
  }, 0);
  const displaySaving = isAlreadyBest && savingVsAvg && savingVsAvg > 0
    ? Math.max(0, savingVsAvg - travel)
    : Math.max(0, grossSaving - travel);

  const selectBazar = (bid: string) => {
    setSelectedBazarId(bid);
    localStorage.setItem('defaultBazarId', bid);
    const b = bazars.find((b: any) => b._id === bid);
    if (b) setBazarSearch(b.nameBn || b.name || '');
    setBazarDropdownOpen(false);
  };

  const clearBazar = () => {
    setSelectedBazarId('');
    setBazarSearch('');
    setBazarDropdownOpen(false);
    localStorage.removeItem('defaultBazarId');
  };

  const handleStartNewList = () => {
    setSelectedProducts({});
    setSearchQuery('');
    setTravelCost('');
    setPlanName('');
    setWizardStep(1);
    setPlannerView('wizard');
  };

  const handleWizardBack = () => {
    if (wizardStep === 1) setPlannerView('home');
    else setWizardStep((s) => (s - 1) as 1 | 2 | 3);
  };

  const handleQuickShare = async () => {
    const latest = savedPlans[0];
    const text = latest
      ? `আমার "${latest.name}" বাজার তালিকা: ৳${latest.estimatedTotal} — বাজার দর অ্যাপ দিয়ে দেখুন!`
      : 'বাজার দর অ্যাপ দিয়ে বাজার পরিকল্পনা করুন!';
    try {
      if (navigator.share) await navigator.share({ title: 'বাজার দর', text, url: window.location.origin });
      else await navigator.clipboard.writeText(`${text} ${window.location.origin}`);
    } catch {}
  };

  const handleCalculate = (name: string) => {
    const items = Object.entries(selectedProducts).map(([id, qty]) => {
      const p = products.find((pr: any) => pr._id === id);
      const price = getDisplayPrice(p || {});
      return {
        productId: id,
        name: p?.nameBn || p?.name,
        qty, price,
        icon: p?.icon,
        saving: p ? getSaving(p._id, price, qty) : 0,
        refPrice: refPrices[id] || price,
      };
    });
    if (displaySaving > 0) persistSaving(displaySaving);
    const comparisons = bazarComparisons.slice(0, 5).map(r => ({
      bazarId: r.bazar._id,
      name: r.bazar.nameBn || r.bazar.name,
      total: r.total,
      dist: r.dist,
    }));
    sessionStorage.setItem('plannerResult', JSON.stringify({
      totalCost: productCost,
      savings: displaySaving,
      grossSaving,
      savingVsAvg: savingVsAvg || 0,
      savingIfSwitch: savingIfSwitch || 0,
      isAlreadyBest,
      bazarId: selectedBazarId,
      bazarName: selectedBazarDisplayName,
      itemCount: Object.keys(selectedProducts).length,
      travelCost: travel,
      items,
      comparisons,
    }));

    // Persist the plan for logged-in users so it shows up under "আমার পরিকল্পনা" / history.
    // Best-effort only — a failed save never blocks the core calculate→result flow.
    if (isAuthenticated) {
      createShoppingList({
        name: name || 'সাপ্তাহিক বাজার',
        bazarId: selectedBazarId || undefined,
        items: items.map((it: any) => ({
          productId: it.productId,
          qty: it.qty,
          unit: products.find((p: any) => p._id === it.productId)?.unit || 'kg',
          estimatedPrice: it.price,
        })),
        estimatedTotal: productCost,
        travelCost: travel,
        savings: displaySaving,
        grossSaving,
        savingVsAvg: savingVsAvg || 0,
        savingIfSwitch: savingIfSwitch || 0,
        isAlreadyBest,
        comparisons: comparisons.map(c => ({
          bazarId: c.bazarId,
          bazarName: c.name,
          total: c.total,
          dist: c.dist,
        })),
        status: 'completed',
      }).unwrap().catch(() => {});
    }

    router.push('/result');
  };

  const selectedCount = Object.keys(selectedProducts).length;

  return (
    <div className="flex flex-col gap-3 sm:gap-5 pb-24 md:pb-6 w-full">

      {/* ── Header: tab switcher (home) OR wizard progress (wizard) ── */}
      {activeTab === 'planner' && plannerView === 'wizard' ? (
        <WizardHeader step={wizardStep} onBack={handleWizardBack} />
      ) : (
        <div className="glass-card p-4 sm:p-6 text-center flex flex-col gap-3 sm:gap-5">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-[#064E3B] mb-0.5">স্মার্ট প্ল্যানার</h1>
            <p className="text-xs text-slate-500">আপনার বাজার ও রান্না সহজ করুন</p>
          </div>
          <div className="bg-slate-100/60 p-1 rounded-2xl flex items-center">
            {['planner', 'rescue'].map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className={`flex-1 py-2.5 text-sm font-bold rounded-xl transition-all ${
                  activeTab === tab
                    ? 'bg-white text-[#064E3B] shadow-sm'
                    : 'text-slate-400 hover:text-slate-600'
                }`}>
                {tab === 'planner' ? 'বাজার প্ল্যানার' : 'ফুড রেসকিউ'}
              </button>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'rescue' ? <FoodRescue /> : plannerView === 'home' ? (
        <>
          {/* আজকের পরিকল্পনার সারাংশ */}
          <div className="glass-card p-4 sm:p-5">
            <h2 className="text-sm font-bold text-[#064E3B] mb-3">আজকের পরিকল্পনার সারাংশ</h2>
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              <StatCard icon={<ShoppingCart className="w-4 h-4" strokeWidth={2} />} label="মোট আইটেম" value={`${selectedCount} টি`} />
              <StatCard icon={<Wallet className="w-4 h-4" strokeWidth={2} />} label="আনুমানিক বাজেট" value={`৳${totalCost}`} />
              <StatCard icon={<Trophy className="w-4 h-4" strokeWidth={2} />} label="সাশ্রয় সম্ভব" value={`৳${displaySaving}`} highlight />
            </div>
          </div>

          {/* দ্রুত অ্যাকশন */}
          <div className="glass-card p-4 sm:p-5">
            <h2 className="text-sm font-bold text-[#064E3B] mb-3">দ্রুত অ্যাকশন</h2>
            <div className="grid grid-cols-4 gap-2 sm:gap-3">
              <QuickAction icon={<PlusCircle className="w-5 h-5" strokeWidth={2} />} label="নতুন তালিকা" onClick={handleStartNewList} />
              <QuickAction
                icon={<ClipboardList className="w-5 h-5" strokeWidth={2} />}
                label="আগের তালিকা"
                onClick={() => myPlansRef.current?.scrollIntoView({ behavior: 'smooth' })}
              />
              <QuickAction icon={<Sparkles className="w-5 h-5" strokeWidth={2} />} label="স্মার্ট সাজেশন" disabled badge="শীঘ্রই" />
              <QuickAction icon={<Share2 className="w-5 h-5" strokeWidth={2} />} label="শেয়ার করুন" onClick={handleQuickShare} />
            </div>
          </div>

          {/* আমার পরিকল্পনা */}
          <div ref={myPlansRef} className="glass-card p-4 sm:p-5">
            <h2 className="text-sm font-bold text-[#064E3B] flex items-center gap-1.5 mb-3">
              <ClipboardList className="w-4 h-4" /> আমার পরিকল্পনা
            </h2>
            {!isAuthenticated ? (
              <p className="text-xs text-slate-400 text-center py-6">লগইন করলে আপনার বাজার পরিকল্পনা এখানে সেভ হয়ে থাকবে।</p>
            ) : savedPlans.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-6">এখনো কোনো পরিকল্পনা সেভ করা হয়নি। &quot;নতুন তালিকা&quot; দিয়ে শুরু করুন।</p>
            ) : (
              <div className="flex flex-col gap-2">
                {savedPlans.map((plan: any) => (
                  <Link
                    key={plan._id}
                    href={`/planner/history/${plan._id}`}
                    className="flex items-center justify-between gap-3 bg-slate-50 hover:bg-slate-100 transition-colors rounded-xl px-3 py-2.5"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-bold text-slate-700 truncate">{plan.name}</p>
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ${
                          plan.status === 'completed' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                        }`}>
                          {plan.status === 'completed' ? 'সম্পন্ন' : 'খসড়া'}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        {new Date(plan.createdAt).toLocaleDateString('bn-BD')} · {plan.items?.length || 0} টি পণ্য
                      </p>
                    </div>
                    <span className="text-sm font-black text-[#064E3B] shrink-0">
                      ৳ {plan.estimatedTotal?.toLocaleString?.() ?? plan.estimatedTotal}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </>
      ) : (
        <>
          {/* ══════════════════════════════════════════
              WIZARD — ধাপ ১: পণ্য যোগ করা
          ══════════════════════════════════════════ */}
          {wizardStep === 1 && (
            <>
              <div className="grid grid-cols-1 lg:grid-cols-[18rem_1fr] gap-3 sm:gap-4">
                {/* Left: bazar + travel cost */}
                <div className={`glass-card p-4 sm:p-5 flex flex-col gap-4 lg:sticky lg:top-4 h-fit relative${bazarDropdownOpen ? ' z-20' : ''}`}>
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
                        <MapPin className="w-3 h-3" /> আপনার বাজার
                      </label>
                      {userLocation && (
                        <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <Navigation className="w-3 h-3" /> কাছের বাজার
                        </span>
                      )}
                    </div>
                    <div className="relative" ref={bazarRef}>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                        <input
                          type="text"
                          placeholder="বাজার খুঁজুন বা বেছে নিন..."
                          value={bazarSearch}
                          onChange={e => { setBazarSearch(e.target.value); setBazarDropdownOpen(true); if (selectedBazarId) setSelectedBazarId(''); }}
                          onFocus={() => setBazarDropdownOpen(true)}
                          onBlur={() => setTimeout(() => setBazarDropdownOpen(false), 150)}
                          className={`w-full h-10 pl-8 pr-8 rounded-xl border text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-300/30 transition-colors ${selectedBazarId ? 'border-emerald-300 bg-emerald-50 text-emerald-800' : 'border-slate-200 bg-slate-50 focus:bg-white'}`}
                        />
                        {selectedBazarId ? (
                          <button onMouseDown={clearBazar} className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-500 hover:text-emerald-700">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        ) : loadingBazars ? (
                          <div className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 rotate-90 pointer-events-none" />
                        )}
                      </div>
                      {bazarDropdownOpen && bazarOptions.length > 0 && (
                        <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden max-h-56 overflow-y-auto">
                          {bazarOptions.slice(0, 20).map((b: any) => {
                            const dist = userLocation && b.lat && b.lng ? distanceKm(userLocation.lat, userLocation.lng, b.lat, b.lng) : null;
                            return (
                              <button key={b._id} onMouseDown={() => selectBazar(b._id)}
                                className={`w-full flex items-center gap-2 px-3 py-2.5 text-left border-b border-slate-100 last:border-0 transition-colors ${b._id === selectedBazarId ? 'bg-emerald-50' : 'hover:bg-slate-50'}`}>
                                <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-semibold text-slate-700 truncate">{b.nameBn || b.name}</p>
                                  {b.area && <p className="text-[10px] text-slate-400 truncate">{b.area}</p>}
                                </div>
                                {dist !== null && (
                                  <span className="text-[10px] font-bold text-emerald-600 shrink-0">
                                    {dist < 1 ? `${Math.round(dist * 1000)}মি` : `${dist.toFixed(1)}কিমি`}
                                  </span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-400 flex items-center gap-1 mb-1.5">
                      <Car className="w-3 h-3" /> যাতায়াত খরচ (ঐচ্ছিক)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">৳</span>
                      <input type="number" placeholder="0" value={travelCost}
                        onChange={e => setTravelCost(e.target.value)} min="0"
                        className="w-full h-11 pl-7 pr-3 rounded-xl border border-slate-200 bg-white text-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300/40" />
                    </div>
                  </div>

                  {selectedCount > 0 && (
                    <div className="bg-slate-50 rounded-2xl p-3 flex flex-col gap-1.5">
                      <p className="text-[11px] font-bold text-slate-500">নির্বাচিত পণ্য ({selectedCount})</p>
                      <div className="flex flex-col max-h-40 overflow-y-auto">
                        {Object.entries(selectedProducts).map(([id, qty]) => {
                          const p = products.find((pr: any) => pr._id === id);
                          if (!p) return null;
                          return (
                            <div key={id} className="flex justify-between text-[11px] text-slate-600 py-1 border-b border-slate-100 last:border-0">
                              <span className="truncate mr-2">{p.icon} {p.nameBn || p.name} × {qty}</span>
                              <span className="font-bold shrink-0">৳{getDisplayPrice(p) * (qty as number)}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* Right: product picker */}
                <div className="glass-card overflow-hidden flex flex-col">
                  <div className="px-4 pt-4 pb-3 flex items-center justify-between border-b border-slate-100">
                    <h2 className="text-sm font-bold text-[#064E3B]">পণ্য নির্বাচন করুন</h2>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${selectedCount > 0 ? 'bg-[#064E3B] text-white' : 'bg-slate-100 text-slate-400'}`}>
                      {selectedCount} টি
                    </span>
                  </div>
                  <div className="px-4 py-3 border-b border-slate-100">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input type="text" placeholder="পণ্য খুঁজুন..." value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="w-full h-10 pl-9 pr-4 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300/30 focus:bg-white transition-colors" />
                    </div>
                  </div>

                  <div className="p-3 sm:p-4">
                    {loadingProducts ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {[...Array(6)].map((_, i) => (
                          <div key={i} className="h-16 bg-slate-100 rounded-2xl animate-pulse" />
                        ))}
                      </div>
                    ) : filteredProducts.length === 0 ? (
                      <div className="text-center py-12 text-slate-400">
                        <p className="text-3xl mb-2">🛒</p>
                        <p className="text-sm">{searchQuery ? 'কোনো পণ্য পাওয়া যায়নি' : 'আজকে কোনো দাম সাবমিট হয়নি'}</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {filteredProducts.map((product: any) => {
                          const isSelected = !!selectedProducts[product._id];
                          const qty        = selectedProducts[product._id] || 0;
                          const price      = getDisplayPrice(product);
                          const ref        = refPrices[product._id];
                          const cheaper    = ref && ref > price ? Math.round(ref - price) : 0;
                          return (
                            <div key={product._id}
                              className={`p-3 rounded-2xl border transition-all ${
                                isSelected ? 'border-emerald-400 bg-emerald-50/30' : 'border-slate-100 bg-white/60 hover:border-slate-200'
                              }`}>
                              <div className="flex items-center gap-3">
                                <div onClick={() => handleToggle(product._id)}
                                  className="w-11 h-11 rounded-xl bg-white flex items-center justify-center text-xl shadow-sm cursor-pointer shrink-0 border border-slate-100">
                                  {product.icon || '🛒'}
                                </div>
                                <div className="flex-1 min-w-0 cursor-pointer" onClick={() => !isSelected && handleToggle(product._id)}>
                                  <p className="font-bold text-[#064E3B] text-sm leading-tight truncate">{product.nameBn || product.name}</p>
                                  <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                                    <span className="text-xs text-slate-400">{product.unit}</span>
                                    <span className="text-slate-200 text-xs">·</span>
                                    <span className="font-bold text-sm text-[#064E3B]">৳{price}</span>
                                    {cheaper > 0 && (
                                      <span className="text-[10px] text-emerald-600 font-semibold bg-emerald-50 px-1.5 rounded-full">
                                        ↓৳{cheaper}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                {isSelected ? (
                                  <div className="flex items-center gap-1 bg-[#064E3B] rounded-xl px-1.5 py-1 shrink-0">
                                    <button onClick={e => { e.stopPropagation(); handleQty(product._id, -1); }}
                                      className="w-7 h-7 flex items-center justify-center rounded-lg bg-white/15 text-white active:scale-90 transition-transform">
                                      <Minus className="w-3.5 h-3.5" />
                                    </button>
                                    <span className="w-6 text-center font-bold text-sm text-white">{qty}</span>
                                    <button onClick={e => { e.stopPropagation(); handleQty(product._id, 1); }}
                                      className="w-7 h-7 flex items-center justify-center rounded-lg bg-white/15 text-white active:scale-90 transition-transform">
                                      <Plus className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                ) : (
                                  <button onClick={() => handleToggle(product._id)}
                                    className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 active:scale-90 transition-transform shrink-0">
                                    <Plus className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <button
                onClick={() => setWizardStep(2)}
                disabled={selectedCount === 0}
                className="w-full bg-[#064E3B] text-white font-bold py-3.5 rounded-2xl disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#043d2e] transition-colors flex items-center justify-center gap-2"
              >
                পরবর্তী ধাপ <ChevronRight className="w-4 h-4" />
              </button>
            </>
          )}

          {/* ══════════════════════════════════════════
              WIZARD — ধাপ ২: বাজার তুলনা
          ══════════════════════════════════════════ */}
          {wizardStep === 2 && (
            <>
              <div className="glass-card p-4 sm:p-5">
                <p className="text-xs text-slate-500 mb-4">আমরা আপনার তালিকা অনুযায়ী বাজারগুলো তুলনা করছি</p>
                {bazarComparisons.length === 0 ? (
                  <div className="text-center py-10 text-slate-400">
                    <p className="text-sm mb-1">কাছাকাছি কোনো বাজারে এই পণ্যগুলোর দাম মেলেনি।</p>
                    <p className="text-xs">আপনি &quot;সব বাজার&quot; নিয়ে পরের ধাপে এগিয়ে যেতে পারেন।</p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2.5">
                    {bazarComparisons.map((r, i) => {
                      const isPicked = r.bazar._id === selectedBazarId;
                      return (
                        <div key={r.bazar._id}
                          className={`flex items-center gap-3 p-3 sm:p-4 rounded-2xl border transition-colors ${
                            isPicked ? 'border-emerald-400 bg-emerald-50/50' : 'border-slate-100 bg-white/60'
                          }`}>
                          <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500 shrink-0">
                            {i + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <p className="text-sm font-bold text-[#064E3B] truncate">{r.bazar.nameBn || r.bazar.name}</p>
                              {i === 0 && (
                                <span className="text-[9px] font-bold text-white bg-emerald-500 px-1.5 py-0.5 rounded-full shrink-0">
                                  সবচেয়ে সস্তা
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-400 mt-0.5">
                              {r.dist !== null ? `দূরত্ব: ${r.dist.toFixed(1)} কিমি · ` : ''}মোট দাম: ৳{r.total}
                            </p>
                          </div>
                          <button
                            onClick={() => selectBazar(r.bazar._id)}
                            className={`shrink-0 text-xs font-bold px-3 py-2 rounded-xl transition-colors ${
                              isPicked ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                          >
                            {isPicked ? '✓ সিলেক্ট হয়েছে' : 'সিলেক্ট করুন'}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <button
                onClick={() => setWizardStep(3)}
                className="w-full bg-[#064E3B] text-white font-bold py-3.5 rounded-2xl hover:bg-[#043d2e] transition-colors flex items-center justify-center gap-2"
              >
                পরবর্তী ধাপ <ChevronRight className="w-4 h-4" />
              </button>
            </>
          )}

          {/* ══════════════════════════════════════════
              WIZARD — ধাপ ৩: সেভ করুন
          ══════════════════════════════════════════ */}
          {wizardStep === 3 && (
            <>
              <div className="glass-card p-4 sm:p-5 flex flex-col gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-500 mb-1.5 block">তালিকার নাম দিন</label>
                  <input
                    value={planName}
                    onChange={e => setPlanName(e.target.value)}
                    placeholder="যেমন: শুক্রবারের বাজার"
                    className="w-full h-11 px-4 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300/40"
                  />
                </div>

                <div className="bg-slate-50 rounded-2xl p-4 flex flex-col gap-2">
                  <p className="text-xs font-bold text-slate-500 mb-1">তালিকার সারসংক্ষেপ</p>
                  <SummaryRow label="মোট পণ্য" value={`${selectedCount} টি`} />
                  <SummaryRow label="নির্বাচিত বাজার" value={selectedBazarDisplayName} />
                  {displaySaving > 0 && <SummaryRow label="সাশ্রয় সম্ভব" value={`৳ ${displaySaving}`} />}
                  <div className="h-px bg-slate-200 my-1" />
                  <SummaryRow label="আনুমানিক মোট খরচ" value={`৳ ${totalCost}`} bold />
                </div>
              </div>

              <button
                onClick={() => handleCalculate(planName)}
                className="w-full bg-[#064E3B] text-white font-bold py-4 rounded-2xl hover:bg-[#043d2e] transition-colors flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" /> তালিকা সেভ করুন
              </button>
            </>
          )}
        </>
      )}
    </div>
  );
}
