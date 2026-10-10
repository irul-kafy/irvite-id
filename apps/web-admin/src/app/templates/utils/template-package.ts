import JSZip from 'jszip';
import {
  createEditorSnapshot,
  SECTION_IDS,
  TemplateConfigV1,
  validateEditorState,
} from './template-studio-model';

export const CLIENT_PACKAGE_LIMITS = {
  inputBytes: 30 * 1024 * 1024,
  manifestBytes: 64 * 1024,
  files: 12,
  totalAssetBytes: 30 * 1024 * 1024,
} as const;

export type PackageAssetSlot = 'thumbnail' | 'background' | 'ornament' | 'music';

export interface PackageManifest {
  schemaVersion: 1;
  name: string;
  themeCode: string;
  renderer: 'GENERIC';
  config: TemplateConfigV1;
  assets?: {
    thumbnail?: string;
    background?: string;
    ornaments?: string[];
    music?: string;
  };
}

export interface ParsedPackageAsset {
  fieldName: string;
  slot: PackageAssetSlot;
  order: number;
  path: string;
  blob: Blob;
}

export interface ParsedTemplatePackage {
  manifest: PackageManifest;
  manifestJson: string;
  assets: ParsedPackageAsset[];
  sourceName: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function safeAssetPath(value: unknown, label: string): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== 'string' || value.length === 0 || value.length > 240) {
    throw new Error(`${label} harus berupa path file yang valid.`);
  }
  const normalized = value.replaceAll('\\', '/');
  if (normalized.startsWith('/') || normalized.split('/').some((part) => !part || part === '.' || part === '..') || /[:\x00-\x1f]/.test(normalized)) {
    throw new Error(`${label} mengandung path yang tidak aman.`);
  }
  return normalized;
}

export function parsePackageManifest(raw: string): PackageManifest {
  if (new TextEncoder().encode(raw).byteLength > CLIENT_PACKAGE_LIMITS.manifestBytes) {
    throw new Error('manifest.json melebihi batas 64 KB.');
  }
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    throw new Error('File JSON tidak valid.');
  }
  if (!isRecord(value)) throw new Error('Manifest harus berupa object JSON.');
  if (Object.keys(value).some((key) => !['schemaVersion', 'name', 'themeCode', 'renderer', 'config', 'assets'].includes(key))) throw new Error('Properti manifest tidak dikenal.');
  if (value.schemaVersion !== 1) throw new Error('Hanya schemaVersion 1 yang didukung.');
  if (typeof value.name !== 'string' || value.name.trim().length < 2 || value.name.trim().length > 120) {
    throw new Error('Nama template harus berisi 2–120 karakter.');
  }
  if (typeof value.themeCode !== 'string' || !/^[A-Z][A-Z0-9_]{2,59}$/.test(value.themeCode)) {
    throw new Error('themeCode harus huruf besar, angka, atau underscore.');
  }
  if (value.renderer !== 'GENERIC') {
    throw new Error('Paket manual hanya boleh memakai renderer GENERIC yang aman.');
  }
  if (
    !isRecord(value.config) ||
    value.config.version !== 1 ||
    !isRecord(value.config.theme) ||
    !isRecord(value.config.typography) ||
    !Array.isArray(value.config.sections) ||
    value.config.sections.length > 9
  ) {
    throw new Error('Struktur config template tidak valid.');
  }
  if (value.config.sections.some((section) => !isRecord(section) || !(SECTION_IDS as readonly unknown[]).includes(section.id) || typeof section.enabled !== 'boolean' || !Number.isSafeInteger(section.order) || section.variant !== 'default')) {
    throw new Error('Struktur section tidak valid.');
  }
  if (new Set(value.config.sections.map((section) => (section as Record<string, unknown>).id)).size !== value.config.sections.length) throw new Error('Section tidak boleh duplikat.');
  const validation = validateEditorState(
    createEditorSnapshot(value.name.trim(), value.config as unknown as TemplateConfigV1),
  );
  if (!validation.valid) throw new Error(validation.errors[0]?.message || 'Konfigurasi tidak valid.');

  let assets: PackageManifest['assets'];
  if (value.assets !== undefined) {
    if (!isRecord(value.assets)) throw new Error('assets harus berupa object.');
    if (Object.keys(value.assets).some((key) => !['thumbnail', 'background', 'ornaments', 'music'].includes(key))) throw new Error('Properti aset tidak dikenal.');
    const ornamentsValue = value.assets.ornaments;
    let ornaments: string[] | undefined;
    if (ornamentsValue !== undefined) {
      if (!Array.isArray(ornamentsValue) || ornamentsValue.length > 8 || ornamentsValue.some((item) => typeof item !== 'string')) {
        throw new Error('Maksimal 8 ornament dalam satu paket.');
      }
      ornaments = ornamentsValue.map((item, index) => safeAssetPath(item, `ornaments[${index}]`) as string);
    }
    assets = {
      thumbnail: safeAssetPath(value.assets.thumbnail, 'thumbnail'),
      background: safeAssetPath(value.assets.background, 'background'),
      ornaments,
      music: safeAssetPath(value.assets.music, 'music'),
    };
  }

  return {
    schemaVersion: 1,
    name: value.name.trim(),
    themeCode: value.themeCode,
    renderer: 'GENERIC',
    config: value.config as unknown as TemplateConfigV1,
    assets,
  };
}

function declaredAssets(manifest: PackageManifest) {
  const items: Array<{ path: string; slot: PackageAssetSlot; order: number }> = [];
  if (manifest.assets?.thumbnail) items.push({ path: manifest.assets.thumbnail, slot: 'thumbnail', order: 0 });
  if (manifest.assets?.background) items.push({ path: manifest.assets.background, slot: 'background', order: 0 });
  manifest.assets?.ornaments?.forEach((path, order) => items.push({ path, slot: 'ornament', order }));
  if (manifest.assets?.music) items.push({ path: manifest.assets.music, slot: 'music', order: 0 });
  return items;
}

function readBoundedEntry(entry: JSZip.JSZipObject, limit: number): Promise<Uint8Array<ArrayBuffer>> {
  return new Promise((resolve, reject) => {
    const chunks: Uint8Array[] = [];
    let size = 0;
    // JSZip 3.10 exposes this documented method at runtime but omits it from
    // JSZipObject's bundled declaration (zipObject.js).
    const stream = (entry as JSZip.JSZipObject & {
      internalStream(type: 'uint8array'): JSZip.JSZipStreamHelper<Uint8Array>;
    }).internalStream('uint8array');
    stream.on('data', (chunk: Uint8Array) => {
      size += chunk.byteLength;
      if (size > limit) {
        stream.pause();
        chunks.length = 0;
        reject(new Error(`File ${entry.name} setelah diekstrak melebihi batas ukuran.`));
        return;
      }
      chunks.push(chunk);
    });
    stream.on('error', reject);
    stream.on('end', () => {
      const bytes = new Uint8Array(size);
      let offset = 0;
      for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
      resolve(bytes);
    });
    stream.resume();
  });
}

export async function readTemplatePackage(file: File): Promise<ParsedTemplatePackage> {
  if (file.size > CLIENT_PACKAGE_LIMITS.inputBytes) throw new Error('File melebihi batas 30 MB.');
  const lowerName = file.name.toLowerCase();

  if (lowerName.endsWith('.json')) {
    if (file.size > CLIENT_PACKAGE_LIMITS.manifestBytes) throw new Error('manifest.json melebihi batas 64 KB.');
    const manifestJson = await file.text();
    const manifest = parsePackageManifest(manifestJson);
    if (declaredAssets(manifest).length > 0) {
      throw new Error('Manifest dengan aset harus diunggah sebagai ZIP.');
    }
    return { manifest, manifestJson: JSON.stringify(manifest), assets: [], sourceName: file.name };
  }
  if (!lowerName.endsWith('.zip')) throw new Error('Gunakan file .json atau .zip.');

  let zip: JSZip;
  try {
    // Do not eagerly inflate the entire archive for CRC checking. Every entry is
    // decoded below with a streaming output limit, including dishonest ZIP sizes.
    zip = await JSZip.loadAsync(await file.arrayBuffer(), { createFolders: false });
  } catch {
    throw new Error('ZIP rusak atau tidak dapat dibaca.');
  }
  const fileEntries = Object.values(zip.files).filter((entry) => !entry.dir);
  for (const entry of fileEntries) {
    safeAssetPath(entry.unsafeOriginalName ?? entry.name, 'ZIP entry');
  }
  if (fileEntries.length > CLIENT_PACKAGE_LIMITS.files + 1) {
    throw new Error('Paket berisi terlalu banyak file.');
  }
  const manifestEntry = zip.file('manifest.json');
  if (!manifestEntry) throw new Error('ZIP wajib memiliki manifest.json di folder utama.');
  const manifestJson = new TextDecoder().decode(await readBoundedEntry(manifestEntry, CLIENT_PACKAGE_LIMITS.manifestBytes));
  const manifest = parsePackageManifest(manifestJson);
  const declarations = declaredAssets(manifest);
  const declaredPaths = new Set(['manifest.json', ...declarations.map((item) => item.path)]);
  const undeclared = fileEntries.find((entry) => !declaredPaths.has(entry.name));
  if (undeclared) throw new Error(`File ${undeclared.name} tidak dideklarasikan di manifest.`);
  if (declarations.length > CLIENT_PACKAGE_LIMITS.files) throw new Error('Maksimal 12 aset per paket.');

  const assets: ParsedPackageAsset[] = [];
  let totalBytes = 0;
  for (const [index, declaration] of declarations.entries()) {
    const entry = zip.file(declaration.path);
    if (!entry) throw new Error(`Aset ${declaration.path} tidak ditemukan di ZIP.`);
    const extension = declaration.path.split('.').at(-1)?.toLowerCase();
    const mime = declaration.slot === 'music'
      ? (extension === 'mp3' ? 'audio/mpeg' : undefined)
      : ({ png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp' } as Record<string, string>)[extension ?? ''];
    if (!mime) throw new Error(`Format aset ${declaration.path} tidak didukung.`);
    const fileLimit = (declaration.slot === 'music' ? 10 : 5) * 1024 * 1024;
    const bytes = await readBoundedEntry(entry, Math.min(fileLimit, CLIENT_PACKAGE_LIMITS.totalAssetBytes - totalBytes));
    totalBytes += bytes.byteLength;
    if (totalBytes > CLIENT_PACKAGE_LIMITS.totalAssetBytes) {
      throw new Error('Total aset setelah diekstrak melebihi 30 MB.');
    }
    const copiedBytes = new Uint8Array(bytes.byteLength);
    copiedBytes.set(bytes);
    assets.push({
      fieldName: `asset_${index}`,
      slot: declaration.slot,
      order: declaration.order,
      path: declaration.path,
      blob: new Blob([copiedBytes.buffer], { type: mime }),
    });
  }
  return { manifest, manifestJson: JSON.stringify(manifest), assets, sourceName: file.name };
}

export function buildTemplatePackageFormData(pkg: ParsedTemplatePackage): FormData {
  const formData = new FormData();
  formData.append('manifest', pkg.manifestJson);
  formData.append('assets', JSON.stringify(pkg.assets.map(({ fieldName, slot, order }) => ({ fieldName, slot, order }))));
  for (const asset of pkg.assets) formData.append(asset.fieldName, asset.blob, asset.path.split('/').at(-1));
  return formData;
}

export const TEMPLATE_PACKAGE_EXAMPLE: PackageManifest = {
  schemaVersion: 1,
  name: 'Nama Template Baru',
  themeCode: 'NAMA_TEMPLATE_BARU',
  renderer: 'GENERIC',
  config: {
    version: 1,
    theme: {
      primaryColor: '#173F5F',
      secondaryColor: '#C9A86A',
      backgroundColor: '#F5F0E8',
      textColor: '#20242A',
    },
    typography: { headingFont: 'PLAYFAIR_DISPLAY', bodyFont: 'INTER' },
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
};
