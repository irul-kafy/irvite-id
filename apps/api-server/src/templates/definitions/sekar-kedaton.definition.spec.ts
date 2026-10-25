import {
  getTemplateDefinition,
  hasTemplateDefinition,
  SEKAR_KEDATON_DEFINITION,
} from './template-definition.registry';
import { validateEventContent } from './template-content.validator';

describe('SEKAR_KEDATON TemplateDefinition & Validation', () => {
  describe('Definition Registration & Structure', () => {
    it('should be registered with themeCode SEKAR_KEDATON and schemaVersion 1', () => {
      expect(hasTemplateDefinition('SEKAR_KEDATON')).toBe(true);
      expect(SEKAR_KEDATON_DEFINITION).toBeDefined();
      const def = getTemplateDefinition('SEKAR_KEDATON');
      expect(def).toBeDefined();
      expect(def?.themeCode).toBe('SEKAR_KEDATON');
      expect(def?.schemaVersion).toBe(1);
    });

    it('should declare exact approved contentFields and constraints', () => {
      const def = getTemplateDefinition('SEKAR_KEDATON')!;
      const keys = def.contentFields.map((f) => f.key);

      expect(keys).toEqual([
        'partnerOneName',
        'partnerTwoName',
        'partnerOneFullName',
        'partnerTwoFullName',
        'partnerOneFamily',
        'partnerTwoFamily',
        'timeZone',
        'intro',
        'quote',
        'prayer',
        'closing',
        'ceremonies',
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

  describe('validateEventContent for SEKAR_KEDATON', () => {
    it('accepts valid minimal content', () => {
      const content = {
        partnerOneName: 'Laras',
        partnerTwoName: 'Bagas',
        timeZone: 'Asia/Jakarta',
      };
      const validated = validateEventContent(content, 'SEKAR_KEDATON')!;
      expect(validated.partnerOneName).toBe('Laras');
      expect(validated.partnerTwoName).toBe('Bagas');
      expect(validated.timeZone).toBe('Asia/Jakarta');
    });

    it('accepts full content with ceremonies and giftAccounts', () => {
      const content = {
        partnerOneName: 'Laras',
        partnerTwoName: 'Bagas',
        partnerOneFullName: 'Laras Ayu Prameswari',
        partnerTwoFullName: 'Bagas Aditya Pradana',
        partnerOneFamily: 'Keluarga Bapak Arya',
        partnerTwoFamily: 'Keluarga Bapak Suryo',
        timeZone: 'Asia/Jakarta',
        intro: 'Teks pembuka adat Jawa',
        quote: 'Kutipan indah',
        prayer: 'Doa restu',
        closing: 'Teks penutup',
        ceremonies: [
          {
            title: 'Akad Nikah',
            startDateTime: '2027-06-20T08:00',
            venue: 'Pendopo',
            address: 'Yogyakarta',
          },
        ],
        giftAccounts: [
          {
            bankName: 'BCA',
            accountNumber: '8830192831',
            accountHolder: 'Laras Ayu',
          },
        ],
      };
      const validated = validateEventContent(content, 'SEKAR_KEDATON')!;
      expect(validated.partnerOneFullName).toBe('Laras Ayu Prameswari');
      expect(Array.isArray(validated.ceremonies)).toBe(true);
      expect(Array.isArray(validated.giftAccounts)).toBe(true);
    });
  });
});
