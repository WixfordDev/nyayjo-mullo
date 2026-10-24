'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PlannerResultView, PlannerResult } from '@/components/PlannerResultView';

export function Result() {
  const router = useRouter();
  const [state, setState] = useState<PlannerResult | null>(null);

  useEffect(() => {
    const stored = sessionStorage.getItem('plannerResult');
    if (stored) setState(JSON.parse(stored));
    else router.replace('/planner');
  }, [router]);

  if (!state) return null;

  return <PlannerResultView state={state} backHref="/planner" />;
}
