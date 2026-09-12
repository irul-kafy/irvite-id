export interface SignatureResult {
  kind: 'JPEG' | 'PNG' | 'WEBP' | 'MP4' | 'MP3';
  mime: string;
  extension: string;
}

export function detectSignature(buffer: Buffer): SignatureResult | undefined {
  if (!buffer || buffer.length === 0) return undefined;

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return { kind: 'PNG', mime: 'image/png', extension: 'png' };
  }

  // JPEG: FF D8 FF
  if (
    buffer.length >= 3 &&
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff
  ) {
    return { kind: 'JPEG', mime: 'image/jpeg', extension: 'jpg' };
  }

  // WebP: RIFF ... WEBP
  if (
    buffer.length >= 12 &&
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 && // RIFF
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50 // WEBP
  ) {
    return { kind: 'WEBP', mime: 'image/webp', extension: 'webp' };
  }

  // MP4: ... ftyp
  if (
    buffer.length >= 8 &&
    buffer[4] === 0x66 &&
    buffer[5] === 0x74 &&
    buffer[6] === 0x79 &&
    buffer[7] === 0x70 // ftyp
  ) {
    return { kind: 'MP4', mime: 'video/mp4', extension: 'mp4' };
  }

  // MP3 (ID3 tag): ID3
  if (
    buffer.length >= 3 &&
    buffer[0] === 0x49 &&
    buffer[1] === 0x44 &&
    buffer[2] === 0x33 // ID3
  ) {
    return { kind: 'MP3', mime: 'audio/mpeg', extension: 'mp3' };
  }

  // MP3 (MPEG audio frame sync): FF E0
  if (
    buffer.length >= 4 &&
    buffer[0] === 0xff &&
    (buffer[1] & 0xe0) === 0xe0 // Sync bits
  ) {
    const version = (buffer[1] & 0x18) >> 3;
    const layer = (buffer[1] & 0x06) >> 1;
    const bitrateIdx = (buffer[2] & 0xf0) >> 4;
    const sampleRateIdx = (buffer[2] & 0x0c) >> 2;

    // Apply strict but bounded validity checks for the frame header
    if (
      version !== 0x01 && // 01 is reserved
      layer !== 0x00 && // 00 is reserved
      bitrateIdx !== 0x0f && // 1111 is invalid/bad
      sampleRateIdx !== 0x03 // 11 is reserved
    ) {
      return { kind: 'MP3', mime: 'audio/mpeg', extension: 'mp3' };
    }
  }

  return undefined;
}
