"use client";

import React, {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import type { RendererProps } from "../registry";
import type { CeremonyItem, GiftAccountItem } from "./ivory-garden.types";
import {
  adaptIvoryGardenContent,
  adaptIvoryGardenMedia,
} from "./ivory-garden.adapter";
import {
  formatCeremonyDate,
  formatCeremonyTime,
  parseTargetEpoch,
} from "./datetime-formatter";
import {
  resolveIvoryEffectiveMode,
  shouldRenderIvoryGuest,
  shouldRenderIvoryRsvp,
} from "./ivory-garden.gating";
import { resolveCoverGuestName } from "../mode-gating";
import { FONT_MAP } from "../fonts";
import { normalizeConfig } from "../../utils/config-normalizer";
import { RsvpForm } from "../../components/rsvp-form";
import styles from "./ivory-garden.module.css";

function Icon({
  name,
}: {
  name:
    | "envelope"
    | "pin"
    | "heart"
    | "gift"
    | "arrow"
    | "music"
    | "pause"
    | "copy"
    | "check";
}) {
  const paths: Record<string, ReactNode> = {
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
    copy: (
      <>
        <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
      </>
    ),
    check: <polyline points="20 6 9 17 4 12" />,
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

function computeRemaining(date: string, timeZone?: string): number[] {
  const targetEpoch = parseTargetEpoch(date, timeZone);
  if (!targetEpoch) return [0, 0, 0, 0];
  const diffSec = Math.max(0, Math.floor((targetEpoch - Date.now()) / 1000));
  const days = Math.floor(diffSec / 86400);
  const hours = Math.floor((diffSec % 86400) / 3600);
  const minutes = Math.floor((diffSec % 3600) / 60);
  const seconds = diffSec % 60;
  return [days, hours, minutes, seconds];
}

function Countdown({
  date,
  timeZone,
}: {
  date: string;
  timeZone?: string;
}) {
  const [remaining, setRemaining] = useState<number[]>(() =>
    computeRemaining(date, timeZone)
  );

  useEffect(() => {
    const timer = window.setInterval(() => {
      setRemaining(computeRemaining(date, timeZone));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [date, timeZone]);

  return (
    <div
      className={styles.countdown}
      aria-label="Hitung mundur menuju acara"
      aria-live="off"
    >
      {["Hari", "Jam", "Menit", "Detik"].map((label, index) => (
        <div key={label}>
          <strong>
            {String(remaining[index]).padStart(2, "0")}
          </strong>
          <span>{label}</span>
        </div>
      ))}
    </div>
  );
}

function resolveMediaSrc(src?: string): string | undefined {
  if (!src) return undefined;
  if (!src.startsWith("/") || src.startsWith("//") || /[\\\u0000-\u0020]/.test(src)) {
    return undefined;
  }
  return src.startsWith("/api-proxy") ? src : `/api-proxy${src}`;
}

function BankAccountCard({ account }: { account: GiftAccountItem }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(account.accountNumber);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 2200);
      } catch {
        // Gracefully ignore clipboard failures
      }
    }
  };

  return (
    <div className={styles.giftCard}>
      <span className={styles.bankName}>{account.bankName}</span>
      <p
        className={styles.accountNumber}
        aria-label={`Nomor rekening ${account.accountNumber}`}
      >
        {account.accountNumber}
      </p>
      <p className={styles.accountHolder}>{account.accountHolderName}</p>
      <button
        type="button"
        className={styles.copyButton}
        onClick={() => void handleCopy()}
        aria-label={`Salin nomor rekening ${account.bankName}`}
      >
        <Icon name={copied ? "check" : "copy"} />
        <span>{copied ? "Tersalin!" : "Salin No. Rekening"}</span>
      </button>
    </div>
  );
}

export default function IvoryGarden(props: RendererProps) {
  const { data, isPreview = false, mode, uniqueCode = "" } = props;
  const { event, guest, template } = data;

  const adaptedContent = adaptIvoryGardenContent(event?.content);
  const adaptedMedia = adaptIvoryGardenMedia(data.mediaBySlot, data.media);
  const effectiveMode = resolveIvoryEffectiveMode(mode);
  const defaultIvorySections = [
    { id: "hero", enabled: true, order: 1, variant: "default" },
    { id: "greeting", enabled: true, order: 2, variant: "default" },
    { id: "eventDetails", enabled: true, order: 3, variant: "default" },
    { id: "countdown", enabled: true, order: 4, variant: "default" },
    { id: "gallery", enabled: true, order: 5, variant: "default" },
    { id: "location", enabled: true, order: 6, variant: "default" },
    { id: "rsvp", enabled: true, order: 7, variant: "default" },
    { id: "guestQr", enabled: false, order: 8, variant: "default" },
    { id: "closing", enabled: true, order: 9, variant: "default" },
  ];

  const config = template?.config
    ? normalizeConfig(template.config)
    : {
        ...normalizeConfig(null),
        theme: {
          primaryColor: "#4A5741",
          secondaryColor: "#A38A59",
          backgroundColor: "#F8F4EB",
          textColor: "#343B30",
        },
        typography: {
          headingFont: "PLAYFAIR_DISPLAY",
          bodyFont: "LORA",
        },
        sections: defaultIvorySections,
      };

  const timeZone =
    adaptedContent?.timeZone &&
    ["Asia/Jakarta", "Asia/Makassar", "Asia/Jayapura"].includes(
      adaptedContent.timeZone,
    )
      ? adaptedContent.timeZone
      : "Asia/Jakarta";

  const [opened, setOpened] = useState(isPreview);
  const [playing, setPlaying] = useState(false);
  const [audioError, setAudioError] = useState("");
  const audioRef = useRef<HTMLAudioElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);

  const headingClass =
    FONT_MAP[config.typography.headingFont] || FONT_MAP.PLAYFAIR_DISPLAY || "";
  const bodyClass =
    FONT_MAP[config.typography.bodyFont] || FONT_MAP.LORA || "";

  const audioSrc = resolveMediaSrc(adaptedMedia.bgMusic?.src);
  const coverGuestName = resolveCoverGuestName(
    effectiveMode === "PERSONALIZED" ? "PERSONAL" : "PUBLIC",
    guest?.name,
  );
  const canShowGuestGreeting = shouldRenderIvoryGuest(effectiveMode, guest);
  const canShowRsvp = shouldRenderIvoryRsvp(effectiveMode, guest, data.rsvp);

  const partnerOne = adaptedContent?.partnerOneName;
  const partnerTwo = adaptedContent?.partnerTwoName;
  const couple =
    partnerOne && partnerTwo ? `${partnerOne} & ${partnerTwo}` : event.title;

  const initials =
    [partnerOne, partnerTwo]
      .filter(Boolean)
      .map((name) => name!.trim()[0])
      .join(" · ") || "♡";

  const enabled = (id: string) =>
    config.sections.some(
      (section: { id: string; enabled: boolean }) =>
        section.id === id && section.enabled,
    );

  const ceremonies: CeremonyItem[] =
    adaptedContent?.ceremonies && adaptedContent.ceremonies.length > 0
      ? adaptedContent.ceremonies.slice(0, 2)
      : [
          {
            title: "Perayaan Pernikahan",
            dateTime: event.eventDate,
            venue: event.locationDetails?.split("\n")[0] || "",
            address: event.locationDetails || "",
            ...(adaptedContent?.mapsUrl
              ? { mapsUrl: adaptedContent.mapsUrl }
              : {}),
          },
        ];

  const palette = {
    "--ig-primary": config.theme.primaryColor || "#4A5741",
    "--ig-accent": config.theme.secondaryColor || "#A38A59",
    "--ig-paper": config.theme.backgroundColor || "#F8F4EB",
    "--ig-ink": config.theme.textColor || "#343B30",
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
      setAudioError("Musik belum dapat diputar otomatis. Ketuk tombol musik.");
    }
  }

  function openInvitation() {
    setOpened(true);
    if (audioSrc) {
      void toggleAudio();
    }
    window.requestAnimationFrame(() => {
      headingRef.current?.focus({ preventScroll: true });
    });
  }

  const names = (
    <>
      {partnerOne && partnerTwo ? (
        <>
          {partnerOne}
          <em>&amp;</em>
          {partnerTwo}
        </>
      ) : (
        couple
      )}
    </>
  );

  const renderSection = (id: string): ReactNode => {
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
                {formatCeremonyDate(ceremonies[0]?.dateTime, timeZone)}
              </p>
              {adaptedMedia.hero && resolveMediaSrc(adaptedMedia.hero.src) && (
                <div className={styles.heroPhoto}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={resolveMediaSrc(adaptedMedia.hero.src)}
                    alt={`Mempelai ${couple}`}
                    loading="lazy"
                  />
                </div>
              )}
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
            {adaptedContent?.openingText ? (
              <p className={styles.prose}>{adaptedContent.openingText}</p>
            ) : null}
            {canShowGuestGreeting && coverGuestName ? (
              <p className={styles.personal}>
                Teruntuk <strong>{coverGuestName}</strong>
                {guest?.customGreeting && <span>{guest.customGreeting}</span>}
                {data.invitation?.customMessage && (
                  <span>{data.invitation.customMessage}</span>
                )}
              </p>
            ) : null}
            <div className={styles.couple}>
              {partnerOne || partnerTwo ? (
                <>
                  <div>
                    <h3 className={headingClass}>
                      {partnerOne || couple}
                    </h3>
                    {adaptedContent?.partnerOneParents && (
                      <p>{adaptedContent.partnerOneParents}</p>
                    )}
                  </div>
                  <span className={styles.ampersand}>&amp;</span>
                  <div>
                    <h3 className={headingClass}>{partnerTwo || ""}</h3>
                    {adaptedContent?.partnerTwoParents && (
                      <p>{adaptedContent.partnerTwoParents}</p>
                    )}
                  </div>
                </>
              ) : (
                <h3 className={headingClass}>{couple}</h3>
              )}
            </div>
            {adaptedContent?.prayerText ? (
              <div className={styles.prayer}>
                <span className={styles.monogram}>{initials}</span>
                <blockquote>{adaptedContent.prayerText}</blockquote>
                {adaptedContent.prayerSource && (
                  <cite>{adaptedContent.prayerSource}</cite>
                )}
              </div>
            ) : null}
          </Section>
        );

      case "countdown":
        return ceremonies[0]?.dateTime ? (
          <Section id="menghitung-hari" className={styles.countdownSection}>
            <span className={styles.eyebrow}>SETIAP DETIK MENUJU KITA</span>
            <h2 className={headingClass}>Tak sabar berbagi bahagia.</h2>
            <Countdown
              date={ceremonies[0].dateTime}
              timeZone={timeZone}
            />
          </Section>
        ) : null;

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
                const maps = ceremony.mapsUrl || adaptedContent?.mapsUrl;
                return (
                  <article
                    className={styles.ceremony}
                    key={`${ceremony.title}-${index}`}
                  >
                    <span className={styles.ceremonyNumber}>0{index + 1}</span>
                    <h3 className={headingClass}>{ceremony.title}</h3>
                    <div className={styles.line} />
                    <p>{formatCeremonyDate(ceremony.dateTime, timeZone)}</p>
                    <p className={styles.time}>
                      {formatCeremonyTime(ceremony.dateTime, timeZone)}
                    </p>
                    {ceremony.venue && (
                      <strong className={styles.venue}>
                        {ceremony.venue}
                      </strong>
                    )}
                    {ceremony.address &&
                      ceremony.address !== ceremony.venue && (
                        <p className={styles.address}>{ceremony.address}</p>
                      )}
                    {maps && (
                      <a
                        href={maps}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={styles.outlineButton}
                      >
                        <Icon name="pin" />
                        Petunjuk lokasi
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
        return adaptedMedia.gallery.length > 0 ? (
          <Section id="kenangan">
            <p className={styles.eyebrow}>POTONGAN CERITA KAMI</p>
            <h2 className={headingClass}>Yang ingin kami kenang.</h2>
            <div
              className={
                adaptedMedia.gallery.length === 1
                  ? styles.gallerySingle
                  : styles.gallery
              }
            >
              {adaptedMedia.gallery.map((photo, index) => (
                <figure key={photo.src}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={resolveMediaSrc(photo.src)}
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
        return adaptedContent?.mapsUrl ? (
          <Section id="lokasi" className={styles.location}>
            <Icon name="pin" />
            <p className={styles.eyebrow}>TEMPAT KITA BERTEMU</p>
            <h2 className={headingClass}>Sampai jumpa di sana.</h2>
            {event.locationDetails && (
              <p className={styles.prose}>{event.locationDetails}</p>
            )}
            <a
              className={styles.button}
              href={adaptedContent.mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              Petunjuk lokasi
              <Icon name="arrow" />
            </a>
          </Section>
        ) : null;

      case "rsvp":
        return canShowRsvp && data.rsvp ? (
          <Section id="ucapan">
            <Sprig />
            <p className={styles.eyebrow}>KEHADIRAN ANDA BERARTI</p>
            <h2 className={headingClass}>Datang membawa bahagia.</h2>
            <div className={styles.rsvpWrapper}>
              <RsvpForm
                uniqueCode={uniqueCode}
                maxPax={guest?.maxPax || 1}
                initialRsvp={data.rsvp}
              />
            </div>
          </Section>
        ) : null;

      case "guestQr":
        return null; // Page-level QRDisplay in /i/[uniqueCode] mounts admission QR

      case "closing":
        return (
          <div key="closing">
            {adaptedContent?.giftAccounts &&
            adaptedContent.giftAccounts.length > 0 ? (
              <Section id="gift" className={styles.gift}>
                <Icon name="gift" />
                <p className={styles.eyebrow}>SEBUAH TANDA KASIH</p>
                <h2 className={headingClass}>
                  {adaptedContent.giftTitle || "Tanda Kasih"}
                </h2>
                {adaptedContent.giftMessage ? (
                  <p className={styles.prose}>{adaptedContent.giftMessage}</p>
                ) : null}
                <div className={styles.giftAccounts}>
                  {adaptedContent.giftAccounts.map((account) => (
                    <BankAccountCard
                      key={`${account.bankName}-${account.accountNumber}`}
                      account={account}
                    />
                  ))}
                </div>
              </Section>
            ) : null}

            <Section id="penutup" className={styles.closing}>
              <Sprig />
              <p className={styles.eyebrow}>DENGAN CINTA DAN TERIMA KASIH</p>
              {adaptedContent?.closingText ? (
                <p className={styles.prose}>{adaptedContent.closingText}</p>
              ) : null}
              <h2 className={`${styles.closingNames} ${headingClass}`}>
                {couple}
              </h2>
              <p className={styles.date}>
                {formatCeremonyDate(ceremonies[0]?.dateTime, timeZone)}
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
          <span>{formatCeremonyDate(ceremonies[0]?.dateTime, timeZone)}</span>
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
                {formatCeremonyDate(ceremonies[0]?.dateTime, timeZone)}
              </p>
              {effectiveMode === "PERSONALIZED" && (
                <div className={styles.recipient}>
                  <span>Kepada Yth.</span>
                  <strong>{coverGuestName || "Bapak / Ibu / Saudara/i"}</strong>
                </div>
              )}
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
                <div key={item.id}>{renderSection(item.id)}</div>
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
              {enabled("rsvp") && canShowRsvp && (
                <a href="#ucapan">
                  <Icon name="envelope" />
                  <span>RSVP</span>
                </a>
              )}
              {adaptedContent?.giftAccounts &&
                adaptedContent.giftAccounts.length > 0 &&
                enabled("closing") && (
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
                aria-pressed={playing}
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
