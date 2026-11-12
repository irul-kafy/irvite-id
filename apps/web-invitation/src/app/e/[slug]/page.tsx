import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { fetchPublicEvent } from '../../../api/client';
import { RenderTheme } from '../../../renderers/registry';
import { extractPublicRecipientFromSearchParams } from '../../../renderers/mode-gating';
import { buildInvitationMetadata } from '../../../utils/invitation-metadata';

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
      title: 'Event Not Found | IRVITE',
      description: 'Acara pernikahan tidak ditemukan.',
    };
  }

  return buildInvitationMetadata(data, { slug, publicRecipient });
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
