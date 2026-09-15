import { BadRequestException } from '@nestjs/common';
import {
  getTemplateDefinition,
  hasTemplateDefinition,
  SERENE_GARDEN_DEFINITION,
} from './template-definition.registry';
import { validateEventContent } from './template-content.validator';

describe('SERENE_GARDEN TemplateDefinition & Validation', () => {
  describe('Definition Registration & Structure', () => {
    it('should be registered with themeCode SERENE_GARDEN and schemaVersion 1', () => {
      expect(hasTemplateDefinition('SERENE_GARDEN')).toBe(true);
      expect(SERENE_GARDEN_DEFINITION).toBeDefined();
      const def = getTemplateDefinition('SERENE_GARDEN');
      expect(def).toBeDefined();
      expect(def?.themeCode).toBe('SERENE_GARDEN');
      expect(def?.schemaVersion).toBe(1);
    });

    it('should declare correct contentFields and constraints', () => {
      const def = getTemplateDefinition('SERENE_GARDEN')!;
      const keys = def.contentFields.map((f) => f.key);

      expect(keys).toEqual([
        'partnerOneName',
        'partnerTwoName',
        'partnerOneFullName',
        'partnerTwoFullName',
        'partnerOneParents',
        'partnerTwoParents',
        'openingText',
        'prayerText',
        'closingText',
        'timeZone',
        'ceremonies',
        'giftTitle',
        'giftMessage',
        'giftAccounts',
      ]);

      // Required fields
      const p1 = def.contentFields.find((f) => f.key === 'partnerOneName')!;
      expect(p1.required).toBe(true);
      expect(p1.maxLength).toBe(50);

      const p2 = def.contentFields.find((f) => f.key === 'partnerTwoName')!;
      expect(p2.required).toBe(true);
      expect(p2.maxLength).toBe(50);

      const tz = def.contentFields.find((f) => f.key === 'timeZone')!;
      expect(tz.required).toBe(true);
      expect(tz.type).toBe('select');
      expect(tz.options?.map((o) => o.value)).toEqual([
        'Asia/Jakarta',
        'Asia/Makassar',
        'Asia/Jayapura',
      ]);

      // Optional full names
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

      // Ceremonies repeater
      const ceremonies = def.contentFields.find((f) => f.key === 'ceremonies')!;
      expect(ceremonies.type).toBe('repeater');
      expect(ceremonies.maxItems).toBe(2);
      expect(ceremonies.fields).toBeDefined();
      const ceremonyKeys = ceremonies.fields!.map((f) => f.key);
      expect(ceremonyKeys).toEqual([
        'title',
        'startDateTime',
        'endDateTime',
        'venue',
        'address',
        'mapsUrl',
      ]);

      const startField = ceremonies.fields!.find(
        (f) => f.key === 'startDateTime',
      )!;
      expect(startField.type).toBe('datetime');
      expect(startField.required).toBe(true);

      const endField = ceremonies.fields!.find((f) => f.key === 'endDateTime')!;
      expect(endField.type).toBe('datetime');
      expect(endField.required).toBeFalsy();

      // Gift accounts repeater
      const giftAccounts = def.contentFields.find(
        (f) => f.key === 'giftAccounts',
      )!;
      expect(giftAccounts.type).toBe('repeater');
      expect(giftAccounts.maxItems).toBe(3);
    });

    it('should declare correct mediaSlots with PHOTO only and no gallery/audio/video', () => {
      const def = getTemplateDefinition('SERENE_GARDEN')!;
      const slotKeys = def.mediaSlots.map((s) => s.key);

      expect(slotKeys).toEqual(['partner-one-photo', 'partner-two-photo']);

      for (const slot of def.mediaSlots) {
        expect(slot.mediaType).toBe('PHOTO');
        expect(slot.multiple).toBe(false);
        expect(slot.maxItems).toBe(1);
        expect(slot.maxSizeBytes).toBe(5 * 1024 * 1024);
      }

      // No audio, gallery, or video slots
      expect(slotKeys).not.toContain('bg-music');
      expect(slotKeys).not.toContain('gallery');
      expect(slotKeys).not.toContain('hero');
      expect(slotKeys).not.toContain('video');
      expect(def.mediaSlots.some((s) => s.mediaType === 'AUDIO')).toBe(false);
      expect(def.mediaSlots.some((s) => s.mediaType === 'VIDEO')).toBe(false);
    });
  });

  describe('Content Validation', () => {
    const validContent = {
      partnerOneName: 'Alya',
      partnerTwoName: 'Raka',
      partnerOneFullName: 'Alya Putri Wijaya',
      partnerTwoFullName: 'Raka Pratama Nugraha',
      partnerOneParents: 'Bapak Wijaya & Ibu Siti',
      partnerTwoParents: 'Bapak Nugraha & Ibu Dewi',
      openingText: 'Dengan memohon rahmat dan ridho Allah SWT...',
      prayerText: 'Dan di antara tanda-tanda (kebesaran)-Nya...',
      closingText: 'Merupakan suatu kehormatan dan kebahagiaan bagi kami...',
      timeZone: 'Asia/Jakarta',
      ceremonies: [
        {
          title: 'Akad Nikah',
          startDateTime: '2026-12-20T08:00',
          endDateTime: '2026-12-20T10:00',
          venue: 'Masjid Raya Al-Ikhlas',
          address: 'Jl. Merdeka No. 45, Jakarta Selatan',
          mapsUrl: 'https://maps.app.goo.gl/abcdef123',
        },
        {
          title: 'Resepsi Pernikahan',
          startDateTime: '2026-12-20T11:00',
          endDateTime: '2026-12-20T14:00',
          venue: 'Grand Ballroom Hotel Sentral',
          address: 'Jl. Sudirman Kav. 1, Jakarta Pusat',
        },
      ],
      giftTitle: 'Tanda Kasih',
      giftMessage: 'Doa restu Anda merupakan karunia terindah bagi kami.',
      giftAccounts: [
        {
          bankName: 'BCA',
          accountNumber: '001234567890',
          accountHolderName: 'Alya Putri Wijaya',
        },
        {
          bankName: 'Mandiri',
          accountNumber: '1230009876543',
          accountHolderName: 'Raka Pratama Nugraha',
        },
      ],
    };

    it('should successfully validate and normalize full valid content with schemaVersion 1', () => {
      const normalized = validateEventContent(validContent, 'SERENE_GARDEN');
      expect(normalized).toBeDefined();
      expect(normalized?._schemaVersion).toBe(1);
      expect(normalized?.partnerOneName).toBe('Alya');
      expect(normalized?.partnerTwoName).toBe('Raka');
      expect(normalized?.partnerOneFullName).toBe('Alya Putri Wijaya');
      expect(normalized?.partnerTwoFullName).toBe('Raka Pratama Nugraha');
      expect(normalized?.timeZone).toBe('Asia/Jakarta');
      expect(Array.isArray(normalized?.ceremonies)).toBe(true);
      expect((normalized?.ceremonies as unknown[]).length).toBe(2);

      // Verify string preservation on accountNumber with leading zero
      const accounts = normalized?.giftAccounts as Array<{
        accountNumber: string;
      }>;
      expect(accounts[0].accountNumber).toBe('001234567890');
      expect(typeof accounts[0].accountNumber).toBe('string');
    });

    it('should validate minimal content with only required fields', () => {
      const minimal = {
        partnerOneName: 'Alya',
        partnerTwoName: 'Raka',
        timeZone: 'Asia/Makassar',
      };
      const normalized = validateEventContent(minimal, 'SERENE_GARDEN');
      expect(normalized).toBeDefined();
      expect(normalized?.partnerOneName).toBe('Alya');
      expect(normalized?.partnerTwoName).toBe('Raka');
      expect(normalized?.timeZone).toBe('Asia/Makassar');
      expect(normalized?.partnerOneFullName).toBeUndefined();
    });

    it('should reject missing required short names', () => {
      expect(() => {
        validateEventContent(
          { partnerTwoName: 'Raka', timeZone: 'Asia/Jakarta' },
          'SERENE_GARDEN',
        );
      }).toThrow(BadRequestException);

      expect(() => {
        validateEventContent(
          { partnerOneName: 'Alya', timeZone: 'Asia/Jakarta' },
          'SERENE_GARDEN',
        );
      }).toThrow(BadRequestException);
    });

    it('should reject invalid timeZone outside allowlist', () => {
      expect(() => {
        validateEventContent(
          {
            partnerOneName: 'Alya',
            partnerTwoName: 'Raka',
            timeZone: 'UTC',
          },
          'SERENE_GARDEN',
        );
      }).toThrow(BadRequestException);
    });

    it('should reject ceremony without startDateTime or venue', () => {
      expect(() => {
        validateEventContent(
          {
            ...validContent,
            ceremonies: [
              {
                title: 'Akad Nikah',
                venue: 'Masjid Raya',
              },
            ],
          },
          'SERENE_GARDEN',
        );
      }).toThrow(BadRequestException);
    });

    it('should accept ceremony without optional endDateTime and address', () => {
      const normalized = validateEventContent(
        {
          partnerOneName: 'Alya',
          partnerTwoName: 'Raka',
          timeZone: 'Asia/Jayapura',
          ceremonies: [
            {
              title: 'Akad Nikah',
              startDateTime: '2026-12-20T08:00',
              venue: 'Masjid Raya',
            },
          ],
        },
        'SERENE_GARDEN',
      );
      expect(normalized).toBeDefined();
      const ceremonies = normalized?.ceremonies as Array<{
        startDateTime: string;
        endDateTime?: string;
      }>;
      expect(ceremonies[0].startDateTime).toBe('2026-12-20T08:00');
      expect(ceremonies[0].endDateTime).toBeUndefined();
    });

    it('should reject more than 2 ceremonies', () => {
      expect(() => {
        validateEventContent(
          {
            ...validContent,
            ceremonies: [
              { title: '1', startDateTime: '2026-12-20T08:00', venue: 'V1' },
              { title: '2', startDateTime: '2026-12-20T11:00', venue: 'V2' },
              { title: '3', startDateTime: '2026-12-20T18:00', venue: 'V3' },
            ],
          },
          'SERENE_GARDEN',
        );
      }).toThrow(BadRequestException);
    });

    it('should reject invalid non-Google-Maps URL in ceremonies[].mapsUrl', () => {
      expect(() => {
        validateEventContent(
          {
            ...validContent,
            ceremonies: [
              {
                title: 'Akad',
                startDateTime: '2026-12-20T08:00',
                venue: 'V',
                mapsUrl: 'https://evil.com/phishing',
              },
            ],
          },
          'SERENE_GARDEN',
        );
      }).toThrow(BadRequestException);
    });

    it('should reject prototype-only fields (accent, qrImage, bridePhoto, etc.)', () => {
      expect(() => {
        validateEventContent(
          { ...validContent, accent: '#545e46' },
          'SERENE_GARDEN',
        );
      }).toThrow(/Undeclared content field: accent/);

      expect(() => {
        validateEventContent(
          { ...validContent, qrImage: 'data:image/png;base64,abc' },
          'SERENE_GARDEN',
        );
      }).toThrow(/Undeclared content field: qrImage/);

      expect(() => {
        validateEventContent(
          { ...validContent, bridePhoto: 'data:image/png;base64,abc' },
          'SERENE_GARDEN',
        );
      }).toThrow(/Undeclared content field: bridePhoto/);
    });

    it('should reject undeclared top-level mapsUrl for Serene Garden', () => {
      expect(() => {
        validateEventContent(
          { ...validContent, mapsUrl: 'https://maps.app.goo.gl/abc' },
          'SERENE_GARDEN',
        );
      }).toThrow(/Undeclared content field: mapsUrl/);
    });
  });
});
