"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type AccountMenuProps = {
  greeting: string;
  isLoggedIn: boolean;
};

function AccountIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4 shrink-0">
      <path
        fill="currentColor"
        d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Zm0 2c-3.87 0-7 2.24-7 5v1h14v-1c0-2.76-3.13-5-7-5Z"
      />
    </svg>
  );
}

const menuLinkClassName =
  "flex min-h-11 items-center rounded-[1rem] border border-white/8 bg-black/20 px-4 py-3 text-sm text-slate-200 transition hover:border-[rgba(210,138,163,0.34)] hover:text-white";

export function AccountMenu({ greeting, isLoggedIn }: AccountMenuProps) {
  const pathname = usePathname();
  const items = isLoggedIn
    ? [
        { href: "/profile", label: "Perfil" },
        { href: "/historial", label: "Historial" },
      ]
    : [{ href: "/login", label: "Iniciá sesión" }];

  return (
    <details className="group relative">
      <summary
        aria-label={isLoggedIn ? "Abrir tu cuenta customer" : "Abrir acceso customer"}
        className="flex min-h-11 cursor-pointer list-none items-center justify-center rounded-full border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.07),rgba(255,255,255,0.03))] px-2.5 py-2 text-[#f4d7e0] shadow-[0_12px_34px_rgba(0,0,0,0.22)] transition marker:hidden hover:border-[rgba(210,138,163,0.34)] hover:text-white [&::-webkit-details-marker]:hidden"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-black/30">
          <AccountIcon />
        </span>
        <span className="sr-only">{isLoggedIn ? greeting : "Iniciá sesión"}</span>
      </summary>

      <div className="absolute right-0 top-[calc(100%+0.8rem)] hidden w-[min(18rem,calc(100vw-2rem))] overflow-hidden rounded-[1.6rem] border border-white/10 bg-[linear-gradient(180deg,rgba(12,15,23,0.98),rgba(6,7,11,0.98))] p-3 shadow-[0_24px_60px_rgba(0,0,0,0.42)] group-open:block">
        {isLoggedIn ? (
          <div className="rounded-[1.2rem] border border-white/8 bg-white/[0.04] px-4 py-3">
            <p className="text-[11px] font-medium uppercase tracking-[0.24em] text-[#f1d2dc]/72">Cuenta</p>
            <p className="mt-2 text-sm font-semibold text-white">{greeting}</p>
          </div>
        ) : null}

        <div className="mt-3 space-y-2">
          {items.map((item) => {
            const isCurrent = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`${menuLinkClassName} ${isCurrent ? "border-[rgba(210,138,163,0.28)] bg-[rgba(210,138,163,0.1)] text-white" : ""}`}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>
    </details>
  );
}
