/**
 * Template Studio Model — Pure functions for editor state management.
 * No React, no DOM, no side effects. Testable with node:test.
 */

// ── Types ──

export interface ThemeColors {
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  textColor: string;
}

export type ThemeColorKey = keyof ThemeColors;

export interface Typography {
  headingFont: string;
  bodyFont: string;
}

export interface SectionConfig {
  id: string;
  enabled: boolean;
  order: number;
  variant: string;
}

export interface TemplateConfigV1 {
  version: 1;
  theme: ThemeColors;
  typography: Typography;
  sections: SectionConfig[];
}

export interface EditorSnapshot {
  name: string;
  config: TemplateConfigV1;
}

export interface CreatePayload {
  name: string;
  themeCode: string;
  config: TemplateConfigV1;
}

export interface UpdatePayload {
  name: string;
  config: TemplateConfigV1;
}

export interface PreviewMessagePayload {
  name: string;
  config: TemplateConfigV1;
}

export interface PreviewMessage {
  type: 'TEMPLATE_PREVIEW_UPDATE';
  version: 1;
  payload: PreviewMessagePayload;
}

export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

// ── Constants ──

const HEX_COLOR_REGEX = /^#[0-9A-Fa-f]{6}$/;

export const ALLOWED_FONTS = ['INTER', 'PLAYFAIR_DISPLAY', 'LORA', 'MONTSERRAT'] as const;

export const SECTION_IDS = [
  'hero', 'greeting', 'eventDetails', 'countdown',
  'gallery', 'location', 'rsvp', 'guestQr', 'closing',
] as const;

export const SECTION_LABELS: Record<string, string> = {
  hero: 'Hero',
  greeting: 'Greeting',
  eventDetails: 'Event Details',
  countdown: 'Countdown',
  gallery: 'Gallery',
  location: 'Location',
  rsvp: 'RSVP',
  guestQr: 'Guest QR',
  closing: 'Closing',
};

export type PresetId = 'classic-elegance' | 'modern-minimal' | 'romantic-garden';

// ── Presets ──

const PRESETS: Record<PresetId, TemplateConfigV1> = {
  'classic-elegance': {
    version: 1,
    theme: {
      primaryColor: '#1c1917',
      secondaryColor: '#78716c',
      backgroundColor: '#fafaf9',
      textColor: '#292524',
    },
    typography: {
      headingFont: 'PLAYFAIR_DISPLAY',
      bodyFont: 'LORA',
    },
    sections: [
      { id: 'hero', enabled: true, order: 1, variant: 'default' },
      { id: 'greeting', enabled: true, order: 2, variant: 'default' },
      { id: 'eventDetails', enabled: true, order: 3, variant: 'default' },
      { id: 'countdown', enabled: true, order: 4, variant: 'default' },
      { id: 'gallery', enabled: true, order: 5, variant: 'default' },
      { id: 'location', enabled: true, order: 6, variant: 'default' },
      { id: 'rsvp', enabled: true, order: 7, variant: 'default' },
      { id: 'guestQr', enabled: false, order: 8, variant: 'default' },
      { id: 'closing', enabled: true, order: 9, variant: 'default' },
    ],
  },
  'modern-minimal': {
    version: 1,
    theme: {
      primaryColor: '#111827',
      secondaryColor: '#6b7280',
      backgroundColor: '#ffffff',
      textColor: '#111827',
    },
    typography: {
      headingFont: 'MONTSERRAT',
      bodyFont: 'INTER',
    },
    sections: [
      { id: 'hero', enabled: true, order: 1, variant: 'default' },
      { id: 'eventDetails', enabled: true, order: 2, variant: 'default' },
      { id: 'greeting', enabled: true, order: 3, variant: 'default' },
      { id: 'location', enabled: true, order: 4, variant: 'default' },
      { id: 'rsvp', enabled: true, order: 5, variant: 'default' },
      { id: 'gallery', enabled: false, order: 6, variant: 'default' },
      { id: 'countdown', enabled: false, order: 7, variant: 'default' },
      { id: 'guestQr', enabled: false, order: 8, variant: 'default' },
      { id: 'closing', enabled: false, order: 9, variant: 'default' },
    ],
  },
  'romantic-garden': {
    version: 1,
    theme: {
      primaryColor: '#881337',
      secondaryColor: '#9f1239',
      backgroundColor: '#fff1f2',
      textColor: '#4c0519',
    },
    typography: {
      headingFont: 'PLAYFAIR_DISPLAY',
      bodyFont: 'INTER',
    },
    sections: [
      { id: 'hero', enabled: true, order: 1, variant: 'default' },
      { id: 'greeting', enabled: true, order: 2, variant: 'default' },
      { id: 'eventDetails', enabled: true, order: 3, variant: 'default' },
      { id: 'gallery', enabled: true, order: 4, variant: 'default' },
      { id: 'countdown', enabled: true, order: 5, variant: 'default' },
      { id: 'location', enabled: true, order: 6, variant: 'default' },
      { id: 'rsvp', enabled: true, order: 7, variant: 'default' },
      { id: 'guestQr', enabled: false, order: 8, variant: 'default' },
      { id: 'closing', enabled: true, order: 9, variant: 'default' },
    ],
  },
};

export const PRESET_META: Record<PresetId, { label: string }> = {
  'classic-elegance': { label: 'Classic Elegance' },
  'modern-minimal': { label: 'Modern Minimal' },
  'romantic-garden': { label: 'Romantic Garden' },
};

// ── Preset Functions ──

export function createPresetConfig(presetId: PresetId): TemplateConfigV1 {
  const preset = PRESETS[presetId];
  return JSON.parse(JSON.stringify(preset)) as TemplateConfigV1;
}

export function getPresetIds(): PresetId[] {
  return Object.keys(PRESETS) as PresetId[];
}

// ── Color Functions ──

export function isValidHexColor(value: string): boolean {
  return HEX_COLOR_REGEX.test(value);
}

export function updateThemeColor(
  config: TemplateConfigV1,
  colorKey: ThemeColorKey,
  value: string,
): TemplateConfigV1 {
  return {
    ...config,
    theme: {
      ...config.theme,
      [colorKey]: value,
    },
  };
}

// ── Typography Functions ──

export function isAllowedFont(fontKey: string): boolean {
  return (ALLOWED_FONTS as readonly string[]).includes(fontKey);
}

export function updateTypography(
  config: TemplateConfigV1,
  field: 'headingFont' | 'bodyFont',
  fontKey: string,
): TemplateConfigV1 {
  return {
    ...config,
    typography: {
      ...config.typography,
      [field]: fontKey,
    },
  };
}

// ── Section Functions ──

export function normalizeSectionOrder(sections: SectionConfig[]): SectionConfig[] {
  return sections.map((s, i) => ({ ...s, order: i + 1 }));
}

export function toggleSection(
  config: TemplateConfigV1,
  sectionId: string,
  enabled: boolean,
): TemplateConfigV1 {
  // eventDetails cannot be disabled
  if (sectionId === 'eventDetails' && !enabled) {
    return config;
  }

  const sections = config.sections.map((s) =>
    s.id === sectionId ? { ...s, enabled } : s
  );

  return { ...config, sections };
}

export function moveSection(
  config: TemplateConfigV1,
  sectionId: string,
  direction: 'up' | 'down',
): TemplateConfigV1 {
  const sorted = [...config.sections].sort((a, b) => a.order - b.order);
  const idx = sorted.findIndex((s) => s.id === sectionId);

  if (idx === -1) return config;
  if (direction === 'up' && idx === 0) return config;
  if (direction === 'down' && idx === sorted.length - 1) return config;

  const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
  const newSections = [...sorted];
  [newSections[idx], newSections[swapIdx]] = [newSections[swapIdx], newSections[idx]];

  return { ...config, sections: normalizeSectionOrder(newSections) };
}

export function reorderSections(
  config: TemplateConfigV1,
  fromIndex: number,
  toIndex: number,
): TemplateConfigV1 {
  const sorted = [...config.sections].sort((a, b) => a.order - b.order);

  if (fromIndex < 0 || fromIndex >= sorted.length) return config;
  if (toIndex < 0 || toIndex >= sorted.length) return config;
  if (fromIndex === toIndex) return config;

  const [moved] = sorted.splice(fromIndex, 1);
  sorted.splice(toIndex, 0, moved);

  return { ...config, sections: normalizeSectionOrder(sorted) };
}

// ── Snapshot / Dirty ──

export function createEditorSnapshot(name: string, config: TemplateConfigV1): EditorSnapshot {
  return {
    name,
    config: JSON.parse(JSON.stringify(config)) as TemplateConfigV1,
  };
}

export function isEditorDirty(initial: EditorSnapshot, current: EditorSnapshot): boolean {
  return JSON.stringify(initial) !== JSON.stringify(current);
}

// ── Payload ──

export function buildTemplatePayload(
  snapshot: EditorSnapshot,
  mode: 'create' | 'edit',
  themeCode: string = 'GENERIC',
): CreatePayload | UpdatePayload {
  const config: TemplateConfigV1 = {
    ...snapshot.config,
    sections: normalizeSectionOrder(
      [...snapshot.config.sections].sort((a, b) => a.order - b.order)
    ),
  };

  if (mode === 'create') {
    return {
      name: snapshot.name,
      themeCode,
      config,
    };
  }

  return {
    name: snapshot.name,
    config,
  };
}

export function buildPreviewMessage(snapshot: EditorSnapshot): PreviewMessage {
  return {
    type: 'TEMPLATE_PREVIEW_UPDATE',
    version: 1,
    payload: {
      name: snapshot.name,
      config: {
        ...snapshot.config,
        sections: normalizeSectionOrder(
          [...snapshot.config.sections].sort((a, b) => a.order - b.order)
        ),
      },
    },
  };
}

// ── Validation ──

export function validateEditorState(snapshot: EditorSnapshot): ValidationResult {
  const errors: ValidationError[] = [];

  if (!snapshot.name || snapshot.name.trim().length === 0) {
    errors.push({ field: 'name', message: 'Template name is required' });
  }

  const { theme } = snapshot.config;
  const colorKeys: ThemeColorKey[] = ['primaryColor', 'secondaryColor', 'backgroundColor', 'textColor'];
  for (const key of colorKeys) {
    if (!isValidHexColor(theme[key])) {
      errors.push({ field: `theme.${key}`, message: `Invalid hex color: ${theme[key]}` });
    }
  }

  if (!isAllowedFont(snapshot.config.typography.headingFont)) {
    errors.push({ field: 'typography.headingFont', message: 'Invalid heading font' });
  }
  if (!isAllowedFont(snapshot.config.typography.bodyFont)) {
    errors.push({ field: 'typography.bodyFont', message: 'Invalid body font' });
  }

  const hasEventDetails = snapshot.config.sections.some(
    (s) => s.id === 'eventDetails' && s.enabled
  );
  if (!hasEventDetails) {
    errors.push({ field: 'sections', message: 'Event Details section must be enabled' });
  }

  const orders = snapshot.config.sections.map((s) => s.order);
  const uniqueOrders = new Set(orders);
  if (uniqueOrders.size !== orders.length) {
    errors.push({ field: 'sections', message: 'Section orders must be unique' });
  }

  return { valid: errors.length === 0, errors };
}
