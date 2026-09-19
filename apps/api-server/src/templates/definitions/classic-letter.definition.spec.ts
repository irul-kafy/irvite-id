import { BadRequestException } from '@nestjs/common';
import {
  getTemplateDefinition,
  hasTemplateDefinition,
  CLASSIC_LETTER_DEFINITION,
} from './template-definition.registry';
import { validateEventContent } from './template-content.validator';

describe('CLASSIC_LETTER TemplateDefinition & Validation', () => {
  describe('Definition Registration & Structure', () => {
    it('should be registered with themeCode CLASSIC_LETTER and schemaVersion 1', () => {
      expect(hasTemplateDefinition('CLASSIC_LETTER')).toBe(true);
      expect(CLASSIC_LETTER_DEFINITION).toBeDefined();
      const def = getTemplateDefinition('CLASSIC_LETTER');
      expect(def).toBeDefined();
      expect(def?.themeCode).toBe('CLASSIC_LETTER');
      expect(def?.schemaVersion).toBe(1);
    });

    it('should declare exact approved contentFields and constraints', () => {
      const def = getTemplateDefinition('CLASSIC_LETTER')!;
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

      // Required root fields
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

      // Optional root fields
      const p1Full = def.contentFields.find(
        (f) => f.key === 'partnerOneFullName',
      )!;
      expect(p1Full.required).toBeFalsy();
      expect(p1Full.maxLength).toBe(120);

      const p2Full = def.contentFields.find(
        (f) => f.key === 'partnerTwoFullName',
      )!;
      expect(p2Full.required).toBeFalsy();
      expect(p2Full.maxLength).toBe(120);

      const p1Fam = def.contentFields.find(
        (f) => f.key === 'partnerOneFamily',
      )!;
      expect(p1Fam.required).toBeFalsy();
      expect(p1Fam.maxLength).toBe(300);

      const p2Fam = def.contentFields.find(
        (f) => f.key === 'partnerTwoFamily',
      )!;
      expect(p2Fam.required).toBeFalsy();
      expect(p2Fam.maxLength).toBe(300);

      const intro = def.contentFields.find((f) => f.key === 'intro')!;
      expect(intro.required).toBeFalsy();
      expect(intro.maxLength).toBe(600);

      const quote = def.contentFields.find((f) => f.key === 'quote')!;
      expect(quote.required).toBeFalsy();
      expect(quote.maxLength).toBe(400);

      const prayer = def.contentFields.find((f) => f.key === 'prayer')!;
      expect(prayer.required).toBeFalsy();
      expect(prayer.maxLength).toBe(600);

      const closing = def.contentFields.find((f) => f.key === 'closing')!;
      expect(closing.required).toBeFalsy();
      expect(closing.maxLength).toBe(400);

      // Verify absence of speculative / design control fields
      expect(keys).not.toContain('bgType');
      expect(keys).not.toContain('bgOverlay');
      expect(keys).not.toContain('story');
      expect(keys).not.toContain('wishes');
      expect(keys).not.toContain('calendar');
    });

    it('should declare ceremonies repeater bounded to max 2 items', () => {
      const def = getTemplateDefinition('CLASSIC_LETTER')!;
      const ceremonies = def.contentFields.find((f) => f.key === 'ceremonies')!;
      expect(ceremonies.type).toBe('repeater');
      expect(ceremonies.maxItems).toBe(2);

      const subKeys = ceremonies.fields?.map((f) => f.key);
      expect(subKeys).toEqual([
        'title',
        'startDateTime',
        'endDateTime',
        'venue',
        'address',
        'mapsUrl',
      ]);

      const titleField = ceremonies.fields!.find((f) => f.key === 'title')!;
      expect(titleField.required).toBe(true);
      expect(titleField.maxLength).toBe(80);

      const startField = ceremonies.fields!.find(
        (f) => f.key === 'startDateTime',
      )!;
      expect(startField.required).toBe(true);
      expect(startField.type).toBe('datetime');

      const endField = ceremonies.fields!.find((f) => f.key === 'endDateTime')!;
      expect(endField.required).toBeFalsy();
      expect(endField.type).toBe('datetime');

      const venueField = ceremonies.fields!.find((f) => f.key === 'venue')!;
      expect(venueField.required).toBe(true);
      expect(venueField.maxLength).toBe(150);

      const mapsField = ceremonies.fields!.find((f) => f.key === 'mapsUrl')!;
      expect(mapsField.type).toBe('url');
      expect(mapsField.urlPolicy).toBe('google-maps');
    });

    it('should declare giftAccounts repeater bounded to max 2 items with string accountNumber', () => {
      const def = getTemplateDefinition('CLASSIC_LETTER')!;
      const giftAccounts = def.contentFields.find(
        (f) => f.key === 'giftAccounts',
      )!;
      expect(giftAccounts.type).toBe('repeater');
      expect(giftAccounts.maxItems).toBe(2);

      const subKeys = giftAccounts.fields?.map((f) => f.key);
      expect(subKeys).toEqual(['bankName', 'accountNumber', 'accountHolder']);

      const accNum = giftAccounts.fields!.find(
        (f) => f.key === 'accountNumber',
      )!;
      expect(accNum.type).toBe('text');
      expect(accNum.required).toBe(true);
      expect(accNum.maxLength).toBe(50);
    });

    it('should declare approved mediaSlots with correct types and limits', () => {
      const def = getTemplateDefinition('CLASSIC_LETTER')!;
      expect(def.mediaSlots).toHaveLength(5);

      const slotKeys = def.mediaSlots.map((s) => s.key);
      expect(slotKeys).toEqual([
        'bg-photo',
        'bg-video',
        'bg-poster',
        'couple-photo',
        'gallery',
      ]);

      // bg-photo
      const bgPhoto = def.mediaSlots.find((s) => s.key === 'bg-photo')!;
      expect(bgPhoto.mediaType).toBe('PHOTO');
      expect(bgPhoto.multiple).toBe(false);
      expect(bgPhoto.maxItems).toBe(1);
      expect(bgPhoto.maxSizeBytes).toBe(5 * 1024 * 1024);

      // bg-video (strictly 20 MiB per platform limits)
      const bgVideo = def.mediaSlots.find((s) => s.key === 'bg-video')!;
      expect(bgVideo.mediaType).toBe('VIDEO');
      expect(bgVideo.multiple).toBe(false);
      expect(bgVideo.maxItems).toBe(1);
      expect(bgVideo.maxSizeBytes).toBe(20 * 1024 * 1024);

      // bg-poster
      const bgPoster = def.mediaSlots.find((s) => s.key === 'bg-poster')!;
      expect(bgPoster.mediaType).toBe('PHOTO');
      expect(bgPoster.multiple).toBe(false);
      expect(bgPoster.maxItems).toBe(1);
      expect(bgPoster.maxSizeBytes).toBe(5 * 1024 * 1024);

      // couple-photo
      const couple = def.mediaSlots.find((s) => s.key === 'couple-photo')!;
      expect(couple.mediaType).toBe('PHOTO');
      expect(couple.multiple).toBe(false);
      expect(couple.maxItems).toBe(1);
      expect(couple.maxSizeBytes).toBe(5 * 1024 * 1024);

      // gallery
      const gallery = def.mediaSlots.find((s) => s.key === 'gallery')!;
      expect(gallery.mediaType).toBe('PHOTO');
      expect(gallery.multiple).toBe(true);
      expect(gallery.maxItems).toBe(2);
      expect(gallery.maxSizeBytes).toBe(5 * 1024 * 1024);

      // No bg-music
      expect(slotKeys).not.toContain('bg-music');
    });
  });

  describe('Content Validation with validateEventContent', () => {
    it('validates minimal required content successfully', () => {
      const validMin = {
        partnerOneName: 'Nadira',
        partnerTwoName: 'Arga',
        timeZone: 'Asia/Jakarta',
      };

      const result = validateEventContent(validMin, 'CLASSIC_LETTER');
      expect(result).toBeDefined();
      expect(result?._schemaVersion).toBe(1);
      expect(result?.partnerOneName).toBe('Nadira');
      expect(result?.partnerTwoName).toBe('Arga');
      expect(result?.timeZone).toBe('Asia/Jakarta');
    });

    it('validates comprehensive content successfully including ceremonies and giftAccounts', () => {
      const validFull = {
        partnerOneName: 'Nadira',
        partnerTwoName: 'Arga',
        partnerOneFullName: 'Nadira Putri Maharani',
        partnerTwoFullName: 'Arga Aditya Pratama',
        partnerOneFamily:
          'Putri dari Bapak Hendra Wijaya dan Ibu Ratna Puspita',
        partnerTwoFamily:
          'Putra dari Bapak Bambang Pratama dan Ibu Dewi Lestari',
        timeZone: 'Asia/Jakarta',
        intro: 'Dengan memohon rahmat dan rida Allah SWT...',
        quote: 'Di antara begitu banyak perjalanan...',
        prayer: 'Ya Allah, tumbuhkanlah kasih...',
        closing: 'Terima kasih atas waktu, kehadiran...',
        ceremonies: [
          {
            title: 'Akad Nikah',
            startDateTime: '2026-11-22T08:00:00Z',
            endDateTime: '2026-11-22T10:00:00Z',
            venue: 'Taman Bahagia',
            address: 'Bandung, Jawa Barat',
            mapsUrl: 'https://maps.app.goo.gl/abcdef',
          },
          {
            title: 'Resepsi',
            startDateTime: '2026-11-22T11:00:00Z',
            venue: 'Taman Bahagia',
          },
        ],
        giftAccounts: [
          {
            bankName: 'BCA',
            accountNumber: '0123456789',
            accountHolder: 'Nadira Putri',
          },
        ],
      };

      const result = validateEventContent(validFull, 'CLASSIC_LETTER');
      expect(result).toBeDefined();
      expect(result?._schemaVersion).toBe(1);
      expect(result?.partnerOneFullName).toBe('Nadira Putri Maharani');
      expect(result?.ceremonies).toHaveLength(2);
      expect(result?.giftAccounts).toHaveLength(1);
      // Ensure leading zero in accountNumber is preserved
      const giftAccounts = result?.giftAccounts as Array<{
        accountNumber: string;
      }>;
      expect(giftAccounts[0].accountNumber).toBe('0123456789');
    });

    it('fails closed when required field is missing', () => {
      expect(() =>
        validateEventContent(
          { partnerTwoName: 'Arga', timeZone: 'Asia/Jakarta' },
          'CLASSIC_LETTER',
        ),
      ).toThrow(BadRequestException);

      expect(() =>
        validateEventContent(
          { partnerOneName: 'Nadira', timeZone: 'Asia/Jakarta' },
          'CLASSIC_LETTER',
        ),
      ).toThrow(BadRequestException);

      expect(() =>
        validateEventContent(
          { partnerOneName: 'Nadira', partnerTwoName: 'Arga' },
          'CLASSIC_LETTER',
        ),
      ).toThrow(BadRequestException);
    });

    it('fails closed when timeZone is invalid', () => {
      expect(() =>
        validateEventContent(
          {
            partnerOneName: 'Nadira',
            partnerTwoName: 'Arga',
            timeZone: 'Europe/London',
          },
          'CLASSIC_LETTER',
        ),
      ).toThrow(BadRequestException);
    });

    it('fails closed when undeclared field is passed', () => {
      expect(() =>
        validateEventContent(
          {
            partnerOneName: 'Nadira',
            partnerTwoName: 'Arga',
            timeZone: 'Asia/Jakarta',
            bgType: 'video',
          },
          'CLASSIC_LETTER',
        ),
      ).toThrow(BadRequestException);

      expect(() =>
        validateEventContent(
          {
            partnerOneName: 'Nadira',
            partnerTwoName: 'Arga',
            timeZone: 'Asia/Jakarta',
            bgOverlay: 0.56,
          },
          'CLASSIC_LETTER',
        ),
      ).toThrow(BadRequestException);
    });

    it('fails closed when ceremonies exceeds maxItems 2', () => {
      const tooManyCeremonies = {
        partnerOneName: 'Nadira',
        partnerTwoName: 'Arga',
        timeZone: 'Asia/Jakarta',
        ceremonies: [
          {
            title: 'Acara 1',
            startDateTime: '2026-11-22T08:00:00Z',
            venue: 'Venue 1',
          },
          {
            title: 'Acara 2',
            startDateTime: '2026-11-22T11:00:00Z',
            venue: 'Venue 2',
          },
          {
            title: 'Acara 3',
            startDateTime: '2026-11-22T14:00:00Z',
            venue: 'Venue 3',
          },
        ],
      };

      expect(() =>
        validateEventContent(tooManyCeremonies, 'CLASSIC_LETTER'),
      ).toThrow(BadRequestException);
    });

    it('fails closed when giftAccounts exceeds maxItems 2', () => {
      const tooManyGifts = {
        partnerOneName: 'Nadira',
        partnerTwoName: 'Arga',
        timeZone: 'Asia/Jakarta',
        giftAccounts: [
          {
            bankName: 'Bank 1',
            accountNumber: '111',
            accountHolder: 'Holder 1',
          },
          {
            bankName: 'Bank 2',
            accountNumber: '222',
            accountHolder: 'Holder 2',
          },
          {
            bankName: 'Bank 3',
            accountNumber: '333',
            accountHolder: 'Holder 3',
          },
        ],
      };

      expect(() =>
        validateEventContent(tooManyGifts, 'CLASSIC_LETTER'),
      ).toThrow(BadRequestException);
    });

    it('fails closed when mapsUrl does not conform to Google Maps policy', () => {
      const invalidMaps = {
        partnerOneName: 'Nadira',
        partnerTwoName: 'Arga',
        timeZone: 'Asia/Jakarta',
        ceremonies: [
          {
            title: 'Akad Nikah',
            startDateTime: '2026-11-22T08:00:00Z',
            venue: 'Taman Bahagia',
            mapsUrl: 'https://evil.com/phishing',
          },
        ],
      };

      expect(() => validateEventContent(invalidMaps, 'CLASSIC_LETTER')).toThrow(
        BadRequestException,
      );
    });
  });
});
