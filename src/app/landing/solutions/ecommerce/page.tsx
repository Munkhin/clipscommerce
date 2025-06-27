'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function EcommerceSolutionRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/landing/solutions#ecommerce');
  }, [router]);
  return null;
} 