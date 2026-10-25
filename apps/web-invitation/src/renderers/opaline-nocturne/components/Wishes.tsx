"use client";
import { useId, useRef, useState } from "react";
import type { Guest, InvitationData, InvitationTemplateProps } from "../types";
import { Heading, Section } from "./Shared";
import s from "../InvitationTemplate.module.css";
export function Wishes({
  config,
  guest,
  onSubmit,
}: {
  config: InvitationData["wishes"];
  guest?: Guest;
  onSubmit?: InvitationTemplateProps["onWishSubmit"];
}) {
  const uid = useId();
  const busyRef = useRef(false);
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState(
    guest?.kind === "personal" ? (guest.name ?? "") : "",
  );
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState("");
  return (
    <Section id="wishes" className={s.wishesSection}>
      <Heading
        eyebrow="Words we will keep forever"
        description={config.description}
      >
        {config.title}
      </Heading>
      <div className={s.wishesLayout}>
        <form
          className={s.formCard}
          data-reveal
          onSubmit={async (e) => {
            e.preventDefault();
            if (busyRef.current || !onSubmit) return;
            if (!name.trim() || !message.trim()) {
              setStatus("Mohon isi nama dan ucapan Anda.");
              return;
            }
            busyRef.current = true;
            setBusy(true);
            setStatus("");
            try {
              await onSubmit({ name: name.trim(), message: message.trim() });
              setMessage("");
              setStatus("Terima kasih untuk doa dan ucapan hangatnya.");
            } catch {
              setStatus("Ucapan belum terkirim. Silakan coba lagi.");
            } finally {
              busyRef.current = false;
              setBusy(false);
            }
          }}
        >
          <label htmlFor={`${uid}-name`}>Nama Anda</label>
          <input
            id={`${uid}-name`}
            required
            maxLength={120}
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nama Anda"
          />
          <label htmlFor={`${uid}-wish`}>Doa & ucapan</label>
          <textarea
            id={`${uid}-wish`}
            required
            rows={5}
            maxLength={2000}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Semoga cinta selalu menjadi rumah untuk kalian berdua…"
          />
          <button className={s.button} disabled={busy || !onSubmit}>
            {busy ? "Mengirim…" : "Titipkan Doa"}{" "}
            <span aria-hidden="true">↗</span>
          </button>
          {!onSubmit && <p>Pengiriman ucapan belum dibuka.</p>}
          <p role="status" className={s.formStatus}>
            {status}
          </p>
        </form>
        <div
          className={s.wishList}
          aria-label="Ucapan untuk mempelai"
          data-reveal
        >
          {config.items.length ? (
            config.items.map((w) => (
              <article className={s.wishItem} key={w.id}>
                <span className={s.quoteMark} aria-hidden="true">
                  “
                </span>
                <p>{w.message}</p>
                <footer>
                  <strong>{w.name}</strong>
                  {w.dateLabel && <span>{w.dateLabel}</span>}
                </footer>
              </article>
            ))
          ) : (
            <p>Jadilah yang pertama menitipkan doa untuk kami.</p>
          )}
        </div>
      </div>
    </Section>
  );
}
