import { TemplateDefinition } from './template-definition.types';

export const IVORY_GARDEN_DEFINITION: TemplateDefinition = {
  themeCode: 'IVORY_GARDEN',
  schemaVersion: 1,
  contentFields: [
    {
      key: 'partnerOneName',
      label: 'Nama Pasangan 1',
      type: 'text',
      maxLength: 120,
    },
    {
      key: 'partnerTwoName',
      label: 'Nama Pasangan 2',
      type: 'text',
      maxLength: 120,
    },
    {
      key: 'partnerOneParents',
      label: 'Orang Tua Pasangan 1',
      type: 'text',
      maxLength: 250,
    },
    {
      key: 'partnerTwoParents',
      label: 'Orang Tua Pasangan 2',
      type: 'text',
      maxLength: 250,
    },
    {
      key: 'openingText',
      label: 'Teks Pembuka',
      type: 'textarea',
      maxLength: 2000,
    },
    {
      key: 'prayerText',
      label: 'Teks Doa / Ayat',
      type: 'textarea',
      maxLength: 2000,
    },
    {
      key: 'prayerSource',
      label: 'Sumber Doa / Surat',
      type: 'text',
      maxLength: 120,
    },
    {
      key: 'closingText',
      label: 'Teks Penutup',
      type: 'textarea',
      maxLength: 2000,
    },
    {
      key: 'timeZone',
      label: 'Zona Waktu',
      type: 'select',
      options: [
        { label: 'WIB', value: 'Asia/Jakarta' },
        { label: 'WITA', value: 'Asia/Makassar' },
        { label: 'WIT', value: 'Asia/Jayapura' },
      ],
    },
    {
      key: 'ceremonies',
      label: 'Rangkaian Acara',
      type: 'repeater',
      maxItems: 2,
      fields: [
        {
          key: 'title',
          label: 'Nama Acara',
          type: 'text',
          required: true,
          maxLength: 80,
        },
        {
          key: 'dateTime',
          label: 'Waktu Pelaksanaan',
          type: 'datetime',
          required: true,
        },
        {
          key: 'venue',
          label: 'Tempat Acara',
          type: 'text',
          required: true,
          maxLength: 255,
        },
        {
          key: 'address',
          label: 'Alamat Acara',
          type: 'textarea',
          required: true,
          maxLength: 1000,
        },
        {
          key: 'mapsUrl',
          label: 'Tautan Google Maps',
          type: 'url',
          urlPolicy: 'google-maps',
          maxLength: 2048,
        },
      ],
    },
    {
      key: 'giftAccounts',
      label: 'Rekening Hadiah',
      type: 'repeater',
      maxItems: 3,
      fields: [
        {
          key: 'bankName',
          label: 'Nama Bank',
          type: 'text',
          required: true,
          maxLength: 100,
        },
        {
          key: 'accountNumber',
          label: 'Nomor Rekening',
          type: 'text',
          required: true,
          maxLength: 50,
        },
        {
          key: 'accountHolderName',
          label: 'Nama Pemilik Rekening',
          type: 'text',
          required: true,
          maxLength: 120,
        },
      ],
    },
    { key: 'giftTitle', label: 'Judul Hadiah', type: 'text', maxLength: 80 },
    {
      key: 'giftMessage',
      label: 'Pesan Hadiah',
      type: 'textarea',
      maxLength: 1000,
    },
    {
      key: 'mapsUrl',
      label: 'Tautan Google Maps Utama',
      type: 'url',
      urlPolicy: 'google-maps',
      maxLength: 2048,
    },
  ],
  mediaSlots: [
    {
      key: 'hero',
      label: 'Foto Utama',
      mediaType: 'PHOTO',
      multiple: false,
      maxItems: 1,
      maxSizeBytes: 5 * 1024 * 1024,
    },
    {
      key: 'gallery',
      label: 'Galeri Foto',
      mediaType: 'PHOTO',
      multiple: true,
      maxItems: 6,
      maxSizeBytes: 5 * 1024 * 1024,
    },
    {
      key: 'bg-music',
      label: 'Musik Latar',
      mediaType: 'AUDIO',
      multiple: false,
      maxItems: 1,
      maxSizeBytes: 10 * 1024 * 1024,
    },
  ],
};

export const SERENE_GARDEN_DEFINITION: TemplateDefinition = {
  themeCode: 'SERENE_GARDEN',
  schemaVersion: 1,
  contentFields: [
    {
      key: 'partnerOneName',
      label: 'Nama Pasangan 1',
      type: 'text',
      required: true,
      maxLength: 50,
    },
    {
      key: 'partnerTwoName',
      label: 'Nama Pasangan 2',
      type: 'text',
      required: true,
      maxLength: 50,
    },
    {
      key: 'partnerOneFullName',
      label: 'Nama Lengkap Pasangan 1',
      type: 'text',
      maxLength: 120,
    },
    {
      key: 'partnerTwoFullName',
      label: 'Nama Lengkap Pasangan 2',
      type: 'text',
      maxLength: 120,
    },
    {
      key: 'partnerOneParents',
      label: 'Orang Tua / Keluarga Pasangan 1',
      type: 'textarea',
      maxLength: 300,
    },
    {
      key: 'partnerTwoParents',
      label: 'Orang Tua / Keluarga Pasangan 2',
      type: 'textarea',
      maxLength: 300,
    },
    {
      key: 'openingText',
      label: 'Teks Pembuka / Pengantar',
      type: 'textarea',
      maxLength: 1500,
    },
    {
      key: 'prayerText',
      label: 'Teks Doa',
      type: 'textarea',
      maxLength: 2000,
    },
    {
      key: 'closingText',
      label: 'Teks Penutup',
      type: 'textarea',
      maxLength: 1200,
    },
    {
      key: 'timeZone',
      label: 'Zona Waktu',
      type: 'select',
      required: true,
      options: [
        { label: 'WIB', value: 'Asia/Jakarta' },
        { label: 'WITA', value: 'Asia/Makassar' },
        { label: 'WIT', value: 'Asia/Jayapura' },
      ],
    },
    {
      key: 'ceremonies',
      label: 'Rangkaian Acara',
      type: 'repeater',
      maxItems: 2,
      fields: [
        {
          key: 'title',
          label: 'Nama Acara',
          type: 'text',
          required: true,
          maxLength: 60,
        },
        {
          key: 'startDateTime',
          label: 'Waktu Mulai',
          type: 'datetime',
          required: true,
        },
        {
          key: 'endDateTime',
          label: 'Waktu Selesai',
          type: 'datetime',
        },
        {
          key: 'venue',
          label: 'Tempat Acara',
          type: 'text',
          required: true,
          maxLength: 150,
        },
        {
          key: 'address',
          label: 'Alamat Acara',
          type: 'textarea',
          maxLength: 500,
        },
        {
          key: 'mapsUrl',
          label: 'Tautan Google Maps',
          type: 'url',
          urlPolicy: 'google-maps',
          maxLength: 2048,
        },
      ],
    },
    {
      key: 'giftTitle',
      label: 'Judul Hadiah',
      type: 'text',
      maxLength: 60,
    },
    {
      key: 'giftMessage',
      label: 'Pesan Hadiah',
      type: 'textarea',
      maxLength: 1000,
    },
    {
      key: 'giftAccounts',
      label: 'Rekening Hadiah',
      type: 'repeater',
      maxItems: 3,
      fields: [
        {
          key: 'bankName',
          label: 'Nama Bank',
          type: 'text',
          required: true,
          maxLength: 100,
        },
        {
          key: 'accountNumber',
          label: 'Nomor Rekening',
          type: 'text',
          required: true,
          maxLength: 50,
        },
        {
          key: 'accountHolderName',
          label: 'Nama Pemilik Rekening',
          type: 'text',
          required: true,
          maxLength: 120,
        },
      ],
    },
  ],
  mediaSlots: [
    {
      key: 'partner-one-photo',
      label: 'Foto Mempelai 1',
      mediaType: 'PHOTO',
      multiple: false,
      maxItems: 1,
      maxSizeBytes: 5 * 1024 * 1024,
    },
    {
      key: 'partner-two-photo',
      label: 'Foto Mempelai 2',
      mediaType: 'PHOTO',
      multiple: false,
      maxItems: 1,
      maxSizeBytes: 5 * 1024 * 1024,
    },
  ],
};

const builtInDefinitions: Record<string, TemplateDefinition> = {
  IVORY_GARDEN: IVORY_GARDEN_DEFINITION,
  SERENE_GARDEN: SERENE_GARDEN_DEFINITION,
};

const customDefinitions: Record<string, TemplateDefinition> = {};

export function getTemplateDefinition(
  themeCode: string | null | undefined,
): TemplateDefinition | undefined {
  if (!themeCode) return undefined;
  const upper = themeCode.trim().toUpperCase();
  return customDefinitions[upper] || builtInDefinitions[upper];
}

export function hasTemplateDefinition(
  themeCode: string | null | undefined,
): boolean {
  return getTemplateDefinition(themeCode) !== undefined;
}

export function registerTemplateDefinition(
  definition: TemplateDefinition,
): void {
  const upper = definition.themeCode.trim().toUpperCase();
  customDefinitions[upper] = definition;
}

export function clearCustomTemplateDefinitions(): void {
  for (const key of Object.keys(customDefinitions)) {
    delete customDefinitions[key];
  }
}

export function getAllTemplateDefinitions(): TemplateDefinition[] {
  return [
    ...Object.values(builtInDefinitions),
    ...Object.values(customDefinitions),
  ];
}
