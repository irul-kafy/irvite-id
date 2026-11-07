import {
  getTemplateDefinition,
  hasTemplateDefinition,
  ROYAL_VELVET_DEFINITION,
} from './template-definition.registry';
import { validateEventContent } from './template-content.validator';

describe('ROYAL_VELVET TemplateDefinition & Validation', () => {
  describe('Definition Registration & Structure', () => {
    it('should be registered with themeCode ROYAL_VELVET and schemaVersion 1', () => {
      expect(hasTemplateDefinition('ROYAL_VELVET')).toBe(true);
      expect(ROYAL_VELVET_DEFINITION).toBeDefined();
      const def = getTemplateDefinition('ROYAL_VELVET');
      expect(def).toBeDefined();
      expect(def?.themeCode).toBe('ROYAL_VELVET');
      expect(def?.schemaVersion).toBe(1);
    });

    it('should declare exact approved contentFields and constraints', () => {
      const def = getTemplateDefinition('ROYAL_VELVET')!;
      const keys = def.contentFields.map((f) => f.key);

      expect(keys).toEqual([
        'partnerOneName',
        'partnerTwoName',
        'partnerOneFullName',
        'partnerTwoFullName',
        'partnerOneFamily',
        'partnerTwoFamily',
        'timeZone',
        'openingText',
        'quote',
        'statement',
        'prayer',
        'prayerSource',
        'closing',
        'closingMessage',
        'ceremonies',
        'story',
        'giftTitle',
        'giftMessage',
        'giftAccounts',
      ]);

      const p1 = def.contentFields.find((f) => f.key === 'partnerOneName')!;
      expect(p1.required).toBe(true);
      expect(p1.maxLength).toBe(60);

      const p2 = def.contentFields.find((f) => f.key === 'partnerTwoName')!;
      expect(p2.required).toBe(true);
      expect(p2.maxLength).toBe(60);

      const tz = def.contentFields.find((f) => f.key === 'timeZone')!;
      expect(tz.required).toBe(true);
      expect(tz.type).toBe('select');
      expect(tz.options?.map((o) => o.value)).toEqual([
        'Asia/Jakarta',
        'Asia/Makassar',
        'Asia/Jayapura',
      ]);
    });
  });

  describe('validateEventContent for ROYAL_VELVET', () => {
    it('accepts valid minimal content', () => {
      const content = {
        partnerOneName: 'Citra',
        partnerTwoName: 'Galih',
        timeZone: 'Asia/Jakarta',
      };
      const validated = validateEventContent(content, 'ROYAL_VELVET')!;
      expect(validated.partnerOneName).toBe('Citra');
      expect(validated.partnerTwoName).toBe('Galih');
      expect(validated.timeZone).toBe('Asia/Jakarta');
    });

    it('accepts full content with ceremonies, stories, and giftAccounts', () => {
      const content = {
        partnerOneName: 'Citra',
        partnerTwoName: 'Galih',
        partnerOneFullName: 'Lady Citra Kirana, S.Ds.',
        partnerTwoFullName: 'Lord Galih Pratama, S.T.',
        partnerOneFamily:
          'Putri Tercinta dari Keluarga Bapak R. Soedirjo & Ibu Hj. Retno Wulandari',
        partnerTwoFamily:
          'Putra Pertama dari Keluarga Bapak Ir. Bambang Wicaksono & Ibu Hj. Endang Sulastri',
        timeZone: 'Asia/Jakarta',
        openingText:
          'Dengan segala kerendahan hati dan rasa syukur ke hadirat Tuhan Yang Maha Esa...',
        quote: 'Two souls with but a single thought, two hearts that beat as one.',
        prayer:
          'Dan di antara tanda-tanda (kebesaran)-Nya ialah Dia menciptakan pasangan-pasangan untukmu...',
        prayerSource: 'Surah Ar-Rum: 21',
        closing:
          'Merupakan kehormatan dan kebahagiaan bagi kami apabila Bapak/Ibu berkenan hadir...',
        ceremonies: [
          {
            title: 'Holy Matrimony & Akad Kerajaan',
            startDateTime: '2026-10-24T09:00',
            endDateTime: '2026-10-24T11:00',
            venue: 'The Grand Baroque Cathedral',
            address: 'Jl. Kencana Murni No. 18, Menteng, Jakarta Pusat',
            mapsUrl: 'https://maps.google.com/?q=The+Grand+Ballroom',
          },
        ],
        story: [
          {
            year: '2022',
            title: 'Simfoni Awal di Wina',
            description:
              'Pertemuan di bawah gemerlap lampu katedral dalam alunan waltz orkestra.',
          },
        ],
        giftTitle: 'Tanda Kasih & Doa',
        giftMessage:
          'Doa restu Anda merupakan karunia terindah bagi lembaran baru perjalanan hidup kami.',
        giftAccounts: [
          {
            bankName: 'BCA Royal Privilege',
            accountNumber: '8820194821',
            accountHolder: 'Citra Kirana',
          },
        ],
      };
      const validated = validateEventContent(content, 'ROYAL_VELVET')!;
      expect(validated.partnerOneFullName).toBe('Lady Citra Kirana, S.Ds.');
      expect((validated.ceremonies as unknown[]).length).toBe(1);
      expect((validated.story as unknown[]).length).toBe(1);
      expect((validated.giftAccounts as unknown[]).length).toBe(1);
    });
  });
});

