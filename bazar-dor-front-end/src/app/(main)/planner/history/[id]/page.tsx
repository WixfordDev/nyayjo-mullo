import { Suspense } from 'react';
import { Layout } from '@/components/Layout';
import { History } from './History';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function PlanHistoryPage({ params }: PageProps) {
  const { id } = await params;
  return (
    <Layout>
      <Suspense fallback={<div className="p-8 text-center">Loading...</div>}>
        <History id={id} />
      </Suspense>
    </Layout>
  );
}
