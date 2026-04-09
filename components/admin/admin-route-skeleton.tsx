function SkeletonBar({ className }: { className: string }) {
  return <div aria-hidden="true" className={`animate-pulse rounded-full bg-white/8 ${className}`} />;
}

export function AdminRouteSkeleton() {
  return (
    <section className="space-y-6">
      <div className="space-y-3">
        <SkeletonBar className="h-4 w-28" />
        <SkeletonBar className="h-12 w-full max-w-md" />
      </div>

      <div className="rounded-[2rem] border border-white/10 bg-white/[0.03] p-6">
        <div className="space-y-3">
          <SkeletonBar className="h-6 w-40" />
          <SkeletonBar className="h-4 w-full max-w-3xl" />
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-12 animate-pulse rounded-2xl bg-white/6" />
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <article key={index} className="rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-5">
            <div className="grid gap-3 md:grid-cols-2">
              <div className="h-12 animate-pulse rounded-2xl bg-white/6" />
              <div className="h-12 animate-pulse rounded-2xl bg-white/6" />
              <div className="h-12 animate-pulse rounded-2xl bg-white/6" />
              <SkeletonBar className="h-11 w-28" />
            </div>
            <SkeletonBar className="mt-4 h-11 w-24" />
          </article>
        ))}
      </div>
    </section>
  );
}
