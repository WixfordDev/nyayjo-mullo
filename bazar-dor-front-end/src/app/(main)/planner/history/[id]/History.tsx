'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { useGetShoppingListQuery } from '@/store/api/shoppingListApi';
import { PlannerResultView, PlannerResult } from '@/components/PlannerResultView';

export function History({ id }: { id: string }) {
  const { data, isLoading, isError } = useGetShoppingListQuery(id);
  const plan = data?.data?.attributes;

  if (isLoading) {
    return (
      <div className="max-w-lg mx-auto pt-8 animate-pulse space-y-4">
        <div className="h-40 bg-slate-100 rounded-3xl" />
        <div className="h-32 bg-slate-100 rounded-3xl" />
        <div className="h-48 bg-slate-100 rounded-3xl" />
      </div>
    );
  }

  if (isError || !plan) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-center">
        <p className="text-sm text-slate-400">এই পরিকল্পনাটি খুঁজে পাওয়া যায়নি।</p>
        <Link href="/planner" className="inline-flex items-center gap-1.5 text-sm font-bold text-[#064E3B]">
          <ArrowLeft className="w-4 h-4" /> প্ল্যানারে ফিরে যান
        </Link>
      </div>
    );
  }

  const state: PlannerResult = {
    totalCost: plan.estimatedTotal || 0,
    savings: plan.savings || 0,
    grossSaving: plan.grossSaving || 0,
    savingVsAvg: plan.savingVsAvg || 0,
    savingIfSwitch: plan.savingIfSwitch || 0,
    isAlreadyBest: !!plan.isAlreadyBest,
    bazarId: plan.bazarId?._id || plan.bazarId || '',
    bazarName: plan.bazarId?.nameBn || plan.bazarId?.name || 'সব বাজার',
    itemCount: plan.items?.length || 0,
    travelCost: plan.travelCost || 0,
    items: (plan.items || []).map((it: any) => ({
      productId: it.productId?._id || it.productId,
      name: it.productId?.nameBn || it.productId?.name || '',
      qty: it.qty,
      price: it.estimatedPrice,
      icon: it.productId?.icon || '🛒',
      saving: 0,
      refPrice: it.estimatedPrice,
    })),
    comparisons: (plan.comparisons || []).map((c: any) => ({
      name: c.bazarName,
      total: c.total,
      dist: c.dist,
    })),
  };

  return <PlannerResultView state={state} backHref="/planner" />;
}
