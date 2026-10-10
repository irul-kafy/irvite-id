'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  buildTemplatePackageFormData,
  ParsedTemplatePackage,
  readTemplatePackage,
  TEMPLATE_PACKAGE_EXAMPLE,
} from '../utils/template-package';

export function TemplatePackageImporter() {
  const router = useRouter();
  const [pkg, setPackage] = useState<ParsedTemplatePackage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const invitationOrigin = process.env.NEXT_PUBLIC_INVITATION_ORIGIN || 'http://localhost:3002';
  const previewSrc = `${invitationOrigin}/preview/template`;

  const sendPreview = useCallback(() => {
    if (!pkg || !iframeRef.current?.contentWindow) return;
    iframeRef.current.contentWindow.postMessage(
      {
        type: 'TEMPLATE_PREVIEW_UPDATE',
        version: 1,
        payload: { name: pkg.manifest.name, config: pkg.manifest.config,
          assets: pkg.assets.map(({ slot, order, blob }) => ({ slot, order, blob })),
        },
      },
      invitationOrigin,
    );
  }, [invitationOrigin, pkg]);

  useEffect(() => {
    const receiveReady = (event: MessageEvent) => {
      if (
        event.origin === invitationOrigin &&
        event.source === iframeRef.current?.contentWindow &&
        event.data?.type === 'PREVIEW_READY'
      ) sendPreview();
    };
    window.addEventListener('message', receiveReady);
    return () => window.removeEventListener('message', receiveReady);
  }, [invitationOrigin, sendPreview]);

  useEffect(() => sendPreview(), [sendPreview]);

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      setPackage(await readTemplatePackage(file));
    } catch (cause) {
      setPackage(null);
      setError(cause instanceof Error ? cause.message : 'Paket tidak dapat dibaca.');
    } finally {
      setBusy(false);
    }
  };

  const handleSave = async () => {
    if (!pkg) return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch('/api/templates/package', {
        method: 'POST',
        body: buildTemplatePackageFormData(pkg),
      });
      const result = await response.json().catch(() => ({}));
      if (response.status === 401) {
        router.push('/login');
        return;
      }
      if (!response.ok) throw new Error(result.message || 'Paket gagal disimpan.');
      setSaved(true);
      window.setTimeout(() => router.push('/templates'), 700);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Paket gagal disimpan.');
    } finally {
      setBusy(false);
    }
  };

  const downloadExample = () => {
    const blob = new Blob([JSON.stringify(TEMPLATE_PACKAGE_EXAMPLE, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'manifest-template-irvite.json';
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="package-import">
      <section className="package-import__panel" aria-labelledby="package-import-title">
        <div className="package-import__heading">
          <div>
            <span className="studio-badge studio-badge--fixed">SUPER_ADMIN · DRAFT FIRST</span>
            <h2 id="package-import-title">Impor paket template</h2>
            <p>JSON untuk konfigurasi tanpa aset, atau ZIP berisi manifest dan aset visual.</p>
            <p>Paket memakai layout bawaan yang bisa diatur warna, font, urutan bagian, background, ornamen, dan musiknya. Desain HTML/React lama perlu diadaptasi dahulu agar layout dan animasinya tetap sama.</p>
            <details><summary>Cara menyiapkan ZIP</summary><p>Letakkan <code>manifest.json</code> langsung di dalam ZIP bersama folder <code>assets/</code>. Tambahkan properti <code>assets</code> ke contoh JSON: thumbnail, background, ornaments (maks. 8 path gambar), dan music (path MP3). Contoh: <code>{'{"background":"assets/background.png","music":"assets/music.mp3"}'}</code>. Gambar maks. 5 MB, musik maks. 10 MB; total maks. 30 MB. Jangan masukkan HTML, JS, CSS, atau folder project.</p></details>
          </div>
          <button type="button" className="studio-btn studio-btn--secondary" onClick={downloadExample}>
            Unduh contoh JSON
          </button>
        </div>

        <label className={`package-dropzone ${busy ? 'package-dropzone--busy' : ''}`}>
          <input
            type="file"
            accept=".json,.zip,application/json,application/zip"
            disabled={busy}
            onChange={(event) => void handleFile(event.target.files?.[0])}
          />
          <span className="package-dropzone__icon" aria-hidden="true">⇧</span>
          <strong>{busy ? 'Memeriksa paket…' : 'Pilih JSON atau ZIP'}</strong>
          <span>Maksimum 30 MB · aset PNG, JPEG, WebP, atau MP3</span>
        </label>

        {error && <div className="studio-banner studio-banner--error" role="alert">{error}</div>}
        {saved && <div className="studio-banner studio-banner--success" role="status">Draft tersimpan. Pilih status AVAILABLE di katalog untuk mempublikasikan.</div>}

        {pkg && (
          <div className="package-summary">
            <div className="package-summary__title">
              <div>
                <span>{pkg.sourceName}</span>
                <h3>{pkg.manifest.name}</h3>
              </div>
              <code>{pkg.manifest.themeCode}</code>
            </div>
            <dl className="package-summary__facts">
              <div><dt>Renderer</dt><dd>{pkg.manifest.renderer}</dd></div>
              <div><dt>Aset</dt><dd>{pkg.assets.length} file</dd></div>
              <div><dt>Status awal</dt><dd>HIDDEN</dd></div>
              <div><dt>Section aktif</dt><dd>{pkg.manifest.config.sections.filter((section) => section.enabled).length}</dd></div>
            </dl>
            <div className="package-summary__palette" aria-label="Warna template">
              {Object.values(pkg.manifest.config.theme).map((color) => (
                <span key={color} style={{ backgroundColor: color }} title={color} />
              ))}
            </div>
            {pkg.assets.length > 0 && (
              <ul className="package-assets">
                {pkg.assets.map((asset) => (
                  <li key={asset.fieldName}><span>{asset.slot}</span><code>{asset.path}</code></li>
                ))}
              </ul>
            )}
            <button type="button" className="studio-btn studio-btn--primary package-save" onClick={handleSave} disabled={busy || saved}>
              {busy ? 'Menyimpan…' : saved ? 'Tersimpan' : 'Simpan sebagai Draft'}
            </button>
          </div>
        )}
      </section>

      <aside className="studio-preview package-import__preview" aria-label="Preview template hasil impor">
        <div className="studio-preview__header">
          <span className="studio-preview__label">Preview aman</span>
          <span className="studio-preview__sections-count">Tidak menjalankan kode dari ZIP</span>
        </div>
        <div className="studio-preview__phone-frame">
          {!pkg && <div className="studio-preview__overlay"><span className="studio-preview__overlay-text">Pilih paket untuk melihat preview</span></div>}
          <iframe
            ref={iframeRef}
            src={previewSrc}
            title="Preview template impor"
            className="studio-preview__iframe"
            sandbox="allow-scripts allow-same-origin"
            onLoad={sendPreview}
          />
        </div>
      </aside>
    </div>
  );
}
