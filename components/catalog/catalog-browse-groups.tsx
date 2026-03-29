import Link from "next/link";

import { SmartImage } from "@/components/ui/smart-image";
import type { CatalogBrowseGroup } from "@/lib/catalog";

interface CatalogBrowseGroupsProps {
  groups: CatalogBrowseGroup[];
}

export function CatalogBrowseGroups({ groups }: CatalogBrowseGroupsProps) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {groups.map((group) => (
        <section
          key={group.id}
          className="space-y-4 rounded-[1.75rem] border border-white/10 bg-white/[0.03] p-5 sm:p-6"
        >
          <div className="space-y-1">
            <p className="text-xs font-medium tracking-[0.3em] text-orange-200/70 uppercase">Atajos</p>
            <h2 className="text-xl font-semibold text-white sm:text-2xl">{group.title}</h2>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {group.options.map((option) => (
              <Link
                key={option.id}
                href={option.href}
                className="group relative min-h-36 overflow-hidden rounded-[1.5rem] border border-white/10 bg-black"
              >
                <SmartImage
                  src={option.image}
                  alt={option.alt}
                  fill
                  className="object-cover transition duration-700 group-hover:scale-105"
                  sizes="(max-width: 1024px) 50vw, 20vw"
                />
                <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.14),rgba(0,0,0,0.86))]" />
                <div className="absolute inset-x-0 bottom-0 space-y-1 p-4">
                  <p className="text-sm font-semibold text-white">{option.label}</p>
                  <p className="text-[11px] tracking-[0.24em] text-white/72 uppercase">
                    {option.count} producto{option.count === 1 ? "" : "s"}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
