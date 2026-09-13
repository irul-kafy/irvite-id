"use client";

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import type { RendererProps } from "../registry";
import type { WeddingWish } from "../../types/event-content";
import { normalizeConfig } from "../../utils/config-normalizer";
import { resolveCoverGuestName, shouldRenderRsvp } from "../mode-gating";
import { FONT_MAP } from "../fonts";
import {
  GARDEN_DEFAULTS,
  gardenCountdown,
  gardenDate,
  gardenMapsUrl,
  gardenMediaSrc,
  gardenPhotos,
} from "./ivory-garden-model";
import styles from "./ivory-garden.module.css";

function Icon({
  name,
}: {
  name: "envelope" | "pin" | "heart" | "gift" | "arrow" | "music" | "pause";
}) {
  const paths = {
    envelope: (
      <>
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path d="m3 6 9 7 9-7" />
      </>
    ),
    pin: (
      <>
        <path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0Z" />
        <circle cx="12" cy="10" r="2.5" />
      </>
    ),
    heart: (
      <path d="M20.5 5.5a5.3 5.3 0 0 0-8.5 1 5.3 5.3 0 0 0-8.5-1c-5 5 3.5 11 8.5 15 5-4 13.5-10 8.5-15Z" />
    ),
    gift: (
      <>
        <rect x="3" y="8" width="18" height="4" rx="1" />
        <path d="M5 12v9h14v-9M12 8v13M12 8H8a3 3 0 1 1 3-3l1 3Zm0 0h4a3 3 0 1 0-3-3l-1 3Z" />
      </>
    ),
    arrow: <path d="M5 12h14m-6-6 6 6-6 6" />,
    music: (
      <>
        <path d="M9 18V5l11-2v13M9 8l11-2" />
        <ellipse cx="6" cy="18" rx="3" ry="2" />
        <ellipse cx="17" cy="16" rx="3" ry="2" />
      </>
    ),
    pause: (
      <>
        <path d="M8 5v14M16 5v14" />
      </>
    ),
  };
  return (
    <svg
      width="19"
      height="19"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.35"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  );
}

function Sprig() {
  return (
    <svg
      className={styles.sprig}
      viewBox="0 0 100 54"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M15 43c24-3 47-15 68-34M32 38C16 30 20 19 33 28l7 7M47 30C33 17 42 8 49 23l3 5M61 21C54 8 64 1 66 15l1 3M38 36c14 4 22 0 23-8M56 26c16 3 24-4 19-10"
        stroke="currentColor"
        strokeWidth="1.1"
      />
    </svg>
  );
}

function Section({
  children,
  id,
  className = "",
}: {
  children: ReactNode;
  id: string;
  className?: string;
}) {
  return (
    <section id={id} className={`${styles.section} ${className}`}>
      {children}
    </section>
  );
}

function Countdown({ date }: { date: string }) {
  const [remaining, setRemaining] = useState<number[] | null>(null);
  useEffect(() => {
    const update = () => setRemaining(gardenCountdown(date, Date.now()));
    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, [date]);
  return (
    <div className={styles.countdown} aria-label="Hitung mundur menuju acara">
      {["Hari", "Jam", "Menit", "Detik"].map((label, index) => (
        <div key={label}>
          <strong>
            {remaining ? String(remaining[index]).padStart(2, "0") : "—"}
          </strong>
          <span>{label}</span>
        </div>
      ))}
    </div>
  );
}

function GardenRsvp({ data, uniqueCode = "", isPreview }: RendererProps) {
  const initial = data.rsvp!;
  const [response, setResponse] = useState<"YES" | "NO" | "">(
    initial.response === "PENDING" ? "" : initial.response,
  );
  const [pax, setPax] = useState(initial.pax || 1);
  const [busy, setBusy] = useState(false);
  const [closed, setClosed] = useState(!isPreview && !initial.canRespond);
  const [message, setMessage] = useState("");
  const maxPax = data.guest?.maxPax || 1;
  return (
    <form
      className={styles.form}
      onSubmit={async (e) => {
        e.preventDefault();
        if (busy || closed || !response) return;
        if (isPreview) {
          setMessage(
            "Contoh konfirmasi kehadiran. Data pratinjau tidak disimpan.",
          );
          return;
        }
        setBusy(true);
        setMessage("");
        try {
          const res = await fetch(
            `/api-proxy/invitations/public/${encodeURIComponent(uniqueCode)}/rsvp`,
            {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                response,
                ...(response === "YES" ? { pax } : {}),
              }),
            },
          );
          if (res.status === 409) {
            setClosed(true);
            setMessage("Konfirmasi kehadiran sudah ditutup.");
            return;
          }
          if (!res.ok)
            throw new Error("Konfirmasi belum tersimpan. Silakan coba lagi.");
          setMessage(
            "Terima kasih. Konfirmasi kehadiran Anda sudah tersimpan.",
          );
        } catch (error) {
          setMessage(
            error instanceof Error ? error.message : "Silakan coba lagi.",
          );
        } finally {
          setBusy(false);
        }
      }}
    >
      {closed ? (
        <p>
          Konfirmasi kehadiran sudah ditutup.
          {initial.response !== "PENDING" &&
            ` Jawaban Anda: ${initial.response === "YES" ? `hadir, ${initial.pax || 1} orang` : "berhalangan hadir"}.`}
        </p>
      ) : (
        <>
          <fieldset disabled={busy}>
            <legend>Apakah Anda berkenan hadir?</legend>
            <div className={styles.options}>
              {(["YES", "NO"] as const).map((value) => (
                <label key={value}>
                  <input
                    type="radio"
                    name="garden-rsvp"
                    value={value}
                    checked={response === value}
                    onChange={() => setResponse(value)}
                    required
                  />
                  <span>
                    {value === "YES"
                      ? "Dengan senang hati"
                      : "Maaf, berhalangan"}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
          {response === "YES" && maxPax > 1 && (
            <label>
              Jumlah yang hadir
              <select
                value={pax}
                onChange={(e) => setPax(Number(e.target.value))}
                disabled={busy}
              >
                {Array.from({ length: maxPax }, (_, index) => (
                  <option key={index} value={index + 1}>
                    {index + 1} orang
                  </option>
                ))}
              </select>
            </label>
          )}
          <button
            className={styles.button}
            type="submit"
            disabled={busy || !response}
          >
            {busy ? "Menyimpan…" : "Konfirmasi kehadiran"}
            <Icon name="arrow" />
          </button>
        </>
      )}
      {message && (
        <p className={styles.feedback} role="status">
          {message}
        </p>
      )}
    </form>
  );
}

function Wishes({ data, uniqueCode = "", isPreview, mode }: RendererProps) {
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [publishedWishes, setPublishedWishes] = useState<WeddingWish[]>(data.event.wishes || []);
  const [saved, setSaved] = useState<WeddingWish | null>(null);
  const personal =
    mode === "PERSONAL" && Boolean(data.guest) && Boolean(uniqueCode);
  const wishes = [
    ...(saved ? [saved] : []),
    ...publishedWishes,
  ].slice(0, 20);
  return (
    <>
      <div className={styles.wishIntro}>
        <span className={styles.eyebrow}>UNTUK PERJALANAN KAMI</span>
        <h3>Sepucuk doa, sejuta makna.</h3>
        <p>
          Kalimat sederhana dari Anda akan menjadi kenangan yang selalu kami
          jaga.
        </p>
      </div>
      {personal ? (
        <form
          className={styles.form}
          onSubmit={async (e) => {
            e.preventDefault();
            if (!name.trim() || !message.trim() || !consent || busy) return;
            setBusy(true);
            setFeedback("");
            try {
              if (isPreview) {
                setSaved({
                  name: name.trim(),
                  message: message.trim(),
                  createdAt: new Date().toISOString(),
                });
                setFeedback(
                  "Ucapan ini hanya contoh pratinjau dan tidak disimpan.",
                );
              } else {
                const res = await fetch(
                  `/api-proxy/invitations/public/${encodeURIComponent(uniqueCode)}/wishes`,
                  {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      name: name.trim(),
                      message: message.trim(),
                    }),
                  },
                );
                if (res.status === 429)
                  throw new Error(
                    "Tunggu 30 detik sebelum memperbarui ucapan.",
                  );
                if (res.status === 409)
                  throw new Error(
                    "Pengiriman ucapan untuk acara ini sudah ditutup.",
                  );
                if (!res.ok)
                  throw new Error("Ucapan belum terkirim. Silakan coba lagi.");
                setFeedback("Terima kasih. Doa baik Anda sudah kami simpan.");
                // Reload the bounded public feed so editing an existing wish
                // replaces its previous text instead of appearing twice.
                try {
                  const refreshed = await fetch(`/api-proxy/invitations/public/${encodeURIComponent(uniqueCode)}`, { cache: "no-store" });
                  if (refreshed.ok) {
                    const current = await refreshed.json();
                    setPublishedWishes(current.event.wishes || []);
                    setSaved(null);
                  }
                } catch { /* The write succeeded; a feed refresh may be retried by reloading. */ }
              }
              setMessage("");
            } catch (error) {
              setFeedback(
                error instanceof Error ? error.message : "Silakan coba lagi.",
              );
            } finally {
              setBusy(false);
            }
          }}
        >
          <label>
            Nama yang ditampilkan
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
              maxLength={80}
              placeholder="Nama Anda"
              required
              disabled={busy}
            />
          </label>
          <label>
            Doa &amp; ucapan
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength={1000}
              rows={4}
              placeholder="Tuliskan doa dan harapan terbaik Anda…"
              required
              disabled={busy}
            />
          </label>
          <label className={styles.consent}>
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              required
              disabled={busy}
            />
            <span>
              Saya setuju nama dan ucapan ini ditampilkan pada undangan.
            </span>
          </label>
          <button
            className={styles.button}
            type="submit"
            disabled={busy || !consent}
          >
            {busy ? "Mengirim…" : "Kirim doa & ucapan"}
            <Icon name="envelope" />
          </button>
          {feedback && (
            <p className={styles.feedback} role="status">
              {feedback}
            </p>
          )}
        </form>
      ) : (
        <p className={styles.note}>
          Buka link undangan personal Anda untuk mengirim doa dan mengonfirmasi
          kehadiran.
        </p>
      )}
      <div
        className={styles.wishes}
        aria-label="Doa dan ucapan tamu"
        aria-live="polite"
      >
        {wishes.length ? (
          wishes.map((wish, index) => (
            <article key={`${wish.createdAt}-${index}`} className={styles.wish}>
              <Icon name="heart" />
              <div>
                <h4>{wish.name}</h4>
                <p>{wish.message}</p>
              </div>
            </article>
          ))
        ) : (
          <p className={styles.note}>
            Setiap doa baik adalah bagian dari cerita kami.
          </p>
        )}
      </div>
    </>
  );
}

export default function IvoryGarden(props: RendererProps) {
  const { data, isPreview = false, mode } = props;
  const { event, guest, template } = data;
  const content = event.content || {};
  const config = normalizeConfig(template?.config);
  const timeZone = ["Asia/Jakarta", "Asia/Makassar", "Asia/Jayapura"].includes(
    content.timeZone || "",
  )
    ? content.timeZone!
    : "Asia/Jakarta";
  const zoneLabel = {
    "Asia/Jakarta": "WIB",
    "Asia/Makassar": "WITA",
    "Asia/Jayapura": "WIT",
  }[timeZone];
  const [opened, setOpened] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [audioError, setAudioError] = useState("");
  const audioRef = useRef<HTMLAudioElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const headingClass =
    FONT_MAP[config.typography.headingFont] || FONT_MAP.PLAYFAIR_DISPLAY;
  const bodyClass = FONT_MAP[config.typography.bodyFont] || FONT_MAP.LORA;
  const audioSrc = gardenMediaSrc(
    data.media?.find((item) => item.type === "AUDIO")?.src,
  );
  const photos = gardenPhotos(data.media, event.giftQr?.src);
  const giftSrc = gardenMediaSrc(event.giftQr?.src);
  const showGift = Boolean(giftSrc) || isPreview;
  const guestName = resolveCoverGuestName(mode, guest?.name);
  const couple =
    content.partnerOneName && content.partnerTwoName
      ? `${content.partnerOneName} & ${content.partnerTwoName}`
      : event.title;
  const initials =
    [content.partnerOneName, content.partnerTwoName]
      .filter(Boolean)
      .map((name) => name!.trim()[0])
      .join(" · ") || "♡";
  const enabled = (id: string) =>
    config.sections.some(
      (section: { id: string; enabled: boolean }) =>
        section.id === id && section.enabled,
    );
  const maps = gardenMapsUrl(content.mapsUrl, event.locationDetails);
  const ceremonies = content.ceremonies?.length
    ? content.ceremonies.slice(0, 2)
    : [
        {
          title: "Perayaan Pernikahan",
          dateTime: event.eventDate,
          venue: event.locationDetails?.split("\n")[0] || "",
          address: event.locationDetails || "",
          mapsUrl: content.mapsUrl,
        },
      ];
  const palette = {
    "--ig-primary": config.theme.primaryColor,
    "--ig-accent": config.theme.secondaryColor,
    "--ig-paper": config.theme.backgroundColor,
    "--ig-ink": config.theme.textColor,
  } as CSSProperties;

  async function toggleAudio() {
    if (!audioRef.current) return;
    if (playing) {
      audioRef.current.pause();
      setPlaying(false);
      return;
    }
    try {
      await audioRef.current.play();
      setPlaying(true);
      setAudioError("");
    } catch {
      setAudioError("Musik belum dapat diputar. Coba kembali.");
    }
  }

  function openInvitation() {
    setOpened(true);
    if (audioSrc) void toggleAudio();
    window.requestAnimationFrame(() =>
      headingRef.current?.focus({ preventScroll: true }),
    );
  }

  const names = (
    <>
      {content.partnerOneName && content.partnerTwoName ? (
        <>
          {content.partnerOneName}
          <em>&amp;</em>
          {content.partnerTwoName}
        </>
      ) : (
        couple
      )}
    </>
  );

  const section = (id: string): ReactNode => {
    switch (id) {
      case "hero":
        return (
          <header id="awal" className={styles.hero}>
            <div className={styles.heroText}>
              <p className={styles.eyebrow}>THE WEDDING OF</p>
              <h1
                tabIndex={-1}
                ref={headingRef}
                className={`${styles.names} ${headingClass}`}
              >
                {names}
              </h1>
              <div className={styles.line} />
              <p className={styles.date}>
                {gardenDate(event.eventDate, timeZone)}
              </p>
              <p className={styles.heroCaption}>
                Sebuah awal. Seumur hidup bersama.
              </p>
            </div>
            <a href="#mempelai" className={styles.scrollHint}>
              GULIR UNTUK MEMBACA<span>↓</span>
            </a>
          </header>
        );
      case "greeting":
        return (
          <Section id="mempelai">
            <Sprig />
            <p className={styles.eyebrow}>DENGAN RAHMAT DAN KASIH-NYA</p>
            <h2 className={headingClass}>Dua hati, satu tujuan.</h2>
            <p className={styles.prose}>
              {content.openingText ||
                event.description ||
                GARDEN_DEFAULTS.openingText}
            </p>
            {guestName && (
              <p className={styles.personal}>
                Teruntuk <strong>{guestName}</strong>
                {guest?.customGreeting && <span>{guest.customGreeting}</span>}
                {data.invitation?.customMessage && (
                  <span>{data.invitation.customMessage}</span>
                )}
              </p>
            )}
            <div className={styles.couple}>
              {[content.partnerOneName, content.partnerTwoName].some(
                Boolean,
              ) ? (
                <>
                  <div>
                    <h3 className={headingClass}>{content.partnerOneName}</h3>
                    <p>{content.partnerOneParents}</p>
                  </div>
                  <span className={styles.ampersand}>&amp;</span>
                  <div>
                    <h3 className={headingClass}>{content.partnerTwoName}</h3>
                    <p>{content.partnerTwoParents}</p>
                  </div>
                </>
              ) : (
                <h3 className={headingClass}>{couple}</h3>
              )}
            </div>
            <div className={styles.prayer}>
              <span className={styles.monogram}>{initials}</span>
              <blockquote>
                {content.prayerText || GARDEN_DEFAULTS.prayerText}
              </blockquote>
              {content.prayerSource && <cite>{content.prayerSource}</cite>}
            </div>
          </Section>
        );
      case "countdown":
        return (
          <Section id="menghitung-hari" className={styles.countdownSection}>
            <span className={styles.eyebrow}>SETIAP DETIK MENUJU KITA</span>
            <h2 className={headingClass}>Tak sabar berbagi bahagia.</h2>
            <Countdown date={event.eventDate} />
          </Section>
        );
      case "eventDetails":
        return (
          <Section id="acara">
            <Sprig />
            <p className={styles.eyebrow}>SEBUAH HARI ISTIMEWA</p>
            <h2 className={headingClass}>Janji &amp; perayaan.</h2>
            <p className={styles.prose}>
              Dengan sukacita, kami menantikan kehadiran Anda.
            </p>
            <div className={styles.ceremonies}>
              {ceremonies.map((ceremony, index) => {
                const url = gardenMapsUrl(
                  ceremony.mapsUrl || content.mapsUrl,
                  ceremony.address || ceremony.venue || event.locationDetails,
                );
                return (
                  <article
                    className={styles.ceremony}
                    key={`${ceremony.title}-${index}`}
                  >
                    <span className={styles.ceremonyNumber}>0{index + 1}</span>
                    <h3 className={headingClass}>{ceremony.title}</h3>
                    <div className={styles.line} />
                    <p>{gardenDate(ceremony.dateTime, timeZone)}</p>
                    <p className={styles.time}>
                      {gardenDate(ceremony.dateTime, timeZone, true)}{" "}
                      {zoneLabel}
                    </p>
                    {ceremony.venue && (
                      <strong className={styles.venue}>{ceremony.venue}</strong>
                    )}
                    {ceremony.address &&
                      ceremony.address !== ceremony.venue && (
                        <p className={styles.address}>{ceremony.address}</p>
                      )}
                    {url && (
                      <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={styles.outlineButton}
                      >
                        <Icon name="pin" />
                        Buka Google Maps
                        <Icon name="arrow" />
                      </a>
                    )}
                  </article>
                );
              })}
            </div>
          </Section>
        );
      case "gallery":
        return photos.length ? (
          <Section id="kenangan">
            <p className={styles.eyebrow}>POTONGAN CERITA KAMI</p>
            <h2 className={headingClass}>Yang ingin kami kenang.</h2>
            <div className={styles.gallery}>
              {photos.map((photo, index) => (
                <figure key={photo.src}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={gardenMediaSrc(photo.src)}
                    alt={`Kenangan ${couple}, foto ${index + 1}`}
                    loading="lazy"
                    decoding="async"
                  />
                </figure>
              ))}
            </div>
          </Section>
        ) : null;
      case "location":
        return maps ? (
          <Section id="lokasi" className={styles.location}>
            <Icon name="pin" />
            <p className={styles.eyebrow}>TEMPAT KITA BERTEMU</p>
            <h2 className={headingClass}>Sampai jumpa di sana.</h2>
            {event.locationDetails && (
              <p className={styles.prose}>{event.locationDetails}</p>
            )}
            <a
              className={styles.button}
              href={maps}
              target="_blank"
              rel="noopener noreferrer"
            >
              Petunjuk lokasi
              <Icon name="arrow" />
            </a>
          </Section>
        ) : null;
      case "rsvp":
        return (
          <Section id="ucapan">
            <Sprig />
            <p className={styles.eyebrow}>KEHADIRAN ANDA BERARTI</p>
            <h2 className={headingClass}>Datang membawa bahagia.</h2>
            {shouldRenderRsvp(mode, Boolean(guest), Boolean(data.rsvp)) && (
              <GardenRsvp {...props} />
            )}
            <Wishes {...props} />
          </Section>
        );
      case "guestQr":
        return null; // Admission QR remains mounted by the personal invitation page.
      case "closing":
        return (
          <div key="closing">
            {showGift && (
              <Section id="gift" className={styles.gift}>
                <Icon name="gift" />
                <p className={styles.eyebrow}>SEBUAH TANDA KASIH</p>
                <h2 className={headingClass}>
                  {content.giftTitle || "Hadiah untuk kami."}
                </h2>
                <p className={styles.prose}>
                  {content.giftMessage || GARDEN_DEFAULTS.giftMessage}
                </p>
                <div className={styles.giftCard}>
                  {giftSrc ? (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={giftSrc}
                        alt={`QR pembayaran hadiah${content.giftAccountName ? ` atas nama ${content.giftAccountName}` : ""}`}
                        loading="lazy"
                      />
                      <p>
                        {content.giftAccountName ||
                          "Tanda kasih untuk kedua mempelai"}
                      </p>
                      <a
                        className={styles.outlineButton}
                        href={giftSrc}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Buka gambar QR
                        <Icon name="arrow" />
                      </a>
                    </>
                  ) : (
                    <>
                      <div className={styles.qrPlaceholder}>
                        <Icon name="gift" />
                        <span>QR gift Anda</span>
                      </div>
                      <strong>Ruang untuk tanda kasih</strong>
                      <p>
                        Contoh penempatan gambar QR bank.
                        <br />
                        Tidak dapat digunakan untuk pembayaran.
                      </p>
                    </>
                  )}
                </div>
              </Section>
            )}
            <Section id="penutup" className={styles.closing}>
              <Sprig />
              <p className={styles.eyebrow}>DENGAN CINTA DAN TERIMA KASIH</p>
              <p className={styles.prose}>
                {content.closingText || GARDEN_DEFAULTS.closingText}
              </p>
              <h2 className={`${styles.closingNames} ${headingClass}`}>
                {couple}
              </h2>
              <p className={styles.date}>
                {gardenDate(event.eventDate, timeZone)}
              </p>
              <div className={styles.brand}>
                <span>crafted with love</span>
                <span>irvite.id</span>
              </div>
            </Section>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className={`${styles.page} ${bodyClass}`} style={palette}>
      <aside className={styles.desktopArt} aria-hidden="true">
        <div>
          <span className={styles.eyebrow}>A CELEBRATION OF LOVE</span>
          <p className={headingClass}>{couple}</p>
          <span>{gardenDate(event.eventDate, timeZone)}</span>
          <div className={styles.line} />
          <i>
            Di antara semua kisah,
            <br />
            kita memilih untuk menjadi satu.
          </i>
        </div>
      </aside>
      <div className={styles.invitation}>
        {!opened ? (
          <section className={styles.cover} aria-label="Sampul undangan">
            <div className={styles.coverText}>
              <span className={styles.eyebrow}>YOU ARE CORDIALLY INVITED</span>
              <h1 className={`${styles.names} ${headingClass}`}>{names}</h1>
              <div className={styles.line} />
              <p className={styles.date}>
                {gardenDate(event.eventDate, timeZone)}
              </p>
              <div className={styles.recipient}>
                <span>Kepada Yth.</span>
                <strong>{guestName || "Bapak / Ibu / Saudara/i"}</strong>
              </div>
              <button
                type="button"
                className={styles.button}
                onClick={openInvitation}
              >
                <Icon name="envelope" />
                Buka undangan
              </button>
              {isPreview && (
                <span className={styles.previewBadge}>PRATINJAU TEMPLATE</span>
              )}
            </div>
          </section>
        ) : (
          <div className={styles.opened}>
            {config.sections
              .filter((item: { enabled: boolean }) => item.enabled)
              .map((item: { id: string }) => (
                <div key={item.id}>{section(item.id)}</div>
              ))}
            {!enabled("closing") && (
              <footer className={styles.minimalBrand}>irvite.id</footer>
            )}
            <nav className={styles.nav} aria-label="Navigasi undangan">
              {enabled("greeting") && (
                <a href="#mempelai">
                  <Icon name="heart" />
                  <span>Mempelai</span>
                </a>
              )}
              {enabled("eventDetails") && (
                <a href="#acara">
                  <Icon name="pin" />
                  <span>Acara</span>
                </a>
              )}
              {enabled("rsvp") && (
                <a href="#ucapan">
                  <Icon name="envelope" />
                  <span>Ucapan</span>
                </a>
              )}
              {showGift && enabled("closing") && (
                <a href="#gift">
                  <Icon name="gift" />
                  <span>Gift</span>
                </a>
              )}
            </nav>
          </div>
        )}
        {audioSrc && (
          <>
            <audio
              ref={audioRef}
              src={audioSrc}
              loop
              preload="none"
              onError={() => {
                setPlaying(false);
                setAudioError("Musik belum tersedia.");
              }}
            />
            {opened && (
              <button
                type="button"
                className={styles.music}
                onClick={() => void toggleAudio()}
                aria-label={playing ? "Jeda musik" : "Putar musik"}
              >
                <Icon name={playing ? "pause" : "music"} />
              </button>
            )}
            {audioError && (
              <span role="status" className={styles.audioStatus}>
                {audioError}
              </span>
            )}
          </>
        )}
      </div>
    </div>
  );
}
