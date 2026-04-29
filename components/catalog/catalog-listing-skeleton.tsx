import { Container } from "@/components/ui/container";

function SkeletonBlock({ className }: { className: string }) {
  return <div aria-hidden="true" className={`animate-pulse rounded-full bg-white/8 ${className}`} />;
}

function SkeletonCard() {
  return (
    <div className="overflow-hidden rounded-[1.8rem] border border-white/10 bg-white/[0.03] shadow-[0_20px_48px_rgba(0,0,0,0.2)]">
      <div className="aspect-[4/5] animate-pulse bg-white/6" />
      <div className="space-y-5 p-5 sm:p-6">
        <div className="flex items-center gap-3">
          <SkeletonBlock className="h-3 w-20" />
          <SkeletonBlock className="h-3 w-16" />
        </div>
        <div className="space-y-3">
          <SkeletonBlock className="h-8 w-2/3" />
          <SkeletonBlock className="h-6 w-28" />
          <div className="space-y-2 pt-1">
            <SkeletonBlock className="h-4 w-full" />
            <SkeletonBlock className="h-4 w-5/6" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function CatalogListingSkeleton() {
  return (
    <div className="relative isolate">
      <section className="py-12 sm:py-18">
        <Container className="space-y-8">
          <div className="space-y-4">
            <SkeletonBlock className="h-4 w-32" />
            <div className="space-y-3">
              <SkeletonBlock className="h-14 w-full max-w-3xl" />
              <SkeletonBlock className="h-6 w-full max-w-2xl" />
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <SkeletonBlock className="h-10 w-32" />
            <SkeletonBlock className="h-10 w-32" />
            <SkeletonBlock className="h-10 w-32" />
            <SkeletonBlock className="h-10 w-72" />
          </div>
        </Container>
      </section>

      <Container>
        <section className="pb-6">
          <div className="space-y-6 rounded-[1.75rem] border border-white/10 bg-white/[0.03] p-5 sm:p-6">
            <div className="space-y-3">
              <SkeletonBlock className="h-4 w-24" />
              <SkeletonBlock className="h-5 w-full max-w-xl" />
            </div>

            <div className="grid gap-3 lg:grid-cols-[minmax(0,1.25fr)_minmax(16rem,0.75fr)]">
              <div className="h-12 animate-pulse rounded-[1.1rem] bg-white/6" />
              <div className="h-12 animate-pulse rounded-[1.1rem] bg-white/6" />
            </div>

            <div className="flex flex-wrap gap-2">
              {Array.from({ length: 6 }).map((_, index) => (
                <SkeletonBlock key={index} className="h-10 w-28" />
              ))}
            </div>
          </div>
        </section>
      </Container>

      <section className="py-8 sm:py-10">
        <Container>
          <div className="grid gap-4 sm:gap-5 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {Array.from({ length: 10 }).map((_, index) => (
              <SkeletonCard key={index} />
            ))}
          </div>
        </Container>
      </section>
    </div>
  );
}
