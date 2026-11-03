import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import {
  getCatalogTemplateBySlug,
} from '../../../../catalog';
import { getDemoFixture } from '../../../../demo';
import {
  isTemplateProductionActivated,
  RenderTheme,
} from '../../../../renderers/registry';
import { fetchPublicTemplateAvailability } from '../../../../api/client';
import { TemplateCustomizerStudio } from '../../../../components/template-customizer-studio';

interface DemoPageProps {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{ admin?: string; previewOnly?: string; embed?: string }>;
}

export async function generateMetadata({
  params,
}: DemoPageProps): Promise<Metadata> {
  const { slug } = await params;
  const catalogItem = getCatalogTemplateBySlug(slug);

  if (!catalogItem) {
    return {
      title: 'Template Not Found | IRVITE',
    };
  }

  const availability = await fetchPublicTemplateAvailability();
  const matched = availability?.find(
    (a) => a.themeCode?.trim().toUpperCase() === catalogItem.themeCode.trim().toUpperCase(),
  );

  if (!matched || matched.status !== 'AVAILABLE') {
    return {
      title: 'Template Not Found | IRVITE',
    };
  }

  return {
    title: `${catalogItem.displayName} — Live Demo & Simulasi | IRVITE`,
    description: catalogItem.shortDescription,
  };
}

export default async function TemplateDemoPage({ params, searchParams }: DemoPageProps) {
  const { slug } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const isEmbed = resolvedSearchParams.embed === 'true' || resolvedSearchParams.embed === '1';
  const isAdmin = resolvedSearchParams.admin === 'true' || resolvedSearchParams.admin === '1' || resolvedSearchParams.previewOnly === 'true';

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

  if (isEmbed) {
    return (
      <main style={{ minHeight: '100vh', background: 'transparent' }}>
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

  return (
    <main>
      <TemplateCustomizerStudio
        themeCode={catalogItem.themeCode}
        templateSlug={catalogItem.slug}
        templateDisplayName={catalogItem.displayName}
        templateCategory={catalogItem.category}
        initialFixture={fixture}
        adminMode={isAdmin}
      />
    </main>
  );
}
