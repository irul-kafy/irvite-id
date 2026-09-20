import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import {
  getCatalogTemplateBySlug,
} from '../../../../catalog';
import { getDemoFixture } from '../../../../demo';
import {
  RenderTheme,
  isTemplateProductionActivated,
} from '../../../../renderers/registry';
import { fetchPublicTemplateAvailability } from '../../../../api/client';

interface DemoPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: DemoPageProps): Promise<Metadata> {
  const { slug } = await params;
  const catalogItem = getCatalogTemplateBySlug(slug);

  if (!catalogItem) {
    return {
      title: 'Template Not Found | IRVITE.ID',
    };
  }

  const availability = await fetchPublicTemplateAvailability();
  const matched = availability?.find(
    (a) => a.themeCode?.trim().toUpperCase() === catalogItem.themeCode.trim().toUpperCase(),
  );

  if (!matched || matched.status !== 'AVAILABLE') {
    return {
      title: 'Template Not Found | IRVITE.ID',
    };
  }

  return {
    title: `${catalogItem.displayName} — Live Demo | IRVITE.ID`,
    description: catalogItem.shortDescription,
  };
}

export default async function TemplateDemoPage({ params }: DemoPageProps) {
  const { slug } = await params;
  const catalogItem = getCatalogTemplateBySlug(slug);

  // Fail closed if slug not in catalog
  if (!catalogItem) {
    notFound();
  }

  // Fail closed if not AVAILABLE in DB lifecycle
  const availability = await fetchPublicTemplateAvailability();
  const matched = availability?.find(
    (a) => a.themeCode?.trim().toUpperCase() === catalogItem.themeCode.trim().toUpperCase(),
  );

  if (!matched || matched.status !== 'AVAILABLE') {
    notFound();
  }

  // Fail closed if theme is not production-activated
  if (!isTemplateProductionActivated(catalogItem.themeCode)) {
    notFound();
  }

  const fixture = getDemoFixture(catalogItem.themeCode);
  if (!fixture) {
    notFound();
  }

  return (
    <main>
      <RenderTheme
        themeCode={catalogItem.themeCode}
        data={fixture}
        uniqueCode=""
        isPreview={true}
        mode="PUBLIC"
      />
    </main>
  );
}
