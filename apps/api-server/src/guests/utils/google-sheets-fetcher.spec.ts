/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/require-await */
import {
  fetchGoogleSheetCsv,
  parseGoogleSheetsUrl,
} from './google-sheets-fetcher';
import { BadRequestException } from '@nestjs/common';

describe('google-sheets-fetcher', () => {
  describe('parseGoogleSheetsUrl', () => {
    it('parses standard edit link correctly', () => {
      const url =
        'https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit#gid=0';
      const parsed = parseGoogleSheetsUrl(url);
      expect(parsed.spreadsheetId).toBe(
        '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
      );
      expect(parsed.gid).toBe('0');
      expect(parsed.exportUrl).toBe(
        'https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/export?format=csv&gid=0',
      );
    });

    it('parses URL with gid in query params', () => {
      const url =
        'https://docs.google.com/spreadsheets/d/abc123_XYZ-789/edit?gid=12345';
      const parsed = parseGoogleSheetsUrl(url);
      expect(parsed.spreadsheetId).toBe('abc123_XYZ-789');
      expect(parsed.gid).toBe('12345');
      expect(parsed.exportUrl).toBe(
        'https://docs.google.com/spreadsheets/d/abc123_XYZ-789/export?format=csv&gid=12345',
      );
    });

    it('parses URL without gid', () => {
      const url = 'https://docs.google.com/spreadsheets/d/abc123_XYZ-789/';
      const parsed = parseGoogleSheetsUrl(url);
      expect(parsed.spreadsheetId).toBe('abc123_XYZ-789');
      expect(parsed.gid).toBeUndefined();
      expect(parsed.exportUrl).toBe(
        'https://docs.google.com/spreadsheets/d/abc123_XYZ-789/export?format=csv',
      );
    });

    it('rejects non-google domain (hostile SSRF)', () => {
      expect(() =>
        parseGoogleSheetsUrl('https://evil.com/spreadsheets/d/123'),
      ).toThrow(BadRequestException);
      expect(() =>
        parseGoogleSheetsUrl(
          'https://docs.google.com.evil.com/spreadsheets/d/123',
        ),
      ).toThrow(BadRequestException);
      expect(() =>
        parseGoogleSheetsUrl('http://169.254.169.254/latest/meta-data'),
      ).toThrow(BadRequestException);
      expect(() => parseGoogleSheetsUrl('http://localhost:3000')).toThrow(
        BadRequestException,
      );
    });

    it('rejects non-HTTPS protocol', () => {
      expect(() =>
        parseGoogleSheetsUrl('http://docs.google.com/spreadsheets/d/123'),
      ).toThrow(BadRequestException);
    });

    it('rejects credentials in URL', () => {
      expect(() =>
        parseGoogleSheetsUrl(
          'https://user:pass@docs.google.com/spreadsheets/d/123',
        ),
      ).toThrow(BadRequestException);
    });

    it('rejects malformed path without spreadsheetId', () => {
      expect(() =>
        parseGoogleSheetsUrl('https://docs.google.com/document/d/123'),
      ).toThrow(BadRequestException);
      expect(() =>
        parseGoogleSheetsUrl('https://docs.google.com/spreadsheets/'),
      ).toThrow(BadRequestException);
    });
  });
  describe('fetchGoogleSheetCsv hardening & mocked flows', () => {
    const origFetch = global.fetch;
    afterEach(() => {
      global.fetch = origFetch;
    });

    const validSheetUrl =
      'https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit?gid=42';

    it('preserves gid in exportUrl and follows allowed redirect to permitted Google host', async () => {
      const csvData = 'Nama Tamu,Kategori\nBudi,VIP';
      let hop = 0;
      global.fetch = jest
        .fn()
        .mockImplementation(async (url: string, opts: any) => {
          expect(opts.redirect).toBe('manual');
          hop++;
          if (hop === 1) {
            expect(url).toContain('gid=42');
            return new Response(null, {
              status: 302,
              headers: {
                location:
                  'https://doc-0k-sheets.docs.googleusercontent.com/export?gid=42',
              },
            });
          }
          return new Response(csvData, {
            status: 200,
            headers: { 'content-type': 'text/csv' },
          });
        });

      const buf = await fetchGoogleSheetCsv(validSheetUrl);
      expect(buf.toString('utf8')).toBe(csvData);
      expect(hop).toBe(2);
    });

    it('rejects hostile redirect to external non-Google domain', async () => {
      global.fetch = jest.fn().mockResolvedValue(
        new Response(null, {
          status: 302,
          headers: { location: 'https://attacker-controlled.com/stolen.csv' },
        }),
      );

      await expect(fetchGoogleSheetCsv(validSheetUrl)).rejects.toThrow(
        'Redirect Google Sheets mengarah ke domain yang tidak diizinkan.',
      );
    });

    it('rejects redirect to Google Accounts login (private sheet) with friendly error', async () => {
      global.fetch = jest.fn().mockResolvedValue(
        new Response(null, {
          status: 302,
          headers: {
            location: 'https://accounts.google.com/ServiceLogin?service=wise',
          },
        }),
      );

      await expect(fetchGoogleSheetCsv(validSheetUrl)).rejects.toThrow(
        'Google Sheet tidak dapat diakses atau berstatus privat.',
      );
    });

    it('rejects when Content-Length header exceeds 5 MB before streaming', async () => {
      global.fetch = jest.fn().mockResolvedValue(
        new Response('small body but huge header', {
          status: 200,
          headers: { 'content-length': String(6 * 1024 * 1024) }, // 6 MB
        }),
      );

      await expect(fetchGoogleSheetCsv(validSheetUrl)).rejects.toThrow(
        'Ukuran data Google Sheet melebihi batas maksimal 5 MB.',
      );
    });

    it('stops and rejects when streamed body exceeds 5 MB', async () => {
      const chunk = new Uint8Array(2 * 1024 * 1024); // 2 MB chunk
      let sent = 0;
      const stream = new ReadableStream({
        pull(controller) {
          if (sent < 3) {
            sent++;
            controller.enqueue(chunk); // 3 * 2 MB = 6 MB
          } else {
            controller.close();
          }
        },
      });

      global.fetch = jest.fn().mockResolvedValue(
        new Response(stream, {
          status: 200,
        }),
      );

      await expect(fetchGoogleSheetCsv(validSheetUrl)).rejects.toThrow(
        'Ukuran data Google Sheet melebihi batas maksimal 5 MB.',
      );
    });
  });
});
