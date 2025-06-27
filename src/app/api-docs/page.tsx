'use client';

import NavigationBar from '@/app/landing/components/NavigationBar';

export default function ApiDocsComingSoon() {
  return (
    <div className="min-h-screen bg-black text-white">
      <NavigationBar />
      <div className="flex flex-col items-center justify-center h-[80vh] px-4 text-center">
        <h1 className="text-5xl md:text-7xl font-bold mb-6">
          API Documentation <span className="text-[#8D5AFF]">Coming Soon</span>
        </h1>
        <p className="text-lg text-white/70 max-w-2xl">
          We're working hard to document every endpoint and example for developers. Sign up for our newsletter or check back soon for the full API reference.
        </p>
      </div>
    </div>
  );
}
