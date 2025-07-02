import { Skeleton } from '@/components/ui/skeleton';

export default function Loading() {
  return (
    <div className="min-h-screen p-8">
      {/* Header Skeleton */}
      <div className="mb-8">
        <Skeleton className="h-8 w-1/2 mb-2" />
        <Skeleton className="h-4 w-1/4" />
      </div>

      {/* Key Metrics Skeleton */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white border-2 border-[#E5E7EB] rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <Skeleton className="h-5 w-1/3" />
              <Skeleton className="h-5 w-1/4" />
            </div>
            <Skeleton className="h-8 w-3/4 mb-2" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        ))}
      </section>

      {/* Quick Actions Skeleton */}
      <section className="mb-8">
        <Skeleton className="h-7 w-1/4 mb-6" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white border-2 border-[#E5E7EB] rounded-xl p-6">
              <Skeleton className="h-6 w-6 ml-auto mb-4" />
              <Skeleton className="h-6 w-3/4 mb-2" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3 mt-1" />
            </div>
          ))}
        </div>
      </section>

      {/* Charts Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-xl p-5 shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
          <Skeleton className="h-7 w-1/3 mb-4" />
          <Skeleton className="h-64 w-full" />
        </div>
        <div className="bg-white rounded-xl p-5 shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
          <Skeleton className="h-7 w-1/3 mb-4" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>

      {/* Recent Activity Skeleton */}
      <div className="bg-white rounded-xl p-6 shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
        <Skeleton className="h-7 w-1/4 mb-4" />
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex items-start space-x-3">
              <Skeleton className="h-5 w-5 mt-1 rounded-full" />
              <div className="w-full">
                <Skeleton className="h-5 w-1/3 mb-1" />
                <Skeleton className="h-4 w-2/3 mb-1" />
                <Skeleton className="h-3 w-1/4" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}