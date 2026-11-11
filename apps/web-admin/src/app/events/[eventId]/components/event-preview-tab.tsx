'use client';

import React, { useState } from 'react';

interface EventPreviewTabProps {
  eventId: string;
  status: string;
  slug: string;
  canonicalUrl?: string | null;
  hasTemplate: boolean;
  hasContent: boolean;
}

export function EventPreviewTab({
  eventId,
  status,
  slug,
  canonicalUrl,
  hasTemplate,
  hasContent,
}: EventPreviewTabProps) {
  const [copied, setCopied] = useState(false);
  const [customRecipient, setCustomRecipient] = useState('');
  const [copiedCustom, setCopiedCustom] = useState(false);
  const [broadcastTone, setBroadcastTone] = useState<'formal' | 'casual' | 'social' | 'islamic'>('formal');
  const [customBroadcastText, setCustomBroadcastText] = useState<string | null>(null);
  const [copiedBroadcast, setCopiedBroadcast] = useState(false);
  const isPublished = status === 'PUBLISHED';

  const sanitizedRecipient = customRecipient
    .replace(/<[^>]*>/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 60)
    .trim();

  const customPublicUrl = canonicalUrl
    ? sanitizedRecipient
      ? `${canonicalUrl}${canonicalUrl.includes('?') ? '&' : '?'}to=${encodeURIComponent(sanitizedRecipient)}`
      : canonicalUrl
    : '';

  const displayRecipient = sanitizedRecipient || 'Bapak/Ibu/Saudara/i & Sahabat Terkasih';

  const defaultBroadcastMessage = (() => {
    if (!customPublicUrl) return '';
    switch (broadcastTone) {
      case 'casual':
        return [
          `Halo teman-teman ${displayRecipient}!`,
          '',
          `Dengan penuh kebahagiaan, kami mau berbagi kabar baik dan mengundang ${displayRecipient} ke hari spesial kami.`,
          '',
          'Info lengkap lokasi & jadwal acara bisa langsung dibuka di sini ya:',
          customPublicUrl,
          '',
          'Ditunggu kehadiran & doa restunya ya! Terima kasih banyak.',
        ].join('\n');
      case 'social':
        return [
          `Hai ${displayRecipient}!`,
          '',
          `Sebuah babak baru segera dimulai — kami dengan senang hati mengundang ${displayRecipient} untuk ikut merayakan hari bahagia kami.`,
          '',
          'Yuk lihat detail lengkap undangan digital kami di link berikut:',
          customPublicUrl,
          '',
          'Terima kasih atas dukungan, perhatian, dan doa baiknya!',
        ].join('\n');
      case 'islamic':
        return [
          "Assalamu'alaikum Warahmatullahi Wabarakatuh",
          '',
          `Kepada Yth. ${displayRecipient},`,
          `Dengan memohon rahmat dan ridho Allah SWT, kami bermaksud mengundang ${displayRecipient} untuk hadir dan memberikan doa restu pada acara pernikahan kami.`,
          '',
          'Tautan undangan digital resmi dapat diakses melalui link berikut:',
          customPublicUrl,
          '',
          'Merupakan suatu kehormatan dan kebahagiaan bagi kami atas kehadiran serta doa restunya.',
          "Wassalamu'alaikum Warahmatullahi Wabarakatuh.",
        ].join('\n');
      case 'formal':
      default:
        return [
          `Kepada Yth. ${displayRecipient},`,
          '',
          `Tanpa mengurangi rasa hormat, kami bermaksud mengundang ${displayRecipient} untuk berbagi sukacita serta doa restu di hari bahagia kami.`,
          '',
          'Informasi lengkap jadwal & lokasi acara dapat diakses melalui tautan undangan berikut:',
          customPublicUrl,
          '',
          'Merupakan suatu kehormatan dan kebahagiaan bagi kami apabila berkenan hadir dan memberikan doa restu.',
          '',
          'Terima kasih.',
        ].join('\n');
    }
  })();

  const activeBroadcastMessage =
    customBroadcastText !== null ? customBroadcastText : defaultBroadcastMessage;

  const handleCopy = async () => {
    if (!canonicalUrl) return;
    try {
      await navigator.clipboard.writeText(canonicalUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback if clipboard API unavailable
    }
  };

  const handleCopyCustom = async () => {
    if (!customPublicUrl) return;
    try {
      await navigator.clipboard.writeText(customPublicUrl);
      setCopiedCustom(true);
      setTimeout(() => setCopiedCustom(false), 2000);
    } catch {
      // Fallback if clipboard API unavailable
    }
  };

  const handleCopyBroadcast = async () => {
    if (!activeBroadcastMessage) return;
    try {
      await navigator.clipboard.writeText(activeBroadcastMessage);
      setCopiedBroadcast(true);
      setTimeout(() => setCopiedBroadcast(false), 2000);
    } catch {
      // Fallback if clipboard API unavailable
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
            Pratinjau & Publikasi Undangan
          </h2>
          <span className={`badge ${isPublished ? 'badge--success' : 'badge--warning'}`}>
            Status: {status}
          </span>
        </div>
        <p className="text-sm text-muted" style={{ margin: 0 }}>
          Pusat kendali status tayang dan tautan akses halaman undangan digital.
        </p>
      </div>

      {isPublished ? (
        <div className="card">
          <div className="card-header">
            <h3 className="card-header__title">Tautan Undangan Publik Aktif</h3>
          </div>
          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div
              style={{
                padding: '1.25rem',
                borderRadius: 'var(--radius-md)',
                background: 'var(--success-bg, #ecfdf5)',
                border: '1px solid var(--success-border, #a7f3d0)',
              }}
            >
              <div style={{ fontWeight: 600, color: 'var(--success-text, #065f46)', marginBottom: '0.25rem' }}>
                ✓ Undangan Siap Diakses Publik
              </div>
              <p className="text-sm" style={{ margin: 0, color: 'var(--success-text, #065f46)', opacity: 0.9 }}>
                Acara ini telah berstatus PUBLISHED dan dapat diakses melalui domain publik undangan resmi.
              </p>
            </div>

            {canonicalUrl ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label text-xs">Tautan Publik Resmi (Canonical URL)</label>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <input
                      type="text"
                      readOnly
                      className="form-input font-mono text-sm"
                      value={canonicalUrl}
                      style={{ background: 'var(--admin-bg)', color: 'var(--text-primary)' }}
                    />
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={handleCopy}
                      id="copy-preview-link-btn"
                    >
                      {copied ? '✓ Tersalin' : 'Salin URL'}
                    </button>
                    <a
                      href={canonicalUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-primary btn-sm flex-center gap-1"
                      id="open-published-invitation-btn"
                    >
                      Buka Undangan &rarr;
                    </a>
                  </div>
                </div>

                <div
                  style={{
                    padding: '1rem',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--admin-border)',
                    background: 'var(--admin-bg)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.65rem',
                  }}
                >
                  <div>
                    <label className="form-label text-xs" style={{ marginBottom: '0.15rem' }}>
                      Generator Link Publik Custom (Grup WA / Followers / Komunitas)
                    </label>
                    <p className="text-xs text-muted" style={{ margin: 0 }}>
                      Ubah sapaan <em>&ldquo;Bapak / Ibu / Saudara / i&rdquo;</em> di sampul menjadi nama grup atau komunitas via parameter <code>?to=...</code> (RSVP &amp; QR tetap nonaktif).
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <input
                      type="text"
                      maxLength={60}
                      className="form-input text-sm"
                      placeholder="Contoh: Grup Alumni SMAN 8, Followers Instagram, Keluarga Besar..."
                      value={customRecipient}
                      onChange={(e) => setCustomRecipient(e.target.value)}
                      style={{ flex: '1 1 240px' }}
                    />
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={handleCopyCustom}
                    >
                      {copiedCustom ? '✓ Link Custom Tersalin' : 'Salin Link Custom'}
                    </button>
                    <a
                      href={customPublicUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-secondary btn-sm flex-center gap-1"
                    >
                      Tes Buka &rarr;
                    </a>
                  </div>

                  <div style={{ marginTop: '0.35rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.4rem' }}>
                      <label className="form-label text-xs" style={{ margin: 0 }}>
                        Kata-kata Pengantar Undangan (Bisa Diedit)
                      </label>
                      <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                        {(
                          [
                            { id: 'formal', label: 'Formal' },
                            { id: 'casual', label: 'Santai Grup' },
                            { id: 'social', label: 'Sosmed / Followers' },
                            { id: 'islamic', label: 'Islami' },
                          ] as const
                        ).map((tone) => (
                          <button
                            key={tone.id}
                            type="button"
                            className={`btn btn-sm ${broadcastTone === tone.id && customBroadcastText === null ? 'btn-primary' : 'btn-secondary'}`}
                            style={{ padding: '0.2rem 0.55rem', fontSize: '0.72rem' }}
                            onClick={() => {
                              setBroadcastTone(tone.id);
                              setCustomBroadcastText(null);
                            }}
                          >
                            {tone.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <textarea
                      rows={6}
                      className="form-input text-xs"
                      value={activeBroadcastMessage}
                      onChange={(e) => setCustomBroadcastText(e.target.value)}
                      style={{ lineHeight: 1.5, resize: 'vertical' }}
                    />
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        onClick={handleCopyBroadcast}
                      >
                        {copiedBroadcast ? '✓ Kata-kata & Link Tersalin' : 'Salin Kata-kata + Link'}
                      </button>
                      <a
                        href={`https://wa.me/?text=${encodeURIComponent(activeBroadcastMessage)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-secondary btn-sm flex-center gap-1"
                      >
                        Share ke WA &rarr;
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-sm text-muted">
                Tautan kanonikal: <code>/e/{slug}</code> (Konfigurasi domain publik undangan belum diatur).
              </div>
            )}
          </div>
        </div>
      ) : (
        /* DRAFT SECURITY STATE: DRAFT is strictly closed to public */
        <div className="card">
          <div className="card-header">
            <h3 className="card-header__title">Status Kesiapan Publikasi (DRAFT)</h3>
          </div>
          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div
              style={{
                padding: '1.25rem',
                borderRadius: 'var(--radius-md)',
                background: 'var(--admin-accent-soft, #fef3c7)',
                border: '1px solid #fde68a',
                color: '#92400e',
              }}
            >
              <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>
                🔒 Acara Masih Berstatus DRAFT (Akses Publik Ditutup)
              </div>
              <p className="text-sm" style={{ margin: 0, lineHeight: 1.5 }}>
                Demi melindungi privasi data mempelai sebelum acara siap, tautan publik <code>/e/{slug}</code> ditutup dan menghasilkan kode respon 404 bagi siapapun di luar sistem admin.
              </p>
            </div>

            <div>
              <h4 style={{ fontSize: '0.9375rem', fontWeight: 600, marginBottom: '0.75rem', color: 'var(--text-primary)' }}>
                Daftar Periksa Kesiapan Acara:
              </h4>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
                  <span>{hasTemplate ? '✅' : '❌'}</span>
                  <span>{hasTemplate ? 'Template telah dipilih' : 'Template belum dipilih'}</span>
                </li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
                  <span>{hasContent ? '✅' : '⚠️'}</span>
                  <span>{hasContent ? 'Konten template telah diisi' : 'Konten template masih kosong (opsional)'}</span>
                </li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
                  <span>🔒</span>
                  <span>Status saat ini: DRAFT (Klik Publikasikan Acara jika sudah siap)</span>
                </li>
              </ul>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
              <a href={`/events/${eventId}/edit`} className="btn btn-primary btn-sm">
                Buka Pengaturan & Publikasikan Acara &rarr;
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
