import {
  getTemplateDefinition,
  hasTemplateDefinition,
  AETHERIA_DEFINITION,
} from './template-definition.registry';
import { validateEventContent } from './template-content.validator';

describe('AETHERIA TemplateDefinition & Validation', () => {
  describe('Definition Registration & Structure', () => {
    it('should be registered with themeCode AETHERIA and schemaVersion 1', () => {
      expect(hasTemplateDefinition('AETHERIA')).toBe(true);
      expect(AETHERIA_DEFINITION).toBeDefined();
      const def = getTemplateDefinition('AETHERIA');
      expect(def).toBeDefined();
      expect(def?.themeCode).toBe('AETHERIA');
      expect(def?.schemaVersion).toBe(1);
    });

    it('should declare exact approved contentFields and constraints', () => {
      const def = getTemplateDefinition('AETHERIA')!;
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

  describe('validateEventContent for AETHERIA', () => {
    it('accepts valid minimal content', () => {
      const content = {
        partnerOneName: 'Lyra',
        partnerTwoName: 'Elian',
        timeZone: 'Asia/Jakarta',
      };
      const validated = validateEventContent(content, 'AETHERIA')!;
      expect(validated.partnerOneName).toBe('Lyra');
      expect(validated.partnerTwoName).toBe('Elian');
      expect(validated.timeZone).toBe('Asia/Jakarta');
    });

    it('accepts full content with ceremonies, story, and giftAccounts', () => {
      const content = {
        partnerOneName: 'Lyra',
        partnerTwoName: 'Elian',
        partnerOneFullName: 'Lyra Adeline',
        partnerTwoFullName: 'Elian Mahendra',
        partnerOneFamily: 'Putri dari Bapak Arya Pranata & Ibu Laras Kirana',
        partnerTwoFamily: 'Putra dari Bapak Surya Mahendra & Ibu Maya Andriani',
        timeZone: 'Asia/Jakarta',
        openingText: 'Di bawah langit yang sama...',
        statement: 'Di dunia seluas apa pun...',
        prayer: 'Ya Tuhan, jadikan perjalanan ini...',
        prayerSource: 'Sebuah doa untuk perjalanan seumur hidup',
        closingMessage: 'Cerita ini menjadi lebih indah...',
        ceremonies: [
          {
            title: 'Pemberkatan',
            startDateTime: '2027-06-20T16:00',
            venue: 'The Glasshouse',
            address: 'Bandung',
          },
        ],
        story: [
          {
            year: '2022',
            title: 'Dua orbit bertemu',
            description: 'Sebuah pertemuan sederhana...',
          },
        ],
        giftAccounts: [
          {
            bankName: 'BCA',
            accountNumber: '1234567890',
            accountHolder: 'Lyra Adeline',
          },
        ],
      };
      const validated = validateEventContent(content, 'AETHERIA')!;
      expect(validated.partnerOneFullName).toBe('Lyra Adeline');
      expect((validated.ceremonies as any[]).length).toBe(1);
      expect((validated.story as any[]).length).toBe(1);
      expect((validated.giftAccounts as any[]).length).toBe(1);
    });
  });
});
