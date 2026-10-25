import {
  getTemplateDefinition,
  hasTemplateDefinition,
  RANAH_CINTA_DEFINITION,
} from './template-definition.registry';
import { validateEventContent } from './template-content.validator';

describe('RANAH_CINTA TemplateDefinition & Validation', () => {
  describe('Definition Registration & Structure', () => {
    it('should be registered with themeCode RANAH_CINTA and schemaVersion 1', () => {
      expect(hasTemplateDefinition('RANAH_CINTA')).toBe(true);
      expect(RANAH_CINTA_DEFINITION).toBeDefined();
      const def = getTemplateDefinition('RANAH_CINTA');
      expect(def).toBeDefined();
      expect(def?.themeCode).toBe('RANAH_CINTA');
      expect(def?.schemaVersion).toBe(1);
    });

    it('should declare exact approved contentFields and constraints', () => {
      const def = getTemplateDefinition('RANAH_CINTA')!;
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

  describe('validateEventContent for RANAH_CINTA', () => {
    it('accepts valid minimal content', () => {
      const content = {
        partnerOneName: 'Salma',
        partnerTwoName: 'Fadli',
        timeZone: 'Asia/Jakarta',
      };
      const validated = validateEventContent(content, 'RANAH_CINTA')!;
      expect(validated.partnerOneName).toBe('Salma');
      expect(validated.partnerTwoName).toBe('Fadli');
      expect(validated.timeZone).toBe('Asia/Jakarta');
    });

    it('accepts full content with ceremonies, story, and giftAccounts', () => {
      const content = {
        partnerOneName: 'Salma',
        partnerTwoName: 'Fadli',
        partnerOneFullName: 'Salma Putri Maharani',
        partnerTwoFullName: 'Fadli Aditya Pratama',
        partnerOneFamily: 'Putri dari Bapak Hendra Wijaya dan Ibu Ratna Puspita',
        partnerTwoFamily: 'Putra dari Bapak Bambang Pratama dan Ibu Dewi Lestari',
        timeZone: 'Asia/Jakarta',
        openingText: 'Dengan memohon rahmat dan rida Allah SWT...',
        statement: 'Bertemu dalam cinta, berpulang pada kita.',
        prayer: 'Ya Allah, jadikanlah pernikahan ini...',
        prayerSource: 'Doa Pernikahan',
        closingMessage: 'Terima kasih telah menjadi bagian dari kisah kami...',
        ceremonies: [
          {
            title: 'Akad Nikah',
            startDateTime: '2026-11-22T08:00',
            endDateTime: '2026-11-22T10:00',
            venue: 'Balairung Keluarga',
            address: 'Padang, Sumatera Barat',
            mapsUrl: 'https://maps.google.com/?q=Padang',
          },
        ],
        story: [
          {
            year: '2023',
            title: 'Awal Pertemuan',
            description: 'Berawal dari sebuah langkah di tanah Minang.',
          },
        ],
        giftTitle: 'Tanda Kasih',
        giftMessage: 'Kehadiran dan doa restu Anda adalah hadiah terindah.',
        giftAccounts: [
          {
            bankName: 'BCA',
            accountNumber: '1234567890',
            accountHolder: 'Salma & Fadli',
          },
        ],
      };
      const validated = validateEventContent(content, 'RANAH_CINTA')!;
      expect(validated.partnerOneFullName).toBe('Salma Putri Maharani');
      expect((validated.ceremonies as any[]).length).toBe(1);
      expect((validated.story as any[]).length).toBe(1);
      expect((validated.giftAccounts as any[]).length).toBe(1);
    });
  });
});
