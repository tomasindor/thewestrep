import { CartHeaderButton } from "@/components/cart/cart-header-button";
import { PublicHeader } from "@/components/layout/public-header";
import { siteConfig } from "@/lib/site";
import { compactGhostCtaClassName } from "@/lib/ui";

interface CatalogHeaderProps {
  whatsappMessage: string;
  ctaLabel?: string;
}

export function CatalogHeader({ whatsappMessage, ctaLabel = "Consultar por WhatsApp" }: CatalogHeaderProps) {
  return (
    <PublicHeader
      actions={(
        <>
          <CartHeaderButton />
          <a
            href={`${siteConfig.whatsappUrl}${encodeURIComponent(whatsappMessage)}`}
            target="_blank"
            rel="noreferrer"
            className={compactGhostCtaClassName}
          >
            {ctaLabel}
          </a>
        </>
      )}
    />
  );
}
