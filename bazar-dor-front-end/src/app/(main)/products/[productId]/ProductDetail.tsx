'use client';

import React, { useEffect, useState } from 'react';
import {
  ArrowLeft, Heart, Share2, Info, ShieldCheck, ThumbsUp,
  TrendingDown, TrendingUp, Pencil, Users, CheckCircle2,
  Clock, SlidersHorizontal,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useGetProductQuery } from '../../../../store/api/productApi';
import { useGetPricesQuery, useVotePriceMutation } from '../../../../store/api/priceApi';
import { useAppSelector } from '../../../../store/hooks';
import { useUserLocation } from '../../../../hooks/useUserLocation';
import { distanceKm, formatDistance } from '../../../../lib/distance';

function avg(arr: number[]) {
  return arr.length ? Math.round(arr.reduce((s, v) => s + v, 0) / arr.length) : null;
}

function timeAgo(dateStr: string) {
  const mins = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
  if (mins < 1) return 'এইমাত্র';
  if (mins < 60) return `${mins} মিনিট আগে`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} ঘণ্টা আগে`;
  return `${Math.floor(hrs / 24)} দিন আগে`;
}

const dhakaDay  = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Dhaka' });
const dhakaTime = new Intl.DateTimeFormat('bn-BD', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Asia/Dhaka' });

function formatUpdateTime(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  const yesterday = new Date(now.getTime() - 86400000);
  const time = dhakaTime.format(d);
  if (dhakaDay.format(d) === dhakaDay.format(now)) return `আজ, ${time}`;
  if (dhakaDay.format(d) === dhakaDay.format(yesterday)) return `গতকাল, ${time}`;
  return `${d.toLocaleDateString('bn-BD', { day: 'numeric', month: 'short' })}, ${time}`;
}

/* ── component ────────────────────────────────────── */
export function ProductDetail({ productId }: { productId: string }) {
  const router = useRouter();
  const isAuthenticated = useAppSelector(s => s.auth.isAuthenticated);
  const currentUser     = useAppSelector(s => s.auth.user);
  const userId          = (currentUser as any)?._id || (currentUser as any)?.id || '';
  const { location: userLocation } = useUserLocation();

  const [votedPriceIds, setVotedPriceIds] = useState<Set<string>>(new Set());
  const [voting, setVoting] = useState<string | null>(null);
  const [voteError, setVoteError] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<'all' | 'cheap' | 'expensive'>('all');
  const [isFavorite, setIsFavorite] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);

  useEffect(() => {
    const votedKey = userId ? `voted_prices_${userId}` : 'voted_prices';
    try {
      const stored = JSON.parse(localStorage.getItem(votedKey) || '[]');
      setVotedPriceIds(new Set(stored));
      const favs = JSON.parse(localStorage.getItem('favorite_products') || '[]');
      setIsFavorite(favs.includes(productId));
    } catch {}
  }, [productId, userId]);

  const { data: productRes, isLoading: loadingProduct } = useGetProductQuery(productId);
  const { data: pricesRes,  isLoading: loadingPrices  } = useGetPricesQuery({ productId, limit: 200 });
  const [votePrice] = useVotePriceMutation();

  const product: any     = productRes?.data?.attributes;
  const allPrices: any[] = pricesRes?.data?.attributes?.data || [];

  /* today's prices — midnight BD = 18:00 UTC prev day */
  const todayStart = new Date();
  todayStart.setUTCHours(todayStart.getUTCHours() - ((todayStart.getUTCHours() + 6) % 24), 0, 0, 0);
  const yesterdayStart = new Date(todayStart.getTime() - 24 * 60 * 60 * 1000);

  const todayPrices     = allPrices.filter(p => new Date(p.createdAt) >= todayStart);
  const yesterdayPrices = allPrices.filter(p => {
    const t = new Date(p.createdAt).getTime();
    return t >= yesterdayStart.getTime() && t < todayStart.getTime();
  });

  const todayAvg     = avg(todayPrices.map(p => p.price)) ?? avg(allPrices.map(p => p.price));
  const yesterdayAvg  = avg(yesterdayPrices.map(p => p.price));
  const change        = todayAvg !== null && yesterdayAvg !== null ? todayAvg - yesterdayAvg : null;

  const totalVotesAll   = allPrices.reduce((s, p) => s + (p.upvotes || 0) + (p.downvotes || 0), 0);
  const totalUpvotesAll = allPrices.reduce((s, p) => s + (p.upvotes || 0), 0);
  const reliability     = totalVotesAll > 0 ? Math.round((totalUpvotesAll / totalVotesAll) * 100) : 100;

  const latestEntry = [...allPrices].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
  const repEntry     = [...todayPrices].sort((a, b) => (b.upvotes || 0) - (a.upvotes || 0))[0] ?? latestEntry;
  const repVotes     = repEntry ? (repEntry.upvotes || 0) + (repEntry.downvotes || 0) : 0;

  /* per-bazar latest price */
  const bazarMap = new Map<string, any>();
  allPrices.forEach(p => {
    const bid = typeof p.bazarId === 'object' ? p.bazarId?._id : p.bazarId;
    if (!bid) return;
    if (!bazarMap.has(bid) || new Date(p.createdAt) > new Date(bazarMap.get(bid).createdAt))
      bazarMap.set(bid, p);
  });
  const bazarPrices = sortOrder === 'all'
    ? [...bazarMap.values()]
    : [...bazarMap.values()].sort((a, b) =>
        sortOrder === 'cheap' ? a.price - b.price : b.price - a.price,
      );
  const cheapestId = [...bazarMap.values()].sort((a, b) => a.price - b.price)[0]?._id;

  const markVoted = (priceId: string) => {
    setVotedPriceIds(prev => {
      const next = new Set([...prev, priceId]);
      const votedKey = userId ? `voted_prices_${userId}` : 'voted_prices';
      try { localStorage.setItem(votedKey, JSON.stringify([...next])); } catch {}
      return next;
    });
  };

  const handleVote = async (priceId: string) => {
    if (!isAuthenticated) { router.push('/login'); return; }
    setVoting(priceId);
    setVoteError(null);
    try {
      await votePrice({ priceId, voteType: 'up' }).unwrap();
      markVoted(priceId);
    } catch (err: any) {
      const status = err?.status ?? err?.data?.code;
      if (status === 409) {
        markVoted(priceId);
      } else {
        setVoteError('ভোট দেওয়া সম্ভব হয়নি, আবার চেষ্টা করুন');
        setTimeout(() => setVoteError(null), 3000);
      }
    }
    setVoting(null);
  };

  const toggleFavorite = () => {
    try {
      const favs: string[] = JSON.parse(localStorage.getItem('favorite_products') || '[]');
      const next = isFavorite ? favs.filter(id => id !== productId) : [...favs, productId];
      localStorage.setItem('favorite_products', JSON.stringify(next));
      setIsFavorite(!isFavorite);
    } catch {}
  };

  const handleShare = async () => {
    const url = typeof window !== 'undefined' ? window.location.href : '';
    if (navigator.share) {
      try { await navigator.share({ title: name, url }); } catch {}
    } else {
      try {
        await navigator.clipboard.writeText(url);
        setShareCopied(true);
        setTimeout(() => setShareCopied(false), 1500);
      } catch {}
    }
  };

  /* loading skeleton */
  if (loadingProduct || loadingPrices) {
    return (
      <div className="max-w-lg mx-auto pb-12 space-y-4 animate-pulse pt-2">
        <div className="h-10 bg-slate-100 rounded-2xl w-2/5" />
        <div className="h-48 bg-slate-100 rounded-3xl" />
        <div className="h-40 bg-slate-100 rounded-3xl" />
      </div>
    );
  }

  const name = product?.nameBn || product?.name || 'পণ্য';
  const unit = product?.unit || '';

  return (
    <div className="max-w-lg mx-auto pb-20">

      {/* ── Header ── */}
      <div className="flex items-center gap-3 mb-4 pt-1">
        <button onClick={() => router.back()}
          className="w-10 h-10 bg-white border border-slate-100 rounded-full flex items-center justify-center shadow-sm shrink-0">
          <ArrowLeft className="w-5 h-5 text-slate-600" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-extrabold text-emerald-700 truncate">{name}</h1>
          <p className="text-xs text-slate-400 truncate">{unit}{unit && ' · '}এটি আজকের গড় দাম</p>
        </div>
        <button onClick={toggleFavorite}
          className="w-10 h-10 bg-white border border-slate-100 rounded-full flex items-center justify-center shadow-sm shrink-0">
          <Heart className={`w-4.5 h-4.5 ${isFavorite ? 'text-rose-500 fill-rose-500' : 'text-slate-500'}`} />
        </button>
        <button onClick={handleShare} title={shareCopied ? 'লিংক কপি হয়েছে' : 'শেয়ার করুন'}
          className="w-10 h-10 bg-white border border-slate-100 rounded-full flex items-center justify-center shadow-sm shrink-0">
          <Share2 className="w-4.5 h-4.5 text-slate-500" />
        </button>
      </div>

      {allPrices.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-5xl mb-3">📭</p>
          <p className="text-slate-500 font-medium mb-4">এখনো কোনো দাম সাবমিট হয়নি</p>
          <Link href={`/submit?product_id=${productId}`}
            className="inline-block bg-emerald-600 text-white px-6 py-3 rounded-xl font-bold text-sm">
            দাম যোগ করুন
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-4">

          {/* ── Average price summary ── */}
          <div className="bg-gradient-to-br from-[#064E3B] to-emerald-600 rounded-3xl p-5 text-white shadow-xl shadow-emerald-900/15">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-1.5">
                <p className="text-emerald-200 text-xs font-bold">আজকের গড় দাম</p>
                <Info className="w-3.5 h-3.5 text-emerald-300" />
              </div>
              <ShieldCheck className="w-5 h-5 text-emerald-200" strokeWidth={1.75} />
            </div>

            <div className="flex items-baseline gap-1.5 mb-1">
              <span className="text-4xl font-black tracking-tight">৳{todayAvg ?? '—'}</span>
              {unit && <span className="text-emerald-200 text-sm font-semibold">/{unit}</span>}
            </div>

            <div className="flex items-center justify-between gap-2 mt-3">
              <div className="flex items-center gap-1.5 bg-white/10 rounded-xl px-2.5 py-1.5">
                <Users className="w-3.5 h-3.5 text-emerald-200" />
                <span className="text-xs font-bold text-emerald-100">মোট ভোট: {repVotes}</span>
              </div>
              {change !== null && change !== 0 && (
                <div className={`flex items-center gap-1 rounded-xl px-2.5 py-1.5 ${change > 0 ? 'bg-rose-500/20' : 'bg-emerald-400/20'}`}>
                  {change > 0
                    ? <TrendingUp className="w-3.5 h-3.5 text-rose-200" />
                    : <TrendingDown className="w-3.5 h-3.5 text-emerald-200" />}
                  <span className={`text-xs font-bold ${change > 0 ? 'text-rose-100' : 'text-emerald-100'}`}>
                    গতকালের থেকে ৳{Math.abs(change)} {change > 0 ? 'বেশি' : 'কম'}
                  </span>
                </div>
              )}
            </div>

            {latestEntry && (
              <p className="text-[11px] text-emerald-300 mt-3">
                সর্বশেষ আপডেট: {formatUpdateTime(latestEntry.createdAt)}
              </p>
            )}

            <Link href={`/submit?product_id=${productId}`}
              className="mt-3 w-full flex items-center justify-center gap-2 bg-white text-emerald-700 font-bold text-sm py-2.5 rounded-xl active:scale-[0.98] transition-transform">
              দাম আপডেট করুন <Pencil className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* ── Sort / filter row ── */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            <button onClick={() => setSortOrder('all')}
              className={`shrink-0 text-xs font-bold rounded-full px-3 py-1.5 border transition-colors ${
                sortOrder === 'all' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-slate-500 border-slate-200'
              }`}>
              সকল বাজার ({bazarPrices.length})
            </button>
            <button onClick={() => setSortOrder('cheap')}
              className={`shrink-0 text-xs font-bold rounded-full px-3 py-1.5 border transition-colors ${
                sortOrder === 'cheap' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-slate-500 border-slate-200'
              }`}>
              কম দামের প্রথম
            </button>
            <button onClick={() => setSortOrder('expensive')}
              className={`shrink-0 text-xs font-bold rounded-full px-3 py-1.5 border transition-colors ${
                sortOrder === 'expensive' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-slate-500 border-slate-200'
              }`}>
              বেশি দামের প্রথম
            </button>
            <button className="shrink-0 w-8 h-8 bg-white border border-slate-200 rounded-full flex items-center justify-center text-slate-500 ml-auto">
              <SlidersHorizontal className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* ── Bazar ranking list ── */}
          <div className="flex flex-col gap-2.5">
            {bazarPrices.map((p: any, i: number) => {
              const bazar      = typeof p.bazarId === 'object' ? p.bazarId : null;
              const dist       = userLocation && bazar?.lat && bazar?.lng
                ? distanceKm(userLocation.lat, userLocation.lng, bazar.lat, bazar.lng)
                : null;
              const isCheapest = p._id === cheapestId;
              const hasVoted   = votedPriceIds.has(p._id);
              const totalV     = (p.upvotes || 0) + (p.downvotes || 0);
              const isVerified = totalV >= 10 && (p.upvotes || 0) / totalV >= 0.6;

              return (
                <div key={p._id}
                  className={`bg-white rounded-2xl border p-3.5 flex items-center gap-3 ${isCheapest ? 'border-emerald-200' : 'border-slate-100'}`}>
                  <span className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-black ${
                    isCheapest ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-400'
                  }`}>
                    {i + 1}
                  </span>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className="text-sm font-bold text-slate-800 truncate">{bazar?.nameBn || bazar?.name || '—'}</p>
                      {isVerified && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />}
                    </div>
                    <p className="text-[11px] text-slate-400 truncate">
                      {bazar?.area ? `${bazar.area} · ` : ''}
                      {dist !== null ? `${formatDistance(dist)} দূরে · ` : ''}
                      {timeAgo(p.createdAt)}
                    </p>
                    {isCheapest && (
                      <span className="inline-block mt-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                        সর্বনিম্ন দাম
                      </span>
                    )}
                  </div>

                  <div className="text-right shrink-0">
                    <p className="text-base font-black text-slate-800">৳{p.price}<span className="text-[10px] text-slate-400 font-medium">/{unit}</span></p>
                    <div className="flex items-center justify-end gap-1 mt-1 text-[11px] font-bold text-amber-500">
                      <ThumbsUp className="w-3 h-3" /> {p.upvotes || 0}
                    </div>
                    <button
                      onClick={() => !hasVoted && !voting && handleVote(p._id)}
                      disabled={hasVoted || !!voting}
                      className={`mt-1.5 text-[11px] font-bold px-2.5 py-1 rounded-lg transition-colors ${
                        hasVoted ? 'bg-slate-50 text-slate-300' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                      }`}>
                      {hasVoted ? 'ভোট দেওয়া হয়েছে' : 'ভোট দিন'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* ── Vote error toast ── */}
          {voteError && (
            <div className="flex items-center gap-2 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold px-4 py-3 rounded-2xl">
              <span>⚠️</span> {voteError}
            </div>
          )}

          {/* ── Footer stats ── */}
          <div className="flex items-center justify-between bg-white rounded-2xl border border-slate-100 px-4 py-3">
            <div className="flex items-center gap-1.5 text-slate-500">
              <Users className="w-4 h-4" />
              <span className="text-xs font-bold">{totalVotesAll} মোট ভোট</span>
            </div>
            <div className="flex items-center gap-1.5 text-emerald-600">
              <CheckCircle2 className="w-4 h-4" />
              <span className="text-xs font-bold">{reliability}% ডেটা নির্ভরযোগ্য</span>
            </div>
            {latestEntry && (
              <div className="flex items-center gap-1.5 text-slate-500">
                <Clock className="w-4 h-4" />
                <span className="text-xs font-bold">{formatUpdateTime(latestEntry.createdAt)}</span>
              </div>
            )}
          </div>

          {/* ── Add price CTA ── */}
          <Link
            href={`/submit?product_id=${productId}`}
            className="w-full bg-gradient-to-r from-[#064E3B] to-[#10B981] text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/20 text-sm active:scale-[0.98] transition-transform">
            + এই পণ্যের নতুন দাম যোগ করুন
          </Link>
        </div>
      )}
    </div>
  );
}
