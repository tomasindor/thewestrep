import type { ReactNode } from "react";

import { getCustomerProfileById } from "@/lib/auth/customer-profile";
import { getCustomerSession } from "@/lib/auth/session";

import { PublicHeaderClient } from "./public-header-client";

interface PublicHeaderWithDataProps {
  navItems?: readonly { href: string; label: string }[];
  actions?: ReactNode;
  homeLinkLabel?: string;
}

export async function PublicHeaderWithData({
  actions,
  homeLinkLabel,
  navItems,
}: PublicHeaderWithDataProps) {
  const customerSession = await getCustomerSession();
  const isLoggedIn = Boolean(customerSession?.user);
  const customerProfile = customerSession?.user?.id
    ? await getCustomerProfileById(customerSession.user.id).catch(() => null)
    : null;
  const firstName = customerProfile?.name?.trim().split(/\s+/)[0] ?? customerSession?.user?.name?.trim().split(/\s+/)[0];
  const greeting = firstName ? `Hola, ${firstName}` : "Mi cuenta";

  return (
    <PublicHeaderClient
      isLoggedIn={isLoggedIn}
      greeting={greeting}
      navItems={navItems}
      actions={actions}
      homeLinkLabel={homeLinkLabel}
    />
  );
}
