import {
  getTemplateDefinition,
  hasTemplateDefinition,
  KUSUMA_PARAHYANGAN_DEFINITION,
} from './template-definition.registry';
import { validateEventContent } from './template-content.validator';

describe('KUSUMA_PARAHYANGAN TemplateDefinition & Validation', () => {
  describe('Definition Registration & Structure', () => {
    it('should be registered with themeCode KUSUMA_PARAHYANGAN and schemaVersion 1', () => {
      expect(hasTemplateDefinition('KUSUMA_PARAHYANGAN')).toBe(true);
      expect(KUSUMA_PARAHYANGAN_DEFINITION).toBeDefined();
      const def = getTemplateDefinition('KUSUMA_PARAHYANGAN');
      expect(def).toBeDefined();
      expect(def?.themeCode).toBe('KUSUMA_PARAHYANGAN');
      expect(def?.schemaVersion).toBe(1);
    });

    it('should declare approved contentFields and constraints for Sundanese wedding', () => {
      const def = getTemplateDefinition('KUSUMA_PARAHYANGAN')!;
      const keys = def.contentFields.map((f) => f.key);

      expect(keys).toEqual([
        'partnerOneName',
        'partnerTwoName',
        'partnerOneFullName',
        'partnerTwoFullName',
        'partnerOneFamily',
        'partnerTwoFamily',
        'timeZone',
        'openingGreeting',
        'openingText',
        'prayer',
        'closing',
        'ceremonies',
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

  describe('validateEventContent for KUSUMA_PARAHYANGAN', () => {
    it('accepts valid minimal content', () => {
      const content = {
        partnerOneName: 'Citra',
        partnerTwoName: 'Galih',
        timeZone: 'Asia/Jakarta',
      };
      const validated = validateEventContent(content, 'KUSUMA_PARAHYANGAN')!;
      expect(validated.partnerOneName).toBe('Citra');
      expect(validated.partnerTwoName).toBe('Galih');
      expect(validated.timeZone).toBe('Asia/Jakarta');
    });

    it('accepts full Sundanese wedding content with ceremonies and giftAccounts', () => {
      const content = {
        partnerOneName: 'Citra',
        partnerTwoName: 'Galih',
        partnerOneFullName: 'Citra Kirana, S.Ds.',
        partnerTwoFullName: 'Galih Prakoso, S.T.',
        partnerOneFamily: 'Putri bungsu ti Bapa Asep Hidayat & Ibu Nining Rustini',
        partnerTwoFamily: 'Putra cikal ti Bapa Dudung Suherman & Ibu Euis Kartini',
        timeZone: 'Asia/Jakarta',
        openingGreeting: 'Silih asih, silih asah, silih asuh',
        openingText: 'Kalayan nyebat asma Allah Nu Maha Welas tur Maha Asih',
        prayer: 'Ka cai jadi saleuwi, ka darat jadi salogak',
        closing: 'Hatur nuhun kana sagala pidua sareng pangrojong',
        ceremonies: [
          {
            title: 'Akad Nikah',
            startDateTime: '2027-07-24T08:00',
            endDateTime: '2027-07-24T10:00',
            venue: 'Bale Asri Pusdai Bandung',
            address: 'Jl. Diponegoro No.63, Citarum, Kec. Bandung Wetan',
            mapsUrl: 'https://maps.google.com',
          },
          {
            title: 'Resepsi & Mapag Panganten',
            startDateTime: '2027-07-24T11:00',
            endDateTime: '2027-07-24T14:00',
            venue: 'Grand Ballroom Pusdai',
            address: 'Jl. Diponegoro No.63, Citarum, Kec. Bandung Wetan',
            mapsUrl: 'https://maps.google.com',
          },
        ],
        giftAccounts: [
          {
            bankName: 'BCA',
            accountNumber: '8830192831',
            accountHolder: 'Citra Kirana',
          },
        ],
      };
      const validated = validateEventContent(content, 'KUSUMA_PARAHYANGAN')!;
      expect(validated.partnerOneName).toBe('Citra');
      expect(validated.partnerTwoName).toBe('Galih');
      expect(Array.isArray(validated.ceremonies)).toBe(true);
      expect((validated.ceremonies as unknown[]).length).toBe(2);
    });
  });
});

