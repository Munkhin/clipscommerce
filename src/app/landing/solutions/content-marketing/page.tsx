'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ContentMarketingRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/landing/solutions#content-marketing');
  }, [router]);
  return null;
} 