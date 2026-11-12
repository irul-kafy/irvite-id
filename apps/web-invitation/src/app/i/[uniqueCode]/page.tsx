import type { Metadata } from 'next';
import { fetchPublicInvitation } from '../../../api/client';
import { RenderTheme } from '../../../renderers/registry';
import { notFound } from 'next/navigation';
import { getCanonicalInvitationUrl } from '../../../utils/url';
import { buildInvitationMetadata } from '../../../utils/invitation-metadata';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ uniqueCode: string }>;
}): Promise<Metadata> {
  const { uniqueCode } = await params;
  const data = await fetchPublicInvitation(uniqueCode);
  return buildInvitationMetadata(data, { uniqueCode });
}

export default async function InvitationPage({
  params,
}: {
  params: Promise<{ uniqueCode: string }>;
}) {
  const { uniqueCode } = await params;
  const data = await fetchPublicInvitation(uniqueCode);

  if (!data) {
    notFound();
  }

  const canonicalUrl = getCanonicalInvitationUrl(uniqueCode);

  return (
    <RenderTheme
      themeCode={data.template?.themeCode}
      data={data}
      uniqueCode={uniqueCode}
      canonicalUrl={canonicalUrl}
      mode="PERSONAL"
    />
  );
}
