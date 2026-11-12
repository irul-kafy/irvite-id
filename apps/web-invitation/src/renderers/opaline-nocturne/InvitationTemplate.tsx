"use client";
import { useEffect, useRef, useState } from "react";
import type { Feature, InvitationTemplateProps } from "./types";
import { Opening } from "./components/Opening";
import { Hero } from "./components/Hero";
import { Countdown } from "./components/Countdown";
import { Couple } from "./components/Couple";
import { Story } from "./components/Story";
import { Events } from "./components/Events";
import { Gallery } from "./components/Gallery";
import { RSVP } from "./components/RSVP";
import { Wishes } from "./components/Wishes";
import { Gift } from "./components/Gift";
import { Closing } from "./components/Closing";
import { Heading, Photo, safeAsset, Section } from "./components/Shared";
import { useScrollReveal } from "./hooks/useScrollReveal";
import s from "./InvitationTemplate.module.css";
export type {
  InvitationTemplateProps,
  InvitationData,
  Guest,
  ThemeTokens,
  RsvpSubmission,
  WishSubmission,
} from "./types";
export default function InvitationTemplate({
  data,
  guest,
  theme,
  rsvpSlot,
  qrSlot,
  onRsvpSubmit,
  onWishSubmit,
  callbacks,
}: InvitationTemplateProps) {
  const [stage, setStage] = useState<"closed" | "opening" | "open">("closed");
  const [playing, setPlaying] = useState(false);
  const [musicStatus, setMusicStatus] = useState("");
  const root = useRef<HTMLDivElement>(null);
  const audio = useRef<HTMLAudioElement>(null);
  const feature = (key: Feature) => data.features?.[key] !== false;
  const musicSrc = feature("music") ? safeAsset(data.music?.src) : undefined;
  useScrollReveal(root, stage === "open");
  useEffect(() => {
    if (stage !== "opening") return;
    const timer = window.setTimeout(
      () => setStage("open"),
      window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 1500,
    );
    return () => clearTimeout(timer);
  }, [stage]);
  useEffect(() => {
    if (stage === "open") {
      root.current?.scrollIntoView({ block: "start", behavior: "instant" });
      root.current
        ?.querySelector<HTMLElement>("[data-opening-focus]")
        ?.focus({ preventScroll: true });
    }
  }, [stage]);
  async function playMusic() {
    if (!audio.current) return;
    try {
      await audio.current.play();
      setMusicStatus("");
    } catch {
      setMusicStatus("Ketuk tombol musik untuk mencoba memutar kembali.");
    }
  }
  const guestKey = `${guest?.kind ?? "general"}-${guest?.name ?? ""}`;
  return (
    <div ref={root} className={s.template} style={{
      ...(safeAsset(data.media.background?.src) ? { "--inv-garden": `url(${JSON.stringify(safeAsset(data.media.background?.src))})` } : {}),
      ...theme,
    }}>
      {musicSrc && (
        <audio
          ref={audio}
          src={musicSrc}
          loop
          preload="none"
          onPlay={() => {
            setPlaying(true);
            callbacks?.onMusicChange?.(true);
          }}
          onPause={() => {
            setPlaying(false);
            callbacks?.onMusicChange?.(false);
          }}
          onError={() => {
            setPlaying(false);
            setMusicStatus("Musik belum dapat diputar.");
          }}
        />
      )}
      {stage !== "open" && (
        <Opening
          data={data}
          guest={guest}
          leaving={stage === "opening"}
          onOpen={() => {
            if (stage !== "closed") return;
            setStage("opening");
            if (musicSrc) void playMusic();
            callbacks?.onOpen?.();
          }}
        />
      )}
      {stage !== "closed" && (
        <main
          className={s.main}
          data-stage={stage}
          inert={stage === "opening"}
          aria-label="Undangan pernikahan"
        >
          <Hero data={data} />
          {feature("countdown") && <Countdown datetime={data.event.datetime} />}
          {feature("couple") && <Couple couple={data.couple} />}
          {feature("story") && data.story.length > 0 && (
            <Story chapters={data.story} image={data.media.story} />
          )}
          {feature("events") && data.events.length > 0 && (
            <Events
              events={data.events}
              locale={data.event.locale}
              onOpenMaps={callbacks?.onOpenMaps}
            />
          )}
          {feature("gallery") && data.gallery.length > 0 && (
            <Gallery images={data.gallery} />
          )}
          {feature("wishes") && (
            <Wishes
              key={`wishes-${guestKey}`}
              config={data.wishes}
              guest={guest}
              onSubmit={onWishSubmit}
            />
          )}
          {feature("gift") &&
            (data.gifts.accounts.length > 0 || data.gifts.address || Boolean(data.gifts.qrisUrl)) && (
              <Gift config={data.gifts} onCopy={callbacks?.onCopyGift} />
            )}
          {(feature("rsvp") || feature("guestQr")) && (
            <Section id="rsvp" className={s.rsvpSection}>
              <Heading
                eyebrow="Your presence is a gift · RSVP & Check-in"
                description={data.rsvp.description}
              >
                {data.rsvp.title}
              </Heading>
              <div className={s.rsvpQrGrid}>
                {rsvpSlot ? (
                  <div className={s.rsvpCardSlot}>{rsvpSlot}</div>
                ) : (
                  <RSVP
                    key={`rsvp-${guestKey}`}
                    config={data.rsvp}
                    guest={guest}
                    onSubmit={onRsvpSubmit}
                  />
                )}
                {qrSlot ? (
                  <div className={s.qrCardSlot}>{qrSlot}</div>
                ) : (
                  guest?.kind === "personal" &&
                  safeAsset(guest.qrImage?.src) && (
                    <div className={s.qrCard}>
                      <Photo image={guest.qrImage} />
                      <strong>{guest.name}</strong>
                      {guest.invitationLabel && <p>{guest.invitationLabel}</p>}
                      <p>Tunjukkan QR ini kepada petugas saat tiba di lokasi.</p>
                    </div>
                  )
                )}
              </div>
            </Section>
          )}
          <Closing data={data} />
        </main>
      )}
      {stage === "open" && (
        <>
          <nav className={s.navigation} aria-label="Navigasi undangan">
            <a href="#opening" aria-label="Pembuka">
              ⌂<span>Awal</span>
            </a>
            {feature("couple") && (
              <a href="#couple">
                ♡<span>Mempelai</span>
              </a>
            )}
            {feature("events") && data.events.length > 0 && (
              <a href="#events">
                ◇<span>Acara</span>
              </a>
            )}
            {feature("gift") &&
              (data.gifts.accounts.length > 0 || data.gifts.address || Boolean(data.gifts.qrisUrl)) && (
                <a href="#gift">
                  ♧<span>Gift</span>
                </a>
              )}
            {feature("rsvp") && (
              <a href="#rsvp">
                ✓<span>RSVP &amp; QR</span>
              </a>
            )}
          </nav>
          {musicSrc && (
            <button
              className={s.musicButton}
              aria-label={playing ? "Jeda musik" : "Putar musik"}
              aria-pressed={playing}
              title={data.music?.title}
              onClick={() => {
                if (playing) audio.current?.pause();
                else void playMusic();
              }}
            >
              {playing ? "Ⅱ" : "♫"}
            </button>
          )}
          <span className={s.srOnly} role="status">
            {musicStatus}
          </span>
        </>
      )}
    </div>
  );
}
