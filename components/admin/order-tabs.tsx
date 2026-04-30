"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";

interface OrderTabsProps {
  counts: { all: number; pending: number; paid: number };
  activeTab: string;
}

export function OrderTabs({ counts, activeTab }: OrderTabsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function setTab(tab: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (tab === "all") {
      params.delete("tab");
    } else {
      params.set("tab", tab);
    }
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  const tabs = [
    { key: "all", label: "Todos", count: counts.all },
    { key: "pending", label: "Pendientes", count: counts.pending },
    { key: "paid", label: "Pagados", count: counts.paid },
  ];

  return (
    <div className="flex flex-wrap gap-2">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.key;
        return (
          <button
            key={tab.key}
            onClick={() => setTab(tab.key)}
            className={`rounded-full px-4 py-2 text-sm font-medium transition ${
              isActive
                ? "border border-white/20 bg-white/10 text-white"
                : "text-slate-400 hover:bg-white/5 hover:text-white"
            }`}
          >
            {tab.label} <span className="text-slate-500">({tab.count})</span>
          </button>
        );
      })}
    </div>
  );
}
