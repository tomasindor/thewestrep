"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";

import { inputClassName } from "@/lib/ui";

interface SearchSortOption {
  value: string;
  label: string;
}

interface SearchSortToolbarProps {
  searchLabel?: string;
  searchPlaceholder: string;
  sortLabel?: string;
  defaultSortLabel: string;
  searchValue?: string;
  sortValue?: string;
  sortOptions: SearchSortOption[];
  preservedParams?: Record<string, string | undefined>;
  pendingCopy?: string;
}

function buildSearchHref(
  pathname: string,
  preservedParams: Record<string, string | undefined>,
  query: string,
  sort: string,
) {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(preservedParams)) {
    if (value) {
      params.set(key, value);
    }
  }

  if (query) {
    params.set("q", query);
  }

  if (sort) {
    params.set("sort", sort);
  }

  const search = params.toString();

  return search ? `${pathname}?${search}` : pathname;
}

export function SearchSortToolbar({
  searchLabel = "Buscar",
  searchPlaceholder,
  sortLabel = "Ordenar",
  defaultSortLabel,
  searchValue = "",
  sortValue = "",
  sortOptions,
  preservedParams = {},
  pendingCopy = "Actualizando vista...",
}: SearchSortToolbarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const [query, setQuery] = useState(searchValue);
  const [sort, setSort] = useState(sortValue);
  const hasMountedRef = useRef(false);

  useEffect(() => {
    setQuery(searchValue);
  }, [searchValue]);

  useEffect(() => {
    setSort(sortValue);
  }, [sortValue]);

  const navigate = useCallback(
    (nextQuery: string, nextSort: string) => {
      const href = buildSearchHref(pathname, preservedParams, nextQuery.trim(), nextSort);

      startTransition(() => {
        router.replace(href, { scroll: false });
      });
    },
    [pathname, preservedParams, router, startTransition],
  );

  useEffect(() => {
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      return;
    }

    if (query.trim() === searchValue.trim()) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      navigate(query, sort);
    }, 260);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [navigate, query, searchValue, sort]);

  return (
    <div className="space-y-3">
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1.25fr)_minmax(16rem,0.75fr)] lg:items-end">
        <label className="space-y-2">
          <span className="text-[11px] font-medium tracking-[0.28em] text-[#f1d2dc]/72 uppercase">{searchLabel}</span>
          <input
            type="search"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
            }}
            placeholder={searchPlaceholder}
            className={inputClassName}
          />
        </label>

        <label className="space-y-2">
          <span className="text-[11px] font-medium tracking-[0.28em] text-[#f1d2dc]/72 uppercase">{sortLabel}</span>
          <select
            value={sort}
            onChange={(event) => {
              const nextSort = event.target.value;

              setSort(nextSort);
              navigate(query, nextSort);
            }}
            className={inputClassName}
          >
            <option value="">{defaultSortLabel}</option>
            {sortOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div aria-live="polite" className="min-h-5 text-sm text-slate-400">
        {isPending ? (
          <div className="flex items-center gap-2 text-slate-300">
            <span className="h-2 w-2 rounded-full bg-[#f1d2dc] animate-pulse" />
            <span>{pendingCopy}</span>
          </div>
        ) : null}
      </div>
    </div>
  );
}
