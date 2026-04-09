import type { CSSProperties } from "react";

import Image from "next/image";

import { isCloudinaryAssetUrl } from "@/lib/media/cloudinary";
import { buildRemoteImageProxyUrl, shouldProxyRemoteImage } from "@/lib/media/remote-image-proxy";

type SmartImageProps = {
  src: string;
  alt: string;
  fill?: boolean;
  width?: number;
  height?: number;
  className?: string;
  sizes?: string;
  priority?: boolean;
  style?: CSSProperties;
};

export function resolveSmartImageSrc(src: string) {
  return shouldProxyRemoteImage(src) ? buildRemoteImageProxyUrl(src) : src;
}

export function SmartImage({ src, alt, fill, width, height, className, sizes, priority, style }: SmartImageProps) {
  const resolvedSrc = resolveSmartImageSrc(src);
  const shouldUseProxy = resolvedSrc !== src;
  const isCloudinarySrc = isCloudinaryAssetUrl(resolvedSrc);

  if (shouldUseProxy) {
    if (fill) {
      // eslint-disable-next-line @next/next/no-img-element
      return <img src={resolvedSrc} alt={alt} className={`absolute inset-0 h-full w-full ${className ?? ""}`} style={style} />;
    }

    // eslint-disable-next-line @next/next/no-img-element
    return <img src={resolvedSrc} alt={alt} className={className} width={width} height={height} style={style} />;
  }

  if (resolvedSrc.startsWith("/") || isCloudinarySrc) {
    return (
      <Image
        src={resolvedSrc}
        alt={alt}
        fill={fill}
        width={width}
        height={height}
        className={className}
        sizes={sizes}
        priority={priority}
        style={style}
        unoptimized={isCloudinarySrc}
      />
    );
  }

  if (fill) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={resolvedSrc} alt={alt} className={`absolute inset-0 h-full w-full ${className ?? ""}`} style={style} />;
  }

  // eslint-disable-next-line @next/next/no-img-element
  return <img src={resolvedSrc} alt={alt} className={className} width={width} height={height} style={style} />;
}
