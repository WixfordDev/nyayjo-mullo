'use client';

import { MapPin, TrendingDown, Share2, ArrowLeft, CheckCircle2, Car } from 'lucide-react';
import Link from 'next/link';

export interface ResultItem {
  productId: string;
  name: string;
  qty: number;
  price: number;
  icon: string;
  saving: number;
  refPrice: number;
}

export interface BazarComparison {
  name: string;
  total: number;
  dist: number | null;
}

export interface PlannerResult {
  totalCost: number;
  savings: number;
  grossSaving: number;
  savingVsAvg: number;
  savingIfSwitch: number;
  isAlreadyBest: boolean;
  bazarId: string;
  bazarName: string;
  itemCount: number;
  travelCost: number;
  items: ResultItem[];
  comparisons: BazarComparison[];
}

export function PlannerResultView({ state, backHref }: { state: PlannerResult; backHref: string }) {
  const {
    totalCost, savings, travelCost, bazarName,
    isAlreadyBest, savingVsAvg, savingIfSwitch,
    comparisons = [],
  } = state;

  const grandTotal  = totalCost + travelCost;
  const displaySave = isAlreadyBest && savingVsAvg > 0 ? savingVsAvg : savings;

  const selectedComp = comparisons.find(c => c.name === bazarName) || comparisons[0];
  const splitComp    = comparisons.find(c => c.name !== bazarName) || comparisons[1];
  const splitSaving  = selectedComp && splitComp
    ? Math.max(0, Math.round(selectedComp.total - splitComp.total))
    : savingIfSwitch || 0;

  const handleShare = async () => {
    const text = displaySave > 0
      ? `আমি বাজার দর অ্যাপ ব্যবহার করে ${displaySave.toLocaleString()} টাকা সাশ্রয় করলাম! আপনিও ট্রাই করুন।`
      : `বাজার দর অ্যাপ দিয়ে স্মার্ট বাজার করলাম। আপনিও ট্রাই করুন।`;
    try {
      if (navigator.share) await navigator.share({ title: 'বাজার দর', text, url: window.location.origin });
      else await navigator.clipboard.writeText(`${text} ${window.location.origin}`);
    } catch {}
  };

  return (
    <div className="flex flex-col gap-4 sm:gap-6 pb-20">

      {/* Header */}
      <div className="flex items-center justify-between">
        <Link href={backHref} className="p-2 glass-pill hover:bg-white/50 transition-colors text-slate-600">
          <ArrowLeft className="w-5 h-5" strokeWidth={2} />
        </Link>
        <h1 className="text-lg sm:text-xl font-bold text-[#064E3B]">আপনার বাজার প্ল্যান</h1>
        <div className="w-9" />
      </div>

      {/* Hero Card */}
      <div className="glass-card p-5 sm:p-8 bg-gradient-to-br from-[#064E3B] to-[#10B981] text-white text-center relative overflow-hidden shadow-[0_24px_48px_rgba(16,185,129,0.2)]">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-black/10 rounded-full blur-3xl -ml-20 -mb-20 pointer-events-none" />

        <div className="relative z-10 flex flex-col items-center">
          <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-md px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs font-medium mb-4 sm:mb-6 border border-white/20 shadow-sm">
            <MapPin className="w-3 h-3 sm:w-3.5 sm:h-3.5" strokeWidth={2} />
            <span className="truncate max-w-[140px] sm:max-w-none">নির্বাচিত বাজার: {bazarName || 'সব বাজার'}</span>
          </div>

          <p className="text-emerald-100 text-xs sm:text-sm mb-1 font-medium uppercase tracking-wider">আপনার মোট খরচ হবে</p>
          <div className="text-5xl sm:text-6xl font-black tracking-tight mb-2 drop-shadow-sm">
            ৳ {grandTotal.toLocaleString()}
          </div>

          {travelCost > 0 && (
            <div className="text-white/80 text-xs mb-4 sm:mb-6 flex items-center gap-1.5 font-medium bg-black/10 px-3 py-1 rounded-full">
              <Car className="w-3 h-3" />
              বাজার ৳{totalCost.toLocaleString()} + যাতায়াত ৳{travelCost.toLocaleString()}
            </div>
          )}
          {!travelCost && <div className="mb-4 sm:mb-6" />}

          {displaySave > 0 ? (
            <div className="inline-flex items-center gap-2 bg-white text-[#064E3B] px-4 sm:px-6 py-2.5 sm:py-3 rounded-2xl font-bold text-sm sm:text-lg shadow-lg cursor-default">
              <TrendingDown className="w-4 h-4 sm:w-5 sm:h-5 text-[#10B981] shrink-0" strokeWidth={2.5} />
              <span className="truncate">
                {isAlreadyBest
                  ? `আশেপাশের চেয়ে সাশ্রয়: ৳ ${displaySave.toLocaleString()}`
                  : `আপনি সেভ করছেন: ৳ ${displaySave.toLocaleString()}`}
              </span>
            </div>
          ) : savingIfSwitch > 0 ? (
            <div className="inline-flex items-center gap-2 bg-amber-400 text-amber-900 px-4 sm:px-6 py-2.5 sm:py-3 rounded-2xl font-bold text-sm sm:text-base shadow-lg cursor-default">
              বাজার বদলালে ৳{savingIfSwitch} কম লাগতো
            </div>
          ) : null}
        </div>
      </div>

      {/* Split Comparison Cards */}
      <div className="grid grid-cols-2 gap-2 sm:gap-4">
        <div className="glass-card p-3 sm:p-5 flex flex-col justify-center items-center text-center">
          <h3 className="text-slate-400 font-medium mb-1.5 sm:mb-2 uppercase tracking-wider text-[9px] sm:text-[10px]">
            {isAlreadyBest ? 'আপনার বাজার (সেরা)' : 'আপনার বাজার'}
          </h3>
          <div className="text-base sm:text-xl font-bold text-[#064E3B] mb-1 leading-tight truncate w-full px-1">
            {bazarName || 'সব বাজার'}
          </div>
          <div className={`font-bold text-[11px] sm:text-xs px-2 sm:px-3 py-1 rounded-full ${isAlreadyBest ? 'text-[#10B981] bg-emerald-50' : 'text-slate-500 bg-slate-50'}`}>
            ৳ {(selectedComp?.total || grandTotal).toLocaleString()}
          </div>
        </div>

        {splitComp ? (
          <div className="relative glass-card p-3 sm:p-5 border border-[#10B981]/30 flex flex-col justify-center items-center text-center bg-emerald-50/30">
            <div className="absolute -top-2.5 bg-[#10B981] text-white text-[8px] sm:text-[9px] font-bold px-2 sm:px-3 py-0.5 sm:py-1 rounded-full uppercase tracking-widest shadow-sm">
              {isAlreadyBest ? 'তুলনা' : 'সুপারিশ'}
            </div>
            <h3 className="text-slate-400 font-medium mb-1.5 sm:mb-2 uppercase tracking-wider text-[9px] sm:text-[10px]">
              {isAlreadyBest ? 'পরের সস্তা বাজার' : 'সস্তা বিকল্প'}
            </h3>
            <div className="text-sm sm:text-lg font-bold text-[#064E3B] mb-1 leading-tight truncate w-full px-1">
              {splitComp.name}
            </div>
            <div className="text-[#10B981] font-bold text-[11px] sm:text-xs bg-emerald-50 px-2 sm:px-3 py-1 rounded-full">
              {isAlreadyBest
                ? `৳ ${splitComp.total.toLocaleString()} (+৳${Math.abs(splitComp.total - (selectedComp?.total || 0))})`
                : splitSaving > 0
                  ? `৳${splitSaving} সাশ্রয়`
                  : `৳ ${splitComp.total.toLocaleString()}`}
            </div>
          </div>
        ) : (
          <div className="glass-card p-3 sm:p-5 flex flex-col justify-center items-center text-center">
            <h3 className="text-slate-400 font-medium mb-2 uppercase tracking-wider text-[9px] sm:text-[10px]">তুলনামূলক বাজার</h3>
            <div className="text-slate-400 text-sm">ডেটা নেই</div>
          </div>
        )}
      </div>

      {/* Comparison Table */}
      {comparisons.length > 0 && (
        <div className="glass-card overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-slate-100/50">
            <h2 className="text-base sm:text-lg font-bold text-[#064E3B]">বাজার তুলনা</h2>
            <p className="text-slate-500 text-xs mt-0.5">নির্বাচিত পণ্যের ভিত্তিতে তুলনা</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[280px]">
              <thead>
                <tr className="bg-slate-50/50 text-slate-400 text-[10px] uppercase tracking-wider font-medium">
                  <th className="p-3 sm:p-4 font-medium">বাজারের নাম</th>
                  <th className="p-3 sm:p-4 text-right font-medium">মোট খরচ</th>
                  <th className="p-3 sm:p-4 text-center font-medium">দূরত্ব</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100/50">
                {comparisons.map((c, i) => {
                  const isSelected = c.name === bazarName;
                  const isCheapest = i === 0;
                  const diff       = i > 0 ? c.total - comparisons[0].total : 0;
                  return (
                    <tr key={i} className={isSelected ? 'bg-emerald-50/30' : 'hover:bg-slate-50/50 transition-colors'}>
                      <td className="p-3 sm:p-4 font-medium text-sm">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className={isSelected ? 'font-bold text-[#064E3B]' : 'text-slate-600'}>
                            {c.name}
                          </span>
                          {isSelected && (
                            <span className="bg-[#10B981] text-white text-[9px] px-1.5 py-0.5 rounded-full uppercase font-bold shadow-sm">
                              আপনার
                            </span>
                          )}
                          {isCheapest && !isSelected && (
                            <span className="bg-emerald-100 text-emerald-700 text-[9px] px-1.5 py-0.5 rounded-full font-bold">
                              সস্তা
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-3 sm:p-4 text-right">
                        <span className={`font-black text-sm sm:text-base ${isCheapest ? 'text-[#10B981]' : 'text-slate-600'}`}>
                          ৳ {c.total.toLocaleString()}
                        </span>
                        {diff > 0 && (
                          <p className="text-[10px] text-rose-400 font-medium text-right">+৳{diff}</p>
                        )}
                      </td>
                      <td className="p-3 sm:p-4 text-center">
                        {c.dist !== null ? (
                          <div className="inline-flex items-center gap-1 text-slate-500 font-bold text-xs bg-slate-50 px-2 py-1 rounded-lg border border-slate-200">
                            <CheckCircle2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" strokeWidth={2.5} />
                            {c.dist.toFixed(1)} কিমি
                          </div>
                        ) : (
                          <span className="text-xs text-slate-300">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Monthly Projection */}
      {displaySave > 0 && (
        <div className="glass-card p-5 sm:p-8 text-center relative overflow-hidden bg-gradient-to-b from-white/40 to-emerald-50/40">
          <div className="relative z-10">
            <h3 className="text-xs sm:text-sm font-bold text-slate-500 mb-2 uppercase tracking-wider">বার্ষিক হিসাব</h3>
            <p className="text-[#064E3B] text-sm sm:text-base mb-3 sm:mb-4 font-medium leading-snug">
              এইভাবে প্রতি সপ্তাহে বাজার করলে আপনার বছরে সাশ্রয় হবে
            </p>
            <div className="text-3xl sm:text-4xl font-black text-[#10B981] tracking-tight">
              ৳ {(displaySave * 52).toLocaleString()}
            </div>
          </div>
        </div>
      )}

      {/* Share */}
      <div className="flex justify-center pt-2">
        <button onClick={handleShare}
          className="inline-flex items-center gap-2 text-slate-500 hover:text-[#064E3B] font-medium px-6 py-3 glass-pill hover:bg-white/80 transition-all">
          <Share2 className="w-4 h-4" strokeWidth={2} />
          বন্ধুদের সাথে শেয়ার করুন
        </button>
      </div>
    </div>
  );
}
