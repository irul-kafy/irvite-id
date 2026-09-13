export type ContentFieldType =
  'text' | 'textarea' | 'datetime' | 'url' | 'select' | 'repeater';

export interface ContentFieldDefinition {
  key: string;
  label: string;
  type: ContentFieldType;
  required?: boolean;
  maxLength?: number;
  options?: Array<{
    label: string;
    value: string;
  }>;
  maxItems?: number;
  fields?: ContentFieldDefinition[];
  urlPolicy?: 'https' | 'google-maps';
}

export interface MediaSlotDefinition {
  key: string;
  label: string;
  mediaType: 'PHOTO' | 'VIDEO' | 'AUDIO' | 'THUMBNAIL';
  required?: boolean;
  multiple?: boolean;
  maxItems?: number;
  maxSizeBytes?: number;
}

export interface TemplateDefinition {
  themeCode: string;
  schemaVersion: number;
  contentFields: ContentFieldDefinition[];
  mediaSlots: MediaSlotDefinition[];
}
