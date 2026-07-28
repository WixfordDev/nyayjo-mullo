'use client';

import { useState } from 'react';
import { ArrowLeft, Search, MapPin, ChevronRight, CheckCircle2 } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useGetBazarsQuery, useGetNearbyBazarsQuery } from '../../../store/api/bazarApi';
import { useGetPricesQuery } from '../../../store/api/priceApi';
import { useUserLocation } from '../../../hooks/useUserLocation';
import { distanceKm, formatDistance } from '../../../lib/distance';

export function AllProducts() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [selectedBazarId, setSelectedBazarId] = useState(searchParams.get('bazar_id') || '');
  const [searchQuery, setSearchQuery] = useState('');

  const { location: userLocation } = useUserLocation();

  const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;
  const { data: bazarsRes,      isLoading: loadingBazars1 } = useGetBazarsQuery(
    { limit: 50 }, { skip: !!userLocation },
  );
  const { data: nearbyBazarsRes, isLoading: loadingBazars2 } = useGetNearbyBazarsQuery(
    { lat: userLocation?.lat ?? 0, lng: userLocation?.lng ?? 0, radius: 10, limit: 50 },
    { skip: !userLocation },
  );
  const loadingBazars = loadingBazars1 || loadingBazars2;

  const { data: pricesRes, isFetching: loadingBazarPrices } = useGetPricesQuery(
    { bazarId: selectedBazarId, limit: 200 },
    { skip: !selectedBazarId }
  );
  const { data: recentPricesRes, isFetching: loadingRecentPrices } = useGetPricesQuery(
    { limit: 200 },
    { skip: !!selectedBazarId }
  );

  const bazars = userLocation
    ? (nearbyBazarsRes?.data?.attributes || [])
    : (bazarsRes?.data?.attributes?.data || []);
  const prices = pricesRes?.data?.attributes?.data || [];

  // nearby API already limits to 10km radius — all returned bazars qualify as nearby
  const nearbyBazarIds = userLocation ? new Set(bazars.map((b: any) => b._id)) : null;

  const recentAllPrices = (recentPricesRes?.data?.attributes?.data || []).filter((p: any) => {
    if (Date.now() - new Date(p.createdAt).getTime() >= SEVEN_DAYS) return false;
    if (!nearbyBazarIds) return true;
    const bid = typeof p.bazarId === 'object' ? p.bazarId?._id : p.bazarId;
    return nearbyBazarIds.has(bid);
  });

  const sortedBazars = userLocation
    ? [...bazars].sort((a: any, b: any) =>
        distanceKm(userLocation.lat, userLocation.lng, a.lat, a.lng) -
        distanceKm(userLocation.lat, userLocation.lng, b.lat, b.lng)
      )
    : bazars;

  const sourceList = selectedBazarId ? prices : recentAllPrices;

  // Deduplicate by product — one card per unique product, best-upvoted price wins
  const productMap = new Map<string, any>();
  sourceList.forEach((p: any) => {
    const pid = typeof p.productId === 'object' ? p.productId?._id : p.productId;
    if (!pid) return;
    const existing = productMap.get(pid);
    if (!existing || (p.upvotes || 0) > (existing.priceEntry?.upvotes || 0)) {
      productMap.set(pid, {
        ...(typeof p.productId === 'object' ? p.productId : { _id: pid }),
        bazarPrice: p.price,
        priceEntry: p,
        bazarName: typeof p.bazarId === 'object' ? (p.bazarId?.nameBn || p.bazarId?.name) : '',
        submittedAt: p.createdAt,
      });
    }
  });
  const bazarProducts = Array.from(productMap.values());

  const filteredProducts = searchQuery
    ? bazarProducts.filter((p: any) =>
        p.name?.toLowerCase().includes(searchQuery.toLowerCase()) || p.nameBn?.includes(searchQuery)
      )
    : bazarProducts;

  const currentBazar = bazars.find((b: any) => b._id === selectedBazarId) as any;
  const loadingProducts = selectedBazarId ? loadingBazarPrices : loadingRecentPrices;

  const isVerifiedPrice = (p: any) => {
    const total = (p?.upvotes || 0) + (p?.downvotes || 0);
    return total >= 10 && (p?.upvotes || 0) / total >= 0.6;
  };

  const timeAgo = (dateStr: string) => {
    const mins = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
    if (mins < 1) return 'এইমাত্র';
    if (mins < 60) return `${mins} মিনিট আগে`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs} ঘণ্টা আগে`;
    return `${Math.floor(hrs / 24)} দিন আগে`;
  };

  const getBazarDistance = (bazar: any) => {
    if (!userLocation) return null;
    return distanceKm(userLocation.lat, userLocation.lng, bazar.lat, bazar.lng);
  };

  return (
    <div className="pb-12">

      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <button onClick={() => router.back()}
          className="w-10 h-10 bg-white border border-slate-100 rounded-full flex items-center justify-center shadow-sm hover:bg-slate-50 transition-colors shrink-0">
          <ArrowLeft className="w-5 h-5 text-slate-600" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-[#064E3B] truncate">
            {currentBazar ? (currentBazar.nameBn || currentBazar.name) : 'সব পণ্য'}
          </h1>
          <p className="text-xs text-slate-400">{filteredProducts.length}টি পণ্য পাওয়া গেছে</p>
        </div>
      </div>

      {/* Bazar selector */}
      <div className="glass-card p-4 mb-4">
        <div className="inline-flex items-center gap-1.5 w-full">
          <MapPin className="w-4 h-4 text-[#10B981] shrink-0" strokeWidth={2} />
          {loadingBazars ? (
            <span className="text-sm text-slate-400">লোড হচ্ছে...</span>
          ) : (
            <select
              value={selectedBazarId}
              onChange={e => setSelectedBazarId(e.target.value)}
              className="flex-1 text-sm font-medium text-slate-700 bg-transparent border-none focus:outline-none appearance-none cursor-pointer">
              <option value="">📍 সব বাজার (কাছের)</option>
              {sortedBazars.map((b: any) => {
                const dist = getBazarDistance(b);
                return (
                  <option key={b._id} value={b._id}>
                    {b.nameBn || b.name}{dist !== null ? ` (${formatDistance(dist)})` : ''}
                  </option>
                );
              })}
            </select>
          )}
          <ChevronRight className="w-4 h-4 text-slate-400 rotate-90 shrink-0" />
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" strokeWidth={1.5} />
        <input type="text" placeholder="পণ্য খুঁজুন..." value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="w-full h-11 pl-11 pr-4 glass-card focus:outline-none focus:ring-2 focus:ring-[#10B981]/30 text-sm transition-shadow" />
      </div>

      {/* Products grid */}
      {loadingProducts ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[...Array(12)].map((_, i) => (
            <div key={i} className="bg-white/60 border border-slate-100 rounded-[16px] p-3 min-h-[110px] animate-pulse">
              <div className="h-4 bg-slate-100 rounded mb-2 w-2/3" />
              <div className="h-3 bg-slate-100 rounded mb-4 w-1/3" />
              <div className="h-6 bg-slate-100 rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <p className="text-5xl mb-3">🛒</p>
          <p className="font-medium">{selectedBazarId ? 'এই বাজারে এখনো কোনো দাম সাবমিট হয়নি' : 'গত ৭ দিনে কোনো দাম সাবমিট হয়নি'}</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {filteredProducts.map((product: any) => (
            <div key={product._id}
              className="backdrop-blur-md border border-[rgba(15,23,42,0.05)] bg-[rgba(255,255,255,0.85)] rounded-[16px] p-[12px] flex flex-col justify-between min-h-[110px] relative cursor-pointer transition-transform hover:-translate-y-1"
              onClick={() => router.push(`/products/${product._id}`)}>
              <div className="flex justify-between items-start">
                <div className="pr-1 flex-1 min-w-0">
                  <h4 className="text-[14px] font-bold text-[#0F172A] m-0 leading-[1.2] truncate">{product.nameBn || product.name}</h4>
                  <p className="text-[11px] text-[#64748B] mt-[2px]">{product.unit}</p>
                  {!selectedBazarId && product.bazarName && (
                    <p className="text-[10px] text-emerald-600 font-semibold mt-0.5 truncate">🏪 {product.bazarName}</p>
                  )}
                </div>
                <div className="w-[52px] h-[52px] bg-[#F1F5F9] rounded-[12px] flex items-center justify-center text-2xl shrink-0 ml-1 overflow-hidden">
                  {product.image
                    ? <img src={product.image} alt={product.nameBn || product.name} className="w-full h-full object-cover" />
                    : (product.icon || '🛒')}
                </div>
              </div>
              <div className="mt-auto pt-2 flex items-end justify-between gap-1">
                <div className="flex items-center gap-1">
                  <span className="text-[18px] font-[800] tracking-[-0.5px] text-[#064E3B]">
                    ৳ {product.bazarPrice ?? product.defaultPrice}
                  </span>
                  {isVerifiedPrice(product.priceEntry) && (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" strokeWidth={2.5} />
                  )}
                </div>
                {product.submittedAt && (
                  <span className="text-[10px] text-slate-400 font-medium shrink-0">{timeAgo(product.submittedAt)}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
