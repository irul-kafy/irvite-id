import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { fetchPublicEvent } from '../../../api/client';
import { RenderTheme } from '../../../renderers/registry';
import { cleanInvitationEventTitle } from '../../../renderers/adapter-utils';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const data = await fetchPublicEvent(slug);

  if (!data) {
    return {
      title: 'Event Not Found',
    };
  }

  const cleanTitle = cleanInvitationEventTitle(data.event.title, data.event.title);

  return {
    title: `${cleanTitle} - Digital Invitation`,
    description: data.event.description || `You are invited to ${cleanTitle}`,
  };
}

export default async function PublicEventPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const data = await fetchPublicEvent(slug);

  if (!data) {
    notFound();
  }

  return (
    <main>
      <RenderTheme themeCode={data.template?.themeCode} data={data} uniqueCode="" mode="PUBLIC" />
    </main>
  );
}
