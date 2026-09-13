import type { PublicMediaDescriptor } from "../../types/public-invitation";

export const GARDEN_DEFAULTS = {
  openingText:
    "Dengan penuh syukur dan bahagia, kami mengundang Bapak, Ibu, serta sahabat terkasih untuk menjadi bagian dari awal perjalanan kami.",
  prayerText:
    "Ya Allah, berkahilah langkah kami dalam ikatan pernikahan. Tumbuhkan kasih dalam setiap kebersamaan, lapangkan hati untuk saling memahami, dan jadikan rumah kami tempat pulang yang penuh ketenteraman.",
  closingText:
    "Ada kebahagiaan yang terasa lebih utuh saat dibagikan. Terima kasih atas kehadiran, kasih, dan doa baik yang mengiringi langkah baru kami.",
  giftMessage:
    "Kehadiran dan doa restu Anda adalah hadiah terindah. Jika berkenan berbagi tanda kasih, Anda dapat menggunakan QR di bawah ini. Terima kasih atas setiap kebaikan yang diberikan.",
};

/** A maps button can only open Google Maps, never an arbitrary supplied URL. */
export function gardenMapsUrl(
  raw: string | undefined,
  address: string | null | undefined,
): string | null {
  if (raw) {
    try {
      const url = new URL(raw);
      const permitted =
        ((url.hostname === "www.google.com" || url.hostname === "google.com") &&
          /^\/maps(?:\/|$)/.test(url.pathname)) ||
        url.hostname === "maps.google.com" ||
        url.hostname === "maps.app.goo.gl" ||
        (url.hostname === "goo.gl" && /^\/maps(?:\/|$)/.test(url.pathname));
      if (
        url.protocol === "https:" &&
        !url.username &&
        !url.password &&
        !url.port &&
        permitted
      )
        return url.href;
    } catch {
      /* Use the encoded address below. */
    }
  }
  return address?.trim()
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address.trim())}`
    : null;
}

/** Public media descriptors are same-origin API paths, not arbitrary image URLs. */
export function gardenMediaSrc(src: string | undefined): string | undefined {
  if (
    !src ||
    !src.startsWith("/") ||
    src.startsWith("//") ||
    /[\\\u0000-\u0020]/.test(src)
  )
    return undefined;
  return src.startsWith("/api-proxy/") ? src : `/api-proxy${src}`;
}

export function gardenPhotos(
  media: PublicMediaDescriptor[] = [],
  giftSrc?: string,
): PublicMediaDescriptor[] {
  return media
    .filter(
      (item) =>
        item.type === "PHOTO" &&
        item.src !== giftSrc &&
        gardenMediaSrc(item.src),
    )
    .sort((a, b) => a.order - b.order)
    .slice(0, 3);
}

export function gardenCountdown(date: string, now: number): number[] {
  const time = new Date(date).getTime();
  const seconds = Number.isFinite(time)
    ? Math.max(0, Math.floor((time - now) / 1000))
    : 0;
  return [
    Math.floor(seconds / 86400),
    Math.floor(seconds / 3600) % 24,
    Math.floor(seconds / 60) % 60,
    seconds % 60,
  ];
}

export function gardenDate(
  value: string,
  timeZone: string,
  withTime = false,
): string {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "Tanggal akan diumumkan";
  return new Intl.DateTimeFormat(
    "id-ID",
    withTime
      ? { timeZone, hour: "2-digit", minute: "2-digit" }
      : {
          timeZone,
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric",
        },
  ).format(date);
}
