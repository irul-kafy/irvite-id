import { BadRequestException } from '@nestjs/common';
import { ContentFieldDefinition } from './template-definition.types';
import { getTemplateDefinition } from './template-definition.registry';

export const GOOGLE_MAPS_URL =
  /^https:\/\/(?:(?:www\.)?google\.com\/maps(?:[/?#]|$)|maps\.google\.com(?:[/?#]|$)|maps\.app\.goo\.gl\/|goo\.gl\/maps(?:[/?#]|$))[^\s]*$/i;

const FORBIDDEN_SCHEMES = /^(javascript|data|file|vbscript):/i;
const PROTOTYPE_POLLUTION_KEYS = new Set([
  '__proto__',
  'prototype',
  'constructor',
]);
export const MAX_CONTENT_SIZE_BYTES = 64 * 1024; // 64 KiB

function checkPrototypePollution(val: unknown): void {
  if (!val || typeof val !== 'object') return;
  if (Array.isArray(val)) {
    for (const item of val) checkPrototypePollution(item);
    return;
  }
  for (const key of Object.keys(val)) {
    if (PROTOTYPE_POLLUTION_KEYS.has(key)) {
      throw new BadRequestException(`Invalid content key: ${key}`);
    }
    checkPrototypePollution((val as Record<string, unknown>)[key]);
  }
}

function validateField(
  fieldDef: ContentFieldDefinition,
  value: unknown,
  fieldPath: string,
): void {
  if (value === undefined || value === null) {
    if (fieldDef.required) {
      throw new BadRequestException(`Field ${fieldPath} is required`);
    }
    return;
  }

  switch (fieldDef.type) {
    case 'text':
    case 'textarea': {
      if (typeof value !== 'string') {
        throw new BadRequestException(`Field ${fieldPath} must be a string`);
      }
      if (fieldDef.required && value.trim() === '') {
        throw new BadRequestException(`Field ${fieldPath} cannot be empty`);
      }
      if (
        fieldDef.maxLength !== undefined &&
        value.length > fieldDef.maxLength
      ) {
        throw new BadRequestException(
          `Field ${fieldPath} exceeds maximum length of ${fieldDef.maxLength}`,
        );
      }
      break;
    }

    case 'datetime': {
      if (typeof value !== 'string' || isNaN(Date.parse(value))) {
        throw new BadRequestException(
          `Field ${fieldPath} must be a valid ISO date string`,
        );
      }
      break;
    }

    case 'url': {
      if (typeof value !== 'string') {
        throw new BadRequestException(`Field ${fieldPath} must be a string`);
      }
      const trimmed = value.trim();
      if (trimmed === '') {
        if (fieldDef.required) {
          throw new BadRequestException(`Field ${fieldPath} cannot be empty`);
        }
        return;
      }
      if (FORBIDDEN_SCHEMES.test(trimmed)) {
        throw new BadRequestException(
          `Invalid URL scheme in field ${fieldPath}`,
        );
      }
      if (
        fieldDef.maxLength !== undefined &&
        trimmed.length > fieldDef.maxLength
      ) {
        throw new BadRequestException(
          `Field ${fieldPath} exceeds maximum length of ${fieldDef.maxLength}`,
        );
      }
      if (fieldDef.urlPolicy === 'google-maps') {
        if (!GOOGLE_MAPS_URL.test(trimmed)) {
          throw new BadRequestException(
            `Field ${fieldPath} must be a valid Google Maps HTTPS URL`,
          );
        }
      } else if (fieldDef.urlPolicy === 'https') {
        if (!/^https:\/\/[^\s]+$/i.test(trimmed)) {
          throw new BadRequestException(
            `Field ${fieldPath} must be a valid HTTPS URL`,
          );
        }
      }
      break;
    }

    case 'select': {
      if (typeof value !== 'string') {
        throw new BadRequestException(`Field ${fieldPath} must be a string`);
      }
      if (
        fieldDef.options &&
        !fieldDef.options.some((opt) => opt.value === value)
      ) {
        throw new BadRequestException(
          `Field ${fieldPath} has invalid option: ${value}`,
        );
      }
      break;
    }

    case 'repeater': {
      if (!Array.isArray(value)) {
        throw new BadRequestException(`Field ${fieldPath} must be an array`);
      }
      if (fieldDef.maxItems !== undefined && value.length > fieldDef.maxItems) {
        throw new BadRequestException(
          `Field ${fieldPath} exceeds maximum items of ${fieldDef.maxItems}`,
        );
      }
      if (fieldDef.fields) {
        const nestedFieldMap = new Map<string, ContentFieldDefinition>();
        for (const f of fieldDef.fields) {
          nestedFieldMap.set(f.key, f);
        }

        value.forEach((item, index) => {
          if (!item || typeof item !== 'object' || Array.isArray(item)) {
            throw new BadRequestException(
              `Item at ${fieldPath}[${index}] must be an object`,
            );
          }
          const itemObj = item as Record<string, unknown>;

          // Reject undeclared keys in repeater item
          for (const k of Object.keys(itemObj)) {
            if (!nestedFieldMap.has(k)) {
              throw new BadRequestException(
                `Undeclared field in ${fieldPath}[${index}]: ${k}`,
              );
            }
          }

          // Validate each field of repeater item
          for (const nestedDef of fieldDef.fields!) {
            validateField(
              nestedDef,
              itemObj[nestedDef.key],
              `${fieldPath}[${index}].${nestedDef.key}`,
            );
          }
        });
      }
      break;
    }

    default:
      throw new BadRequestException(
        `Unsupported field type: ${(fieldDef as { type: string }).type}`,
      );
  }
}

/**
 * Validates and normalizes Event.content according to the template definition.
 * Enforces size limits, prototype pollution prevention, undeclared field rejection,
 * and server-controlled schema versioning.
 */
export function validateEventContent(
  content: unknown,
  themeCode: string | null | undefined,
): Record<string, unknown> | null {
  if (content === undefined || content === null) {
    return null;
  }

  if (typeof content !== 'object' || Array.isArray(content)) {
    throw new BadRequestException(
      'Event content must be a JSON object or null',
    );
  }

  checkPrototypePollution(content);

  const serialized = JSON.stringify(content);
  if (Buffer.byteLength(serialized, 'utf8') > MAX_CONTENT_SIZE_BYTES) {
    throw new BadRequestException(
      'Content exceeds maximum allowed size of 64 KiB',
    );
  }

  const rawObj = content as Record<string, unknown>;

  // Reject _templateKey if present
  if ('_templateKey' in rawObj) {
    throw new BadRequestException(
      'Undeclared content field: _templateKey. Template is bound via Event.templateId',
    );
  }

  const definition = getTemplateDefinition(themeCode);

  if (!definition) {
    // Legacy or template without strict registered definition: only null / empty allowed
    const nonVersionKeys = Object.keys(rawObj).filter(
      (k) => k !== '_schemaVersion',
    );
    if (nonVersionKeys.length > 0) {
      throw new BadRequestException(
        'Selected template does not support custom content',
      );
    }
    return null;
  }

  const declaredKeys = new Map<string, ContentFieldDefinition>();
  for (const field of definition.contentFields) {
    declaredKeys.set(field.key, field);
  }

  // Reject undeclared fields at root
  for (const key of Object.keys(rawObj)) {
    if (key === '_schemaVersion') continue;
    if (!declaredKeys.has(key)) {
      throw new BadRequestException(`Undeclared content field: ${key}`);
    }
  }

  // Validate declared fields
  const normalized: Record<string, unknown> = {};

  for (const field of definition.contentFields) {
    const val = rawObj[field.key];
    validateField(field, val, field.key);
    if (val !== undefined) {
      normalized[field.key] = val;
    }
  }

  // Server controls _schemaVersion
  normalized._schemaVersion = definition.schemaVersion;

  return normalized;
}
