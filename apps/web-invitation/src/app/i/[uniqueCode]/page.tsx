import { fetchPublicInvitation } from '../../../api/client';
import { RenderTheme } from '../../../renderers/registry';
import { notFound } from 'next/navigation';
import QRDisplay from '../../../components/QRDisplay';
import { getCanonicalInvitationUrl } from '../../../utils/url';

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
    <>
      <RenderTheme themeCode={data.template?.themeCode} data={data} uniqueCode={uniqueCode} mode="PERSONAL" />
      {canonicalUrl && <QRDisplay canonicalUrl={canonicalUrl} />}
    </>
  );
}
