'use client';

import {
  ArrowLeft, Bell, Share2, Calendar, TrendingUp, TrendingDown,
  ArrowUpRight, ArrowDownRight, BarChart2, ChevronRight, Lightbulb,
} from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  LineChart, Line, ResponsiveContainer, Tooltip, CartesianGrid, XAxis, YAxis,
} from 'recharts';
import { useGetMarketIndexQuery } from '../../../store/api/priceApi';
import { useUserLocation } from '../../../hooks/useUserLocation';

const ITEM_ICONS: Record<string, string> = {
  rice: '🍚', chicken: '🍗', oil: '🛢️', onion: '🧅', potato: '🥔',
};

export function MarketIndex() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const bazarId = searchParams.get('bazar_id') || '';
  const { location: userLocation } = useUserLocation();

  const params = bazarId
    ? { bazarId }
    : userLocation
      ? { lat: userLocation.lat, lng: userLocation.lng, radius: 10 }
      : {};

  const { data: res, isFetching } = useGetMarketIndexQuery(params);
  const data = res?.data?.attributes;

  const currentPrice = data?.currentPrice ?? null;
  const change       = data?.change ?? null;
  const changePercent = data?.changePercent ?? null;
  const trend         = data?.trend ?? [];
  const stats          = data?.stats ?? { highest: null, lowest: null, average: null, change: null, changePercent: null };
  const insightTip     = data?.insightTip ?? null;
  const items           = data?.items ?? [];

  const isUp = change !== null && change > 0;

  return (
    <div className="max-w-2xl mx-auto pb-16">

      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <button onClick={() => router.back()}
          className="w-10 h-10 rounded-full bg-white border border-slate-100 shadow-sm flex items-center justify-center shrink-0 active:scale-95 transition-transform">
          <ArrowLeft className="w-5 h-5 text-slate-600" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-extrabold text-emerald-700 leading-tight text-center">দামের চার্ট</h1>
          <p className="text-[11px] text-slate-400 mt-0.5 text-center flex items-center justify-center gap-1.5">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
            রিয়েলটাইম আপডেট
          </p>
        </div>
        <Link href="/alerts"
          className="w-10 h-10 rounded-full bg-white border border-slate-100 shadow-sm flex items-center justify-center shrink-0">
          <Bell className="w-4.5 h-4.5 text-slate-600" />
        </Link>
        <button type="button" title="শেয়ার করুন"
          className="w-10 h-10 rounded-full bg-white border border-slate-100 shadow-sm flex items-center justify-center shrink-0">
          <Share2 className="w-4.5 h-4.5 text-slate-600" />
        </button>
      </div>

      {isFetching ? (
        <div className="space-y-4">
          <div className="h-32 bg-slate-100 rounded-3xl animate-pulse" />
          <div className="h-64 bg-slate-100 rounded-3xl animate-pulse" />
          <div className="h-20 bg-slate-100 rounded-3xl animate-pulse" />
        </div>
      ) : (
        <>
          {/* Current Price card */}
          <div className="bg-gradient-to-br from-emerald-50 to-emerald-100/60 border border-emerald-100 rounded-3xl p-5 mb-4 relative overflow-hidden">
            <div className="flex items-center gap-1.5 mb-2">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
              <p className="text-xs font-semibold text-emerald-700">Current Price</p>
            </div>
            <h2 className="text-4xl font-black text-slate-900 tracking-tight mb-2">
              ৳ {currentPrice ?? '—'}
            </h2>
            {change !== null && (
              <p className={`text-sm font-bold flex items-center gap-1 ${isUp ? 'text-rose-500' : 'text-emerald-600'}`}>
                {isUp ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                ৳{Math.abs(change)} {isUp ? 'higher' : 'lower'} than yesterday
              </p>
            )}
            <div className="absolute right-4 bottom-3 text-6xl opacity-90 select-none">🌾</div>
          </div>

          {/* 7-day trend */}
          <div className="bg-white border border-slate-100 rounded-3xl p-5 mb-4 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-emerald-600" strokeWidth={2.5} />
                <p className="text-sm font-bold text-slate-800">গত ৭ দিনের মূল্য পরিবর্তন</p>
              </div>
              <span className="flex items-center gap-1 text-xs font-semibold text-slate-500 bg-slate-50 border border-slate-100 px-2.5 py-1 rounded-full">
                <Calendar className="w-3.5 h-3.5" /> ৭ দিন
              </span>
            </div>

            {trend.length >= 2 ? (
              <div className="h-44 -mx-2">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trend} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={42} tickFormatter={(v) => `৳${v}`} domain={['auto', 'auto']} />
                    <Tooltip
                      formatter={(v: any) => [`৳${v}`, 'দাম']}
                      contentStyle={{ borderRadius: '10px', border: 'none', fontSize: 12, boxShadow: '0 4px 16px rgba(0,0,0,0.1)' }}
                    />
                    <Line type="monotone" dataKey="value" stroke="#10B981" strokeWidth={2.5} dot={{ fill: '#10B981', r: 4, strokeWidth: 0 }} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-sm text-slate-300 text-center py-10">পর্যাপ্ত ডেটা নেই</p>
            )}

            {/* Stats grid */}
            <div className="grid grid-cols-2 gap-2.5 mt-4">
              <div className="bg-emerald-50 rounded-xl p-3">
                <p className="text-[10px] font-bold text-emerald-600 flex items-center gap-1 mb-1">
                  <TrendingUp className="w-3 h-3" /> সর্বোচ্চ মূল্য
                </p>
                <p className="text-lg font-black text-slate-800">৳{stats.highest?.value ?? '—'}</p>
                <p className="text-[10px] text-slate-400">{stats.highest?.label ?? ''}</p>
              </div>
              <div className="bg-rose-50 rounded-xl p-3">
                <p className="text-[10px] font-bold text-rose-500 flex items-center gap-1 mb-1">
                  <TrendingDown className="w-3 h-3" /> সর্বনিম্ন মূল্য
                </p>
                <p className="text-lg font-black text-slate-800">৳{stats.lowest?.value ?? '—'}</p>
                <p className="text-[10px] text-slate-400">{stats.lowest?.label ?? ''}</p>
              </div>
              <div className="bg-violet-50 rounded-xl p-3">
                <p className="text-[10px] font-bold text-violet-500 flex items-center gap-1 mb-1">
                  <BarChart2 className="w-3 h-3" /> গড় মূল্য
                </p>
                <p className="text-lg font-black text-slate-800">৳{stats.average ?? '—'}</p>
                <p className="text-[10px] text-slate-400">৭ দিন</p>
              </div>
              <div className="bg-blue-50 rounded-xl p-3">
                <p className="text-[10px] font-bold text-blue-500 flex items-center gap-1 mb-1">
                  ↕ দাম পরিবর্তন
                </p>
                <p className="text-lg font-black text-slate-800">৳{stats.change !== null ? Math.abs(stats.change) : '—'}</p>
                <p className={`text-[10px] font-semibold ${stats.changePercent !== null && stats.changePercent < 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                  {stats.changePercent !== null ? `(${stats.changePercent > 0 ? '+' : ''}${stats.changePercent}%)` : ''}
                </p>
              </div>
            </div>
          </div>

          {/* Smart tip */}
          {insightTip && (
            <div className="bg-amber-50 border border-amber-100 rounded-2xl px-4 py-3 mb-4 flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
                <Lightbulb className="w-4 h-4 text-amber-600" strokeWidth={2.5} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold text-amber-700 uppercase tracking-wider mb-0.5">স্মার্ট টিপস</p>
                <p className="text-xs text-amber-800 font-medium leading-relaxed">{insightTip}</p>
              </div>
              <ChevronRight className="w-4 h-4 text-amber-400 shrink-0 mt-1" />
            </div>
          )}

          {/* Realtime basket items */}
          <div>
            <div className="flex items-center justify-between mb-2 px-1">
              <h3 className="text-sm font-bold text-slate-800">রিয়েলটাইম বাজারদর</h3>
              <span className="text-[11px] text-slate-400">সর্বশেষ আপডেট: এখনই</span>
            </div>
            <div className="bg-white border border-slate-100 rounded-2xl divide-y divide-slate-100 shadow-sm">
              {items.map((it: any) => (
                <div key={it.key} className="flex items-center gap-3 px-4 py-3">
                  <span className="w-9 h-9 rounded-xl bg-slate-50 flex items-center justify-center text-lg shrink-0">
                    {ITEM_ICONS[it.key] || '🛒'}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-800">{it.label} ({it.qty} {it.unit})</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-black text-slate-800">
                      {it.currentPrice !== null ? `৳${it.currentPrice}` : '—'}
                    </p>
                    {it.change !== null && it.change !== 0 && (
                      <p className={`text-[11px] font-bold flex items-center justify-end gap-0.5 ${it.change > 0 ? 'text-rose-500' : 'text-emerald-600'}`}>
                        {it.change > 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                        ৳{Math.abs(it.change)}
                      </p>
                    )}
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-300 shrink-0" />
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
