"use client";

import type { ReactNode } from "react";
import { createContext, useContext } from "react";

type HeaderConfig = {
  navItems?: readonly { href: string; label: string }[];
  actions?: ReactNode;
  homeLinkHref?: string;
  homeLinkLabel?: string;
};

const HeaderConfigContext = createContext<HeaderConfig | null>(null);

export function useHeaderConfig(): HeaderConfig | null {
  return useContext(HeaderConfigContext);
}

export function HeaderConfigProvider({
  config,
  children,
}: {
  config: HeaderConfig;
  children: ReactNode;
}) {
  return (
    <HeaderConfigContext.Provider value={config}>
      {children}
    </HeaderConfigContext.Provider>
  );
}
