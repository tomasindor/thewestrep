import { Container } from "@/components/ui/container";

function SkeletonBar({ className }: { className: string }) {
  return <div aria-hidden="true" className={`animate-pulse rounded-full bg-white/8 ${className}`} />;
}

function SkeletonStepCard() {
  return (
    <article className="rounded-[1.4rem] border border-white/10 bg-black/20 p-4">
      <SkeletonBar className="h-3 w-10" />
      <SkeletonBar className="mt-3 h-5 w-32" />
      <div className="mt-3 space-y-2">
        <SkeletonBar className="h-4 w-full" />
        <SkeletonBar className="h-4 w-5/6" />
      </div>
    </article>
  );
}

export function ProductDetailSkeleton() {
  return (
    <div className="relative isolate">
      <section className="py-5 sm:py-6 lg:py-8">
        <Container className="space-y-8 sm:space-y-10 lg:space-y-12">
          <div className="flex flex-col gap-2.5 px-1 sm:px-2 lg:flex-row lg:items-center lg:justify-between lg:gap-4">
            <SkeletonBar className="h-4 w-56" />
            <SkeletonBar className="h-4 w-40" />
          </div>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.16fr)_minmax(24rem,0.84fr)] xl:items-start xl:gap-8 2xl:grid-cols-[minmax(0,1.12fr)_minmax(26rem,0.88fr)]">
            <article className="flex w-full min-w-0 rounded-[1.9rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.018))] p-3 shadow-[0_28px_80px_rgba(0,0,0,0.3)] ring-1 ring-white/6 sm:p-4 lg:grid lg:grid-cols-[5.75rem_minmax(0,1fr)] lg:items-stretch lg:gap-4">
              <div className="order-2 aspect-[4/5] min-h-[23rem] animate-pulse rounded-[1.55rem] border border-white/8 bg-white/6 sm:min-h-[31rem] lg:order-2 lg:min-h-[38rem] xl:min-h-[42rem]" />
              <div className="order-1 flex gap-3 overflow-hidden lg:order-1 lg:flex-col">
                {Array.from({ length: 5 }).map((_, index) => (
                  <div key={index} className="aspect-square min-w-[5.25rem] animate-pulse rounded-[1.2rem] border border-white/10 bg-white/[0.03] sm:min-w-[5.75rem] lg:min-h-[5.75rem] lg:min-w-0" />
                ))}
              </div>
            </article>

            <div className="xl:sticky xl:top-28">
              <div className="flex h-full flex-col justify-between gap-5 rounded-[1.9rem] border border-white/10 bg-[linear-gradient(180deg,rgba(19,22,31,0.98),rgba(7,9,14,0.98))] p-5 shadow-[0_28px_80px_rgba(0,0,0,0.34)] ring-1 ring-white/6 sm:p-6">
                <div className="space-y-4">
                  <div className="space-y-3.5">
                    <div className="space-y-2.5">
                      <SkeletonBar className="h-12 w-full max-w-sm sm:h-14" />
                      <SkeletonBar className="h-10 w-36" />
                      <div className="space-y-2 pt-2">
                        <SkeletonBar className="h-4 w-full" />
                        <SkeletonBar className="h-4 w-5/6" />
                        <SkeletonBar className="h-4 w-3/5" />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-[1.6rem] border border-white/10 bg-black/20 p-4 sm:p-5">
                  <SkeletonBar className="h-11 w-full" />
                  <div className="mt-3 space-y-2">
                    <SkeletonBar className="h-4 w-3/4" />
                    <SkeletonBar className="h-4 w-1/2" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <section className="grid gap-4 rounded-[1.9rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.025),rgba(255,255,255,0.012))] p-5 shadow-[0_22px_70px_rgba(0,0,0,0.22)] ring-1 ring-white/6 sm:p-6 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-6">
            <div className="space-y-3 lg:col-span-2">
              <SkeletonBar className="h-4 w-full" />
              <SkeletonBar className="h-4 w-11/12" />
              <SkeletonBar className="h-4 w-4/5" />
            </div>

            <div className="space-y-3">
              <SkeletonBar className="h-4 w-28" />
              <SkeletonBar className="h-10 w-full max-w-md" />
              <div className="space-y-2">
                <SkeletonBar className="h-4 w-full" />
                <SkeletonBar className="h-4 w-5/6" />
                <SkeletonBar className="h-4 w-3/4" />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <SkeletonStepCard key={index} />
              ))}
            </div>
          </section>

          <section className="space-y-8 border-t border-white/8 pt-14 sm:space-y-9 sm:pt-18 lg:pt-24">
            <div className="space-y-3 px-1">
              <SkeletonBar className="h-4 w-28" />
              <SkeletonBar className="h-10 w-full max-w-xl" />
              <SkeletonBar className="h-4 w-full max-w-2xl" />
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
              {Array.from({ length: 5 }).map((_, index) => (
                <div key={index} className="overflow-hidden rounded-[1.8rem] border border-white/10 bg-white/[0.03] shadow-[0_20px_48px_rgba(0,0,0,0.2)]">
                  <div className="aspect-[4/5] animate-pulse bg-white/6" />
                  <div className="space-y-4 p-5 sm:p-6">
                    <SkeletonBar className="h-4 w-24" />
                    <SkeletonBar className="h-6 w-3/4" />
                    <SkeletonBar className="h-4 w-full" />
                    <SkeletonBar className="h-6 w-28" />
                  </div>
                </div>
              ))}
            </div>
          </section>
        </Container>
      </section>
    </div>
  );
}
