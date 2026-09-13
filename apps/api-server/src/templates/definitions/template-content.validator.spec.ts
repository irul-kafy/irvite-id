import { BadRequestException } from '@nestjs/common';
import {
  validateEventContent,
  MAX_CONTENT_SIZE_BYTES,
} from './template-content.validator';
import { clearCustomTemplateDefinitions } from './template-definition.registry';

describe('template-content.validator', () => {
  afterEach(() => {
    clearCustomTemplateDefinitions();
  });

  describe('null / undefined content', () => {
    it('returns null when content is null or undefined', () => {
      expect(validateEventContent(null, 'IVORY_GARDEN')).toBeNull();
      expect(validateEventContent(undefined, 'IVORY_GARDEN')).toBeNull();
      expect(validateEventContent(null, null)).toBeNull();
    });
  });

  describe('root type validation', () => {
    it('rejects primitive values as root', () => {
      expect(() =>
        validateEventContent('string content', 'IVORY_GARDEN'),
      ).toThrow(BadRequestException);
      expect(() => validateEventContent(12345, 'IVORY_GARDEN')).toThrow(
        BadRequestException,
      );
      expect(() => validateEventContent(true, 'IVORY_GARDEN')).toThrow(
        BadRequestException,
      );
    });

    it('rejects array as root', () => {
      expect(() => validateEventContent(['item1'], 'IVORY_GARDEN')).toThrow(
        BadRequestException,
      );
    });
  });

  describe('prototype pollution prevention', () => {
    it('rejects objects containing __proto__', () => {
      const malicious: unknown = JSON.parse(
        '{"__proto__": {"polluted": true}}',
      );
      expect(() => validateEventContent(malicious, 'IVORY_GARDEN')).toThrow(
        BadRequestException,
      );
    });

    it('rejects nested objects containing constructor', () => {
      const malicious = {
        partnerOneName: 'Test',
        nested: { constructor: 'bad' },
      };
      expect(() => validateEventContent(malicious, 'IVORY_GARDEN')).toThrow(
        BadRequestException,
      );
    });
  });

  describe('content size limits', () => {
    it('rejects content larger than 64 KiB', () => {
      const hugeContent = {
        partnerOneName: 'A'.repeat(MAX_CONTENT_SIZE_BYTES + 100),
      };
      expect(() => validateEventContent(hugeContent, 'IVORY_GARDEN')).toThrow(
        'Content exceeds maximum allowed size of 64 KiB',
      );
    });
  });

  describe('undeclared fields and _templateKey', () => {
    it('rejects unknown fields with HTTP 400 (does not silently strip)', () => {
      const content = {
        partnerOneName: 'Budi',
        customUndeclaredColor: '#ff0000',
      };
      expect(() => validateEventContent(content, 'IVORY_GARDEN')).toThrow(
        'Undeclared content field: customUndeclaredColor',
      );
    });

    it('rejects _templateKey inside content payload', () => {
      const content = {
        partnerOneName: 'Budi',
        _templateKey: 'ivory-garden',
      };
      expect(() => validateEventContent(content, 'IVORY_GARDEN')).toThrow(
        '_templateKey',
      );
    });
  });

  describe('field type, length, and format validation', () => {
    it('accepts valid declared fields for IVORY_GARDEN', () => {
      const content = {
        partnerOneName: 'Aditya Pratama',
        partnerTwoName: 'Citra Lestari',
        timeZone: 'Asia/Jakarta',
        ceremonies: [
          {
            title: 'Akad Nikah',
            dateTime: '2026-10-15T09:00:00.000Z',
            venue: 'Masjid Agung',
            address: 'Jl. Ahmad Yani No. 1',
            mapsUrl: 'https://maps.app.goo.gl/xyz123',
          },
        ],
      };

      const result = validateEventContent(content, 'IVORY_GARDEN');
      expect(result).not.toBeNull();
      expect(result?.partnerOneName).toBe('Aditya Pratama');
      expect(result?.partnerTwoName).toBe('Citra Lestari');
      expect(result?._schemaVersion).toBe(1);
    });

    it('rejects invalid field type (e.g. number for string field)', () => {
      const content = {
        partnerOneName: 12345,
      };
      expect(() => validateEventContent(content, 'IVORY_GARDEN')).toThrow(
        'must be a string',
      );
    });

    it('rejects string exceeding maxLength', () => {
      const content = {
        partnerOneName: 'A'.repeat(121),
      };
      expect(() => validateEventContent(content, 'IVORY_GARDEN')).toThrow(
        'exceeds maximum length of 120',
      );
    });

    it('rejects invalid select options', () => {
      const content = {
        timeZone: 'America/New_York',
      };
      expect(() => validateEventContent(content, 'IVORY_GARDEN')).toThrow(
        'invalid option',
      );
    });

    it('rejects repeater exceeding maxItems', () => {
      const content = {
        ceremonies: [
          {
            title: 'C1',
            dateTime: '2026-10-15T09:00:00Z',
            venue: 'V1',
            address: 'A1',
          },
          {
            title: 'C2',
            dateTime: '2026-10-15T11:00:00Z',
            venue: 'V2',
            address: 'A2',
          },
          {
            title: 'C3',
            dateTime: '2026-10-15T13:00:00Z',
            venue: 'V3',
            address: 'A3',
          },
        ],
      };
      expect(() => validateEventContent(content, 'IVORY_GARDEN')).toThrow(
        'exceeds maximum items of 2',
      );
    });

    it('rejects missing required fields inside repeater item', () => {
      const content = {
        ceremonies: [{ title: 'Akad', venue: 'V1', address: 'A1' }],
      };
      expect(() => validateEventContent(content, 'IVORY_GARDEN')).toThrow(
        'Field ceremonies[0].dateTime is required',
      );
    });

    it('rejects undeclared field inside repeater item', () => {
      const content = {
        ceremonies: [
          {
            title: 'Akad',
            dateTime: '2026-10-15T09:00:00Z',
            venue: 'V1',
            address: 'A1',
            unexpectedField: 'forbidden',
          },
        ],
      };
      expect(() => validateEventContent(content, 'IVORY_GARDEN')).toThrow(
        'Undeclared field in ceremonies[0]: unexpectedField',
      );
    });
  });

  describe('URL scheme and policy validation', () => {
    it('rejects forbidden URL schemes (javascript:, data:, file:)', () => {
      expect(() =>
        validateEventContent(
          { mapsUrl: 'javascript:alert(1)' },
          'IVORY_GARDEN',
        ),
      ).toThrow('Invalid URL scheme');

      expect(() =>
        validateEventContent(
          { mapsUrl: 'data:text/html,<script>alert(1)</script>' },
          'IVORY_GARDEN',
        ),
      ).toThrow('Invalid URL scheme');
    });

    it('rejects non-Google Maps URLs when urlPolicy is google-maps', () => {
      expect(() =>
        validateEventContent(
          { mapsUrl: 'https://evil-phishing.com/maps' },
          'IVORY_GARDEN',
        ),
      ).toThrow('must be a valid Google Maps HTTPS URL');
    });

    it('accepts valid Google Maps formats', () => {
      const validUrls = [
        'https://maps.google.com/?q=Bandung',
        'https://www.google.com/maps/place/Bandung',
        'https://maps.app.goo.gl/abc123xyz',
        'https://goo.gl/maps/abc123xyz',
      ];
      for (const url of validUrls) {
        const res = validateEventContent({ mapsUrl: url }, 'IVORY_GARDEN');
        expect(res?.mapsUrl).toBe(url);
      }
    });
  });

  describe('giftAccounts validation (no QRIS, preserve string account numbers)', () => {
    it('accepts valid giftAccounts with string account numbers and preserves leading zeros', () => {
      const content = {
        giftTitle: 'Amplop Digital',
        giftMessage: 'Doa restu Anda merupakan hadiah terindah bagi kami.',
        giftAccounts: [
          {
            bankName: 'Bank BCA',
            accountNumber: '001234567890',
            accountHolderName: 'Aditya Pratama',
          },
          {
            bankName: 'Bank Mandiri',
            accountNumber: '009876543210',
            accountHolderName: 'Citra Lestari',
          },
        ],
      };

      const result = validateEventContent(content, 'IVORY_GARDEN');
      expect(result).not.toBeNull();
      expect(result?.giftTitle).toBe('Amplop Digital');
      expect(result?.giftMessage).toBe(
        'Doa restu Anda merupakan hadiah terindah bagi kami.',
      );
      const accounts = result?.giftAccounts as Array<{
        bankName: string;
        accountNumber: string;
        accountHolderName: string;
      }>;
      expect(accounts).toHaveLength(2);
      expect(accounts[0].accountNumber).toBe('001234567890');
      expect(typeof accounts[0].accountNumber).toBe('string');
      expect(accounts[1].accountNumber).toBe('009876543210');
      expect(typeof accounts[1].accountNumber).toBe('string');
    });

    it('rejects number as accountNumber (must be string to preserve precision and leading zeros)', () => {
      const content = {
        giftAccounts: [
          {
            bankName: 'BCA',
            accountNumber: 123456789,
            accountHolderName: 'Aditya',
          },
        ],
      };
      expect(() => validateEventContent(content, 'IVORY_GARDEN')).toThrow(
        'Field giftAccounts[0].accountNumber must be a string',
      );
    });

    it('rejects missing bankName', () => {
      const content = {
        giftAccounts: [
          {
            accountNumber: '001234567890',
            accountHolderName: 'Aditya',
          },
        ],
      };
      expect(() => validateEventContent(content, 'IVORY_GARDEN')).toThrow(
        'Field giftAccounts[0].bankName is required',
      );
    });

    it('rejects empty accountNumber', () => {
      const content = {
        giftAccounts: [
          {
            bankName: 'BCA',
            accountNumber: '   ',
            accountHolderName: 'Aditya',
          },
        ],
      };
      expect(() => validateEventContent(content, 'IVORY_GARDEN')).toThrow(
        'Field giftAccounts[0].accountNumber cannot be empty',
      );
    });

    it('rejects missing accountHolderName', () => {
      const content = {
        giftAccounts: [
          {
            bankName: 'BCA',
            accountNumber: '001234567890',
          },
        ],
      };
      expect(() => validateEventContent(content, 'IVORY_GARDEN')).toThrow(
        'Field giftAccounts[0].accountHolderName is required',
      );
    });

    it('rejects giftAccounts exceeding maxItems of 3', () => {
      const content = {
        giftAccounts: [
          { bankName: 'B1', accountNumber: '001', accountHolderName: 'H1' },
          { bankName: 'B2', accountNumber: '002', accountHolderName: 'H2' },
          { bankName: 'B3', accountNumber: '003', accountHolderName: 'H3' },
          { bankName: 'B4', accountNumber: '004', accountHolderName: 'H4' },
        ],
      };
      expect(() => validateEventContent(content, 'IVORY_GARDEN')).toThrow(
        'Field giftAccounts exceeds maximum items of 3',
      );
    });

    it('rejects undeclared nested fields inside giftAccounts (e.g. QRIS / payment fields)', () => {
      const content = {
        giftAccounts: [
          {
            bankName: 'BCA',
            accountNumber: '001234567890',
            accountHolderName: 'Aditya',
            qrisUrl: 'https://qris.payment/pay',
          },
        ],
      };
      expect(() => validateEventContent(content, 'IVORY_GARDEN')).toThrow(
        'Undeclared field in giftAccounts[0]: qrisUrl',
      );
    });

    it('rejects root giftQr / payment fields', () => {
      expect(() =>
        validateEventContent({ giftQr: 'some-value' }, 'IVORY_GARDEN'),
      ).toThrow('Undeclared content field: giftQr');

      expect(() =>
        validateEventContent(
          { qrisUrl: 'https://qris.example.com' },
          'IVORY_GARDEN',
        ),
      ).toThrow('Undeclared content field: qrisUrl');

      expect(() =>
        validateEventContent({ paymentGateway: 'midtrans' }, 'IVORY_GARDEN'),
      ).toThrow('Undeclared content field: paymentGateway');
    });
  });

  describe('server controlled schemaVersion', () => {
    it('overrides user supplied _schemaVersion with definition schemaVersion', () => {
      const content = {
        partnerOneName: 'Aditya',
        _schemaVersion: 9999,
      };
      const result = validateEventContent(content, 'IVORY_GARDEN');
      expect(result?._schemaVersion).toBe(1);
    });
  });

  describe('unregistered / legacy templates', () => {
    it('rejects custom content writes for unregistered templates with 400', () => {
      expect(() =>
        validateEventContent({ someKey: 'value' }, 'UNREGISTERED_THEME'),
      ).toThrow('Selected template does not support custom content');
    });

    it('allows null or empty object for unregistered templates', () => {
      expect(validateEventContent(null, 'UNREGISTERED_THEME')).toBeNull();
      expect(validateEventContent({}, 'UNREGISTERED_THEME')).toBeNull();
    });
  });
});
