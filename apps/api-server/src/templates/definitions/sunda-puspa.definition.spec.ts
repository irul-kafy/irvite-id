import { BadRequestException } from '@nestjs/common';
import {
  getTemplateDefinition,
  hasTemplateDefinition,
  SUNDA_PUSPA_DEFINITION,
} from './template-definition.registry';
import { validateEventContent } from './template-content.validator';

describe('SUNDA_PUSPA TemplateDefinition & Validation', () => {
  describe('Definition Registration & Structure', () => {
    it('should be registered with themeCode SUNDA_PUSPA and schemaVersion 1', () => {
      expect(hasTemplateDefinition('SUNDA_PUSPA')).toBe(true);
      expect(SUNDA_PUSPA_DEFINITION).toBeDefined();
      const def = getTemplateDefinition('SUNDA_PUSPA');
      expect(def).toBeDefined();
      expect(def?.themeCode).toBe('SUNDA_PUSPA');
      expect(def?.schemaVersion).toBe(1);
    });

    it('should declare correct contentFields and constraints', () => {
      const def = getTemplateDefinition('SUNDA_PUSPA')!;
      const keys = def.contentFields.map((f) => f.key);

      expect(keys).toEqual([
        'partnerOneName',
        'partnerTwoName',
        'partnerOneFullName',
        'partnerTwoFullName',
        'partnerOneParents',
        'partnerTwoParents',
        'coupleGreeting',
        'openingText',
        'prayerText',
        'prayerSource',
        'closingText',
        'timeZone',
        'ceremonies',
        'story',
      ]);

      // Required short names
      const p1 = def.contentFields.find((f) => f.key === 'partnerOneName')!;
      expect(p1.required).toBe(true);
      expect(p1.maxLength).toBe(50);

      const p2 = def.contentFields.find((f) => f.key === 'partnerTwoName')!;
      expect(p2.required).toBe(true);
      expect(p2.maxLength).toBe(50);

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

      // Parents
      const p1Parents = def.contentFields.find(
        (f) => f.key === 'partnerOneParents',
      )!;
      expect(p1Parents.required).toBeFalsy();
      expect(p1Parents.maxLength).toBe(300);

      const p2Parents = def.contentFields.find(
        (f) => f.key === 'partnerTwoParents',
      )!;
      expect(p2Parents.required).toBeFalsy();
      expect(p2Parents.maxLength).toBe(300);

      // Couple greeting (template/event copy from the couple)
      const greeting = def.contentFields.find(
        (f) => f.key === 'coupleGreeting',
      )!;
      expect(greeting.required).toBeFalsy();
      expect(greeting.maxLength).toBe(120);

      // Textareas
      const opening = def.contentFields.find((f) => f.key === 'openingText')!;
      expect(opening.required).toBeFalsy();
      expect(opening.maxLength).toBe(1500);

      const prayer = def.contentFields.find((f) => f.key === 'prayerText')!;
      expect(prayer.required).toBeFalsy();
      expect(prayer.maxLength).toBe(1500);

      const prayerSrc = def.contentFields.find(
        (f) => f.key === 'prayerSource',
      )!;
      expect(prayerSrc.required).toBeFalsy();
      expect(prayerSrc.maxLength).toBe(120);

      const closing = def.contentFields.find((f) => f.key === 'closingText')!;
      expect(closing.required).toBeFalsy();
      expect(closing.maxLength).toBe(1500);

      // Timezone
      const tz = def.contentFields.find((f) => f.key === 'timeZone')!;
      expect(tz.required).toBe(true);
      expect(tz.type).toBe('select');
      expect(tz.options?.map((o) => o.value)).toEqual([
        'Asia/Jakarta',
        'Asia/Makassar',
        'Asia/Jayapura',
      ]);

      // Ceremonies repeater (maxItems 2)
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

      const titleField = ceremonies.fields!.find((f) => f.key === 'title')!;
      expect(titleField.type).toBe('text');
      expect(titleField.required).toBe(true);
      expect(titleField.maxLength).toBe(80);

      const startField = ceremonies.fields!.find(
        (f) => f.key === 'startDateTime',
      )!;
      expect(startField.type).toBe('datetime');
      expect(startField.required).toBe(true);

      const endField = ceremonies.fields!.find((f) => f.key === 'endDateTime')!;
      expect(endField.type).toBe('datetime');
      expect(endField.required).toBeFalsy();

      const venueField = ceremonies.fields!.find((f) => f.key === 'venue')!;
      expect(venueField.type).toBe('text');
      expect(venueField.required).toBe(true);
      expect(venueField.maxLength).toBe(255);

      const addrField = ceremonies.fields!.find((f) => f.key === 'address')!;
      expect(addrField.type).toBe('textarea');
      expect(addrField.required).toBeFalsy();
      expect(addrField.maxLength).toBe(500);

      const mapsField = ceremonies.fields!.find((f) => f.key === 'mapsUrl')!;
      expect(mapsField.type).toBe('url');
      expect(mapsField.urlPolicy).toBe('google-maps');
      expect(mapsField.maxLength).toBe(2048);

      // Story repeater (maxItems 5)
      const story = def.contentFields.find((f) => f.key === 'story')!;
      expect(story.type).toBe('repeater');
      expect(story.maxItems).toBe(5);
      expect(story.fields).toBeDefined();
      const storyKeys = story.fields!.map((f) => f.key);
      expect(storyKeys).toEqual(['year', 'title', 'text']);

      const yearField = story.fields!.find((f) => f.key === 'year')!;
      expect(yearField.type).toBe('text');
      expect(yearField.required).toBe(true);
      expect(yearField.maxLength).toBe(20);

      const sTitleField = story.fields!.find((f) => f.key === 'title')!;
      expect(sTitleField.type).toBe('text');
      expect(sTitleField.required).toBe(true);
      expect(sTitleField.maxLength).toBe(100);

      const sTextField = story.fields!.find((f) => f.key === 'text')!;
      expect(sTextField.type).toBe('textarea');
      expect(sTextField.required).toBe(true);
      expect(sTextField.maxLength).toBe(500);
    });

    it('should declare correct mediaSlots with couple-photo, gallery, and bg-music', () => {
      const def = getTemplateDefinition('SUNDA_PUSPA')!;
      const slotKeys = def.mediaSlots.map((s) => s.key);

      expect(slotKeys).toEqual(['couple-photo', 'gallery', 'bg-music']);

      // couple-photo
      const coupleSlot = def.mediaSlots.find((s) => s.key === 'couple-photo')!;
      expect(coupleSlot.mediaType).toBe('PHOTO');
      expect(coupleSlot.multiple).toBe(false);
      expect(coupleSlot.maxItems).toBe(1);
      expect(coupleSlot.maxSizeBytes).toBe(5 * 1024 * 1024);

      // gallery
      const gallerySlot = def.mediaSlots.find((s) => s.key === 'gallery')!;
      expect(gallerySlot.mediaType).toBe('PHOTO');
      expect(gallerySlot.multiple).toBe(true);
      expect(gallerySlot.maxItems).toBe(2);
      expect(gallerySlot.maxSizeBytes).toBe(5 * 1024 * 1024);

      // bg-music
      const musicSlot = def.mediaSlots.find((s) => s.key === 'bg-music')!;
      expect(musicSlot.mediaType).toBe('AUDIO');
      expect(musicSlot.multiple).toBe(false);
      expect(musicSlot.maxItems).toBe(1);
      expect(musicSlot.maxSizeBytes).toBe(10 * 1024 * 1024);

      // Strictly NO video, qr, or partner-individual slots
      expect(slotKeys).not.toContain('video');
      expect(slotKeys).not.toContain('opening-video');
      expect(slotKeys).not.toContain('qr');
      expect(slotKeys).not.toContain('guest-qr');
      expect(slotKeys).not.toContain('gift-qr');
      expect(slotKeys).not.toContain('partner-one-photo');
      expect(slotKeys).not.toContain('partner-two-photo');
      expect(def.mediaSlots.some((s) => s.mediaType === 'VIDEO')).toBe(false);
    });
  });

  describe('Content Validation', () => {
    const validContent = {
      partnerOneName: 'Galih',
      partnerTwoName: 'Ratna',
      partnerOneFullName: 'Galih Rakasiwi',
      partnerTwoFullName: 'Ratna Kusuma Dewi',
      partnerOneParents: 'Bapak Rakasiwi & Ibu Endang',
      partnerTwoParents: 'Bapak Kusuma & Ibu Sri',
      coupleGreeting: 'Sampurasun. Bersama doa dan restu keluarga...',
      openingText:
        'Maha Suci Allah yang telah menciptakan mahluk-Nya berpasang-pasangan...',
      prayerText:
        'Dan di antara tanda-tanda kekuasaan-Nya ialah Dia menciptakan untukmu isteri-isteri dari jenismu sendiri...',
      prayerSource: 'QS. Ar-Rum: 21',
      closingText:
        'Merupakan suatu kehormatan dan kebahagiaan bagi kami apabila Bapak/Ibu/Saudara/i berkenan hadir...',
      timeZone: 'Asia/Jakarta',
      ceremonies: [
        {
          title: 'Akad Nikah',
          startDateTime: '2026-12-20T08:00',
          endDateTime: '2026-12-20T10:00',
          venue: 'Bale Asri Sasana Budaya',
          address: 'Jl. R.E. Martadinata No. 88, Bandung',
          mapsUrl: 'https://maps.app.goo.gl/abcdef123',
        },
        {
          title: 'Resepsi',
          startDateTime: '2026-12-20T11:00',
          endDateTime: '2026-12-20T14:00',
          venue: 'Bale Asri Sasana Budaya',
          address: 'Jl. R.E. Martadinata No. 88, Bandung',
          mapsUrl: 'https://maps.google.com/?q=Bandung',
        },
      ],
      story: [
        {
          year: '2020',
          title: 'Pertemuan Pertama',
          text: 'Bertemu di kampus tercinta saat kegiatan orientasi mahasiswa baru.',
        },
        {
          year: '2023',
          title: 'Komitmen Bersama',
          text: 'Memutuskan untuk melangkah bersama menuju ikatan yang suci.',
        },
      ],
    };

    it('should successfully validate and normalize full valid content with schemaVersion 1', () => {
      const normalized = validateEventContent(validContent, 'SUNDA_PUSPA');
      expect(normalized).toBeDefined();
      expect(normalized?._schemaVersion).toBe(1);
      expect(normalized?.partnerOneName).toBe('Galih');
      expect(normalized?.partnerTwoName).toBe('Ratna');
      expect(normalized?.partnerOneFullName).toBe('Galih Rakasiwi');
      expect(normalized?.partnerTwoFullName).toBe('Ratna Kusuma Dewi');
      expect(normalized?.coupleGreeting).toBe(
        'Sampurasun. Bersama doa dan restu keluarga...',
      );
      expect(normalized?.timeZone).toBe('Asia/Jakarta');
      expect(Array.isArray(normalized?.ceremonies)).toBe(true);
      expect((normalized?.ceremonies as unknown[]).length).toBe(2);
      expect(Array.isArray(normalized?.story)).toBe(true);
      expect((normalized?.story as unknown[]).length).toBe(2);
    });

    it('should validate minimal content with only required fields', () => {
      const minimal = {
        partnerOneName: 'Galih',
        partnerTwoName: 'Ratna',
        timeZone: 'Asia/Makassar',
      };
      const normalized = validateEventContent(minimal, 'SUNDA_PUSPA');
      expect(normalized).toBeDefined();
      expect(normalized?.partnerOneName).toBe('Galih');
      expect(normalized?.partnerTwoName).toBe('Ratna');
      expect(normalized?.timeZone).toBe('Asia/Makassar');
      expect(normalized?.partnerOneFullName).toBeUndefined();
      expect(normalized?.ceremonies).toBeUndefined();
      expect(normalized?.story).toBeUndefined();
    });

    it('should reject missing required short names', () => {
      expect(() => {
        validateEventContent(
          { partnerTwoName: 'Ratna', timeZone: 'Asia/Jakarta' },
          'SUNDA_PUSPA',
        );
      }).toThrow(BadRequestException);

      expect(() => {
        validateEventContent(
          { partnerOneName: 'Galih', timeZone: 'Asia/Jakarta' },
          'SUNDA_PUSPA',
        );
      }).toThrow(BadRequestException);
    });

    it('should reject invalid timeZone outside allowlist', () => {
      expect(() => {
        validateEventContent(
          {
            partnerOneName: 'Galih',
            partnerTwoName: 'Ratna',
            timeZone: 'Asia/Tokyo',
          },
          'SUNDA_PUSPA',
        );
      }).toThrow(BadRequestException);
    });

    it('should accept valid timezones: Asia/Jakarta, Asia/Makassar, Asia/Jayapura', () => {
      for (const tz of ['Asia/Jakarta', 'Asia/Makassar', 'Asia/Jayapura']) {
        const normalized = validateEventContent(
          { partnerOneName: 'Galih', partnerTwoName: 'Ratna', timeZone: tz },
          'SUNDA_PUSPA',
        );
        expect(normalized?.timeZone).toBe(tz);
      }
    });

    it('should reject ceremony without startDateTime or venue or title', () => {
      expect(() => {
        validateEventContent(
          {
            ...validContent,
            ceremonies: [
              {
                title: 'Akad Nikah',
                venue: 'Bale Asri',
              },
            ],
          },
          'SUNDA_PUSPA',
        );
      }).toThrow(BadRequestException);
    });

    it('should accept ceremony without optional endDateTime, address, and mapsUrl', () => {
      const normalized = validateEventContent(
        {
          partnerOneName: 'Galih',
          partnerTwoName: 'Ratna',
          timeZone: 'Asia/Jayapura',
          ceremonies: [
            {
              title: 'Akad Nikah',
              startDateTime: '2026-12-20T08:00',
              venue: 'Bale Asri',
            },
          ],
        },
        'SUNDA_PUSPA',
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
          'SUNDA_PUSPA',
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
          'SUNDA_PUSPA',
        );
      }).toThrow(BadRequestException);
    });

    it('should accept valid Google Maps URL variants in ceremonies[].mapsUrl', () => {
      const validUrls = [
        'https://maps.google.com/?q=Bandung',
        'https://www.google.com/maps/place/Bandung',
        'https://maps.app.goo.gl/xyz123',
        'https://goo.gl/maps/abc789',
      ];
      for (const url of validUrls) {
        const normalized = validateEventContent(
          {
            partnerOneName: 'Galih',
            partnerTwoName: 'Ratna',
            timeZone: 'Asia/Jakarta',
            ceremonies: [
              {
                title: 'Akad',
                startDateTime: '2026-12-20T08:00',
                venue: 'Venue',
                mapsUrl: url,
              },
            ],
          },
          'SUNDA_PUSPA',
        );
        const ceremonies = normalized?.ceremonies as Array<{
          mapsUrl?: string;
        }>;
        expect(ceremonies[0].mapsUrl).toBe(url);
      }
    });

    it('should validate story repeater up to 5 items', () => {
      const fiveStories = Array.from({ length: 5 }, (_, i) => ({
        year: `202${i}`,
        title: `Story ${i + 1}`,
        text: `Story text description for chapter ${i + 1}.`,
      }));

      const normalized = validateEventContent(
        {
          ...validContent,
          story: fiveStories,
        },
        'SUNDA_PUSPA',
      );
      expect((normalized?.story as unknown[]).length).toBe(5);
    });

    it('should reject more than 5 story items', () => {
      const sixStories = Array.from({ length: 6 }, (_, i) => ({
        year: `202${i}`,
        title: `Story ${i + 1}`,
        text: `Story text ${i + 1}`,
      }));

      expect(() => {
        validateEventContent(
          {
            ...validContent,
            story: sixStories,
          },
          'SUNDA_PUSPA',
        );
      }).toThrow(BadRequestException);
    });

    it('should reject story missing nested required fields (year, title, or text)', () => {
      expect(() => {
        validateEventContent(
          {
            ...validContent,
            story: [{ title: 'Story Without Year', text: 'Some text' }],
          },
          'SUNDA_PUSPA',
        );
      }).toThrow(BadRequestException);

      expect(() => {
        validateEventContent(
          {
            ...validContent,
            story: [{ year: '2020', text: 'Some text' }],
          },
          'SUNDA_PUSPA',
        );
      }).toThrow(BadRequestException);

      expect(() => {
        validateEventContent(
          {
            ...validContent,
            story: [{ year: '2020', title: 'Story' }],
          },
          'SUNDA_PUSPA',
        );
      }).toThrow(BadRequestException);
    });

    it('should reject legacy / prototype / rejected keys', () => {
      const forbiddenKeys = [
        { guest: 'Fake Guest' },
        { uniqueCode: 'ABCDEF' },
        { qr: 'data:image/png;base64,...' },
        { qrValue: 'raw-code' },
        { audioSrc: '/audio/bg.mp3' },
        { couplePhoto: { src: '/img.jpg' } },
        { gallery: [{ src: '/img1.jpg' }] },
        { access: 'active' },
        { dateTime: '2026-12-20T08:00' },
        { mapUrl: 'https://maps.google.com' },
        { bride: { name: 'Ratna' } },
        { groom: { name: 'Galih' } },
        { quote: 'Some quote' },
        { greeting: 'Some greeting' },
        { giftTitle: 'Tanda Kasih' },
        { giftAccounts: [] },
        { openingVideo: 'video.mp4' },
      ];

      for (const item of forbiddenKeys) {
        expect(() => {
          validateEventContent({ ...validContent, ...item }, 'SUNDA_PUSPA');
        }).toThrow(/Undeclared content field/);
      }
    });

    it('should reject ceremony using rejected audit proposal property names dateTime or mapUrl', () => {
      expect(() => {
        validateEventContent(
          {
            ...validContent,
            ceremonies: [
              {
                title: 'Akad',
                dateTime: '2026-12-20T08:00',
                venue: 'Bale Asri',
              },
            ],
          },
          'SUNDA_PUSPA',
        );
      }).toThrow(BadRequestException);

      expect(() => {
        validateEventContent(
          {
            ...validContent,
            ceremonies: [
              {
                title: 'Akad',
                startDateTime: '2026-12-20T08:00',
                venue: 'Bale Asri',
                mapUrl: 'https://maps.google.com',
              },
            ],
          },
          'SUNDA_PUSPA',
        );
      }).toThrow(BadRequestException);
    });
  });
});
