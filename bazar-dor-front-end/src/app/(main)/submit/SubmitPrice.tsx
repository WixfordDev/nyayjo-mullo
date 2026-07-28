'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  MapPin, ShoppingBag, CheckCircle2, Navigation, Camera, X,
  Bell, Info, ChevronDown, FileText, ListChecks, Search,
} from 'lucide-react';
import Image from 'next/image';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useGetProductsQuery } from '../../../store/api/productApi';
import { useGetBazarsQuery, useGetNearbyBazarsQuery } from '../../../store/api/bazarApi';
import { useSubmitPriceMutation } from '../../../store/api/priceApi';
import { useAppSelector } from '../../../store/hooks';
import { useUserLocation } from '../../../hooks/useUserLocation';
import { distanceKm, formatDistance } from '../../../lib/distance';

const UNIT_LABELS: Record<string, string> = {
  kg: 'কেজি', g: 'গ্রাম', piece: 'পিস', dozen: 'ডজন',
  liter: 'লিটার', ml: 'মিলি', packet: 'প্যাকেট',
};
const unitLabel = (u?: string) => (u && UNIT_LABELS[u]) || u || 'ইউনিট';

export function SubmitPrice() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const isAuthenticated = useAppSelector(s => s.auth.isAuthenticated);

  const { location: userLocation, refresh: refreshLocation } = useUserLocation();

  const { data: productsRes, isLoading: loadingProducts } = useGetProductsQuery({ limit: 50 });
  const { data: bazarsRes,   isLoading: loadingBazars1  } = useGetBazarsQuery(
    { limit: 50 }, { skip: !!userLocation },
  );
  const { data: nearbyBazarsRes, isLoading: loadingBazars2 } = useGetNearbyBazarsQuery(
    { lat: userLocation?.lat ?? 0, lng: userLocation?.lng ?? 0, radius: 10, limit: 50 },
    { skip: !userLocation },
  );
  const [submitPrice, { isLoading: isSubmitting }] = useSubmitPriceMutation();

  const loadingBazars = loadingBazars1 || loadingBazars2;
  const products  = productsRes?.data?.attributes?.data || [];
  const rawBazars = userLocation
    ? (nearbyBazarsRes?.data?.attributes || [])
    : (bazarsRes?.data?.attributes?.data || []);

  const bazars = userLocation
    ? [...rawBazars].sort((a: any, b: any) =>
        distanceKm(userLocation.lat, userLocation.lng, a.lat, a.lng) -
        distanceKm(userLocation.lat, userLocation.lng, b.lat, b.lng)
      )
    : rawBazars;

  const [formData, setFormData] = useState({
    bazarId: searchParams.get('bazar_id') || '',
    productId: searchParams.get('product_id') || '',
    price: '',
    unit: 'kg',
    note: '',
  });
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [productDropdownOpen, setProductDropdownOpen] = useState(false);
  const [bazarDropdownOpen, setBazarDropdownOpen] = useState(false);
  const [productSearch, setProductSearch] = useState('');
  const [bazarSearch, setBazarSearch] = useState('');
  const photoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!formData.bazarId) {
      const saved = localStorage.getItem('defaultBazarId');
      if (saved) setFormData(prev => ({ ...prev, bazarId: saved }));
    }
  }, []);

  // Sync unit selector to the newly-picked product's default unit
  useEffect(() => {
    const product = products.find((p: any) => p._id === formData.productId);
    if (product?.unit) setFormData(prev => ({ ...prev, unit: product.unit }));
  }, [formData.productId, products]);

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const removePhoto = () => {
    setPhotoFile(null);
    setPhotoPreview(null);
    if (photoInputRef.current) photoInputRef.current.value = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) { router.push('/login'); return; }
    if (!formData.productId || !formData.bazarId || !formData.price) {
      setError('পণ্য, বাজার ও দাম সিলেক্ট করুন');
      return;
    }
    setError('');
    try {
      const fd = new FormData();
      fd.append('productId', formData.productId);
      fd.append('bazarId', formData.bazarId);
      fd.append('price', formData.price);
      fd.append('unit', formData.unit || selectedProduct?.unit || 'kg');
      fd.append('visitType', 'physical');
      if (formData.note) fd.append('note', formData.note);
      if (photoFile) fd.append('photo', photoFile);
      await submitPrice(fd).unwrap();
      setSubmitted(true);
      setPhotoFile(null);
      setPhotoPreview(null);
      setFormData(p => ({ ...p, note: '' }));
    } catch (err: any) {
      setError(err?.data?.message || 'সাবমিট ব্যর্থ হয়েছে');
    }
  };

  const selectedProduct = products.find((p: any) => p._id === formData.productId);
  const selectedBazar   = bazars.find((b: any) => b._id === formData.bazarId);

  const filteredProducts = productSearch
    ? products.filter((p: any) =>
        (p.nameBn || '').includes(productSearch) ||
        (p.name || '').toLowerCase().includes(productSearch.toLowerCase())
      )
    : products;

  const filteredBazars = bazarSearch
    ? bazars.filter((b: any) =>
        (b.nameBn || '').includes(bazarSearch) ||
        (b.name || '').toLowerCase().includes(bazarSearch.toLowerCase()) ||
        (b.area || '').toLowerCase().includes(bazarSearch.toLowerCase())
      )
    : bazars;

  const card = 'bg-white rounded-3xl border border-slate-100 shadow-[0_2px_12px_rgba(0,0,0,0.05)] p-5';

  /* ── Auth gate ── */
  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-5 text-center px-4">
        <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center text-3xl">🔒</div>
        <div>
          <h2 className="text-lg font-bold text-slate-800 mb-1">লগইন করুন</h2>
          <p className="text-slate-400 text-sm">দাম সাবমিট করতে অ্যাকাউন্টে প্রবেশ করুন</p>
        </div>
        <div className="flex gap-3">
          <Link href="/login" className="bg-[#064E3B] text-white px-6 py-2.5 rounded-xl font-bold text-sm">লগইন করুন</Link>
          <Link href="/register" className="bg-white border border-slate-200 text-slate-700 px-6 py-2.5 rounded-xl font-bold text-sm">রেজিস্ট্রেশন</Link>
        </div>
      </div>
    );
  }

  /* ── Success ── */
  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-5 animate-in zoom-in-95 duration-500 text-center px-4">
        <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center text-4xl border-4 border-emerald-100 shadow-lg shadow-emerald-100">✅</div>
        <div>
          <h2 className="text-2xl font-bold text-emerald-900 mb-1.5">ধন্যবাদ!</h2>
          <p className="text-slate-500 text-sm max-w-xs leading-relaxed">আপনার দাম সফলভাবে সাবমিট হয়েছে।<br />কমিউনিটি যাচাই করার পর প্রকাশিত হবে।</p>
        </div>
        <div className="flex gap-3 mt-1">
          <button onClick={() => { setSubmitted(false); setFormData(prev => ({ ...prev, price: '' })); }}
            className="bg-[#064E3B] text-white px-6 py-3 rounded-xl font-bold text-sm active:scale-95 transition-transform">
            আবার যোগ করুন
          </button>
          <Link href="/" className="bg-white border border-slate-200 text-slate-700 px-6 py-3 rounded-xl font-bold text-sm">হোমে যান</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto pb-16">

      {/* ── Page header ── */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-extrabold text-[#064E3B] leading-tight">দামের তথ্য যোগ করুন</h1>
          <p className="text-[11px] text-slate-400 mt-0.5 truncate">পণ্যের সঠিক দাম দিন ও বাজার আপডেটে অবদান রাখুন</p>
        </div>
        <Link href="/alerts"
          className="relative w-10 h-10 rounded-full bg-white border border-slate-100 shadow-sm flex items-center justify-center shrink-0">
          <Bell className="w-4.5 h-4.5 text-slate-600" />
          <span className="absolute top-2 right-2.5 w-1.5 h-1.5 bg-rose-500 rounded-full" />
        </Link>
        <button type="button" title="দাম যাচাই সম্পর্কে তথ্য"
          className="w-10 h-10 rounded-full bg-white border border-slate-100 shadow-sm flex items-center justify-center shrink-0">
          <Info className="w-4.5 h-4.5 text-slate-600" />
        </button>
      </div>

      {/* ── Intro banner ── */}
      <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 flex items-center gap-3 mb-4">
        <div className="w-11 h-11 bg-emerald-500 rounded-2xl flex items-center justify-center shrink-0">
          <ShoppingBag className="w-5 h-5 text-white" strokeWidth={2} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-emerald-900">সঠিক দাম দিন, বাজার জানুন</p>
          <p className="text-[11px] text-emerald-600 mt-0.5">আপনাদের দেওয়া তথ্য কমিউনিটির কাছে সাহায্য করে</p>
        </div>
        <div className="flex flex-col gap-1.5 shrink-0">
          <div className="w-7 h-7 bg-white rounded-lg flex items-center justify-center shadow-sm">
            <ListChecks className="w-3.5 h-3.5 text-emerald-500" strokeWidth={2.5} />
          </div>
          <div className="w-7 h-7 bg-amber-400 rounded-full flex items-center justify-center text-[11px] font-extrabold text-white shadow-sm">৳</div>
        </div>
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 bg-rose-50 border border-rose-100 rounded-2xl text-sm text-rose-600 font-medium flex items-center gap-2">
          <span>⚠️</span>{error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">

          {/* ── বাজার নির্বাচন ── */}
          <div className={`${card} order-1`}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                  <MapPin className="w-4 h-4 text-blue-500" strokeWidth={2.5} />
                </div>
                <div>
                  <p className="font-bold text-slate-800 text-sm leading-none">বাজার নির্বাচন</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">কোন বাজারের দাম দিচ্ছেন?</p>
                </div>
              </div>
              {userLocation ? (
                <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-1 shrink-0">
                  <Navigation className="w-3.5 h-3.5" /> কাছের বাজার
                </span>
              ) : (
                <button type="button" onClick={refreshLocation}
                  className="text-[11px] font-bold text-blue-500 flex items-center gap-1 shrink-0 active:scale-95 transition-transform">
                  <Navigation className="w-3.5 h-3.5" /> লোকেশন দিন
                </button>
              )}
            </div>

            {loadingBazars ? (
              <div className="h-12 bg-slate-100 rounded-xl animate-pulse" />
            ) : (
              <div className="relative">
                <button type="button" onClick={() => setBazarDropdownOpen(o => !o)}
                  className="w-full flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 active:scale-[0.99] transition-transform">
                  <span className="flex-1 min-w-0 text-left">
                    {selectedBazar ? (
                      <span className="block text-sm font-semibold text-slate-700 truncate">
                        {selectedBazar.nameBn || selectedBazar.name}{selectedBazar.area ? ` — ${selectedBazar.area}` : ''}
                      </span>
                    ) : (
                      <span className="text-sm font-semibold text-slate-400">বাজার বেছে নিন</span>
                    )}
                  </span>
                  <ChevronDown className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${bazarDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {bazarDropdownOpen && (
                  <>
                    <div className="fixed inset-0 z-30" onClick={() => setBazarDropdownOpen(false)} />
                    <div className="absolute left-0 right-0 top-full mt-2 z-40 bg-white border border-slate-100 rounded-2xl shadow-xl overflow-hidden">
                      <div className="relative p-2 border-b border-slate-100">
                        <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                        <input type="text" value={bazarSearch} autoFocus
                          onChange={(e) => setBazarSearch(e.target.value)}
                          placeholder="বাজার খুঁজুন..."
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-8 pr-3 py-2 text-sm outline-none focus:border-emerald-400" />
                      </div>
                      <div className="max-h-56 overflow-y-auto">
                        {filteredBazars.length === 0 ? (
                          <p className="text-center text-xs text-slate-400 py-4">কোনো বাজার পাওয়া যায়নি</p>
                        ) : filteredBazars.map((b: any) => {
                          const dist = userLocation ? formatDistance(distanceKm(userLocation.lat, userLocation.lng, b.lat, b.lng)) : null;
                          return (
                            <button key={b._id} type="button"
                              onClick={() => { setFormData(f => ({ ...f, bazarId: b._id })); setBazarDropdownOpen(false); setBazarSearch(''); }}
                              className="w-full flex items-center gap-2 px-4 py-2.5 hover:bg-slate-50 transition-colors text-left">
                              <span className="flex-1 min-w-0 text-sm font-semibold text-slate-700 truncate">
                                {b.nameBn || b.name}{b.area ? ` — ${b.area}` : ''}
                              </span>
                              {dist && <span className="text-[11px] font-bold text-emerald-500 shrink-0">{dist}</span>}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </>
                )}

                {selectedBazar && (
                  <div className="mt-3 flex items-center gap-2 bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <span className="text-xs font-semibold text-emerald-700 truncate">{selectedBazar.nameBn || selectedBazar.name}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── পণ্য নির্বাচন ── */}
          <div className={`${card} order-2`}>
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                <ShoppingBag className="w-4 h-4 text-blue-500" strokeWidth={2.5} />
              </div>
              <div>
                <p className="font-bold text-slate-800 text-sm leading-none">পণ্য নির্বাচন</p>
                <p className="text-[11px] text-slate-400 mt-0.5">কোন পণ্যের দাম দিচ্ছেন?</p>
              </div>
            </div>

            {loadingProducts ? (
              <div className="h-12 bg-slate-100 rounded-xl animate-pulse" />
            ) : (
              <div className="relative">
                <button type="button" onClick={() => setProductDropdownOpen(o => !o)}
                  className="w-full flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 active:scale-[0.99] transition-transform">
                  {selectedProduct && (
                    <span className="w-7 h-7 rounded-lg overflow-hidden bg-white border border-slate-200 flex items-center justify-center text-base shrink-0">
                      {selectedProduct.image
                        ? <img src={selectedProduct.image} alt={selectedProduct.nameBn || selectedProduct.name} className="w-full h-full object-cover" />
                        : (selectedProduct.icon || '🛒')}
                    </span>
                  )}
                  <span className="flex-1 min-w-0 text-left">
                    {selectedProduct ? (
                      <span className="block text-sm font-semibold text-slate-700 truncate">
                        {selectedProduct.nameBn || selectedProduct.name} ({unitLabel(selectedProduct.unit)})
                      </span>
                    ) : (
                      <span className="text-sm font-semibold text-slate-400">পণ্য বেছে নিন</span>
                    )}
                  </span>
                  <ChevronDown className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${productDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {productDropdownOpen && (
                  <>
                    <div className="fixed inset-0 z-30" onClick={() => setProductDropdownOpen(false)} />
                    <div className="absolute left-0 right-0 top-full mt-2 z-40 bg-white border border-slate-100 rounded-2xl shadow-xl overflow-hidden">
                      <div className="relative p-2 border-b border-slate-100">
                        <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                        <input type="text" value={productSearch} autoFocus
                          onChange={(e) => setProductSearch(e.target.value)}
                          placeholder="পণ্য খুঁজুন..."
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-8 pr-3 py-2 text-sm outline-none focus:border-emerald-400" />
                      </div>
                      <div className="max-h-56 overflow-y-auto">
                        {filteredProducts.length === 0 ? (
                          <p className="text-center text-xs text-slate-400 py-4">কোনো পণ্য পাওয়া যায়নি</p>
                        ) : filteredProducts.map((p: any) => (
                          <button key={p._id} type="button"
                            onClick={() => { setFormData(f => ({ ...f, productId: p._id })); setProductDropdownOpen(false); setProductSearch(''); }}
                            className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-slate-50 transition-colors text-left">
                            <span className="w-9 h-9 rounded-lg overflow-hidden bg-slate-50 flex items-center justify-center text-lg shrink-0">
                              {p.image
                                ? <img src={p.image} alt={p.nameBn || p.name} className="w-full h-full object-cover" />
                                : (p.icon || '🛒')}
                            </span>
                            <span className="flex-1 min-w-0">
                              <span className="block text-sm font-semibold text-slate-700 truncate">{p.nameBn || p.name}</span>
                              <span className="block text-[11px] text-slate-400">{unitLabel(p.unit)}</span>
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* ── দাম লিখুন (full width) ── */}
          <div className={`${card} order-3 lg:col-span-2`}>
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8 rounded-xl bg-slate-800 flex items-center justify-center shrink-0">
                <span className="text-white font-extrabold text-sm leading-none">৳</span>
              </div>
              <div>
                <p className="font-bold text-slate-800 text-sm leading-none">দাম লিখুন</p>
                <p className="text-[11px] text-slate-400 mt-0.5">প্রতি ইউনিটের দাম দিন</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-black text-slate-300 select-none pointer-events-none">৳</span>
                <input type="number" value={formData.price}
                  onChange={(e) => setFormData(p => ({ ...p, price: e.target.value }))}
                  placeholder="0.00" min="0" step="0.01" required inputMode="decimal"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-11 pr-3 py-3.5 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/10 text-slate-900 font-black text-2xl tracking-tight transition-all" />
              </div>
              <div className="relative shrink-0">
                <select value={formData.unit}
                  onChange={(e) => setFormData(p => ({ ...p, unit: e.target.value }))}
                  className="appearance-none bg-slate-50 border border-slate-200 rounded-xl pl-3 pr-8 py-3.5 text-sm font-bold text-slate-600 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/10 transition-all cursor-pointer whitespace-nowrap">
                  {Object.entries(UNIT_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>প্রতি {label}</option>
                  ))}
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            <div className="flex items-center gap-1.5 mt-2.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              <p className="text-[11px] text-slate-400 font-medium">ইঙ্গিতঃ প্রতি কেজি, প্রতি লিটার, প্রতি পিস</p>
            </div>
          </div>

          {/* ── প্রমাণ ছবি ── */}
          <div className={`${card} order-4`}>
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8 rounded-xl bg-violet-50 flex items-center justify-center shrink-0">
                <Camera className="w-4 h-4 text-violet-500" strokeWidth={2.5} />
              </div>
              <div>
                <p className="font-bold text-slate-800 text-sm leading-none">
                  প্রমাণ ছবি <span className="text-slate-400 font-semibold">(ঐচ্ছিক)</span>
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">দামের প্রমাণ হিসেবে ব্যবহার হবে</p>
              </div>
            </div>

            {photoPreview ? (
              <div className="relative rounded-2xl overflow-hidden">
                <Image src={photoPreview} alt="proof" width={400} height={160}
                  className="w-full h-36 object-cover" unoptimized />
                <button type="button" onClick={removePhoto}
                  className="absolute top-2 right-2 w-8 h-8 bg-black/50 backdrop-blur-sm rounded-full flex items-center justify-center text-white active:bg-black/70 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button type="button" onClick={() => photoInputRef.current?.click()}
                className="w-full h-28 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center gap-2 text-slate-400 hover:border-violet-300 hover:text-violet-500 hover:bg-violet-50/30 active:scale-[0.98] transition-all bg-slate-50/50">
                <Camera className="w-5 h-5" />
                <div className="text-center">
                  <p className="text-xs font-semibold">ছবি তুলুন বা আপলোড করুন</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">JPG, PNG · সর্বোচ্চ 5MB</p>
                </div>
              </button>
            )}
            <input ref={photoInputRef} type="file" accept="image/*" capture="environment"
              onChange={handlePhotoSelect} className="hidden" />
          </div>

          {/* ── নোট (ঐচ্ছিক) ── */}
          <div className={`${card} order-5`}>
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
                <FileText className="w-4 h-4 text-slate-500" strokeWidth={2.5} />
              </div>
              <div>
                <p className="font-bold text-slate-800 text-sm leading-none">
                  নোট <span className="text-slate-400 font-semibold">(ঐচ্ছিক)</span>
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">অতিরিক্ত তথ্য যোগ করুন</p>
              </div>
            </div>

            <textarea value={formData.note}
              onChange={(e) => setFormData(p => ({ ...p, note: e.target.value.slice(0, 100) }))}
              placeholder="কিছু লিখুন..." rows={3} maxLength={100}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/10 text-sm text-slate-700 resize-none transition-all" />
            <p className="text-right text-[11px] text-slate-400 mt-1">{formData.note.length}/100</p>
          </div>
        </div>

        {/* ── Submit button ── */}
        <button type="submit" disabled={isSubmitting}
          className="w-full bg-gradient-to-r from-[#064E3B] to-[#10B981] text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2.5 active:scale-[0.98] transition-all shadow-[0_6px_24px_rgba(16,185,129,0.28)] disabled:opacity-60 text-base">
          {isSubmitting ? (
            <span className="animate-pulse">সাবমিট হচ্ছে...</span>
          ) : (
            <><CheckCircle2 className="w-5 h-5" /> দাম যোগ করুন</>
          )}
        </button>
      </form>
    </div>
  );
}
