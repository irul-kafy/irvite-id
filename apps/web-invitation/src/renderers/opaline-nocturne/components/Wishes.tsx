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
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <label htmlFor={`${uid}-wish`}>Untaian Doa &amp; Ucapan</label>
            <span style={{ fontSize: "0.75rem", opacity: 0.75 }}>
              {message.length} / 500 karakter
            </span>
          </div>
          <textarea
            id={`${uid}-wish`}
            required
            rows={4}
            maxLength={500}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Semoga cinta selalu menjadi rumah untuk kalian berdua…"
          />
          <button className={s.button} disabled={busy || !onSubmit}>
            {busy ? "Mengirimkan Doa…" : "Titipkan Doa Restu"}{" "}
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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px', paddingBottom: '8px', borderBottom: '1px solid rgba(113, 147, 143, 0.25)' }}>
            <span style={{ fontFamily: 'var(--inv-font-display)', fontSize: '1.15rem', color: 'var(--inv-primary)', fontWeight: 600 }}>Buku Doa Tamu</span>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, padding: '3px 9px', borderRadius: '999px', background: 'rgba(39, 78, 85, 0.1)', color: 'var(--inv-primary)' }}>
              💌 {config.items.length} Doa
            </span>
          </div>
          {config.items.length ? (
            config.items.map((w) => {
              const initial = (w.name || 'T').charAt(0).toUpperCase();
              return (
                <article className={s.wishItem} key={w.id}>
                  <span className={s.quoteMark} aria-hidden="true">
                    “
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'linear-gradient(135deg, #e6ecd8 0%, #c9d6b2 100%)', border: '1px solid #71938f', color: '#163336', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '0.78rem' }}>
                      {initial}
                    </div>
                    <strong style={{ fontSize: '0.9rem', color: '#163336' }}>{w.name}</strong>
                  </div>
                  <p>{w.message}</p>
                  <footer>
                    <span style={{ fontStyle: 'italic', opacity: 0.85 }}>Doa Restu Tamu</span>
                    {w.dateLabel && <span>{w.dateLabel}</span>}
                  </footer>
                </article>
              );
            })
          ) : (
            <div style={{ textAlign: 'center', padding: '32px 16px', background: 'rgba(255, 252, 242, 0.6)', borderRadius: '16px', border: '1px dashed rgba(113, 147, 143, 0.35)', color: '#476c70' }}>
              <span style={{ fontSize: '2rem', display: 'block', marginBottom: '8px' }} aria-hidden="true">🕊️</span>
              <strong style={{ display: 'block', fontSize: '1rem', color: '#163336', marginBottom: '4px' }}>Belum ada untaian doa</strong>
              <p style={{ fontSize: '0.84rem', margin: 0, opacity: 0.85 }}>Jadilah yang pertama mengukir doa dan harapan hangat untuk kami.</p>
            </div>
          )}
        </div>
      </div>
    </Section>
  );
}
