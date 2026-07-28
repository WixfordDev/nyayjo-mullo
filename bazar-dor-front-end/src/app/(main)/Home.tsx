'use client';

import { useState } from 'react';
import {
  MapPin, TrendingDown, TrendingUp, Search,
  ArrowRight, ChevronRight, ChevronDown, RefreshCw,
  ShoppingBag, BarChart2, Zap, MoreHorizontal,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  LineChart, Line, ResponsiveContainer, Tooltip,
  CartesianGrid, XAxis, YAxis,
} from 'recharts';
import { useGetBazarsQuery, useGetNearbyBazarsQuery } from '../../store/api/bazarApi';
import { useGetAlertsQuery } from '../../store/api/alertApi';
import { useGetHomeSummaryQuery } from '../../store/api/priceApi';
import { useUserLocation } from '../../hooks/useUserLocation';
import { distanceKm, formatDistance } from '../../lib/distance';

export function Home() {
  const [selectedBazarId, setSelectedBazarId]  = useState<string>('');
  const [searchQuery, setSearchQuery]           = useState('');

  const router = useRouter();
  const { location: userLocation } = useUserLocation();

  // ── Bazar list (for dropdown only) ──────────────────────────────────────
  const { data: bazarsRes, isLoading: loadingBazars1 } = useGetBazarsQuery(
    { limit: 50 },
    { skip: !!userLocation },
  );
  const { data: nearbyBazarsRes, isLoading: loadingBazars2 } = useGetNearbyBazarsQuery(
    { lat: userLocation?.lat ?? 0, lng: userLocation?.lng ?? 0, radius: 10, limit: 50 },
    { skip: !userLocation },
  );
  const loadingBazars = loadingBazars1 || loadingBazars2;
  const bazars = userLocation
    ? (nearbyBazarsRes?.data?.attributes || [])
    : (bazarsRes?.data?.attributes?.data || []);

  // ── Alert banner ──────────────────────────────────────────────────────────
  const { data: alertsRes } = useGetAlertsQuery({ limit: 5 });
  const topAlert = (alertsRes?.data?.attributes?.data || [])[0];

  // ── Home summary (single call replaces all price queries) ────────────────
  const summaryParams = selectedBazarId
    ? { bazarId: selectedBazarId }
    : userLocation
      ? { lat: userLocation.lat, lng: userLocation.lng, radius: 10 }
      : {};

  const { data: summaryRes, isFetching: loadingProducts } = useGetHomeSummaryQuery(summaryParams);
  const summary  = summaryRes?.data?.attributes;
  const stats    = summary?.stats    ?? { totalProducts: 0, updatedToday: 0, basketTotal: null, basketChange: null, savings: null };
  const products = summary?.products ?? [];

  // ── Helpers ───────────────────────────────────────────────────────────────
  const sortedBazars = userLocation
    ? [...bazars].sort((a: any, b: any) =>
        distanceKm(userLocation.lat, userLocation.lng, a.lat, a.lng) -
        distanceKm(userLocation.lat, userLocation.lng, b.lat, b.lng)
      )
    : bazars;

  const currentBazar  = bazars.find((b: any) => b._id === selectedBazarId) as any;

  const goToMarketIndex = () =>
    router.push(`/market-index${selectedBazarId ? `?bazar_id=${selectedBazarId}` : ''}`);

  const filteredProducts = searchQuery
    ? products.filter((p: any) =>
        p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.nameBn?.includes(searchQuery)
      )
    : products;

  const quickViewProducts = products.slice(0, 6);

  // Mini trend for the index widget (from basket history via snapshots — simplified)
  const miniTrendData = products
    .filter((p: any) => p.currentPrice)
    .slice(0, 7)
    .map((p: any) => ({ value: p.currentPrice }));

  return (
    <div className="pb-24 lg:pb-12">
      <div className="flex flex-col lg:flex-row gap-4 lg:gap-6 items-start">

        {/* ── Left / Main column ── */}
        <div className="flex-1 flex flex-col gap-3 min-w-0 w-full">

          {/* Alert Banner */}
          {topAlert ? (
            <Link href="/alerts">
              <div className="bg-rose-500 rounded-2xl p-4 flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center shrink-0">
                  <span className="text-xl">⚠️</span>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-bold text-white leading-snug">
                    {topAlert.messageBn || topAlert.message}
                  </h3>
                  <p className="text-xs text-rose-100 mt-0.5">
                    {topAlert.bazarId?.nameBn || topAlert.bazarId?.name || 'সারাদেশে'}
                  </p>
                </div>
                <ChevronRight className="w-5 h-5 text-white/70 shrink-0" />
              </div>
            </Link>
          ) : (
            <Link href="/alerts">
              <div className="bg-emerald-600 rounded-2xl p-4 flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center shrink-0">
                  <TrendingUp className="w-5 h-5 text-white" strokeWidth={2} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-bold text-white">বাজারের দাম স্বাভাবিক আছে</h3>
                  <p className="text-xs text-emerald-100 mt-0.5">
                    এই মুহূর্তে কোনো অস্বাভাবিক মূল্য বৃদ্ধি পাওয়া যায়নি।
                  </p>
                </div>
                <ChevronRight className="w-5 h-5 text-white/70 shrink-0" />
              </div>
            </Link>
          )}

          {/* আজকের বাজার সূচক */}
          <div
            className="bg-white border border-slate-100 rounded-2xl p-4 flex items-center justify-between gap-3 shadow-sm cursor-pointer"
            onClick={goToMarketIndex}
          >
            <div className="min-w-0">
              <p className="text-xs font-medium text-slate-400 mb-1">আজকের বাজার সূচক</p>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-slate-800 tracking-tight">
                  ৳ {stats.basketTotal ?? '—'}
                </span>
                {stats.basketChange !== null && (
                  <span className={`flex items-center gap-0.5 text-xs font-bold ${stats.basketChange > 0 ? 'text-rose-500' : 'text-emerald-600'}`}>
                    {stats.basketChange > 0
                      ? <TrendingUp className="w-3 h-3" strokeWidth={2.5} />
                      : <TrendingDown className="w-3 h-3" strokeWidth={2.5} />}
                    {stats.basketChange > 0 ? '+' : ''}{stats.basketChange}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">গতকালের তুলনায়</p>
            </div>
            {miniTrendData.length >= 2 && (
              <div className="w-20 h-10 shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={miniTrendData}>
                    <Line type="monotone" dataKey="value" stroke="#10B981" strokeWidth={2.5} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-white border border-slate-100 rounded-2xl px-3 py-3 flex flex-col gap-1 shadow-sm">
              <div className="w-7 h-7 bg-emerald-50 rounded-lg flex items-center justify-center">
                <ShoppingBag className="w-3.5 h-3.5 text-emerald-600" strokeWidth={2} />
              </div>
              <p className="text-lg font-black text-slate-800 leading-none mt-1">
                {loadingProducts ? '—' : `${stats.totalProducts}টি`}
              </p>
              <p className="text-[10px] text-slate-400 leading-tight">আপনার এলাকায় মোট পণ্য</p>
            </div>

            <div className="bg-white border border-slate-100 rounded-2xl px-3 py-3 flex flex-col gap-1 shadow-sm">
              <div className="w-7 h-7 bg-blue-50 rounded-lg flex items-center justify-center">
                <RefreshCw className="w-3.5 h-3.5 text-blue-500" strokeWidth={2} />
              </div>
              <p className="text-lg font-black text-slate-800 leading-none mt-1">
                {loadingProducts ? '—' : `${stats.updatedToday}টি`}
              </p>
              <p className="text-[10px] text-slate-400 leading-tight">দাম আপডেট হয়েছে</p>
            </div>

            <div
              className="bg-white border border-slate-100 rounded-2xl px-3 py-3 flex flex-col gap-1 shadow-sm cursor-pointer"
              onClick={goToMarketIndex}
            >
              <div className="w-7 h-7 bg-amber-50 rounded-lg flex items-center justify-center">
                <BarChart2 className="w-3.5 h-3.5 text-amber-500" strokeWidth={2} />
              </div>
              <p className="text-lg font-black text-slate-800 leading-none mt-1">
                {stats.savings != null
                  ? `৳ ${stats.savings}`
                  : stats.basketTotal
                    ? `৳ ${stats.basketTotal}`
                    : '—'}
              </p>
              <p className="text-[10px] text-slate-400 leading-tight">
                {stats.savings != null ? 'মোট সাশ্রয়' : 'বাজার সূচক'}
              </p>
            </div>
          </div>

          {/* দ্রুত দেখুন — Quick view shortcuts */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-bold text-slate-700">দ্রুত দেখুন</h3>
              <Link href="/products" className="text-xs font-semibold text-emerald-600 flex items-center gap-0.5">
                সব দেখুন <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
              {loadingProducts ? (
                [...Array(5)].map((_, i) => (
                  <div key={i} className="flex flex-col items-center gap-1 shrink-0">
                    <div className="w-14 h-14 rounded-2xl bg-slate-100 animate-pulse" />
                    <div className="w-10 h-2.5 rounded bg-slate-100 animate-pulse" />
                  </div>
                ))
              ) : (
                quickViewProducts.map((p: any) => (
                  <button
                    key={p.productId}
                    type="button"
                    onClick={() => router.push(`/products/${p.productId}`)}
                    className="flex flex-col items-center gap-1 shrink-0"
                  >
                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl border-2 bg-white border-slate-100 overflow-hidden active:scale-95 transition-transform">
                      {p.image
                        ? <img src={p.image} alt={p.nameBn || p.name} className="w-full h-full object-cover" />
                        : (p.icon || '🛒')}
                    </div>
                    <span className="text-[11px] font-medium text-slate-500 truncate max-w-[56px]">
                      {p.nameBn || p.name}
                    </span>
                  </button>
                ))
              )}
              <Link href="/products" className="flex flex-col items-center gap-1 shrink-0">
                <div className="w-14 h-14 rounded-2xl bg-slate-50 border-2 border-slate-100 flex items-center justify-center text-slate-400">
                  <MoreHorizontal className="w-6 h-6" strokeWidth={2} />
                </div>
                <span className="text-[11px] font-medium text-slate-500">সব পণ্য</span>
              </Link>
            </div>
          </div>

          {/* Filter Row: Bazar dropdown + Search */}
          <div className="flex gap-2">
            <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2.5 shadow-sm min-w-0 flex-1">
              <MapPin className="w-4 h-4 text-emerald-600 shrink-0" strokeWidth={2} />
              {loadingBazars ? (
                <span className="text-xs text-slate-400 flex-1">লোড হচ্ছে...</span>
              ) : (
                <select
                  value={selectedBazarId}
                  onChange={(e) => setSelectedBazarId(e.target.value)}
                  className="flex-1 min-w-0 text-sm font-medium text-slate-700 bg-transparent border-none focus:outline-none appearance-none cursor-pointer truncate"
                >
                  <option value="">সব বাজার (কাছের)</option>
                  {sortedBazars.map((b: any) => {
                    const dist = userLocation
                      ? distanceKm(userLocation.lat, userLocation.lng, b.lat, b.lng)
                      : null;
                    return (
                      <option key={b._id} value={b._id}>
                        {b.nameBn || b.name}{dist !== null ? ` (${formatDistance(dist)})` : ''}
                      </option>
                    );
                  })}
                </select>
              )}
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0 pointer-events-none" />
            </div>

            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" strokeWidth={1.5} />
              <input
                type="text"
                placeholder="পণ্য খুঁজুন..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-10 pl-9 pr-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-sm shadow-sm"
              />
            </div>
          </div>

          {/* Section Header */}
          <div className="flex items-center justify-between pt-1">
            <h3 className="text-base font-bold text-slate-800">
              {searchQuery
                ? 'অনুসন্ধানের ফলাফল'
                : currentBazar
                  ? `${currentBazar.nameBn || currentBazar.name} এর পণ্য`
                  : 'প্রয়োজনীয় পণ্যের দাম'}
            </h3>
            {!searchQuery && filteredProducts.length > 0 && (
              <Link
                href={`/products${selectedBazarId ? `?bazar_id=${selectedBazarId}` : ''}`}
                className="text-xs font-semibold text-emerald-600 flex items-center gap-0.5 bg-emerald-50 px-2.5 py-1 rounded-full"
              >
                সব দেখুন <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            )}
          </div>

          {/* Product Grid */}
          {loadingProducts ? (
            <div className="grid grid-cols-3 gap-2">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-white border border-slate-100 rounded-2xl p-3 h-[130px] animate-pulse shadow-sm" />
              ))}
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <p className="text-4xl mb-3">🛒</p>
              <p className="text-sm font-medium">
                {selectedBazarId
                  ? 'এই বাজারে এখনো কোনো দাম সাবমিট হয়নি'
                  : 'গত ৭ দিনে কোনো দাম সাবমিট হয়নি'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {filteredProducts.slice(0, 9).map((product: any) => (
                <div
                  key={product.productId}
                  onClick={() => router.push(`/products/${product.productId}`)}
                  className="bg-white border border-slate-100 rounded-2xl p-4 flex flex-col justify-between min-h-[190px] relative cursor-pointer active:scale-[0.97] transition-transform shadow-sm"
                >
                  {/* Name + image */}
                  <div className="flex items-start justify-between gap-1">
                    <div className="flex-1 min-w-0 pt-1">
                      <h4 className="text-[15px] font-bold text-slate-800 leading-tight truncate">
                        {product.nameBn || product.name}
                      </h4>
                      <p className="text-[11px] text-slate-400 mt-0.5">{product.unit}</p>
                    </div>
                    <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-4xl shrink-0 overflow-hidden bg-slate-50">
                      {product.image
                        ? <img src={product.image} alt={product.nameBn || product.name} className="w-full h-full object-cover" />
                        : (product.icon || '🛒')}
                    </div>
                  </div>

                  {/* Change badge */}
                  {product.change !== null && product.change !== 0 && (
                    <div className={`self-start flex items-center gap-1 text-[13px] font-bold px-2 py-1 rounded-lg mt-2 ${product.change > 0 ? 'text-rose-600 bg-rose-50' : 'text-emerald-600 bg-emerald-50'}`}>
                      {product.change > 0
                        ? <TrendingUp className="w-3.5 h-3.5" strokeWidth={2.5} />
                        : <TrendingDown className="w-3.5 h-3.5" strokeWidth={2.5} />}
                      ৳{Math.abs(product.change)}
                    </div>
                  )}

                  {/* Price + comparison */}
                  <div className="mt-auto pr-7">
                    <p className="text-2xl font-black text-emerald-700 tracking-tight">
                      ৳ {product.currentPrice}
                    </p>
                    {product.prevPrice !== null && product.daysAgo !== null ? (
                      <p className="text-xs text-slate-400 mt-0.5">
                        {product.daysAgo} দিন আগে: ৳ {product.prevPrice}
                      </p>
                    ) : product.bazarName ? (
                      <p className="text-xs text-slate-400 truncate mt-0.5">🏪 {product.bazarName}</p>
                    ) : null}
                  </div>

                  {/* Trend mini-icon, bottom-right corner */}
                  {product.change !== null && product.change !== 0 && (
                    <div className={`absolute bottom-4 right-4 w-7 h-7 rounded-full flex items-center justify-center ${product.change > 0 ? 'bg-rose-50' : 'bg-emerald-50'}`}>
                      {product.change > 0
                        ? <TrendingUp className="w-4 h-4 text-rose-500" strokeWidth={2.5} />
                        : <TrendingDown className="w-4 h-4 text-emerald-500" strokeWidth={2.5} />}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* CTA Card */}
          <div className="bg-white border border-slate-100 rounded-2xl p-4 flex items-center gap-4 shadow-sm">
            <div className="text-4xl shrink-0">🥦</div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-bold text-slate-800">দাম তুলনা করে সাশ্রয় করুন</h3>
              <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                নিয়মিত দাম আপডেট দেখুন এবং বৃদ্ধিমানের সাথে তথ্যনির্ভর করুন।
              </p>
            </div>
            <Link
              href="/products"
              className="shrink-0 bg-emerald-600 text-white text-xs font-bold px-3 py-2 rounded-xl whitespace-nowrap"
            >
              তুলনা করুন
            </Link>
          </div>

          {/* Bottom Info Row */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { icon: <RefreshCw className="w-4 h-4 text-emerald-600" strokeWidth={2} />, bg: 'bg-emerald-50', label: 'নিয়মিত আপডেট' },
              { icon: <MapPin className="w-4 h-4 text-blue-500" strokeWidth={2} />,       bg: 'bg-blue-50',    label: 'আপনার এলাকার বাজার' },
              { icon: <Zap className="w-4 h-4 text-amber-500" strokeWidth={2} />,         bg: 'bg-amber-50',   label: 'সহজ ও দ্রুত' },
            ].map(({ icon, bg, label }) => (
              <div key={label} className="flex flex-col items-center gap-1 text-center">
                <div className={`w-9 h-9 ${bg} rounded-xl flex items-center justify-center`}>{icon}</div>
                <p className="text-[10px] text-slate-500 font-medium leading-tight">{label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Desktop Right Column ── */}
        <div className="lg:w-80 xl:w-96 shrink-0 hidden lg:flex flex-col gap-4">

          {/* Submit promo */}
          <div className="bg-emerald-600 rounded-2xl p-5 relative overflow-hidden">
            <div className="absolute -right-8 -top-8 w-32 h-32 bg-white/10 rounded-full" />
            <div className="relative z-10">
              <p className="text-xs font-bold text-emerald-100 uppercase tracking-wider mb-2">আপনার অবদান</p>
              <h2 className="text-lg font-bold text-white mb-1 leading-snug">আজকের দাম জানাচ্ছেন?</h2>
              <p className="text-sm text-emerald-100 mb-4">সঠিক দাম সাবমিট করুন, সবাইকে সাহায্য করুন।</p>
              <Link
                href="/submit"
                className="inline-flex items-center gap-2 bg-white text-emerald-700 px-4 py-2 rounded-full font-bold text-sm"
              >
                দাম সাবমিট করুন <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {/* Heatmap link */}
          <Link
            href="/heatmap"
            className="bg-white border border-slate-100 rounded-2xl p-4 flex items-center gap-3 hover:shadow-md transition-shadow shadow-sm"
          >
            <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center shrink-0">
              <MapPin className="w-5 h-5 text-indigo-500" strokeWidth={2} />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-slate-800">হিটম্যাপ দেখুন</p>
              <p className="text-xs text-slate-400">আশেপাশের বাজারের তুলনামূলক দাম</p>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-300" />
          </Link>
        </div>
      </div>
    </div>
  );
}
