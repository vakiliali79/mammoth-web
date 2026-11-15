import Image, { type ImageProps } from "next/image";

/**
 * next/image wrapper. Admin uploads (`/media/…`) are already resized and
 * WebP-encoded by sharp at upload time, so they skip the optimizer.
 */
export function SmartImage(props: ImageProps) {
  const unoptimized = typeof props.src === "string" && props.src.startsWith("/media/");
  // eslint-disable-next-line jsx-a11y/alt-text -- alt is passed through props
  return <Image {...props} unoptimized={unoptimized || props.unoptimized} />;
}
