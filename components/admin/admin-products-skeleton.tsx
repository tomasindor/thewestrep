function SkeletonBar({ className }: { className: string }) {
  return <div aria-hidden="true" className={`animate-pulse rounded-full bg-white/8 ${className}`} />;
}

export function AdminProductsSkeleton() {
  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-3">
          <SkeletonBar className="h-4 w-28" />
          <SkeletonBar className="h-12 w-72" />
          <SkeletonBar className="h-5 w-full max-w-2xl" />
        </div>

        <SkeletonBar className="h-11 w-40" />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <article key={index} className="rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-5">
            <SkeletonBar className="h-4 w-24" />
            <SkeletonBar className="mt-4 h-9 w-20" />
          </article>
        ))}
      </div>

      <div className="rounded-[1.75rem] border border-white/10 bg-white/[0.03] p-5 sm:p-6">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1.25fr)_minmax(16rem,0.75fr)]">
          <div className="h-12 animate-pulse rounded-[1.1rem] bg-white/6" />
          <div className="h-12 animate-pulse rounded-[1.1rem] bg-white/6" />
        </div>
      </div>

      <div className="overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.03]">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-white/10 text-left text-sm">
            <thead className="bg-black/25 text-slate-300">
              <tr>
                {Array.from({ length: 7 }).map((_, index) => (
                  <th key={index} className="px-4 py-3">
                    <SkeletonBar className="h-4 w-20" />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {Array.from({ length: 6 }).map((_, rowIndex) => (
                <tr key={rowIndex}>
                  {Array.from({ length: 7 }).map((_, cellIndex) => (
                    <td key={cellIndex} className="px-4 py-4 align-top">
                      <SkeletonBar className={cellIndex === 0 ? "h-5 w-40" : "h-5 w-24"} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
