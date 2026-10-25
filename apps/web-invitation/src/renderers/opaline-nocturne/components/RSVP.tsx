"use client";
import { useId, useRef, useState } from "react";
import type {
  Guest,
  InvitationData,
  InvitationTemplateProps,
  RsvpSubmission,
} from "../types";
import { Heading, paxLimit, Section } from "./Shared";
import s from "../InvitationTemplate.module.css";
export function RSVP({
  config,
  guest,
  onSubmit,
}: {
  config: InvitationData["rsvp"];
  guest?: Guest;
  onSubmit?: InvitationTemplateProps["onRsvpSubmit"];
}) {
  const uid = useId();
  const busyRef = useRef(false);
  const max = paxLimit(
    guest?.kind === "personal" ? guest.maxPax : undefined,
    config.maxPax,
  );
  const [name, setName] = useState(
    guest?.kind === "personal"
      ? (guest.name ?? "")
      : (config.initial?.name ?? ""),
  );
  const [attendance, setAttendance] = useState<RsvpSubmission["attendance"]>(
    config.initial?.attendance ?? "attending",
  );
  const [pax, setPax] = useState(
    Math.min(max, Math.max(1, config.initial?.pax ?? 1)),
  );
  const [message, setMessage] = useState(config.initial?.message ?? "");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <Section id="rsvp" className={s.rsvpSection}>
      <div className={s.formLayout}>
        <Heading
          eyebrow="Your presence is a gift"
          description={config.description}
        >
          {config.title}
        </Heading>
        <form
          className={s.formCard}
          data-reveal
          onSubmit={async (e) => {
            e.preventDefault();
            if (busyRef.current || !onSubmit) return;
            if (!name.trim()) {
              setStatus("Mohon isi nama Anda.");
              return;
            }
            if (
              attendance === "attending" &&
              (!Number.isInteger(pax) || pax < 1 || pax > max)
            ) {
              setStatus(`Jumlah tamu maksimal ${max} orang.`);
              return;
            }
            busyRef.current = true;
            setBusy(true);
            setStatus("");
            try {
              await onSubmit({
                name: name.trim(),
                attendance,
                pax: attendance === "attending" ? pax : 0,
                message: message.trim(),
              });
              setStatus(
                "Terima kasih, konfirmasi kehadiran Anda telah diterima.",
              );
            } catch {
              setStatus("Konfirmasi belum terkirim. Silakan coba lagi.");
            } finally {
              busyRef.current = false;
              setBusy(false);
            }
          }}
        >
          <label htmlFor={`${uid}-name`}>Nama lengkap</label>
          <input
            id={`${uid}-name`}
            required
            maxLength={120}
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nama Anda"
          />
          <label htmlFor={`${uid}-attendance`}>Konfirmasi kehadiran</label>
          <select
            id={`${uid}-attendance`}
            value={attendance}
            onChange={(e) =>
              setAttendance(e.target.value as RsvpSubmission["attendance"])
            }
          >
            <option value="attending">Dengan senang hati, hadir</option>
            <option value="not-attending">Maaf, belum bisa hadir</option>
            <option value="undecided">Masih menyesuaikan jadwal</option>
          </select>
          {attendance === "attending" && (
            <>
              <label htmlFor={`${uid}-pax`}>
                Jumlah tamu <small>(maks. {max} orang)</small>
              </label>
              <input
                id={`${uid}-pax`}
                type="number"
                min={1}
                max={max}
                step={1}
                required
                value={pax}
                onChange={(e) => setPax(Number(e.target.value))}
              />
            </>
          )}
          <label htmlFor={`${uid}-message`}>
            Pesan tambahan <small>(opsional)</small>
          </label>
          <textarea
            id={`${uid}-message`}
            rows={3}
            maxLength={1000}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Sampaikan pesan untuk kami…"
          />
          <button className={s.button} disabled={busy || !onSubmit}>
            {busy ? "Mengirim…" : "Kirim Konfirmasi"}{" "}
            <span aria-hidden="true">↗</span>
          </button>
          {!onSubmit && <p>Konfirmasi kehadiran belum dibuka.</p>}
          <p className={s.formStatus} role="status">
            {status}
          </p>
        </form>
      </div>
    </Section>
  );
}
