'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { isTicketingEnabled } from '@/config/features';

export default function ClientPartnershipPage() {
  useEffect(() => {
    if (!isTicketingEnabled()) {
      window.location.replace('/');
    }
  }, []);

  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);

  // EO Event Proposal Form State ("terima beres")
  const [orgName, setOrgName] = useState<string>('');
  const [eventName, setEventName] = useState<string>('');
  const [attendeeCount, setAttendeeCount] = useState<string>('200 - 500');
  const [contactName, setContactName] = useState<string>('');
  const [organizerWa, setOrganizerWa] = useState<string>('');
  const [contactEmail, setContactEmail] = useState<string>('');
  const [eventCategory, setEventCategory] = useState<string>('Konser Musik');
  const [notes, setNotes] = useState<string>('');
  const [websiteHoneypot, setWebsiteHoneypot] = useState<string>('');

  const [submitting, setSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitResult, setSubmitResult] = useState<{
    inquiryCode: string;
    accessToken?: string;
    status?: string;
    message: string;
  } | null>(null);

  async function handleSendInquiry(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch('/api/ticketing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'submit-inquiry',
          organizerName: orgName.trim(),
          eventName: eventName.trim(),
          category: eventCategory,
          estimatedAudience: attendeeCount,
          contactName: contactName.trim() || orgName.trim(),
          contactEmail: contactEmail.trim() || undefined,
          contactWhatsapp: organizerWa.trim(),
          notes: notes.trim() || undefined,
          website: websiteHoneypot,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          data?.message ||
            'Gagal menyimpan pengajuan acara ke server. Silakan coba lagi.',
        );
      }
      setSubmitResult({
        inquiryCode: data.inquiryCode,
        accessToken: data.accessToken,
        status: data.status || 'PENDING',
        message:
          data.message ||
          'Pengajuan acara berhasil dikirim. Tim IRVITE akan menyiapkan dan mengelola halaman penjualan tiket Anda.',
      });
    } catch (err) {
      setSubmitError(
        err instanceof Error
          ? err.message
          : 'Gagal menghubungi server untuk mengirim pengajuan acara.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="irv-part-page-root"
      style={{
        minHeight: '100vh',
        backgroundColor: 'var(--tkt-bg)',
        color: 'var(--tkt-text-primary)',
        paddingBottom: '3.5rem',
      }}
    >
      <style>{`
        .irv-part-container {
          width: 100%;
          max-width: 1200px;
          margin: 0 auto;
          padding-left: clamp(0.75rem, 2.5vw, 2rem);
          padding-right: clamp(0.75rem, 2.5vw, 2rem);
          box-sizing: border-box;
        }
        .irv-hero-split-grid {
          display: grid;
          grid-template-columns: 1.15fr 0.85fr;
          gap: 2rem;
          align-items: center;
        }
        .irv-hero-stats-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 0.75rem;
        }
        .irv-solutions-teaser-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1.25rem;
        }
        .irv-form-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 1rem;
        }
        .irv-header-desktop-nav {
          display: flex;
          gap: 0.65rem;
          align-items: center;
        }
        .irv-header-mobile-toggle {
          display: none;
        }
        @media (max-width: 1024px) {
          .irv-hero-split-grid {
            grid-template-columns: 1fr;
            gap: 1.5rem;
          }
          .irv-solutions-teaser-grid {
            grid-template-columns: 1fr;
          }
        }
        @media (max-width: 767px) {
          .irv-header-desktop-nav {
            display: none !important;
          }
          .irv-header-mobile-toggle {
            display: inline-flex !important;
          }
          .irv-hero-stats-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 0.5rem;
          }
          .irv-form-grid {
            grid-template-columns: 1fr;
            gap: 0.75rem;
          }
          .irv-hero-card {
            padding: 1.25rem 1rem !important;
            border-radius: var(--tkt-radius-md) !important;
          }
          .irv-hero-title {
            font-size: clamp(1.25rem, 5.2vw, 1.6rem) !important;
            line-height: 1.25 !important;
            margin-bottom: 0.75rem !important;
          }
        }
      `}</style>

      <header
        style={{
          background: 'var(--tkt-surface)',
          borderBottom: '1px solid var(--tkt-border)',
          position: 'sticky',
          top: 0,
          zIndex: 50,
        }}
      >
        <div
          className="irv-part-container"
          style={{
            height: '66px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Link
            href="/"
            style={{
              fontWeight: 800,
              fontSize: '1.1rem',
              color: 'var(--tkt-text-primary)',
              textDecoration: 'none',
            }}
          >
            IRVITE
          </Link>

          <nav className="irv-header-desktop-nav" aria-label="Navigasi kerja sama">
            <Link
              href="/partnership/solusi"
              style={{
                padding: '0.5rem 0.85rem',
                borderRadius: 'var(--tkt-radius-sm)',
                border: '1px solid var(--tkt-border)',
                color: 'var(--tkt-text-primary)',
                textDecoration: 'none',
                fontSize: '0.85rem',
                fontWeight: 700,
              }}
            >
              Detail solusi dan simulasi
            </Link>
            <Link
              href="/tiket"
              style={{
                padding: '0.5rem 0.85rem',
                borderRadius: 'var(--tkt-radius-sm)',
                border: '1px solid var(--tkt-border)',
                color: 'var(--tkt-text-primary)',
                textDecoration: 'none',
                fontSize: '0.85rem',
                fontWeight: 700,
              }}
            >
              Katalog tiket
            </Link>
            <a
              href="#daftar-event"
              style={{
                padding: '0.5rem 0.95rem',
                borderRadius: 'var(--tkt-radius-sm)',
                background: 'var(--tkt-primary)',
                color: 'var(--tkt-surface)',
                textDecoration: 'none',
                fontSize: '0.85rem',
                fontWeight: 700,
              }}
            >
              Ajukan acara sekarang
            </a>
          </nav>

          <button
            type="button"
            className="irv-header-mobile-toggle"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            style={{
              padding: '0.45rem 0.75rem',
              borderRadius: 'var(--tkt-radius-sm)',
              border: '1px solid var(--tkt-border)',
              background: 'var(--tkt-surface)',
              fontWeight: 700,
            }}
          >
            Menu
          </button>
        </div>

        {mobileMenuOpen && (
          <div
            className="irv-part-container"
            style={{
              paddingBottom: '1rem',
              display: 'grid',
              gap: '0.5rem',
            }}
          >
            <Link href="/partnership/solusi" onClick={() => setMobileMenuOpen(false)}>
              Detail solusi dan simulasi
            </Link>
            <Link href="/tiket" onClick={() => setMobileMenuOpen(false)}>
              Katalog tiket
            </Link>
            <a href="#daftar-event" onClick={() => setMobileMenuOpen(false)}>
              Ajukan acara sekarang
            </a>
          </div>
        )}
      </header>

      <main className="irv-part-container" style={{ paddingTop: '2rem' }}>
        <section
          className="irv-hero-card"
          style={{
            background: 'var(--tkt-primary)',
            color: 'var(--tkt-surface)',
            borderRadius: 'var(--tkt-radius-lg)',
            padding: '2.25rem',
            marginBottom: '2rem',
          }}
        >
          <div className="irv-hero-split-grid">
            <div>
              <span
                style={{
                  display: 'inline-block',
                  fontSize: '0.76rem',
                  fontWeight: 700,
                  background: 'rgba(255, 255, 255, 0.14)',
                  padding: '0.3rem 0.7rem',
                  borderRadius: 'var(--tkt-radius-sm)',
                  marginBottom: '0.85rem',
                }}
              >
                Layanan terima beres untuk penyelenggara acara
              </span>
              <h1
                className="irv-hero-title"
                style={{
                  fontSize: 'clamp(1.65rem, 3.2vw, 2.35rem)',
                  fontWeight: 800,
                  margin: '0 0 0.85rem 0',
                  lineHeight: 1.22,
                }}
              >
                Ajukan acara Anda, tim IRVITE yang menyiapkan dan mengelola penjualan tiketnya
              </h1>
              <p
                style={{
                  fontSize: '0.95rem',
                  opacity: 0.92,
                  lineHeight: 1.6,
                  margin: '0 0 1.35rem 0',
                }}
              >
                Penyelenggara cukup mengajukan rincian acara. Tim IRVITE membuat halaman acara, mengatur kuota kategori tiket, mengelola pembayaran otomatis, hingga menyiapkan sistem pemindaian kode QR di gerbang lokasi.
              </p>
              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                <a
                  href="#daftar-event"
                  style={{
                    padding: '0.7rem 1.2rem',
                    borderRadius: 'var(--tkt-radius-sm)',
                    background: 'var(--tkt-surface)',
                    color: 'var(--tkt-text-primary)',
                    fontWeight: 800,
                    fontSize: '0.88rem',
                    textDecoration: 'none',
                  }}
                >
                  Isi formulir pengajuan acara
                </a>
                <Link
                  href="/partnership/solusi"
                  style={{
                    padding: '0.7rem 1.2rem',
                    borderRadius: 'var(--tkt-radius-sm)',
                    border: '1px solid rgba(255, 255, 255, 0.35)',
                    color: 'var(--tkt-surface)',
                    fontWeight: 700,
                    fontSize: '0.88rem',
                    textDecoration: 'none',
                  }}
                >
                  Pelajari tiga pilar solusi operasional
                </Link>
              </div>
            </div>

            <div className="irv-hero-stats-grid">
              {[
                {
                  title: 'Rp 3.000 tetap',
                  desc: 'Biaya layanan per tiket berbayar',
                },
                {
                  title: 'Terima beres',
                  desc: 'Tim IRVITE membuat dan mengelola acara',
                },
                {
                  title: 'Tanpa sewa alat',
                  desc: 'Pemindaian tiket cukup melalui ponsel',
                },
                {
                  title: 'Token QR aman',
                  desc: 'Tanda tangan digital anti-pemalsuan',
                },
              ].map((st) => (
                <div
                  key={st.title}
                  style={{
                    background: 'rgba(255, 255, 255, 0.1)',
                    border: '1px solid rgba(255, 255, 255, 0.18)',
                    borderRadius: 'var(--tkt-radius-md)',
                    padding: '1rem',
                  }}
                >
                  <div style={{ fontWeight: 800, fontSize: '1rem' }}>
                    {st.title}
                  </div>
                  <div
                    style={{
                      fontSize: '0.78rem',
                      opacity: 0.88,
                      marginTop: '0.25rem',
                    }}
                  >
                    {st.desc}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section style={{ marginBottom: '2.25rem' }}>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 800, margin: '0 0 1rem 0' }}>
            Tiga pilar operasional acara terpadu
          </h2>
          <div className="irv-solutions-teaser-grid">
            {[
              {
                title: '1. Sistem penjualan tiket dan verifikasi pembayaran',
                desc: 'Pembeli memesan tiket tanpa wajib membuat akun. Tiket digital otomatis diterbitkan setelah pembayaran terverifikasi.',
              },
              {
                title: '2. Pemindai gerbang masuk melalui ponsel petugas',
                desc: 'Validasi tanda tangan kode QR secara langsung di server untuk mencegah penggunaan tiket ganda di pintu masuk.',
              },
              {
                title: '3. Tiket gelang fisik tahan air untuk konser',
                desc: 'Opsi pencetakan gelang penanda penonton dengan kode QR presisi tinggi untuk acara berkapasitas besar.',
              },
            ].map((pillar) => (
              <div
                key={pillar.title}
                style={{
                  background: 'var(--tkt-surface)',
                  border: '1px solid var(--tkt-border)',
                  borderRadius: 'var(--tkt-radius-md)',
                  padding: '1.35rem',
                  boxShadow: 'var(--tkt-shadow-sm)',
                }}
              >
                <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.02rem' }}>
                  {pillar.title}
                </h3>
                <p
                  style={{
                    margin: 0,
                    fontSize: '0.88rem',
                    color: 'var(--tkt-text-secondary)',
                    lineHeight: 1.55,
                  }}
                >
                  {pillar.desc}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section
          id="daftar-event"
          style={{
            background: 'var(--tkt-surface)',
            border: '1px solid var(--tkt-border)',
            borderRadius: 'var(--tkt-radius-lg)',
            padding: '1.85rem',
            boxShadow: 'var(--tkt-shadow-sm)',
          }}
        >
          <h2 style={{ margin: '0 0 0.4rem 0', fontSize: '1.35rem', fontWeight: 800 }}>
            Formulir pengajuan acara penyelenggara
          </h2>
          <p
            style={{
              margin: '0 0 1.25rem 0',
              fontSize: '0.9rem',
              color: 'var(--tkt-text-secondary)',
            }}
          >
            Lengkapi informasi acara di bawah ini. Pengajuan Anda tercatat langsung di basis data IRVITE untuk ditindaklanjuti oleh tim pengelola kami.
          </p>

          {submitResult ? (
            <div
              style={{
                padding: '1.25rem',
                borderRadius: 'var(--tkt-radius-md)',
                background: 'var(--tkt-success-bg)',
                border: '1px solid var(--tkt-success-border)',
                color: 'var(--tkt-success)',
              }}
            >
              <strong style={{ display: 'block', fontSize: '1rem', marginBottom: '0.35rem' }}>
                Kode pengajuan: {submitResult.inquiryCode}
              </strong>
              {submitResult.accessToken && (
                <div style={{ fontSize: '0.84rem', marginBottom: '0.35rem' }}>
                  <strong>Token akses cek status:</strong>{' '}
                  <code>{submitResult.accessToken}</code>
                </div>
              )}
              <p style={{ margin: '0 0 0.85rem 0', fontSize: '0.88rem' }}>
                {submitResult.message}
              </p>
              <button
                type="button"
                onClick={() => {
                  setSubmitResult(null);
                  setOrgName('');
                  setEventName('');
                  setContactName('');
                  setNotes('');
                  setWebsiteHoneypot('');
                }}
                style={{
                  padding: '0.55rem 1rem',
                  borderRadius: 'var(--tkt-radius-sm)',
                  border: '1px solid var(--tkt-success-border)',
                  background: 'var(--tkt-surface)',
                  color: 'var(--tkt-success)',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Kirim pengajuan acara lain
              </button>
            </div>
          ) : (
            <form onSubmit={handleSendInquiry} style={{ display: 'grid', gap: '1rem' }}>
              <div className="irv-form-grid">
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      marginBottom: '0.3rem',
                    }}
                  >
                    Nama penyelenggara atau komunitas
                  </label>
                  <input
                    type="text"
                    required
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    placeholder="Contoh: Kolektif Suara Senja"
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.85rem',
                      borderRadius: 'var(--tkt-radius-sm)',
                      border: '1px solid var(--tkt-border-strong)',
                      fontSize: '0.88rem',
                    }}
                  />
                </div>

                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      marginBottom: '0.3rem',
                    }}
                  >
                    Nama acara yang diajukan
                  </label>
                  <input
                    type="text"
                    required
                    value={eventName}
                    onChange={(e) => setEventName(e.target.value)}
                    placeholder="Contoh: Panggung Harmoni Nusantara"
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.85rem',
                      borderRadius: 'var(--tkt-radius-sm)',
                      border: '1px solid var(--tkt-border-strong)',
                      fontSize: '0.88rem',
                    }}
                  />
                </div>
              </div>

              <div className="irv-form-grid">
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      marginBottom: '0.3rem',
                    }}
                  >
                    Kategori acara
                  </label>
                  <select
                    value={eventCategory}
                    onChange={(e) => setEventCategory(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.85rem',
                      borderRadius: 'var(--tkt-radius-sm)',
                      border: '1px solid var(--tkt-border-strong)',
                      fontSize: '0.88rem',
                    }}
                  >
                    <option value="Konser Musik">Konser musik</option>
                    <option value="Seminar & Edukasi">Seminar dan edukasi</option>
                    <option value="Workshop">Lokakarya</option>
                    <option value="Standup Comedy">Pertunjukan komedi</option>
                  </select>
                </div>

                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      marginBottom: '0.3rem',
                    }}
                  >
                    Estimasi jumlah penonton
                  </label>
                  <select
                    value={attendeeCount}
                    onChange={(e) => setAttendeeCount(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.85rem',
                      borderRadius: 'var(--tkt-radius-sm)',
                      border: '1px solid var(--tkt-border-strong)',
                      fontSize: '0.88rem',
                    }}
                  >
                    <option value="100 - 200">100 hingga 200 penonton</option>
                    <option value="200 - 500">200 hingga 500 penonton</option>
                    <option value="500 - 1000">500 hingga 1.000 penonton</option>
                    <option value="1000+">Lebih dari 1.000 penonton</option>
                  </select>
                </div>
              </div>

              <div className="irv-form-grid">
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      marginBottom: '0.3rem',
                    }}
                  >
                    Nama penanggung jawab
                  </label>
                  <input
                    type="text"
                    required
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    placeholder="Contoh: Raka Pratama"
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.85rem',
                      borderRadius: 'var(--tkt-radius-sm)',
                      border: '1px solid var(--tkt-border-strong)',
                      fontSize: '0.88rem',
                    }}
                  />
                </div>

                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      marginBottom: '0.3rem',
                    }}
                  >
                    Nomor WhatsApp penanggung jawab
                  </label>
                  <input
                    type="tel"
                    required
                    value={organizerWa}
                    onChange={(e) => setOrganizerWa(e.target.value)}
                    placeholder="0812xxxxxxxx"
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.85rem',
                      borderRadius: 'var(--tkt-radius-sm)',
                      border: '1px solid var(--tkt-border-strong)',
                      fontSize: '0.88rem',
                    }}
                  />
                </div>
              </div>

              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    marginBottom: '0.3rem',
                  }}
                >
                  Alamat email penanggung jawab (opsional)
                </label>
                <input
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  placeholder="kontak@komunitas.id"
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    borderRadius: 'var(--tkt-radius-sm)',
                    border: '1px solid var(--tkt-border-strong)',
                    fontSize: '0.88rem',
                  }}
                />
              </div>

              <div
                aria-hidden="true"
                style={{
                  position: 'absolute',
                  left: '-9999px',
                  width: '1px',
                  height: '1px',
                  overflow: 'hidden',
                }}
              >
                <label htmlFor="irv-inquiry-website">Website</label>
                <input
                  id="irv-inquiry-website"
                  type="text"
                  name="website"
                  tabIndex={-1}
                  autoComplete="off"
                  value={websiteHoneypot}
                  onChange={(e) => setWebsiteHoneypot(e.target.value)}
                />
              </div>

              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    marginBottom: '0.3rem',
                  }}
                >
                  Catatan rencana acara dan kategori tiket (opsional)
                </label>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Tuliskan rencana jadwal, lokasi, dan rincian harga tiket..."
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    borderRadius: 'var(--tkt-radius-sm)',
                    border: '1px solid var(--tkt-border-strong)',
                    fontSize: '0.88rem',
                  }}
                />
              </div>

              {submitError && (
                <div
                  role="alert"
                  style={{
                    padding: '0.9rem 1rem',
                    borderRadius: 'var(--tkt-radius-sm)',
                    background: 'var(--tkt-danger-bg)',
                    border: '1px solid var(--tkt-danger-border)',
                    color: 'var(--tkt-danger)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '0.75rem',
                    flexWrap: 'wrap',
                  }}
                >
                  <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                    {submitError}
                  </span>
                  <button
                    type="button"
                    onClick={(e) =>
                      void handleSendInquiry(e as unknown as React.FormEvent)
                    }
                    style={{
                      padding: '0.4rem 0.8rem',
                      borderRadius: 'var(--tkt-radius-sm)',
                      border: '1px solid var(--tkt-danger-border)',
                      background: 'var(--tkt-surface)',
                      color: 'var(--tkt-danger)',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    Coba lagi
                  </button>
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                style={{
                  padding: '0.75rem 1.25rem',
                  borderRadius: 'var(--tkt-radius-sm)',
                  border: 'none',
                  background: 'var(--tkt-primary)',
                  color: 'var(--tkt-surface)',
                  fontWeight: 800,
                  fontSize: '0.9rem',
                  cursor: submitting ? 'wait' : 'pointer',
                }}
              >
                {submitting
                  ? 'Mengirim pengajuan acara...'
                  : 'Kirim pengajuan acara'}
              </button>
            </form>
          )}
        </section>
      </main>
    </div>
  );
}
