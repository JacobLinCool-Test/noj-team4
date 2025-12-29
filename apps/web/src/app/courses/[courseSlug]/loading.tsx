export default function CourseLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Hero Skeleton */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#003865] via-[#005a9e] to-[#0a7bc4]" />
        <div className="relative px-4 py-10 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-5xl">
            <div className="h-10 w-2/3 rounded-lg bg-white/20 skeleton-shimmer" />
            <div className="mt-3 h-5 w-48 rounded bg-white/10 skeleton-shimmer" />
            <div className="mt-5 flex gap-3">
              <div className="h-8 w-24 rounded-full bg-white/10 skeleton-shimmer" />
              <div className="h-8 w-20 rounded-full bg-white/10 skeleton-shimmer" />
            </div>
          </div>
        </div>
      </div>
      {/* Tabs Skeleton */}
      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="flex gap-6 py-3">
            <div className="h-5 w-16 rounded bg-slate-200 skeleton-shimmer" />
            <div className="h-5 w-16 rounded bg-slate-200 skeleton-shimmer" />
            <div className="h-5 w-16 rounded bg-slate-200 skeleton-shimmer" />
            <div className="h-5 w-16 rounded bg-slate-200 skeleton-shimmer" />
          </div>
        </div>
      </div>
      {/* Content Skeleton */}
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="h-32 rounded-2xl bg-white shadow-sm border border-slate-100 skeleton-shimmer" />
          <div className="h-32 rounded-2xl bg-white shadow-sm border border-slate-100 skeleton-shimmer" />
          <div className="h-32 rounded-2xl bg-white shadow-sm border border-slate-100 skeleton-shimmer" />
          <div className="h-32 rounded-2xl bg-white shadow-sm border border-slate-100 skeleton-shimmer" />
        </div>
      </div>
    </div>
  );
}
