import Image from "next/image";

const uiLogoSrc = "/logo-ui.webp";

type BrandLogoProps = {
  alt?: string;
  className?: string;
  imageClassName?: string;
  priority?: boolean;
  sizes?: string;
};

export function BrandLogo({
  alt = "thewestrep",
  className,
  imageClassName,
  priority = false,
  sizes = "56px",
}: BrandLogoProps) {
  return (
    <div className={`relative ${className ?? ""}`.trim()}>
      <Image
        src={uiLogoSrc}
        alt={alt}
        fill
        unoptimized
        className={`object-contain object-center ${imageClassName ?? ""}`.trim()}
        sizes={sizes}
        priority={priority}
      />
    </div>
  );
}
