import { VELVET_LETTER_DEFINITION } from './velvet-letter.definition';
import { validateEventContent } from './template-content.validator';
import { getTemplateDefinition } from './template-definition.registry';

describe('VELVET_LETTER_DEFINITION', () => {
  it('should have exact themeCode and schemaVersion', () => {
    expect(VELVET_LETTER_DEFINITION.themeCode).toBe('VELVET_LETTER');
    expect(VELVET_LETTER_DEFINITION.schemaVersion).toBe(1);
  });

  it('should be retrievable from template-definition registry', () => {
    const def = getTemplateDefinition('VELVET_LETTER');
    expect(def).toBeDefined();
    expect(def?.themeCode).toBe('VELVET_LETTER');
  });

  it('should declare exactly the approved content fields', () => {
    const keys = VELVET_LETTER_DEFINITION.contentFields.map((f) => f.key);
    expect(keys).toEqual([
      'partnerOneName',
      'partnerTwoName',
      'partnerOneFullName',
      'partnerTwoFullName',
      'partnerOneFamily',
      'partnerTwoFamily',
      'timeZone',
      'intro',
      'prayer',
      'closing',
      'giftMessage',
      'ceremonies',
      'giftAccounts',
    ]);
  });

  it('should strictly define required and optional root fields with exact limits', () => {
    const fieldMap = new Map(
      VELVET_LETTER_DEFINITION.contentFields.map((f) => [f.key, f]),
    );

    // Required fields
    expect(fieldMap.get('partnerOneName')?.required).toBe(true);
    expect(fieldMap.get('partnerOneName')?.maxLength).toBe(50);
    expect(fieldMap.get('partnerTwoName')?.required).toBe(true);
    expect(fieldMap.get('partnerTwoName')?.maxLength).toBe(50);
    expect(fieldMap.get('timeZone')?.required).toBe(true);
    expect(fieldMap.get('timeZone')?.type).toBe('select');
    expect(fieldMap.get('timeZone')?.options).toEqual([
      { label: 'WIB', value: 'Asia/Jakarta' },
      { label: 'WITA', value: 'Asia/Makassar' },
      { label: 'WIT', value: 'Asia/Jayapura' },
    ]);

    // Optional fields
    expect(fieldMap.get('partnerOneFullName')?.required).toBeFalsy();
    expect(fieldMap.get('partnerOneFullName')?.maxLength).toBe(100);
    expect(fieldMap.get('partnerTwoFullName')?.required).toBeFalsy();
    expect(fieldMap.get('partnerTwoFullName')?.maxLength).toBe(100);
    expect(fieldMap.get('partnerOneFamily')?.required).toBeFalsy();
    expect(fieldMap.get('partnerOneFamily')?.maxLength).toBe(300);
    expect(fieldMap.get('partnerTwoFamily')?.required).toBeFalsy();
    expect(fieldMap.get('partnerTwoFamily')?.maxLength).toBe(300);
    expect(fieldMap.get('intro')?.required).toBeFalsy();
    expect(fieldMap.get('intro')?.maxLength).toBe(1500);
    expect(fieldMap.get('prayer')?.required).toBeFalsy();
    expect(fieldMap.get('prayer')?.maxLength).toBe(2000);
    expect(fieldMap.get('closing')?.required).toBeFalsy();
    expect(fieldMap.get('closing')?.maxLength).toBe(1200);
    expect(fieldMap.get('giftMessage')?.required).toBeFalsy();
    expect(fieldMap.get('giftMessage')?.maxLength).toBe(1000);
  });

  it('should define ceremonies repeater capped at 2 with optional address and mapsUrl', () => {
    const ceremoniesField = VELVET_LETTER_DEFINITION.contentFields.find(
      (f) => f.key === 'ceremonies',
    );
    expect(ceremoniesField).toBeDefined();
    expect(ceremoniesField?.type).toBe('repeater');
    expect(ceremoniesField?.maxItems).toBe(2);

    const subFields = ceremoniesField?.fields || [];
    const subKeys = subFields.map((f) => f.key);
    expect(subKeys).toEqual([
      'title',
      'startDateTime',
      'endDateTime',
      'venue',
      'address',
      'mapsUrl',
    ]);

    const titleField = subFields.find((f) => f.key === 'title');
    expect(titleField?.required).toBe(true);
    expect(titleField?.maxLength).toBe(60);

    const startField = subFields.find((f) => f.key === 'startDateTime');
    expect(startField?.required).toBe(true);
    expect(startField?.type).toBe('datetime');

    const endField = subFields.find((f) => f.key === 'endDateTime');
    expect(endField?.required).toBeFalsy();
    expect(endField?.type).toBe('datetime');

    const venueField = subFields.find((f) => f.key === 'venue');
    expect(venueField?.required).toBe(true);
    expect(venueField?.maxLength).toBe(150);

    const addressField = subFields.find((f) => f.key === 'address');
    expect(addressField?.required).toBeFalsy();
    expect(addressField?.maxLength).toBe(400);

    const mapsField = subFields.find((f) => f.key === 'mapsUrl');
    expect(mapsField?.required).toBeFalsy();
    expect(mapsField?.type).toBe('url');
    expect(mapsField?.urlPolicy).toBe('google-maps');
    expect(mapsField?.maxLength).toBe(2048);
  });

  it('should define giftAccounts repeater capped at 2 with string accountNumber', () => {
    const giftField = VELVET_LETTER_DEFINITION.contentFields.find(
      (f) => f.key === 'giftAccounts',
    );
    expect(giftField).toBeDefined();
    expect(giftField?.type).toBe('repeater');
    expect(giftField?.maxItems).toBe(2);

    const subFields = giftField?.fields || [];
    const subKeys = subFields.map((f) => f.key);
    expect(subKeys).toEqual(['bankName', 'accountNumber', 'accountHolder']);

    const bankField = subFields.find((f) => f.key === 'bankName');
    expect(bankField?.required).toBe(true);
    expect(bankField?.maxLength).toBe(60);

    const accField = subFields.find((f) => f.key === 'accountNumber');
    expect(accField?.required).toBe(true);
    expect(accField?.type).toBe('text');
    expect(accField?.maxLength).toBe(40);

    const holderField = subFields.find((f) => f.key === 'accountHolder');
    expect(holderField?.required).toBe(true);
    expect(holderField?.maxLength).toBe(100);
  });

  it('should declare exact mediaSlots with partner-one-photo and partner-two-photo', () => {
    const slots = VELVET_LETTER_DEFINITION.mediaSlots;
    const keys = slots.map((s) => s.key);
    expect(keys).toEqual(['partner-one-photo', 'partner-two-photo']);

    for (const slot of slots) {
      expect(slot.mediaType).toBe('PHOTO');
      expect(slot.multiple).toBe(false);
      expect(slot.maxItems).toBe(1);
      expect(slot.maxSizeBytes).toBe(5 * 1024 * 1024);
    }
  });

  it('should validate minimal valid content and reject missing required fields', () => {
    const minimalValid = {
      partnerOneName: 'Nadira',
      partnerTwoName: 'Arga',
      timeZone: 'Asia/Jakarta',
    };

    const result = validateEventContent(minimalValid, 'VELVET_LETTER');
    expect(result).toBeDefined();
    expect(result?.partnerOneName).toBe('Nadira');
    expect(result?.partnerTwoName).toBe('Arga');
    expect(result?.timeZone).toBe('Asia/Jakarta');
    expect(result?._schemaVersion).toBe(1);

    // Missing partnerOneName
    expect(() =>
      validateEventContent(
        { partnerTwoName: 'Arga', timeZone: 'Asia/Jakarta' },
        'VELVET_LETTER',
      ),
    ).toThrow(/partnerOneName is required/);

    // Missing partnerTwoName
    expect(() =>
      validateEventContent(
        { partnerOneName: 'Nadira', timeZone: 'Asia/Jakarta' },
        'VELVET_LETTER',
      ),
    ).toThrow(/partnerTwoName is required/);

    // Invalid timeZone
    expect(() =>
      validateEventContent(
        { ...minimalValid, timeZone: 'America/New_York' },
        'VELVET_LETTER',
      ),
    ).toThrow(/invalid option/);
  });

  it('should reject undeclared prototype and customizer fields', () => {
    const base = {
      partnerOneName: 'Nadira',
      partnerTwoName: 'Arga',
      timeZone: 'Asia/Jakarta',
    };

    const forbiddenFields = [
      'accent',
      'portraitStyle',
      'guest',
      'guestMode',
      'guestInvitationUrl',
      'gallery',
      'story',
      'wishes',
      'music',
      'calendar',
      'bridePhoto',
      'groomPhoto',
    ];

    for (const field of forbiddenFields) {
      expect(() =>
        validateEventContent(
          { ...base, [field]: 'some-value' },
          'VELVET_LETTER',
        ),
      ).toThrow(/Undeclared content field:/);
    }
  });
});
