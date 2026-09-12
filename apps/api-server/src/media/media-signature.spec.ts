import { detectSignature } from './media-signature';

describe('Media Signature Detector', () => {
  it('returns undefined for empty/null buffer', () => {
    expect(detectSignature(Buffer.from(''))).toBeUndefined();
    expect(detectSignature(null as unknown as Buffer)).toBeUndefined();
  });

  describe('JPEG', () => {
    it('detects valid JPEG', () => {
      const buf = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
      expect(detectSignature(buf)).toEqual({
        kind: 'JPEG',
        mime: 'image/jpeg',
        extension: 'jpg',
      });
    });

    it('returns undefined for near miss', () => {
      const buf = Buffer.from([0xff, 0xd8, 0xfe]);
      expect(detectSignature(buf)).toBeUndefined();
    });

    it('returns undefined for too short', () => {
      const buf = Buffer.from([0xff, 0xd8]);
      expect(detectSignature(buf)).toBeUndefined();
    });
  });

  describe('PNG', () => {
    it('detects valid PNG', () => {
      const buf = Buffer.from([
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00,
      ]);
      expect(detectSignature(buf)).toEqual({
        kind: 'PNG',
        mime: 'image/png',
        extension: 'png',
      });
    });

    it('returns undefined for near miss', () => {
      const buf = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0b]);
      expect(detectSignature(buf)).toBeUndefined();
    });

    it('returns undefined for too short', () => {
      const buf = Buffer.from([0x89, 0x50, 0x4e, 0x47]);
      expect(detectSignature(buf)).toBeUndefined();
    });
  });

  describe('WebP', () => {
    it('detects valid WebP', () => {
      const buf = Buffer.from([
        0x52, 0x49, 0x46, 0x46, 0x12, 0x34, 0x56, 0x78, 0x57, 0x45, 0x42, 0x50,
      ]);
      expect(detectSignature(buf)).toEqual({
        kind: 'WEBP',
        mime: 'image/webp',
        extension: 'webp',
      });
    });

    it('returns undefined for RIFF without WEBP', () => {
      const buf = Buffer.from([
        0x52, 0x49, 0x46, 0x46, 0x12, 0x34, 0x56, 0x78, 0x41, 0x56, 0x49, 0x20,
      ]);
      expect(detectSignature(buf)).toBeUndefined();
    });

    it('returns undefined for WEBP without RIFF', () => {
      const buf = Buffer.from([
        0x00, 0x00, 0x00, 0x00, 0x12, 0x34, 0x56, 0x78, 0x57, 0x45, 0x42, 0x50,
      ]);
      expect(detectSignature(buf)).toBeUndefined();
    });

    it('returns undefined for too short', () => {
      const buf = Buffer.from([
        0x52, 0x49, 0x46, 0x46, 0x12, 0x34, 0x56, 0x78, 0x57, 0x45, 0x42,
      ]);
      expect(detectSignature(buf)).toBeUndefined();
    });
  });

  describe('MP4', () => {
    it('detects valid MP4 (ftyp)', () => {
      const buf = Buffer.from([
        0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70, 0x6d, 0x70, 0x34, 0x32,
      ]);
      expect(detectSignature(buf)).toEqual({
        kind: 'MP4',
        mime: 'video/mp4',
        extension: 'mp4',
      });
    });

    it('returns undefined if ftyp is missing', () => {
      const buf = Buffer.from([0x00, 0x00, 0x00, 0x18, 0x6d, 0x6f, 0x6f, 0x76]);
      expect(detectSignature(buf)).toBeUndefined();
    });

    it('returns undefined if ftyp is late (bounded check only)', () => {
      const buf = Buffer.from([
        0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x66, 0x74, 0x79, 0x70,
      ]);
      expect(detectSignature(buf)).toBeUndefined();
    });

    it('returns undefined for too short', () => {
      const buf = Buffer.from([0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79]);
      expect(detectSignature(buf)).toBeUndefined();
    });
  });

  describe('MP3', () => {
    it('detects MP3 via ID3', () => {
      const buf = Buffer.from([0x49, 0x44, 0x33, 0x03, 0x00, 0x00, 0x00]);
      expect(detectSignature(buf)).toEqual({
        kind: 'MP3',
        mime: 'audio/mpeg',
        extension: 'mp3',
      });
    });

    it('detects MP3 via valid MPEG frame header', () => {
      const buf = Buffer.from([0xff, 0xfb, 0x90, 0x44]); // MPEG-1 Layer 3, 128kbps, 44100Hz
      expect(detectSignature(buf)).toEqual({
        kind: 'MP3',
        mime: 'audio/mpeg',
        extension: 'mp3',
      });
    });

    it('returns undefined for reserved MPEG header combinations', () => {
      // 0xFF 0xE0 with version 01 (reserved), layer 00 (reserved)
      const buf = Buffer.from([0xff, 0xea, 0xf0, 0x44]);
      expect(detectSignature(buf)).toBeUndefined();
    });

    it('returns undefined for short FF prefix', () => {
      const buf = Buffer.from([0xff, 0xe0, 0x00]);
      expect(detectSignature(buf)).toBeUndefined(); // Too short to validate all bits
    });
  });

  describe('Unknowns', () => {
    it('returns undefined for text', () => {
      expect(
        detectSignature(Buffer.from('Hello world this is a test')),
      ).toBeUndefined();
    });

    it('returns undefined for PDF', () => {
      expect(detectSignature(Buffer.from('%PDF-1.4\n'))).toBeUndefined();
    });

    it('returns undefined for GIF', () => {
      expect(detectSignature(Buffer.from('GIF89a'))).toBeUndefined();
    });

    it('returns undefined for ZIP', () => {
      expect(
        detectSignature(Buffer.from([0x50, 0x4b, 0x03, 0x04])),
      ).toBeUndefined();
    });

    it('returns undefined for ASF-like (WMA/WMV)', () => {
      expect(
        detectSignature(
          Buffer.from([
            0x30, 0x26, 0xb2, 0x75, 0x8e, 0x66, 0xcf, 0x11, 0xa6, 0xd9, 0x00,
            0xaa, 0x00, 0x62, 0xce, 0x6c,
          ]),
        ),
      ).toBeUndefined();
    });
  });
});
