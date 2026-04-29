"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentProps, MouseEvent } from "react";

import { computeAnchorScrollTop } from "@/lib/navigation/public-anchor-scroll";

type PublicNavLinkProps = Omit<ComponentProps<typeof Link>, "href"> & { href: string };

function isPlainLeftClick(event: MouseEvent<HTMLAnchorElement>) {
  return event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;
}

function getStickyHeaderHeightPx() {
  const header = document.querySelector<HTMLElement>("[data-public-header]");
  return header?.getBoundingClientRect().height ?? 0;
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

    if (targetHash === "top") {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    const top = computeAnchorScrollTop({
      currentScrollYPx: window.scrollY,
      targetTopRelativeViewportPx: targetElement.getBoundingClientRect().top,
      stickyHeaderHeightPx: getStickyHeaderHeightPx(),
    });

    window.scrollTo({ top, behavior: "smooth" });
  }

  return (
    <Link href={href} onClick={handleClick} {...props}>
      {children}
    </Link>
  );
}
