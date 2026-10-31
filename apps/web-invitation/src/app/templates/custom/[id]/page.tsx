import { notFound } from 'next/navigation';
import { fetchPublishedTemplate } from '@/api/client';
import { buildPreviewData } from '@/preview/preview-sample-data';
import { TemplateCustomizerStudio } from '@/components/template-customizer-studio';

export const dynamic = 'force-dynamic';

export default async function PackageDemoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const template = await fetchPublishedTemplate(id);
  if (!template) notFound();
  const sample = buildPreviewData();

  const initialFixture = {
    event: {
      ...sample.event,
      content: {
        partnerOneName: 'Amira',
        partnerTwoName: 'Reza',
        partnerOneFullName: 'Amira Putri Maharani, S.Psi.',
        partnerTwoFullName: 'Reza Aditya Pratama, S.T.',
        partnerOneFamily: 'Putri dari Bapak Hendra Wijaya & Ibu Ratna Sari',
        partnerTwoFamily: 'Putra dari Bapak Surya Pratama & Ibu Dewi Kusuma',
        timeZone: 'Asia/Jakarta',
        openingText: sample.event.description,
        quote: 'Dua jiwa dengan satu pikiran, dua hati yang berdetak sebagai satu.',
        closingMessage:
          'Merupakan suatu kehormatan dan kebahagiaan bagi kami apabila Bapak/Ibu/Saudara/i berkenan hadir dan memberikan doa restu.',
        ceremonies: [
          {
            title: 'Akad Nikah',
            startDateTime: '2026-10-18T08:00',
            endDateTime: '2026-10-18T10:00',
            venue: 'The Grand Ballroom, Hotel Mulia',
            address: 'Jl. Asia Afrika, Senayan, Jakarta Pusat',
          },
          {
            title: 'Resepsi Pernikahan',
            startDateTime: '2026-10-18T11:00',
            endDateTime: '2026-10-18T14:00',
            venue: 'The Grand Ballroom, Hotel Mulia',
            address: 'Jl. Asia Afrika, Senayan, Jakarta Pusat',
          },
        ],
        giftAccounts: [
          {
            bankName: 'BCA',
            accountNumber: '1234567890',
            accountHolder: 'Amira & Reza',
          },
        ],
      },
    },
    template,
    media: [],
    guest: sample.guest,
    invitation: sample.invitation,
    rsvp: sample.rsvp,
  };

  return (
    <main>
      <TemplateCustomizerStudio
        themeCode={template.themeCode || 'GENERIC'}
        templateSlug={`custom-${id}`}
        templateDisplayName={template.name || 'Custom Template'}
        templateCategory={template.themeCode || 'Custom Exclusive'}
        initialFixture={initialFixture}
      />
    </main>
  );
}
