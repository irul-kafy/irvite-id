import {
  getTemplateDefinition,
  hasTemplateDefinition,
  SWARGA_DEWATA_DEFINITION,
} from './template-definition.registry';
import { validateEventContent } from './template-content.validator';

describe('SWARGA_DEWATA TemplateDefinition & Validation', () => {
  describe('Definition Registration & Structure', () => {
    it('should be registered with themeCode SWARGA_DEWATA and schemaVersion 1', () => {
      expect(hasTemplateDefinition('SWARGA_DEWATA')).toBe(true);
      expect(SWARGA_DEWATA_DEFINITION).toBeDefined();
      const def = getTemplateDefinition('SWARGA_DEWATA');
      expect(def).toBeDefined();
      expect(def?.themeCode).toBe('SWARGA_DEWATA');
      expect(def?.schemaVersion).toBe(1);
    });

    it('should declare exact approved contentFields and constraints', () => {
      const def = getTemplateDefinition('SWARGA_DEWATA')!;
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
        'quote',
        'statement',
        'prayer',
        'prayerSource',
        'closing',
        'closingMessage',
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

  describe('validateEventContent for SWARGA_DEWATA', () => {
    it('accepts valid minimal content', () => {
      const content = {
        partnerOneName: 'Ayu',
        partnerTwoName: 'Bagus',
        timeZone: 'Asia/Makassar',
      };
      const validated = validateEventContent(content, 'SWARGA_DEWATA')!;
      expect(validated.partnerOneName).toBe('Ayu');
      expect(validated.partnerTwoName).toBe('Bagus');
      expect(validated.timeZone).toBe('Asia/Makassar');
    });

    it('accepts full content with ceremonies and giftAccounts', () => {
      const content = {
        partnerOneName: 'Ayu',
        partnerTwoName: 'Bagus',
        partnerOneFullName: 'dr. Anak Agung Ayu Saraswati, S.Ked.',
        partnerTwoFullName: 'Tjokorda Gde Bagus Mahendra, M.Ars.',
        partnerOneFamily:
          'Putri Pertama dari Pasangan Anak Agung Gde Rai Dharmaputra & Jero Puspa Kemala Dewi — Puri Agung Ubud',
        partnerTwoFamily:
          'Putra Kedua dari Pasangan Tjokorda Raka Sudarsana & Anak Agung Istri Ratna Ningrum — Puri Agung Semarapura',
        timeZone: 'Asia/Makassar',
        openingGreeting: 'Om Swastyastu • Atas Asung Kertha Wara Nugraha',
        openingText:
          'Atas Asung Kertha Wara Nugraha Ida Sang Hyang Widhi Wasa...',
        quote: 'Ihaiva stam ma vi yaustam...',
        prayer: 'Wahai pasangan suami-istri, semoga kalian tetap bersatu...',
        prayerSource: 'Rgveda X.85.42 • Sloka Pawiwahan',
        closing:
          'Merupakan suatu kehormatan dan kebahagiaan bagi keluarga besar kami...',
        ceremonies: [
          {
            title: 'Upacara Mabyakala & Mejaya-Jaya',
            startDateTime: '2026-10-18T08:00',
            endDateTime: '2026-10-18T11:30',
            venue: 'Bale Gede Pemerajan Agung Puri Ubud',
            address: 'Jl. Raya Ubud No. 88, Gianyar, Bali',
            mapsUrl: 'https://maps.google.com/?q=Puri+Saren+Agung+Ubud+Bali',
          },
        ],
        giftTitle: 'Prada Dana Kasih',
        giftMessage:
          'Kehadiran serta doa restu Bapak/Ibu/Saudara/i merupakan anugerah terindah bagi kami.',
        giftAccounts: [
          {
            bankName: 'BCA',
            accountNumber: '7720918834',
            accountHolder: 'Tjokorda Gde Bagus Mahendra',
          },
        ],
      };
      const validated = validateEventContent(content, 'SWARGA_DEWATA')!;
      expect(validated.partnerOneFullName).toBe(
        'dr. Anak Agung Ayu Saraswati, S.Ked.',
      );
      expect((validated.ceremonies as unknown[]).length).toBe(1);
      expect((validated.giftAccounts as unknown[]).length).toBe(1);
    });
  });
});

