import { PrismaClient } from 'database';

export interface ApprovedTemplateSeed {
  name: string;
  themeCode: string;
  previewImageUrl: string;
  initialStatus?: 'AVAILABLE' | 'HIDDEN' | 'ARCHIVED';
}

export const APPROVED_TEMPLATE_SEEDS: readonly ApprovedTemplateSeed[] = [
  {
    name: 'Ivory Garden',
    themeCode: 'IVORY_GARDEN',
    previewImageUrl: '/templates/ivory-garden/thumbnail.webp',
    initialStatus: 'AVAILABLE',
  },
  {
    name: 'Serene Garden',
    themeCode: 'SERENE_GARDEN',
    previewImageUrl: '/templates/serene-garden/thumbnail.webp',
    initialStatus: 'AVAILABLE',
  },
  {
    name: 'Sunda Puspa',
    themeCode: 'SUNDA_PUSPA',
    previewImageUrl: '/templates/sunda-puspa/thumbnail.webp',
    initialStatus: 'AVAILABLE',
  },
  {
    name: 'Classic Letter',
    themeCode: 'CLASSIC_LETTER',
    previewImageUrl: '/templates/classic-letter/thumbnail.webp',
    initialStatus: 'AVAILABLE',
  },
  {
    name: 'Velvet Letter',
    themeCode: 'VELVET_LETTER',
    previewImageUrl: '/templates/velvet-letter/thumbnail.webp',
    initialStatus: 'AVAILABLE',
  },
];

export interface SyncResultItem {
  themeCode: string;
  action:
    'CREATED' | 'UPDATED' | 'UNCHANGED' | 'DRY_RUN_CREATE' | 'DRY_RUN_UPDATE';
  templateId?: string;
  name: string;
  previewImageUrl: string;
}

export interface SyncTemplateOptions {
  dryRun?: boolean;
}

/**
 * Idempotently synchronizes approved template identities in the database.
 * - 0 matching records: creates exactly 1 Template record
 * - 1 matching record: updates name/previewImageUrl if changed
 * - >1 matching records: FAILS CLOSED without guessing or destructive cleanup
 */
export async function syncTemplateIdentities(
  prisma: PrismaClient,
  options: SyncTemplateOptions = {},
): Promise<SyncResultItem[]> {
  const { dryRun = false } = options;
  const results: SyncResultItem[] = [];

  for (const target of APPROVED_TEMPLATE_SEEDS) {
    // Current Prisma Template model does NOT have @unique on themeCode.
    // Querying with findMany to detect and prevent duplicates.
    const existing = await prisma.template.findMany({
      where: { themeCode: target.themeCode },
    });

    if (existing.length > 1) {
      throw new Error(
        `FAIL CLOSED: Multiple Template records (${existing.length}) found with themeCode "${target.themeCode}". Duplicate themeCodes must be resolved manually.`,
      );
    }

    if (existing.length === 0) {
      if (dryRun) {
        results.push({
          themeCode: target.themeCode,
          action: 'DRY_RUN_CREATE',
          name: target.name,
          previewImageUrl: target.previewImageUrl,
        });
      } else {
        const created = await prisma.template.create({
          data: {
            name: target.name,
            themeCode: target.themeCode,
            previewImageUrl: target.previewImageUrl,
            status: target.initialStatus ?? 'HIDDEN',
            config: undefined,
          },
        });
        results.push({
          themeCode: target.themeCode,
          action: 'CREATED',
          templateId: created.id,
          name: created.name,
          previewImageUrl: created.previewImageUrl || '',
        });
      }
    } else {
      const record = existing[0];
      const needsUpdate =
        record.name !== target.name ||
        record.previewImageUrl !== target.previewImageUrl;

      if (needsUpdate) {
        if (dryRun) {
          results.push({
            themeCode: target.themeCode,
            action: 'DRY_RUN_UPDATE',
            templateId: record.id,
            name: target.name,
            previewImageUrl: target.previewImageUrl,
          });
        } else {
          const updated = await prisma.template.update({
            where: { id: record.id },
            data: {
              name: target.name,
              previewImageUrl: target.previewImageUrl,
            },
          });
          results.push({
            themeCode: target.themeCode,
            action: 'UPDATED',
            templateId: updated.id,
            name: updated.name,
            previewImageUrl: updated.previewImageUrl || '',
          });
        }
      } else {
        results.push({
          themeCode: target.themeCode,
          action: 'UNCHANGED',
          templateId: record.id,
          name: record.name,
          previewImageUrl: record.previewImageUrl || '',
        });
      }
    }
  }

  return results;
}

export const BUILT_IN_THEME_CODES: ReadonlySet<string> = new Set(
  APPROVED_TEMPLATE_SEEDS.map((s) => s.themeCode),
);

/**
 * Checks if a given themeCode corresponds to an approved built-in template seed.
 */
export function isBuiltInTemplate(
  themeCode: string | null | undefined,
): boolean {
  if (!themeCode || typeof themeCode !== 'string') return false;
  return BUILT_IN_THEME_CODES.has(themeCode.trim().toUpperCase());
}
