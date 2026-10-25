import {
  getTemplateDefinition,
  hasTemplateDefinition,
  OPALINE_NOCTURNE_DEFINITION,
} from './template-definition.registry';
import { validateEventContent } from './template-content.validator';

describe('OPALINE_NOCTURNE TemplateDefinition & Validation', () => {
  describe('Definition Registration & Structure', () => {
    it('should be registered with themeCode OPALINE_NOCTURNE and schemaVersion 1', () => {
      expect(hasTemplateDefinition('OPALINE_NOCTURNE')).toBe(true);
      expect(OPALINE_NOCTURNE_DEFINITION).toBeDefined();
      const def = getTemplateDefinition('OPALINE_NOCTURNE');
      expect(def).toBeDefined();
      expect(def?.themeCode).toBe('OPALINE_NOCTURNE');
      expect(def?.schemaVersion).toBe(1);
    });

    it('should declare exact approved contentFields and constraints', () => {
      const def = getTemplateDefinition('OPALINE_NOCTURNE')!;
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
        'statement',
        'prayer',
        'prayerSource',
        'closingMessage',
        'ceremonies',
        'story',
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

  describe('validateEventContent for OPALINE_NOCTURNE', () => {
    it('accepts valid minimal content', () => {
      const content = {
        partnerOneName: 'Anindya',
        partnerTwoName: 'Rafi',
        timeZone: 'Asia/Jakarta',
      };
      const validated = validateEventContent(content, 'OPALINE_NOCTURNE')!;
      expect(validated.partnerOneName).toBe('Anindya');
      expect(validated.partnerTwoName).toBe('Rafi');
      expect(validated.timeZone).toBe('Asia/Jakarta');
    });

    it('accepts full content with ceremonies, story, and giftAccounts', () => {
      const content = {
        partnerOneName: 'Anindya',
        partnerTwoName: 'Rafi',
        partnerOneFullName: 'Anindya Kirana',
        partnerTwoFullName: 'Rafi Adhitama',
        partnerOneFamily: 'Putri dari Bapak Aditya Pratama & Ibu Ratih Permatasari',
        partnerTwoFamily: 'Putra dari Bapak Hendra Wijaya & Ibu Laras Kusuma',
        timeZone: 'Asia/Jakarta',
        openingText: 'Dengan menyebut nama Allah...',
        statement: 'Dua perjalanan, satu tujuan.',
        prayer: 'Ya Allah, tumbuhkan kasih dalam setiap langkah kami.',
        prayerSource: 'Doa kami untuk awal yang baru',
        closingMessage: 'Kehadiran, doa, dan kasih Anda adalah bagian terindah...',
        ceremonies: [
          {
            title: 'Akad Nikah',
            startDateTime: '2026-12-20T09:00',
            venue: 'Taman Kencana',
            address: 'Bogor',
          },
        ],
        story: [
          {
            year: '2021',
            title: 'Percakapan yang tak selesai',
            description: 'Sebuah pertemuan sederhana...',
          },
        ],
        giftAccounts: [
          {
            bankName: 'BCA',
            accountNumber: '1234567890',
            accountHolder: 'Anindya Kirana',
          },
        ],
      };
      const validated = validateEventContent(content, 'OPALINE_NOCTURNE')!;
      expect(validated.partnerOneFullName).toBe('Anindya Kirana');
      expect((validated.ceremonies as any[]).length).toBe(1);
      expect((validated.story as any[]).length).toBe(1);
      expect((validated.giftAccounts as any[]).length).toBe(1);
    });
  });
});
