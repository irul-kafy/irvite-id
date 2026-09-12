import { BadRequestException } from '@nestjs/common';

export interface ParsedGoogleSheetsUrl {
  spreadsheetId: string;
  gid?: string;
  exportUrl: string;
}

export function parseGoogleSheetsUrl(rawUrl: string): ParsedGoogleSheetsUrl {
  let url: URL;
  try {
    url = new URL(rawUrl.trim());
  } catch {
    throw new BadRequestException('Format URL Google Sheets tidak valid.');
  }

  // 1. Host check: MUST BE EXACTLY docs.google.com
  if (url.hostname.toLowerCase() !== 'docs.google.com') {
    throw new BadRequestException(
      'URL harus berasal dari domain docs.google.com.',
    );
  }

  // 2. HTTPS only
  if (url.protocol !== 'https:') {
    throw new BadRequestException(
      'URL Google Sheets harus menggunakan protokol HTTPS.',
    );
  }

  // 3. No credentials in URL
  if (url.username || url.password) {
    throw new BadRequestException('URL tidak boleh mengandung kredensial.');
  }

  // 4. Path check: /spreadsheets/d/<spreadsheetId>
  const match = url.pathname.match(/^\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
  if (!match || !match[1]) {
    throw new BadRequestException(
      'Struktur URL Google Sheets tidak valid. Harus memiliki ID spreadsheet.',
    );
  }

  const spreadsheetId = match[1];

  // 5. Extract gid if present from query params or hash
  let gid: string | undefined;
  if (url.searchParams.has('gid')) {
    gid = url.searchParams.get('gid') || undefined;
  } else if (url.hash && url.hash.includes('gid=')) {
    const hashMatch = url.hash.match(/gid=([0-9]+)/);
    if (hashMatch) {
      gid = hashMatch[1];
    }
  }

  // If gid is present, ensure it contains only digits
  if (gid && !/^\d+$/.test(gid)) {
    gid = undefined;
  }

  let exportUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv`;
  if (gid !== undefined) {
    exportUrl += `&gid=${gid}`;
  }

  return {
    spreadsheetId,
    gid,
    exportUrl,
  };
}

function isPermittedGoogleHostname(hostname: string): boolean {
  const lower = hostname.toLowerCase();
  if (lower === 'docs.google.com') return true;
  // Permit only Google-owned export domain suffix for sheets
  if (
    lower === 'docs.googleusercontent.com' ||
    lower.endsWith('.docs.googleusercontent.com')
  ) {
    return true;
  }
  return false;
}

export async function fetchGoogleSheetCsv(sheetUrl: string): Promise<Buffer> {
  const { exportUrl } = parseGoogleSheetsUrl(sheetUrl);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  const MAX_BYTES = 5 * 1024 * 1024; // 5 MB hard limit
  const MAX_REDIRECTS = 3;

  let currentUrl = exportUrl;
  let redirectCount = 0;

  try {
    while (redirectCount <= MAX_REDIRECTS) {
      const res = await fetch(currentUrl, {
        signal: controller.signal,
        redirect: 'manual', // Enforce manual handling on EVERY hop
        headers: {
          'User-Agent': 'IRVITE-Sheet-Reader/1.0',
        },
      });

      // Handle Redirect (301, 302, 303, 307, 308)
      if (res.status >= 300 && res.status < 400) {
        redirectCount++;
        if (redirectCount > MAX_REDIRECTS) {
          throw new BadRequestException(
            'Terlalu banyak pengalihan (redirect loop) dari Google Sheets.',
          );
        }

        const location = res.headers.get('location');
        if (!location) {
          throw new BadRequestException(
            'Redirect dari Google Sheets tidak memiliki lokasi tujuan.',
          );
        }

        let redirectUrl: URL;
        try {
          redirectUrl = new URL(location, currentUrl);
        } catch {
          throw new BadRequestException(
            'Lokasi redirect dari Google Sheets tidak valid.',
          );
        }

        // HTTPS only on every hop
        if (redirectUrl.protocol !== 'https:') {
          throw new BadRequestException(
            'Redirect Google Sheets harus menggunakan protokol HTTPS.',
          );
        }

        // No credentials
        if (redirectUrl.username || redirectUrl.password) {
          throw new BadRequestException(
            'Redirect Google Sheets tidak boleh mengandung kredensial.',
          );
        }

        // Check if redirected to Google Accounts login (Private Sheet)
        if (
          redirectUrl.hostname.toLowerCase() === 'accounts.google.com' ||
          redirectUrl.pathname.includes('/ServiceLogin')
        ) {
          throw new BadRequestException(
            'Google Sheet tidak dapat diakses atau berstatus privat. Pastikan akses diatur ke "Siapa saja yang memiliki link dapat melihat".',
          );
        }

        // Check permitted Google-owned hostnames
        if (!isPermittedGoogleHostname(redirectUrl.hostname)) {
          throw new BadRequestException(
            'Redirect Google Sheets mengarah ke domain yang tidak diizinkan.',
          );
        }

        currentUrl = redirectUrl.toString();
        continue;
      }

      if (!res.ok) {
        throw new BadRequestException(
          'Google Sheet tidak dapat diakses atau berstatus privat. Pastikan akses diatur ke "Siapa saja yang memiliki link dapat melihat".',
        );
      }

      // 1. Check Content-Length header if available before streaming
      const contentLengthHeader = res.headers.get('content-length');
      if (contentLengthHeader) {
        const parsedLength = parseInt(contentLengthHeader, 10);
        if (!isNaN(parsedLength) && parsedLength > MAX_BYTES) {
          throw new BadRequestException(
            'Ukuran data Google Sheet melebihi batas maksimal 5 MB.',
          );
        }
      }

      // 2. Stream body and stop if cumulative bytes exceed 5 MB
      if (!res.body) {
        throw new BadRequestException(
          'Respons data dari Google Sheets kosong.',
        );
      }

      const reader = res.body.getReader();
      const chunks: Uint8Array[] = [];
      let totalBytes = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) {
          totalBytes += value.length;
          if (totalBytes > MAX_BYTES) {
            await reader.cancel();
            throw new BadRequestException(
              'Ukuran data Google Sheet melebihi batas maksimal 5 MB.',
            );
          }
          chunks.push(value);
        }
      }

      const buffer = Buffer.concat(chunks);

      // 3. Inspect final response content for HTML login page
      const previewText = buffer
        .subarray(0, 300)
        .toString('utf8')
        .toLowerCase();
      if (
        previewText.includes('<!doctype html') ||
        previewText.includes('<html') ||
        previewText.includes('<body') ||
        previewText.includes('accounts.google.com')
      ) {
        throw new BadRequestException(
          'Google Sheet tidak dapat diakses atau berstatus privat. Pastikan akses diatur ke "Siapa saja yang memiliki link dapat melihat".',
        );
      }

      return buffer;
    }

    throw new BadRequestException(
      'Terlalu banyak pengalihan (redirect loop) dari Google Sheets.',
    );
  } catch (err: unknown) {
    if (err instanceof BadRequestException) {
      throw err;
    }
    const error = err as Error;
    if (error.name === 'AbortError') {
      throw new BadRequestException(
        'Waktu permintaan ke Google Sheets habis (timeout 10 detik).',
      );
    }
    throw new BadRequestException(
      `Gagal menghubungi Google Sheets: ${error.message || 'Kesalahan jaringan'}`,
    );
  } finally {
    clearTimeout(timeout);
  }
}
