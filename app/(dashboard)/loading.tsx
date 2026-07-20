export default function DashboardLoading() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="animate-pulse space-y-4 w-full max-w-4xl">
        <div className="h-8 bg-jc-cream/50 rounded w-48" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-28 rounded-sm bg-jc-cream/50" />)}
        </div>
        <div className="h-64 rounded-sm bg-jc-cream/50" />
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map(i => <div key={i} className="h-40 rounded-sm bg-jc-cream/50" />)}
        </div>
      </div>
    </div>
  );
}