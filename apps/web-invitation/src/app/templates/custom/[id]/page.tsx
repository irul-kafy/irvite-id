import { notFound } from 'next/navigation';
import { fetchPublishedTemplate } from '@/api/client';
import { buildPreviewData } from '@/preview/preview-sample-data';
import GenericTheme from '@/renderers/themes/generic';

export const dynamic = 'force-dynamic';

export default async function PackageDemoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const template = await fetchPublishedTemplate(id);
  if (!template) notFound();
  const sample = buildPreviewData();
  return <GenericTheme data={{ event: sample.event, template, media: [] }} isPreview mode="PUBLIC" />;
}
