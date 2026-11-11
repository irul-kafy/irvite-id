import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { fetchPublicEvent } from '../../../api/client';
import { RenderTheme } from '../../../renderers/registry';
import { cleanInvitationEventTitle } from '../../../renderers/adapter-utils';
import { extractPublicRecipientFromSearchParams } from '../../../renderers/mode-gating';

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}): Promise<Metadata> {
  const { slug } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const publicRecipient = extractPublicRecipientFromSearchParams(resolvedSearchParams);
  const data = await fetchPublicEvent(slug);

  if (!data) {
    return {
      title: 'Event Not Found',
    };
  }

  const cleanTitle = cleanInvitationEventTitle(data.event.title, data.event.title);
  const baseDescription = data.event.description || `Undangan Pernikahan ${cleanTitle}`;

  return {
    title: publicRecipient
      ? `${cleanTitle} — Kepada ${publicRecipient}`
      : `${cleanTitle} - Digital Invitation`,
    description: publicRecipient
      ? `Kepada Yth. ${publicRecipient} — ${baseDescription}`
      : baseDescription,
  };
}

export default async function PublicEventPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { slug } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const publicRecipient = extractPublicRecipientFromSearchParams(resolvedSearchParams);
  const data = await fetchPublicEvent(slug);

  if (!data) {
    notFound();
  }

  const enrichedData = publicRecipient
    ? {
        ...data,
        guest: {
          name: publicRecipient,
          customGreeting: null,
          maxPax: 0,
          isPublicRecipient: true,
        },
      }
    : data;

  return (
    <main>
      <RenderTheme
        themeCode={data.template?.themeCode}
        data={enrichedData}
        uniqueCode=""
        mode="PUBLIC"
      />
    </main>
  );
}
