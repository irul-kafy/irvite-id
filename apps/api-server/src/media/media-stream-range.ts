export type ParsedRange = {
  start: number;
  end: number;
};

export class RangeNotSatisfiableError extends Error {
  constructor(message?: string) {
    super(message);
    this.name = 'RangeNotSatisfiableError';
  }
}

/**
 * Safely parses an HTTP Range header.
 * Only supports a single byte range.
 * Multiple ranges, malformed ranges, or unsatisfiable ranges throw RangeNotSatisfiableError.
 * Returns null if the header is absent or empty.
 */
export function parseSingleByteRange(
  rangeHeader: string | undefined | null,
  fileSize: number,
): ParsedRange | null {
  if (!rangeHeader) {
    return null;
  }

  // Bounded header length check
  if (rangeHeader.length > 256) {
    throw new RangeNotSatisfiableError('Range header too long');
  }

  const match = rangeHeader.trim().match(/^bytes=(.+)$/);
  if (!match) {
    throw new RangeNotSatisfiableError('Invalid range format');
  }

  const rangesStr = match[1];
  if (rangesStr.includes(',')) {
    throw new RangeNotSatisfiableError('Multiple ranges not supported');
  }

  const rangeTokens = rangesStr.split('-');
  if (rangeTokens.length !== 2) {
    throw new RangeNotSatisfiableError('Invalid range tokens');
  }

  const startStr = rangeTokens[0].trim();
  const endStr = rangeTokens[1].trim();

  // Validate no strange characters
  if (
    (startStr && !/^\d+$/.test(startStr)) ||
    (endStr && !/^\d+$/.test(endStr))
  ) {
    throw new RangeNotSatisfiableError('Invalid range digits');
  }

  let start = startStr ? parseInt(startStr, 10) : NaN;
  let end = endStr ? parseInt(endStr, 10) : NaN;

  if (isNaN(start) && isNaN(end)) {
    throw new RangeNotSatisfiableError('No range limits specified');
  }

  if (isNaN(start)) {
    // Suffix range: bytes=-500
    if (end === 0) {
      throw new RangeNotSatisfiableError('Invalid zero suffix length');
    }
    start = Math.max(0, fileSize - end);
    end = fileSize - 1;
  } else if (isNaN(end)) {
    // Open-ended range: bytes=500-
    end = fileSize - 1;
  } else {
    // Bounded range: bytes=500-1000
    if (end < start) {
      throw new RangeNotSatisfiableError('End before start');
    }
    // Clamp end to file size
    end = Math.min(end, fileSize - 1);
  }

  if (start >= fileSize && fileSize > 0) {
    throw new RangeNotSatisfiableError('Start beyond file size');
  }

  // If file is 0 bytes, any range is unsatisfiable
  if (fileSize === 0) {
    throw new RangeNotSatisfiableError('File is empty');
  }

  return { start, end };
}
