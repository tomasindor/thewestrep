"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentProps, MouseEvent } from "react";

type PublicNavLinkProps = Omit<ComponentProps<typeof Link>, "href"> & { href: string };

function isPlainLeftClick(event: MouseEvent<HTMLAnchorElement>) {
  return event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;
}

export function PublicNavLink({ children, href, onClick, ...props }: PublicNavLinkProps) {
  const pathname = usePathname();

  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    onClick?.(event);

    if (event.defaultPrevented || !isPlainLeftClick(event)) {
      return;
    }

    const targetUrl = new URL(href, window.location.origin);
    const targetHash = targetUrl.hash.slice(1);

    if (!targetHash || targetUrl.pathname !== pathname) {
      return;
    }

    const targetElement = document.getElementById(decodeURIComponent(targetHash));

    if (!targetElement) {
      return;
    }

    event.preventDefault();

    const nextUrl = `${targetUrl.pathname}${targetUrl.search}${targetUrl.hash}`;
    const currentUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`;

    if (currentUrl !== nextUrl) {
      window.history.pushState(null, "", nextUrl);
    }

    targetElement.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <Link href={href} onClick={handleClick} {...props}>
      {children}
    </Link>
  );
}
