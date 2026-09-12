'use client';

import { useState, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface PreviewRow {
  sourceRow: number;
  name: string;
  category: string;
  phoneNumber?: string | null;
  email?: string | null;
  maxPax: number;
  status: string;
  reasons: string[];
  duplicateMatch?: string;
}

interface PreviewResponse {
  totalRows: number;
  validRows: number;
  duplicateRows: number;
  invalidRows: number;
  rows: PreviewRow[];
}

interface ImportResultItem {
  sourceRow: number;
  name: string;
  category: string;
  phoneNumber?: string | null;
  email?: string | null;
  maxPax: number;
  status: string;
  reason?: string;
  guestId?: string;
  uniqueCode?: string;
  canonicalUrl?: string;
}

interface ConfirmResponse {
  totalProcessed: number;
  importedCount: number;
  skippedDuplicateCount: number;
  invalidCount: number;
  failedCount: number;
  results: ImportResultItem[];
}

function IconArrowLeft() {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M16 10H4M9 5l-5 5 5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function IconDownload() {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M10 3v10m0 0l-4-4m4 4l4-4M3 17h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function IconUpload() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 16V4M8 8l4-4 4 4M4 20h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function IconCheckCircle() {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="10" cy="10" r="8" stroke="#16a34a" strokeWidth="1.8" fill="none"/>
      <path d="M7 10l2 2 4-4" stroke="#16a34a" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function IconAlertTriangle() {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M10 3l8 14H2L10 3zM10 8v4m0 3h.01" stroke="#d97706" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function IconXCircle() {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="10" cy="10" r="8" stroke="#dc2626" strokeWidth="1.8" fill="none"/>
      <path d="M7 7l6 6M13 7l-6 6" stroke="#dc2626" strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  );
}

function IconCopy() {
  return (
    <svg width="14" height="14" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="7" y="7" width="10" height="10" rx="2" stroke="currentColor" strokeWidth="1.8"/>
      <path d="M13 7V5a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2" stroke="currentColor" strokeWidth="1.8"/>
    </svg>
  );
}

export default function GuestImportPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = use(params);
  const router = useRouter();

  const [tab, setTab] = useState<'file' | 'sheets'>('file');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [sheetUrl, setSheetUrl] = useState<string>('');

  const [isLoadingPreview, setIsLoadingPreview] = useState<boolean>(false);
  const [isImporting, setIsImporting] = useState<boolean>(false);
  const [isDownloadingReport, setIsDownloadingReport] = useState<boolean>(false);
  const [isDownloadingTemplate, setIsDownloadingTemplate] = useState<boolean>(false);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<PreviewResponse | null>(null);
  const [filter, setFilter] = useState<'ALL' | 'VALID' | 'DUPLICATE' | 'ERROR'>('ALL');
  const [duplicateActions, setDuplicateActions] = useState<Record<number, boolean>>({});

  const [importSummary, setImportSummary] = useState<ConfirmResponse | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Template download
  const handleDownloadTemplate = async () => {
    try {
      setIsDownloadingTemplate(true);
      const res = await fetch(`/api/events/${eventId}/guests/import/template`);
      if (!res.ok) {
        throw new Error('Gagal mengunduh berkas template.');
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'template_data_tamu.xlsx';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: unknown) {
      setErrorMessage((err instanceof Error ? err.message : null) || 'Gagal mengunduh template Excel.');
    } finally {
      setIsDownloadingTemplate(false);
    }
  };

  // Preview File (.xlsx, .csv)
  const handlePreviewFile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      setErrorMessage('Pilih berkas Excel (.xlsx) atau CSV (.csv) terlebih dahulu.');
      return;
    }

    if (selectedFile.size > 5 * 1024 * 1024) {
      setErrorMessage('Ukuran berkas melebihi batas maksimal 5 MB.');
      return;
    }

    const lowerName = selectedFile.name.toLowerCase();
    if (!lowerName.endsWith('.xlsx') && !lowerName.endsWith('.csv')) {
      setErrorMessage('Hanya format .xlsx atau .csv yang didukung.');
      return;
    }

    try {
      setIsLoadingPreview(true);
      setErrorMessage(null);
      const formData = new FormData();
      formData.append('file', selectedFile);

      const res = await fetch(`/api/events/${eventId}/guests/import/file/preview`, {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Gagal memvalidasi berkas.');
      }

      setPreviewData(data);
      const initialDup: Record<number, boolean> = {};
      data.rows.forEach((r: PreviewRow) => {
        if (r.status === 'POSSIBLE_DUPLICATE') {
          initialDup[r.sourceRow] = false;
        }
      });
      setDuplicateActions(initialDup);
      setFilter('ALL');
    } catch (err: unknown) {
      setErrorMessage((err instanceof Error ? err.message : null) || 'Gagal memproses pratinjau berkas.');
    } finally {
      setIsLoadingPreview(false);
    }
  };

  // Preview Google Sheets
  const handlePreviewSheets = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUrl = sheetUrl.trim();
    if (!cleanUrl) {
      setErrorMessage('Masukkan tautan Google Sheets terlebih dahulu.');
      return;
    }

    try {
      setIsLoadingPreview(true);
      setErrorMessage(null);

      const res = await fetch(`/api/events/${eventId}/guests/import/sheets/preview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sheetUrl: cleanUrl }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Gagal memvalidasi Google Sheet.');
      }

      setPreviewData(data);
      const initialDup: Record<number, boolean> = {};
      data.rows.forEach((r: PreviewRow) => {
        if (r.status === 'POSSIBLE_DUPLICATE') {
          initialDup[r.sourceRow] = false;
        }
      });
      setDuplicateActions(initialDup);
      setFilter('ALL');
    } catch (err: unknown) {
      setErrorMessage((err instanceof Error ? err.message : null) || 'Gagal memproses pratinjau Google Sheet.');
    } finally {
      setIsLoadingPreview(false);
    }
  };

  // Toggle duplicate action (Lewati / Tetap Impor)
  const handleToggleDuplicate = (sourceRow: number) => {
    setDuplicateActions((prev) => ({
      ...prev,
      [sourceRow]: !prev[sourceRow],
    }));
  };

  // Confirm Import with full row coverage & merging
  const handleConfirmImport = async () => {
    if (!previewData || !previewData.rows) return;

    try {
      setIsImporting(true);
      setErrorMessage(null);

      // Separate insertable rows from preview-invalid rows
      const insertableRows = previewData.rows.filter(
        (r) => r.status === 'VALID' || r.status === 'POSSIBLE_DUPLICATE'
      );
      const previewInvalidRows = previewData.rows.filter(
        (r) => r.status !== 'VALID' && r.status !== 'POSSIBLE_DUPLICATE'
      );

      // Map preview-invalid rows to final ImportResultItem entries
      const previewInvalidItems: ImportResultItem[] = previewInvalidRows.map((r) => ({
        sourceRow: r.sourceRow,
        name: r.name,
        category: r.category,
        phoneNumber: r.phoneNumber || null,
        email: r.email || null,
        maxPax: r.maxPax,
        status: 'INVALID',
        reason: r.reasons && r.reasons.length > 0 ? r.reasons.join('; ') : r.status,
      }));

      // If there are zero insertable rows, finish immediately with invalid rows
      if (insertableRows.length === 0) {
        const sortedResults = previewInvalidItems.sort((a, b) => a.sourceRow - b.sourceRow);
        setImportSummary({
          totalProcessed: sortedResults.length,
          importedCount: 0,
          skippedDuplicateCount: 0,
          invalidCount: sortedResults.length,
          failedCount: 0,
          results: sortedResults,
        });
        setPreviewData(null);
        return;
      }

      const rowsToSubmit = insertableRows.map((row) => ({
        sourceRow: row.sourceRow,
        name: row.name,
        category: row.category,
        phoneNumber: row.phoneNumber || null,
        email: row.email || null,
        maxPax: row.maxPax,
        importAnyway: !!duplicateActions[row.sourceRow],
      }));

      const res = await fetch(`/api/events/${eventId}/guests/import/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows: rowsToSubmit }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Gagal mengimpor data tamu.');
      }

      // Merge backend confirm results with preview-invalid items
      const backendResults: ImportResultItem[] = data.results || [];
      const mergedResults = [...backendResults, ...previewInvalidItems].sort(
        (a, b) => a.sourceRow - b.sourceRow
      );

      // Re-calculate completion counters from MERGED results
      const totalProcessed = mergedResults.length;
      const importedCount = mergedResults.filter((r) => r.status === 'IMPORTED').length;
      const skippedDuplicateCount = mergedResults.filter((r) => r.status === 'SKIPPED_DUPLICATE').length;
      const invalidCount = mergedResults.filter((r) => r.status === 'INVALID').length;
      const failedCount = mergedResults.filter((r) => r.status === 'FAILED').length;

      setImportSummary({
        totalProcessed,
        importedCount,
        skippedDuplicateCount,
        invalidCount,
        failedCount,
        results: mergedResults,
      });
      setPreviewData(null);
    } catch (err: unknown) {
      setErrorMessage(
        (err instanceof Error ? err.message : null) ||
          'Gagal mengeksekusi impor data tamu.'
      );
    } finally {
      setIsImporting(false);
    }
  };

  // Download Report
  const handleDownloadReport = async () => {
    if (!importSummary || !importSummary.results) return;

    try {
      setIsDownloadingReport(true);
      const res = await fetch(`/api/events/${eventId}/guests/import/report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows: importSummary.results }),
      });

      if (!res.ok) {
        throw new Error('Gagal mengunduh berkas laporan hasil impor.');
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const today = new Date().toISOString().split('T')[0];
      a.download = `laporan_import_tamu_${today}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: unknown) {
      setErrorMessage((err instanceof Error ? err.message : null) || 'Gagal mengunduh berkas laporan.');
    } finally {
      setIsDownloadingReport(false);
    }
  };

  const handleReset = () => {
    setPreviewData(null);
    setSelectedFile(null);
    setSheetUrl('');
    setErrorMessage(null);
    setDuplicateActions({});
    setImportSummary(null);
  };

  const copyToClipboard = (code: string, url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2500);
  };

  // Calculate ready to import count
  let readyToImportCount = 0;
  if (previewData) {
    previewData.rows.forEach((r) => {
      if (r.status === 'VALID') readyToImportCount++;
      else if (r.status === 'POSSIBLE_DUPLICATE' && duplicateActions[r.sourceRow]) {
        readyToImportCount++;
      }
    });
  }

  // Filtered rows for preview table
  const displayedRows = (previewData?.rows || []).filter((r) => {
    if (filter === 'VALID') return r.status === 'VALID';
    if (filter === 'DUPLICATE') return r.status === 'POSSIBLE_DUPLICATE';
    if (filter === 'ERROR') return r.status !== 'VALID' && r.status !== 'POSSIBLE_DUPLICATE';
    return true;
  });

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '1.5rem 1rem' }}>
      {/* Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <Link
          href={`/events/${eventId}/guests`}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontSize: '0.875rem',
            color: 'var(--color-primary, #6366f1)',
            textDecoration: 'none',
            marginBottom: '0.75rem',
            fontWeight: 500,
          }}
        >
          <IconArrowLeft />
          Kembali ke Daftar Tamu
        </Link>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0, color: 'var(--color-text, #0f172a)' }}>
              Impor Tamu Undangan
            </h1>
            <p style={{ margin: '0.25rem 0 0', fontSize: '0.875rem', color: 'var(--color-text-secondary, #64748b)' }}>
              Unggah berkas Excel, CSV, atau tautan Google Sheets untuk menambahkan tamu secara massal.
            </p>
          </div>
          <button
            type="button"
            onClick={handleDownloadTemplate}
            disabled={isDownloadingTemplate}
            className="btn btn-secondary"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontSize: '0.875rem',
              padding: '0.5rem 1rem',
              fontWeight: 500,
            }}
          >
            <IconDownload />
            {isDownloadingTemplate ? 'Mengunduh...' : 'Unduh Template Excel'}
          </button>
        </div>
      </div>

      {/* Error Alert */}
      {errorMessage && (
        <div
          role="alert"
          style={{
            marginBottom: '1.5rem',
            padding: '0.875rem 1.25rem',
            borderRadius: 'var(--radius-md, 8px)',
            fontSize: '0.875rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            background: 'var(--color-danger-subtle, #fef2f2)',
            color: 'var(--color-danger, #dc2626)',
            border: '1px solid var(--color-danger-border, #fca5a5)',
          }}
        >
          <IconXCircle />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Stage 1: Input Selection (if no preview and no summary) */}
      {!previewData && !importSummary && (
        <div
          className="card"
          style={{
            background: 'var(--color-surface, #ffffff)',
            borderRadius: 'var(--radius-lg, 12px)',
            border: '1px solid var(--color-border, #e2e8f0)',
            padding: '1.75rem',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          {/* Tabs */}
          <div
            style={{
              display: 'flex',
              borderBottom: '1px solid var(--color-border, #e2e8f0)',
              marginBottom: '1.5rem',
              gap: '1rem',
            }}
          >
            <button
              type="button"
              onClick={() => { setTab('file'); setErrorMessage(null); }}
              style={{
                background: 'none',
                border: 'none',
                padding: '0.75rem 1rem',
                fontSize: '0.925rem',
                fontWeight: 600,
                cursor: 'pointer',
                color: tab === 'file' ? 'var(--color-primary, #6366f1)' : 'var(--color-text-secondary, #64748b)',
                borderBottom: tab === 'file' ? '2px solid var(--color-primary, #6366f1)' : '2px solid transparent',
              }}
            >
              Upload Excel / CSV
            </button>
            <button
              type="button"
              onClick={() => { setTab('sheets'); setErrorMessage(null); }}
              style={{
                background: 'none',
                border: 'none',
                padding: '0.75rem 1rem',
                fontSize: '0.925rem',
                fontWeight: 600,
                cursor: 'pointer',
                color: tab === 'sheets' ? 'var(--color-primary, #6366f1)' : 'var(--color-text-secondary, #64748b)',
                borderBottom: tab === 'sheets' ? '2px solid var(--color-primary, #6366f1)' : '2px solid transparent',
              }}
            >
              Google Sheets
            </button>
          </div>

          {/* Tab 1: File Upload */}
          {tab === 'file' && (
            <form onSubmit={handlePreviewFile}>
              <div
                style={{
                  border: '2px dashed var(--color-border, #cbd5e1)',
                  borderRadius: 'var(--radius-md, 8px)',
                  padding: '2.5rem 1.5rem',
                  textAlign: 'center',
                  background: 'var(--color-bg-subtle, #f8fafc)',
                  cursor: 'pointer',
                  position: 'relative',
                }}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                    setSelectedFile(e.dataTransfer.files[0]);
                  }
                }}
              >
                <input
                  type="file"
                  accept=".xlsx,.csv"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setSelectedFile(e.target.files[0]);
                    }
                  }}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    opacity: 0,
                    cursor: 'pointer',
                  }}
                />
                <div style={{ color: 'var(--color-primary, #6366f1)', marginBottom: '0.75rem' }}>
                  <IconUpload />
                </div>
                {selectedFile ? (
                  <div>
                    <p style={{ fontWeight: 600, margin: '0 0 0.25rem', color: 'var(--color-text, #0f172a)' }}>
                      {selectedFile.name}
                    </p>
                    <p style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary, #64748b)', margin: 0 }}>
                      {(selectedFile.size / 1024).toFixed(1)} KB — Klik atau seret berkas lain untuk mengganti
                    </p>
                  </div>
                ) : (
                  <div>
                    <p style={{ fontWeight: 600, margin: '0 0 0.25rem', color: 'var(--color-text, #0f172a)' }}>
                      Pilih berkas Excel (.xlsx) atau CSV (.csv)
                    </p>
                    <p style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary, #64748b)', margin: 0 }}>
                      Maksimal ukuran 5 MB (hingga 1.000 baris data).
                    </p>
                  </div>
                )}
              </div>

              <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <Link
                  href={`/events/${eventId}/guests`}
                  className="btn btn-secondary"
                  style={{ padding: '0.625rem 1.25rem', fontSize: '0.875rem' }}
                >
                  Batal
                </Link>
                <button
                  type="submit"
                  disabled={!selectedFile || isLoadingPreview}
                  className="btn btn-primary"
                  style={{ padding: '0.625rem 1.5rem', fontSize: '0.875rem', fontWeight: 600 }}
                >
                  {isLoadingPreview ? 'Memvalidasi Data...' : 'Validasi Data'}
                </button>
              </div>
            </form>
          )}

          {/* Tab 2: Google Sheets */}
          {tab === 'sheets' && (
            <form onSubmit={handlePreviewSheets}>
              <div
                style={{
                  marginBottom: '1.25rem',
                  padding: '1rem',
                  borderRadius: 'var(--radius-md, 8px)',
                  background: '#eff6ff',
                  border: '1px solid #bfdbfe',
                  fontSize: '0.85rem',
                  color: '#1e40af',
                  lineHeight: '1.5',
                }}
              >
                <strong>Perhatian Privasi:</strong> Google Sheet harus memiliki akses publik baca (<em>&quot;Siapa saja yang memiliki tautan dapat melihat&quot;</em>). Siapa saja yang memiliki link tersebut dapat melihat isi spreadsheet Anda. Kami menyarankan mengunggah berkas Excel/CSV secara langsung jika data bersifat rahasia.
              </div>

              <div style={{ marginBottom: '1.25rem' }}>
                <label
                  htmlFor="sheet-url-input"
                  style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--color-text, #0f172a)' }}
                >
                  Tautan Google Sheets
                </label>
                <input
                  id="sheet-url-input"
                  type="url"
                  placeholder="https://docs.google.com/spreadsheets/d/.../edit#gid=0"
                  value={sheetUrl}
                  onChange={(e) => setSheetUrl(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.625rem 0.875rem',
                    borderRadius: 'var(--radius-md, 6px)',
                    border: '1px solid var(--color-border, #cbd5e1)',
                    fontSize: '0.875rem',
                  }}
                  required
                />
                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary, #64748b)', marginTop: '0.375rem', display: 'block' }}>
                  Format yang didukung: https://docs.google.com/spreadsheets/d/[ID]/... (parameter ?gid= akan dipertahankan jika ada).
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <Link
                  href={`/events/${eventId}/guests`}
                  className="btn btn-secondary"
                  style={{ padding: '0.625rem 1.25rem', fontSize: '0.875rem' }}
                >
                  Batal
                </Link>
                <button
                  type="submit"
                  disabled={!sheetUrl.trim() || isLoadingPreview}
                  className="btn btn-primary"
                  style={{ padding: '0.625rem 1.5rem', fontSize: '0.875rem', fontWeight: 600 }}
                >
                  {isLoadingPreview ? 'Mengambil & Memvalidasi...' : 'Validasi Data'}
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* Stage 2: Preview & Validation Table */}
      {previewData && !importSummary && (
        <div>
          {/* Summary Cards */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '1rem',
              marginBottom: '1.5rem',
            }}
          >
            <div style={{ background: '#f8fafc', padding: '1rem 1.25rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 500 }}>Total Baris Data</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a', marginTop: '0.25rem' }}>
                {previewData.totalRows}
              </div>
            </div>
            <div style={{ background: '#f0fdf4', padding: '1rem 1.25rem', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
              <div style={{ fontSize: '0.8rem', color: '#166534', fontWeight: 500 }}>Siap Impor (Valid)</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#15803d', marginTop: '0.25rem' }}>
                {previewData.validRows}
              </div>
            </div>
            <div style={{ background: '#fffbeb', padding: '1rem 1.25rem', borderRadius: '8px', border: '1px solid #fde68a' }}>
              <div style={{ fontSize: '0.8rem', color: '#92400e', fontWeight: 500 }}>Duplikat Terdeteksi</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#b45309', marginTop: '0.25rem' }}>
                {previewData.duplicateRows}
              </div>
            </div>
            <div style={{ background: '#fef2f2', padding: '1rem 1.25rem', borderRadius: '8px', border: '1px solid #fecaca' }}>
              <div style={{ fontSize: '0.8rem', color: '#991b1b', fontWeight: 500 }}>Tidak Valid (Error)</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#b91c1c', marginTop: '0.25rem' }}>
                {previewData.invalidRows}
              </div>
            </div>
          </div>

          {/* Filters & Actions Bar */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '0.75rem',
              marginBottom: '1rem',
            }}
          >
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {(['ALL', 'VALID', 'DUPLICATE', 'ERROR'] as const).map((cat) => {
                const labelMap = {
                  ALL: `Semua (${previewData.totalRows})`,
                  VALID: `Valid (${previewData.validRows})`,
                  DUPLICATE: `Duplikat (${previewData.duplicateRows})`,
                  ERROR: `Error (${previewData.invalidRows})`,
                };
                const isActive = filter === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setFilter(cat)}
                    style={{
                      padding: '0.375rem 0.875rem',
                      borderRadius: '20px',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      border: '1px solid',
                      borderColor: isActive ? 'var(--color-primary, #6366f1)' : '#cbd5e1',
                      background: isActive ? 'var(--color-primary, #6366f1)' : '#ffffff',
                      color: isActive ? '#ffffff' : '#475569',
                    }}
                  >
                    {labelMap[cat]}
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              onClick={handleReset}
              className="btn btn-secondary"
              style={{ fontSize: '0.8rem', padding: '0.375rem 0.75rem' }}
            >
              Ganti Berkas / Ulangi
            </button>
          </div>

          {/* Table */}
          <div
            style={{
              overflowX: 'auto',
              background: '#ffffff',
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
              marginBottom: '1.5rem',
            }}
          >
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left', color: '#475569' }}>
                  <th style={{ padding: '0.75rem 1rem', width: '60px' }}>Baris</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Nama Tamu</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Kategori</th>
                  <th style={{ padding: '0.75rem 1rem' }}>No. WhatsApp</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Email</th>
                  <th style={{ padding: '0.75rem 1rem', width: '60px' }}>Pax</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Status</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Keterangan</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'center', width: '130px' }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {displayedRows.length === 0 ? (
                  <tr>
                    <td colSpan={9} style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
                      Tidak ada data pada filter ini.
                    </td>
                  </tr>
                ) : (
                  displayedRows.map((row) => {
                    const isDup = row.status === 'POSSIBLE_DUPLICATE';
                    const isErr = row.status !== 'VALID' && !isDup;
                    const willImportDup = duplicateActions[row.sourceRow] || false;

                    let statusBadge = (
                      <span style={{ padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600, background: '#dcfce7', color: '#15803d' }}>
                        VALID
                      </span>
                    );
                    if (isDup) {
                      statusBadge = (
                        <span style={{ padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600, background: '#fef3c7', color: '#b45309' }}>
                          DUPLIKAT
                        </span>
                      );
                    } else if (isErr) {
                      statusBadge = (
                        <span style={{ padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600, background: '#fee2e2', color: '#b91c1c' }}>
                          {row.status}
                        </span>
                      );
                    }

                    return (
                      <tr key={row.sourceRow} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '0.75rem 1rem', color: '#64748b' }}>#{row.sourceRow}</td>
                        <td style={{ padding: '0.75rem 1rem', fontWeight: 600, color: '#0f172a' }}>{row.name}</td>
                        <td style={{ padding: '0.75rem 1rem', color: '#334155' }}>{row.category}</td>
                        <td style={{ padding: '0.75rem 1rem', color: '#334155' }}>{row.phoneNumber || '-'}</td>
                        <td style={{ padding: '0.75rem 1rem', color: '#334155' }}>{row.email || '-'}</td>
                        <td style={{ padding: '0.75rem 1rem', color: '#334155' }}>{row.maxPax}</td>
                        <td style={{ padding: '0.75rem 1rem' }}>{statusBadge}</td>
                        <td style={{ padding: '0.75rem 1rem', fontSize: '0.8rem', color: '#64748b' }}>
                          {row.duplicateMatch && <div>{row.duplicateMatch}</div>}
                          {row.reasons && row.reasons.length > 0 && (
                            <div style={{ color: isErr ? '#dc2626' : '#d97706' }}>{row.reasons.join('; ')}</div>
                          )}
                        </td>
                        <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                          {isDup && (
                            <button
                              type="button"
                              onClick={() => handleToggleDuplicate(row.sourceRow)}
                              style={{
                                padding: '0.25rem 0.6rem',
                                borderRadius: '4px',
                                fontSize: '0.75rem',
                                fontWeight: 600,
                                cursor: 'pointer',
                                border: '1px solid',
                                borderColor: willImportDup ? '#16a34a' : '#cbd5e1',
                                background: willImportDup ? '#dcfce7' : '#ffffff',
                                color: willImportDup ? '#15803d' : '#64748b',
                              }}
                            >
                              {willImportDup ? 'Tetap Impor' : 'Lewati'}
                            </button>
                          )}
                          {isErr && (
                            <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Dilewati</span>
                          )}
                          {row.status === 'VALID' && (
                            <span style={{ fontSize: '0.75rem', color: '#16a34a', fontWeight: 500 }}>Siap</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Bottom Confirm Action Bar */}
          <div
            style={{
              background: '#ffffff',
              padding: '1rem 1.5rem',
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '1rem',
            }}
          >
            <div>
              <span style={{ fontSize: '0.9rem', color: '#334155' }}>
                Total siap diimpor: <strong>{readyToImportCount}</strong> dari {previewData.totalRows} baris data.
              </span>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={handleReset}
                className="btn btn-secondary"
                style={{ padding: '0.625rem 1.25rem', fontSize: '0.875rem' }}
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isImporting}
                onClick={handleConfirmImport}
                className="btn btn-primary"
                style={{
                  padding: '0.625rem 1.5rem',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
                }}
              >
                {isImporting
                  ? 'Sedang Memproses...'
                  : readyToImportCount > 0
                  ? `Impor ${readyToImportCount} Tamu`
                  : 'Selesaikan & Buat Laporan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stage 3: Post-Import Results View */}
      {importSummary && (
        <div
          className="card"
          style={{
            background: '#ffffff',
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
            padding: '1.75rem',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
            <div style={{ display: 'inline-flex', padding: '0.75rem', borderRadius: '50%', background: '#dcfce7', marginBottom: '0.75rem' }}>
              <IconCheckCircle />
            </div>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 700, margin: '0 0 0.5rem', color: '#0f172a' }}>
              Proses Impor Selesai
            </h2>
            <p style={{ margin: 0, fontSize: '0.875rem', color: '#64748b' }}>
              Berikut adalah ringkasan hasil impor data tamu ke acara ini.
            </p>
          </div>

          {/* Results Metric Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: '1rem',
              marginBottom: '1.5rem',
            }}
          >
            <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
              <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 500 }}>Total Diproses</div>
              <div style={{ fontSize: '1.35rem', fontWeight: 700, color: '#0f172a' }}>{importSummary.totalProcessed}</div>
            </div>
            <div style={{ background: '#f0fdf4', padding: '1rem', borderRadius: '8px', border: '1px solid #bbf7d0', textAlign: 'center' }}>
              <div style={{ fontSize: '0.75rem', color: '#166534', fontWeight: 500 }}>Berhasil Diimpor</div>
              <div style={{ fontSize: '1.35rem', fontWeight: 700, color: '#15803d' }}>{importSummary.importedCount}</div>
            </div>
            <div style={{ background: '#fffbeb', padding: '1rem', borderRadius: '8px', border: '1px solid #fde68a', textAlign: 'center' }}>
              <div style={{ fontSize: '0.75rem', color: '#92400e', fontWeight: 500 }}>Dilewati (Duplikat)</div>
              <div style={{ fontSize: '1.35rem', fontWeight: 700, color: '#b45309' }}>{importSummary.skippedDuplicateCount}</div>
            </div>
            <div style={{ background: '#fef2f2', padding: '1rem', borderRadius: '8px', border: '1px solid #fecaca', textAlign: 'center' }}>
              <div style={{ fontSize: '0.75rem', color: '#991b1b', fontWeight: 500 }}>Tidak Valid / Gagal</div>
              <div style={{ fontSize: '1.35rem', fontWeight: 700, color: '#b91c1c' }}>
                {importSummary.invalidCount + importSummary.failedCount}
              </div>
            </div>
          </div>

          {/* Result List Table */}
          <div
            style={{
              maxHeight: '380px',
              overflowY: 'auto',
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
              marginBottom: '1.5rem',
            }}
          >
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead style={{ position: 'sticky', top: 0, background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                <tr style={{ textAlign: 'left', color: '#475569' }}>
                  <th style={{ padding: '0.625rem 0.875rem', width: '60px' }}>Baris</th>
                  <th style={{ padding: '0.625rem 0.875rem' }}>Nama Tamu</th>
                  <th style={{ padding: '0.625rem 0.875rem' }}>Status</th>
                  <th style={{ padding: '0.625rem 0.875rem' }}>Keterangan</th>
                  <th style={{ padding: '0.625rem 0.875rem' }}>Tautan Undangan</th>
                </tr>
              </thead>
              <tbody>
                {importSummary.results.map((item) => {
                  let statusBadge = (
                    <span style={{ padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600, background: '#dcfce7', color: '#15803d' }}>
                      IMPORTED
                    </span>
                  );
                  if (item.status === 'SKIPPED_DUPLICATE') {
                    statusBadge = (
                      <span style={{ padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600, background: '#fef3c7', color: '#b45309' }}>
                        SKIPPED
                      </span>
                    );
                  } else if (item.status === 'INVALID' || item.status === 'FAILED') {
                    statusBadge = (
                      <span style={{ padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600, background: '#fee2e2', color: '#b91c1c' }}>
                        {item.status}
                      </span>
                    );
                  }

                  return (
                    <tr key={item.sourceRow} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '0.625rem 0.875rem', color: '#64748b' }}>#{item.sourceRow}</td>
                      <td style={{ padding: '0.625rem 0.875rem', fontWeight: 600, color: '#0f172a' }}>{item.name}</td>
                      <td style={{ padding: '0.625rem 0.875rem' }}>{statusBadge}</td>
                      <td style={{ padding: '0.625rem 0.875rem', color: '#64748b' }}>{item.reason || '-'}</td>
                      <td style={{ padding: '0.625rem 0.875rem' }}>
                        {item.canonicalUrl ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <a
                              href={item.canonicalUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{
                                color: 'var(--color-primary, #6366f1)',
                                textDecoration: 'underline',
                                fontSize: '0.8rem',
                              }}
                            >
                              /i/{item.uniqueCode}
                            </a>
                            <button
                              type="button"
                              onClick={() => copyToClipboard(item.uniqueCode || '', item.canonicalUrl || '')}
                              title="Salin Link Undangan"
                              style={{
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                color: copiedCode === item.uniqueCode ? '#16a34a' : '#64748b',
                                padding: '2px',
                              }}
                            >
                              <IconCopy />
                            </button>
                            {copiedCode === item.uniqueCode && (
                              <span style={{ fontSize: '0.75rem', color: '#16a34a' }}>Tersalin</span>
                            )}
                          </div>
                        ) : (
                          <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>-</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Action buttons post-import */}
          <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
            <button
              type="button"
              onClick={handleDownloadReport}
              disabled={isDownloadingReport}
              className="btn btn-secondary"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontSize: '0.875rem',
                padding: '0.625rem 1.25rem',
                fontWeight: 600,
              }}
            >
              <IconDownload />
              {isDownloadingReport ? 'Mengunduh Laporan...' : 'Unduh Laporan Import (.xlsx)'}
            </button>
            <button
              type="button"
              onClick={() => router.push(`/events/${eventId}/guests`)}
              className="btn btn-primary"
              style={{
                fontSize: '0.875rem',
                padding: '0.625rem 1.5rem',
                fontWeight: 600,
              }}
            >
              Kembali ke Kelola Tamu
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
