import { BadRequestException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { TemplateConfigDto } from './dto/template-config.dto';
import { validateTemplateConfig } from './utils/config-validator';
import { isBuiltInTemplate } from './sync-templates';

export const TEMPLATE_PACKAGE_LIMITS = {
  manifestBytes: 64 * 1024,
  files: 12,
  totalAssetBytes: 30 * 1024 * 1024,
  imageBytes: 5 * 1024 * 1024,
  audioBytes: 10 * 1024 * 1024,
} as const;

export type TemplateAssetSlot =
  'thumbnail' | 'background' | 'ornament' | 'music';

export interface TemplatePackageManifest {
  schemaVersion: 1;
  name: string;
  themeCode: string;
  renderer: 'GENERIC';
  config: TemplateConfigDto;
  assets?: {
    thumbnail?: string;
    background?: string;
    ornaments?: string[];
    music?: string;
  };
}

export interface TemplateAssetMetadata {
  fieldName: string;
  slot: TemplateAssetSlot;
  order: number;
}

const THEME_CODE = /^[A-Z][A-Z0-9_]{2,59}$/;
const FIELD_NAME = /^asset_[0-9]{1,2}$/;
const VALID_SLOTS = new Set<TemplateAssetSlot>([
  'thumbnail',
  'background',
  'ornament',
  'music',
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export function parseTemplatePackageManifest(
  raw: string,
): TemplatePackageManifest {
  if (
    typeof raw !== 'string' ||
    Buffer.byteLength(raw, 'utf8') > TEMPLATE_PACKAGE_LIMITS.manifestBytes
  ) {
    throw new BadRequestException('manifest.json exceeds the 64KB limit');
  }

  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    throw new BadRequestException('manifest.json is not valid JSON');
  }
  if (!isRecord(value))
    throw new BadRequestException('manifest.json must contain an object');
  if (
    Object.keys(value).some(
      (key) =>
        ![
          'schemaVersion',
          'name',
          'themeCode',
          'renderer',
          'config',
          'assets',
        ].includes(key),
    )
  ) {
    throw new BadRequestException('Unknown manifest property');
  }
  if (value.schemaVersion !== 1)
    throw new BadRequestException('Only schemaVersion 1 is supported');
  if (
    typeof value.name !== 'string' ||
    value.name.trim().length < 2 ||
    value.name.trim().length > 120
  ) {
    throw new BadRequestException(
      'Template name must contain 2 to 120 characters',
    );
  }
  if (
    typeof value.themeCode !== 'string' ||
    !THEME_CODE.test(value.themeCode)
  ) {
    throw new BadRequestException(
      'themeCode must use uppercase letters, numbers, and underscores',
    );
  }
  if (value.renderer !== 'GENERIC') {
    throw new BadRequestException(
      'Imported packages must use the safe GENERIC renderer',
    );
  }
  if (isBuiltInTemplate(value.themeCode) || value.themeCode === 'GENERIC') {
    throw new BadRequestException(
      'Use a new themeCode; built-in theme codes are reserved',
    );
  }
  if (!isRecord(value.config))
    throw new BadRequestException('config is required');
  if (!isRecord(value.config.theme) || !isRecord(value.config.typography))
    throw new BadRequestException('Template theme and typography are required');

  const config = plainToInstance(TemplateConfigDto, value.config);
  const errors = validateSync(config, {
    whitelist: true,
    forbidNonWhitelisted: true,
  });
  if (errors.length > 0)
    throw new BadRequestException('Template config is invalid');
  validateTemplateConfig(config);

  let assets: TemplatePackageManifest['assets'];
  if (value.assets !== undefined) {
    if (
      !isRecord(value.assets) ||
      Object.keys(value.assets).some(
        (key) =>
          !['thumbnail', 'background', 'ornaments', 'music'].includes(key),
      )
    )
      throw new BadRequestException('Invalid asset declarations');
    const path = (input: unknown): string | undefined => {
      if (input === undefined) return undefined;
      if (
        typeof input !== 'string' ||
        input.length > 240 ||
        /[:\\]/.test(input) ||
        Array.from(input).some((character) => character.charCodeAt(0) < 32) ||
        input.split('/').some((part) => !part || part === '.' || part === '..')
      )
        throw new BadRequestException('Invalid asset path');
      return input;
    };
    const ornaments = value.assets.ornaments;
    if (
      ornaments !== undefined &&
      (!Array.isArray(ornaments) ||
        ornaments.length > 8 ||
        ornaments.some((item) => typeof item !== 'string'))
    )
      throw new BadRequestException('At most 8 ornament paths are allowed');
    assets = {
      thumbnail: path(value.assets.thumbnail),
      background: path(value.assets.background),
      music: path(value.assets.music),
      ornaments: (ornaments as string[] | undefined)?.map((item) =>
        path(item)!,
      ),
    };
  }

  return {
    schemaVersion: 1,
    name: value.name.trim(),
    themeCode: value.themeCode,
    renderer: 'GENERIC',
    config,
    assets,
  };
}

export function parseTemplateAssetMetadata(
  raw: string,
): TemplateAssetMetadata[] {
  if (typeof raw !== 'string' || Buffer.byteLength(raw, 'utf8') > 8 * 1024) {
    throw new BadRequestException('Asset metadata exceeds its size limit');
  }
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    throw new BadRequestException('Asset metadata is not valid JSON');
  }
  if (!Array.isArray(value) || value.length > TEMPLATE_PACKAGE_LIMITS.files) {
    throw new BadRequestException('A package can contain at most 12 assets');
  }

  const seenFields = new Set<string>();
  const seenPositions = new Set<string>();
  return value.map((entry) => {
    if (
      !isRecord(entry) ||
      Object.keys(entry).some(
        (key) => !['fieldName', 'slot', 'order'].includes(key),
      ) ||
      typeof entry.fieldName !== 'string' ||
      !FIELD_NAME.test(entry.fieldName)
    ) {
      throw new BadRequestException('Asset field name is invalid');
    }
    if (
      typeof entry.slot !== 'string' ||
      !VALID_SLOTS.has(entry.slot as TemplateAssetSlot)
    ) {
      throw new BadRequestException('Asset slot is invalid');
    }
    if (
      !Number.isSafeInteger(entry.order) ||
      (entry.order as number) < 0 ||
      (entry.order as number) > 20
    ) {
      throw new BadRequestException('Asset order is invalid');
    }
    const fieldName = entry.fieldName;
    const slot = entry.slot as TemplateAssetSlot;
    const order = entry.order as number;
    if (
      (slot === 'ornament' && order > 7) ||
      (slot !== 'ornament' && order !== 0)
    ) {
      throw new BadRequestException(
        'Only ornaments support multiple assets (maximum 8)',
      );
    }
    const position = `${slot}:${order}`;
    if (seenFields.has(fieldName) || seenPositions.has(position)) {
      throw new BadRequestException('Duplicate asset field or slot order');
    }
    seenFields.add(fieldName);
    seenPositions.add(position);
    return { fieldName, slot, order };
  });
}
