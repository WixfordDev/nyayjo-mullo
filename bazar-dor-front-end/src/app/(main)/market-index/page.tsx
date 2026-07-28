import { Suspense } from 'react';
import { Layout } from '@/components/Layout';
import { MarketIndex } from './MarketIndex';

export default function MarketIndexPage() {
  return (
    <Layout>
      <Suspense fallback={<div className="p-8 text-center text-slate-400">লোড হচ্ছে...</div>}>
        <MarketIndex />
      </Suspense>
    </Layout>
  );
}
