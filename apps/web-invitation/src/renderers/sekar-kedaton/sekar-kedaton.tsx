/* eslint-disable @next/next/no-img-element */
'use client';
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import type { RendererProps } from '../registry';
import { RsvpForm } from '../../components/rsvp-form';
import QRDisplay from '../../components/QRDisplay';
import { WishesSection } from '../../components/wishes/WishesSection';
import { AddToCalendarButton } from '../../components/calendar';
import { QrisGiftCard } from '../../components/qris';
import { CountdownSection } from '../shared/sections';
import { getCanonicalInvitationUrl } from '../../utils/url';
import { adaptSekarKedatonContent, adaptSekarKedatonMedia } from './sekar-kedaton.adapter';
import { shouldRenderSereneGuest, shouldRenderSereneRsvp, shouldRenderRsvpAndQr } from '../mode-gating';
import { useEffectiveDisplayGuest } from '../use-effective-guest';
import { formatCeremonyDate, formatCeremonyDateShort, formatCeremonyTimeRange, parseTargetEpoch } from '../datetime-formatter';
import { Scene, Florals, Gunungan, Kawung, Petals } from './ornaments';
import s from './sekar-kedaton.module.css';

// Visual URL handling only. The existing page already supplies public media descriptors.
function mediaSrc(src: string | undefined, isPreview: boolean) {
  if (!src) return undefined;
  if (isPreview && /^blob:https?:\/\//.test(src)) return src;
  if (!src.startsWith('/') || src.startsWith('//') || /[\\\u0000-\u0020]/.test(src)) return undefined;
  return isPreview || src.startsWith('/api-proxy') ? src : `/api-proxy${src}`;
}

function webLink(src?: string) {
  if (!src) return undefined;
  try {
    const url = new URL(src);
    return ['https:', 'http:'].includes(url.protocol) ? url.href : undefined;
  } catch {
    return undefined;
  }
}

export default function SekarKedatonRenderer({
  data,
  uniqueCode,
  canonicalUrl,
  mode = 'PUBLIC',
  isPreview = false,
}: RendererProps) {
  const content = adaptSekarKedatonContent(data.event.content, data.event.title);
  const media = adaptSekarKedatonMedia(data.mediaBySlot, data.media);
  const [opened, setOpened] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [skip, setSkip] = useState(false);
  const [paused, setPaused] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [lightbox, setLightbox] = useState<number | null>(null);
  const root = useRef<HTMLDivElement>(null);
  const start = useRef<HTMLElement>(null);
  const audio = useRef<HTMLAudioElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const effectiveGuest = useEffectiveDisplayGuest(mode, data.guest);
  const guestVisible = shouldRenderSereneGuest(mode, effectiveGuest);
  const showRsvpAndQr = shouldRenderRsvpAndQr(mode, uniqueCode, isPreview);
  const rsvpVisible = showRsvpAndQr && shouldRenderSereneRsvp(mode, data.guest, data.rsvp);
  void rsvpVisible;
  const audioSrc = mediaSrc(media.bgMusic?.src, isPreview);
  const qrisSrc = mediaSrc(media.qris?.src, isPreview);
  const heroSrc = mediaSrc(media.hero?.src, isPreview);
  const brideSrc = mediaSrc(media.bride?.src, isPreview);
  const groomSrc = mediaSrc(media.groom?.src, isPreview);
  const isBrideHeroCrop = Boolean(
    brideSrc && heroSrc && brideSrc === heroSrc && (heroSrc.startsWith('blob:') || heroSrc.includes('couple-jawa-demo')),
  );
  const isGroomHeroCrop = Boolean(
    groomSrc && heroSrc && groomSrc === heroSrc && (heroSrc.startsWith('blob:') || heroSrc.includes('couple-jawa-demo')),
  );
  const gallery = media.gallery.filter((photo) => mediaSrc(photo.src, isPreview));
  const ceremonies = content?.ceremonies ?? [];
  const timezone = content?.timeZone ?? 'Asia/Jakarta';
  const primaryDate = ceremonies[0]?.startDateTime ?? data.event.eventDate;
  const colors = data.template?.config as Record<string, unknown> | undefined;
  const theme = {
    '--jade': typeof colors?.primaryColor === 'string' && /^#[\da-f]{6}$/i.test(colors.primaryColor) ? colors.primaryColor : undefined,
    '--copper': typeof colors?.accentColor === 'string' && /^#[\da-f]{6}$/i.test(colors.accentColor) ? colors.accentColor : undefined,
  } as CSSProperties;

  useEffect(() => {
    if (opened || !content) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [opened, content]);

  useEffect(() => {
    if (!leaving) return;
    const timer = window.setTimeout(() => {
      setOpened(true);
      setLeaving(false);
      window.scrollTo({ top: 0, behavior: 'instant' });
    }, 800);
    return () => clearTimeout(timer);
  }, [leaving]);

  useEffect(() => {
    if (opened) start.current?.focus({ preventScroll: true });
  }, [opened]);

  useEffect(() => {
    if (!opened || !root.current) return;
    const observer = new IntersectionObserver((entries) => entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.setAttribute('data-visible', 'true');
        observer.unobserve(entry.target);
      }
    }), { threshold: 0.08 });
    root.current.querySelectorAll('[data-reveal]').forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [opened, data]);

  useEffect(() => {
    if (!root.current) return;
    const observer = new IntersectionObserver((entries) => entries.forEach((entry) => {
      entry.target.setAttribute('data-awake', String(entry.isIntersecting));
    }), { rootMargin: '100px' });
    root.current.querySelectorAll('[data-motion]').forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [opened]);

  useEffect(() => {
    if (lightbox !== null) dialog.current?.showModal();
  }, [lightbox]);

  useEffect(() => {
    const t = window.setTimeout(() => setPlaying(false), 0);
    return () => clearTimeout(t);
  }, [audioSrc]);

  async function playMusic() {
    if (!audio.current) return;
    try {
      audio.current.volume = 0.38;
      await audio.current.play();
    } catch {
      setFeedback('Musik belum dapat diputar. Tekan tombol musik untuk mencoba kembali.');
    }
  }

  function openInvitation() {
    setSkip(true);
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setOpened(true);
      window.scrollTo({ top: 0, behavior: 'instant' });
    } else {
      setLeaving(true);
    }
    if (audioSrc) void playMusic();
  }

  function toggleMusic() {
    if (playing) audio.current?.pause();
    else void playMusic();
  }

  async function copy(number: string) {
    try {
      await navigator.clipboard.writeText(number);
      setFeedback('Nomor rekening berhasil disalin.');
    } catch {
      setFeedback(`Silakan salin nomor rekening ini: ${number}`);
    }
  }

  if (!content) {
    return (
      <section className={s.empty}>
        <h1>{data.event.title}</h1>
        <p>Detail undangan belum tersedia.</p>
      </section>
    );
  }

  const nameOne = content.partnerOneName;
  const nameTwo = content.partnerTwoName;

  return (
    <div ref={root} className={s.root} style={theme} data-paused={paused} data-skip={skip}>
      {!opened && (
        <section className={`${s.cover} ${leaving ? s.leaving : ''}`} aria-label="Sampul undangan Jawa" inert={leaving}>
          <Scene intro />
          <div className={s.coverBrand}>SEKAR KEDATON <span>THE JAVANESE COLLECTION</span></div>
          <div className={s.coverWords}>
            <Gunungan />
            <p className={s.eyebrow}>Dengan bahagia kami mengundang Anda</p>
            <h1>{nameOne}<em>&</em>{nameTwo}</h1>
            <p className={s.coverDate}>{formatCeremonyDateShort(primaryDate, timezone)}</p>
            <div className={s.guest}>
              <span>Kepada Yth.</span>
              <strong>{guestVisible && effectiveGuest?.name ? effectiveGuest.name : 'Bapak / Ibu / Saudara/i'}</strong>
              {guestVisible && effectiveGuest?.customGreeting && <small>{effectiveGuest.customGreeting}</small>}
            </div>
            <button className={s.primaryButton} onClick={openInvitation}>Buka undangan <span>↗</span></button>
          </div>
          <button className={s.skip} onClick={() => setSkip(true)} disabled={skip}>Lewati animasi pembuka ↓</button>
          <span className={s.coverCredit}>irvite</span>
        </section>
      )}

      {opened && (
        <main>
          <section className={s.hero} id="home" ref={start} tabIndex={-1}>
            <Scene />
            <header className={s.heroBrand}>
              <span>SEKAR<br />KEDATON</span>
              <span>A STORY ROOTED IN LOVE<br />{formatCeremonyDateShort(primaryDate, timezone)}</span>
            </header>
            <div className={s.heroWords}>
              <Gunungan />
              <p className={s.eyebrow}>The wedding of</p>
              <h2><span>{nameOne}</span><em>&</em><span>{nameTwo}</span></h2>
              <p>{content.quote || 'Dua hati, satu perjalanan.'}</p>
              <a href="#welcome" className={s.heroScroll}>Sugeng rawuh <span>↓</span></a>
            </div>
            <div className={s.heroBottom}>
              <Kawung />
              <span>BERSAMA, MERAWAT CINTA</span>
              <Kawung />
            </div>
          </section>

          <section id="welcome" className={`${s.section} ${s.welcome}`}>
            <div className={s.welcomeOrnament} aria-hidden="true"><Gunungan /><Kawung /></div>
            <div data-reveal="rise">
              <p className={s.eyebrow}>01 / Sebuah awal yang baik</p>
              <h2>Berakar dalam doa.<br /><em>Bertumbuh dalam cinta.</em></h2>
              {content.intro && <p>{content.intro}</p>}
              <CountdownSection epoch={parseTargetEpoch(primaryDate, timezone)} className={s.countdown} />
            </div>
            <Florals />
          </section>

          <section id="couple" className={`${s.section} ${s.couple}`}>
            <div className={s.sectionTitle} data-reveal="rise">
              <p className={s.eyebrow}>02 / Sang mempelai</p>
              <h2>Dua nama,<br /><em>satu cerita.</em></h2>
            </div>
            <div className={s.coupleLayout}>
              <article data-reveal="left">
                {brideSrc && (
                  <figure className={s.partnerPortrait}>
                    <div className={s.portraitArch}>
                      <img
                        src={brideSrc}
                        alt={`Mempelai Wanita - ${nameOne}`}
                        loading="lazy"
                        style={isBrideHeroCrop ? { objectPosition: '78% 20%', transform: 'scale(1.6)' } : undefined}
                      />
                    </div>
                    <span className={s.portraitBadge}>01</span>
                  </figure>
                )}
                <span className={s.partnerLabel}>MEMPELAI WANITA</span>
                <h3>{nameOne}</h3>
                {content.partnerOneFullName && (
                  <p className={s.partnerFullName}>{content.partnerOneFullName}</p>
                )}
                <p className={s.parents}>{content.partnerOneFamily}</p>
                <Kawung />
              </article>
              {heroSrc && (
                <figure className={s.couplePhoto} data-reveal="curtain">
                  <img src={heroSrc} alt={`${nameOne} dan ${nameTwo}`} loading="lazy" />
                  <figcaption>JANJI YANG KITA RAWAT</figcaption>
                </figure>
              )}
              <article data-reveal="right">
                {groomSrc && (
                  <figure className={s.partnerPortrait}>
                    <div className={s.portraitArch}>
                      <img
                        src={groomSrc}
                        alt={`Mempelai Pria - ${nameTwo}`}
                        loading="lazy"
                        style={isGroomHeroCrop ? { objectPosition: '24% 20%', transform: 'scale(1.6)' } : undefined}
                      />
                    </div>
                    <span className={s.portraitBadge}>02</span>
                  </figure>
                )}
                <span className={s.partnerLabel}>MEMPELAI PRIA</span>
                <h3>{nameTwo}</h3>
                {content.partnerTwoFullName && (
                  <p className={s.partnerFullName}>{content.partnerTwoFullName}</p>
                )}
                <p className={s.parents}>{content.partnerTwoFamily}</p>
                <Kawung />
              </article>
            </div>
            <Petals />
          </section>

          {content.prayer && (
            <section className={`${s.section} ${s.prayer}`} data-motion>
              <Gunungan className={s.prayerGunungan} />
              <div data-reveal="soft">
                <p className={s.eyebrow}>Dalam lindungan doa</p>
                <blockquote>“{content.prayer}”</blockquote>
                <Kawung />
              </div>
              <Florals />
            </section>
          )}

          {ceremonies.length > 0 && (
            <section id="events" className={`${s.section} ${s.events}`}>
              <header className={s.sectionTitle} data-reveal="rise">
                <p className={s.eyebrow}>03 / Waktu yang dinantikan</p>
                <h2>Menjadi saksi<br /><em>hari bahagia.</em></h2>
                <p>{formatCeremonyDate(primaryDate, timezone)}</p>
              </header>
              <div className={s.eventGrid}>
                {ceremonies.map((event, i: number) => (
                  <article key={i} className={s.eventCard} data-reveal={i ? 'right' : 'left'}>
                    <div className={s.eventTop}><Gunungan /><span>0{i + 1}</span></div>
                    <h3>{event.title}</h3>
                    <p className={s.eventDate}>{formatCeremonyDate(event.startDateTime, timezone)}</p>
                    <p className={s.eventTime}>{formatCeremonyTimeRange(event.startDateTime, event.endDateTime, timezone)}</p>
                    <div className={s.rule} />
                    <h4>{event.venue}</h4>
                    <p>{event.address}</p>
                    <div className={s.eventActions}>
                      {webLink(event.mapsUrl) && (
                        <a className={s.outlineButton} href={webLink(event.mapsUrl)} target="_blank" rel="noreferrer">
                          Buka Google Maps <span>↗</span>
                        </a>
                      )}
                      <AddToCalendarButton
                        event={{
                          title: `${event.title} - ${nameOne} & ${nameTwo}`,
                          startDateTime: event.startDateTime,
                          endDateTime: event.endDateTime,
                          venue: event.venue,
                          address: event.address,
                          description: `Pernikahan ${nameOne} & ${nameTwo}`,
                          url: canonicalUrl || undefined,
                          timeZone: timezone,
                        }}
                        theme="sekar-kedaton"
                      />
                    </div>
                    <Kawung />
                  </article>
                ))}
              </div>
              <Florals />
            </section>
          )}

          {gallery.length > 0 && (
            <section id="gallery" className={`${s.section} ${s.gallerySection}`}>
              <header data-reveal="rise">
                <p className={s.eyebrow}>04 / Ronce kenangan</p>
                <h2>Sekejap yang tinggal<br /><em>untuk selamanya.</em></h2>
              </header>
              <div className={s.gallery} data-count={gallery.length}>
                {gallery.map((photo, i: number) => (
                  <figure key={`${photo.src}-${i}`} data-reveal={i % 2 ? 'rise' : 'curtain'}>
                    <button onClick={() => setLightbox(i)} aria-label={`Perbesar foto ${i + 1}`}>
                      <img src={mediaSrc(photo.src, isPreview)} alt={`Kenangan ${nameOne} dan ${nameTwo}, foto ${i + 1}`} loading="lazy" />
                      <span>↗</span>
                    </button>
                    <figcaption><span>0{i + 1}</span>Sepotong cerita kita</figcaption>
                  </figure>
                ))}
              </div>
            </section>
          )}

          {(Boolean(content.giftAccounts?.length) || Boolean(qrisSrc)) && (
            <section id="gift" className={`${s.section} ${s.gift}`}>
              <div className={s.giftIntro} data-reveal="left">
                <Gunungan />
                <p className={s.eyebrow}>Tanda kasih</p>
                <h2>Seikhlas hati,<br /><em>sehangat doa.</em></h2>
                <p>Kehadiran dan doa Anda adalah hadiah terindah. Bila berkenan berbagi tanda kasih, kami menerimanya dengan penuh syukur.</p>
              </div>
              <div className={s.accounts}>
                {content.giftAccounts?.map((account, i: number) => (
                  <article key={i} className={s.account} data-reveal="rise">
                    <Kawung />
                    <p className={s.bankName}>{account.bankName}</p>
                    <strong>{account.accountNumber}</strong>
                    <p>a.n. {account.accountHolder}</p>
                    <button className={s.outlineButton} onClick={() => copy(account.accountNumber || '')}>
                      Salin nomor rekening <span>↗</span>
                    </button>
                  </article>
                ))}
                <QrisGiftCard
                  qrisUrl={qrisSrc}
                  coupleName={`${nameOne} & ${nameTwo}`}
                  theme="sekar-kedaton"
                />
              </div>
            </section>
          )}

          {showRsvpAndQr && (
            <section id="rsvp" className={`${s.section} ${s.rsvp}`}>
              <div className={s.rsvpIntro} data-reveal="left">
                <p className={s.eyebrow}>Kehadiran &amp; Registrasi Tamu</p>
                <h2>Sebuah tempat<br /><em>untuk Anda.</em></h2>
                <p>Kami menantikan kehadiran Anda untuk melengkapi hari bahagia ini. Silakan konfirmasi kehadiran melalui RSVP dan tunjukkan kode QR saat registrasi di lokasi acara.</p>
                <Kawung />
              </div>
              <div className={s.rsvpQrGrid} data-reveal="right">
                <div className={s.rsvpCardSlot}>
                  <RsvpForm
                    key={uniqueCode || 'preview-rsvp'}
                    uniqueCode={uniqueCode || 'simulasi-tamu'}
                    maxPax={data.guest?.maxPax || 2}
                    initialRsvp={data.rsvp || { canRespond: true, response: 'PENDING', pax: 1 }}
                    variant="sekar-kedaton"
                  />
                </div>
                <div className={s.qrCardSlot}>
                  <QRDisplay
                    canonicalUrl={
                      canonicalUrl ||
                      (uniqueCode ? getCanonicalInvitationUrl(uniqueCode) : null) ||
                      'https://irvite.id/i/SIMULASI-TAMU'
                    }
                    guestName={guestVisible && data.guest?.name ? data.guest.name : 'Bapak / Ibu / Saudara/i'}
                    maxPax={data.guest?.maxPax || 2}
                    tableNumber={data.guest?.tableNumber}
                    eventTitle={data.event?.title}
                    variant="sekar-kedaton"
                  />
                </div>
              </div>
            </section>
          )}

          <WishesSection
            uniqueCode={uniqueCode}
            eventSlug={data.event?.slug}
            defaultName={guestVisible && data.guest?.name ? data.guest.name : ''}
            initialWishes={data.wishes?.items}
            title={data.wishes?.title}
            description={data.wishes?.description}
            variant="sekar-kedaton"
          />

          <section className={`${s.section} ${s.closing}`} data-motion>
            <Scene />
            <div data-reveal="soft">
              <Gunungan />
              <p className={s.eyebrow}>Terima kasih, dari hati kami</p>
              <h2>Cerita ini lebih indah<br /><em>bersama Anda.</em></h2>
              {content.closing && <p>{content.closing}</p>}
              <h3>{nameOne} & {nameTwo}</h3>
              <a href="#home">Kembali ke awal ↑</a>
            </div>
            <footer>crafted with love <strong>irvite</strong></footer>
          </section>

          <nav className={s.nav} aria-label="Navigasi undangan">
            <a href="#home" aria-label="Awal"><Gunungan /></a>
            <a href="#couple">Mempelai</a>
            {ceremonies.length > 0 && <a href="#events">Acara</a>}
            {gallery.length > 0 && <a href="#gallery">Galeri</a>}
            {(Boolean(content.giftAccounts?.length) || Boolean(qrisSrc)) && <a href="#gift">Gift</a>}
            {showRsvpAndQr && <a href="#rsvp">RSVP &amp; QR</a>}
            <a href="#wishes">Doa</a>
          </nav>
        </main>
      )}

      <div className={s.controls}>
        <button aria-label={paused ? 'Aktifkan animasi' : 'Jeda animasi'} aria-pressed={paused} onClick={() => setPaused((p) => !p)}>
          {paused ? '▷' : 'Ⅱ'}
        </button>
        {audioSrc && (
          <>
            <audio
              ref={audio}
              src={audioSrc}
              loop
              preload="none"
              onPlay={() => setPlaying(true)}
              onPause={() => setPlaying(false)}
              onError={() => {
                setPlaying(false);
                setFeedback('Berkas musik tidak dapat dimuat.');
              }}
            />
            <button aria-label={playing ? 'Jeda musik' : 'Putar musik'} aria-pressed={playing} onClick={toggleMusic}>
              ♫
            </button>
          </>
        )}
      </div>

      {feedback && (
        <div className={s.feedback} role="status">
          {feedback}
          <button onClick={() => setFeedback('')} aria-label="Tutup informasi">×</button>
        </div>
      )}

      <dialog
        ref={dialog}
        className={s.lightbox}
        aria-label="Foto galeri"
        onClose={() => setLightbox(null)}
        onClick={(event) => {
          if (event.target === event.currentTarget) dialog.current?.close();
        }}
      >
        <button onClick={() => dialog.current?.close()} aria-label="Tutup foto">×</button>
        {lightbox !== null && gallery[lightbox] && (
          <img src={mediaSrc(gallery[lightbox].src, isPreview)} alt={`Foto ${nameOne} dan ${nameTwo}`} />
        )}
      </dialog>
    </div>
  );
}
