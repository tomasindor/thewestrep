import Link from "next/link";

import { Container } from "@/components/ui/container";
import { siteConfig } from "@/lib/site";

export function Hero() {
  return (
    <section className="border-b border-black/5 bg-[radial-gradient(circle_at_top,_rgba(120,53,15,0.08),_transparent_35%),linear-gradient(180deg,_#f8f5f1_0%,_#ffffff_60%)] py-24 sm:py-32">
      <Container className="space-y-10">
        <div className="max-w-3xl space-y-6">
          <span className="inline-flex rounded-full border border-amber-900/15 bg-white/80 px-4 py-1 text-sm font-medium tracking-[0.18em] text-amber-950 uppercase backdrop-blur">
            MVP starter ready for launch
          </span>
          <div className="space-y-4">
            <p className="text-sm font-medium tracking-[0.28em] text-amber-900 uppercase">
              {siteConfig.name}
            </p>
            <h1 className="max-w-2xl text-4xl font-semibold tracking-tight text-stone-950 sm:text-5xl lg:text-6xl">
              A clean storefront foundation for the next phase.
            </h1>
            <p className="max-w-2xl text-lg leading-8 text-stone-600">
              This project is intentionally lean: App Router, TypeScript,
              Tailwind CSS, and a simple structure prepared for future product,
              content, and admin flows.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              href="https://vercel.com/new"
              className="inline-flex items-center justify-center rounded-full bg-stone-950 px-6 py-3 text-sm font-medium text-white transition hover:bg-stone-800"
            >
              Deploy on Vercel
            </Link>
            <Link
              href="https://nextjs.org/docs"
              className="inline-flex items-center justify-center rounded-full border border-stone-300 px-6 py-3 text-sm font-medium text-stone-700 transition hover:border-stone-400 hover:text-stone-950"
            >
              Review docs
            </Link>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {[
            ["app/", "Routes, layouts, metadata, and page entrypoints."],
            ["components/", "Reusable UI and marketing sections."],
            ["lib/", "Shared site config and future helpers or integrations."],
          ].map(([title, description]) => (
            <article
              key={title}
              className="rounded-3xl border border-stone-200 bg-white/80 p-6 shadow-sm backdrop-blur"
            >
              <h2 className="text-base font-semibold text-stone-950">{title}</h2>
              <p className="mt-2 text-sm leading-7 text-stone-600">
                {description}
              </p>
            </article>
          ))}
        </div>
      </Container>
    </section>
  );
}
