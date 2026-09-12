import {
  parseSingleByteRange,
  RangeNotSatisfiableError,
} from './media-stream-range';

describe('parseSingleByteRange', () => {
  it('should return null for empty/absent header', () => {
    expect(parseSingleByteRange(null, 1000)).toBeNull();
    expect(parseSingleByteRange('', 1000)).toBeNull();
  });

  it('should parse valid bounded range', () => {
    expect(parseSingleByteRange('bytes=100-500', 1000)).toEqual({
      start: 100,
      end: 500,
    });
  });

  it('should parse valid open-ended range', () => {
    expect(parseSingleByteRange('bytes=100-', 1000)).toEqual({
      start: 100,
      end: 999,
    });
  });

  it('should parse valid suffix range', () => {
    expect(parseSingleByteRange('bytes=-200', 1000)).toEqual({
      start: 800,
      end: 999,
    });
  });

  it('should clamp bounded range end to file size', () => {
    expect(parseSingleByteRange('bytes=100-2000', 1000)).toEqual({
      start: 100,
      end: 999,
    });
  });

  it('should throw RangeNotSatisfiableError if start is beyond file size', () => {
    expect(() => parseSingleByteRange('bytes=1500-2000', 1000)).toThrow(
      RangeNotSatisfiableError,
    );
  });

  it('should throw RangeNotSatisfiableError if end is before start', () => {
    expect(() => parseSingleByteRange('bytes=500-100', 1000)).toThrow(
      RangeNotSatisfiableError,
    );
  });

  it('should throw RangeNotSatisfiableError for multiple ranges', () => {
    expect(() => parseSingleByteRange('bytes=0-99,200-299', 1000)).toThrow(
      RangeNotSatisfiableError,
    );
  });

  it('should throw RangeNotSatisfiableError for invalid format', () => {
    expect(() => parseSingleByteRange('abc=100-200', 1000)).toThrow(
      RangeNotSatisfiableError,
    );
    expect(() => parseSingleByteRange('bytes=abc-def', 1000)).toThrow(
      RangeNotSatisfiableError,
    );
    expect(() => parseSingleByteRange('bytes=-', 1000)).toThrow(
      RangeNotSatisfiableError,
    );
  });

  it('should throw RangeNotSatisfiableError if zero suffix length', () => {
    expect(() => parseSingleByteRange('bytes=-0', 1000)).toThrow(
      RangeNotSatisfiableError,
    );
  });

  it('should handle suffix range larger than file size by clamping to 0', () => {
    expect(parseSingleByteRange('bytes=-2000', 1000)).toEqual({
      start: 0,
      end: 999,
    });
  });

  it('should throw if file is empty', () => {
    expect(() => parseSingleByteRange('bytes=0-10', 0)).toThrow(
      RangeNotSatisfiableError,
    );
  });
});
