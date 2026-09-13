import { Prisma } from 'database';

const PUBLIC_FIELDS = [
  'partnerOneName',
  'partnerTwoName',
  'partnerOneParents',
  'partnerTwoParents',
  'openingText',
  'prayerText',
  'closingText',
  'prayerSource',
  'mapsUrl',
  'timeZone',
  'ceremonies',
  'giftTitle',
  'giftAccountName',
  'giftMessage',
];

export function projectEventContent(
  value: Prisma.JsonValue | undefined,
  media: { id: string; type: string }[],
  basePath: string,
) {
  const source =
    value && typeof value === 'object' && !Array.isArray(value) ? value : null;
  const giftId =
    source && typeof source.giftQrMediaId === 'string'
      ? source.giftQrMediaId
      : null;
  const gift = media.find(
    (item) => item.id === giftId && item.type === 'PHOTO',
  );
  const content: Prisma.JsonObject | null = source ? {} : null;
  if (source && content) {
    for (const key of PUBLIC_FIELDS) {
      if (source[key] !== undefined) content[key] = source[key];
    }
  }
  const selected =
    source && Array.isArray(source.galleryMediaIds)
      ? source.galleryMediaIds
      : null;
  return {
    content,
    galleryOrder: new Map<string, number>(
      selected?.flatMap((id, index) =>
        typeof id === 'string' ? [[id, index] as [string, number]] : [],
      ) ?? [],
    ),
    giftQr: gift ? { src: `${basePath}/${gift.id}` } : null,
    galleryMedia: media.filter(
      (item) =>
        item.id !== gift?.id &&
        (item.type !== 'PHOTO' ||
          selected === null ||
          selected.includes(item.id)),
    ),
  };
}

export function projectWishes(
  wishes: {
    wishName: string | null;
    wishMessage: string | null;
    wishedAt: Date | null;
  }[],
) {
  return wishes
    .filter((wish) => wish.wishName && wish.wishMessage && wish.wishedAt)
    .map((wish) => ({
      name: wish.wishName!,
      message: wish.wishMessage!,
      createdAt: wish.wishedAt!.toISOString(),
    }));
}
