import type { CSSProperties, ReactNode } from "react";
import type { ImageAsset } from "../types";
import s from "../InvitationTemplate.module.css";
import { Flowers, Lace } from "./Decor";

export function safeUrl(url?: string): string | undefined {
  if (!url) return undefined;
  try {
    const parsed = new URL(url);
    return ["https:", "http:"].includes(parsed.protocol)
      ? parsed.href
      : undefined;
  } catch {
    return undefined;
  }
}
export function safeAsset(src?: string): string | undefined {
  if (!src) return undefined;
  if (/^blob:https?:\/\//.test(src)) return src;
  if (/^\/(?!\/)/.test(src) || /^\.\.?\//.test(src)) return src;
  return safeUrl(src);
}
export function Photo({
  image,
  className,
  eager = false,
}: {
  image?: ImageAsset;
  className?: string;
  eager?: boolean;
}) {
  const src = safeAsset(image?.src);
  if (!src || !image) return null;
  return (
    <img
      className={className}
      src={src}
      alt={image.alt}
      loading={eager ? "eager" : "lazy"}
      decoding="async"
      style={{
        objectPosition: image.position,
        transform: image.zoom
          ? `scale(${Math.max(1, Math.min(4, image.zoom))})`
          : undefined,
        transformOrigin: image.position,
      }}
    />
  );
}
export function Flourish() {
  return (
    <span className={s.flourish} aria-hidden="true">
      ❧
    </span>
  );
}
export function Heading({
  eyebrow,
  children,
  description,
}: {
  eyebrow: string;
  children: ReactNode;
  description?: string;
}) {
  return (
    <header className={s.heading} data-reveal="heading">
      <span className={s.eyebrow}>{eyebrow}</span>
      <h2>{children}</h2>
      <Flourish />
      {description && <p>{description}</p>}
    </header>
  );
}
export function Section({
  id,
  className = "",
  children,
}: {
  id: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className={`${s.section} ${className}`}>
      <Flowers position="topRight" />
      <Flowers position="bottomLeft" />
      <div className={s.inner}>{children}</div>
      <Lace />
    </section>
  );
}
export function Ornament({ side = "left" }: { side?: "left" | "right" }) {
  return (
    <span
      aria-hidden="true"
      className={`${s.botanical} ${side === "right" ? s.botanicalRight : ""}`}
    />
  );
}
export function delay(index: number): CSSProperties {
  return { "--reveal-delay": `${Math.min(index, 4) * 90}ms` } as CSSProperties;
}
export function paxLimit(personal?: number, general = 2): number {
  const n = personal ?? general;
  return Number.isFinite(n) ? Math.max(1, Math.min(100, Math.floor(n))) : 2;
}
