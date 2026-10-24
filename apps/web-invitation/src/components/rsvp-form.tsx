'use client';

import { useState } from 'react';
import type { PublicInvitationResponse } from '../types/public-invitation';
import styles from './rsvp-form.module.css';

interface RsvpFormProps {
  uniqueCode: string;
  maxPax: number;
  initialRsvp: PublicInvitationResponse['rsvp'];
}

export function RsvpForm({ uniqueCode, maxPax, initialRsvp }: RsvpFormProps) {
  const [rsvp, setRsvp] = useState(initialRsvp);
  const [selectedResponse, setSelectedResponse] = useState<'YES' | 'NO' | null>(
    initialRsvp.response === 'PENDING' ? null : initialRsvp.response
  );
  const [pax, setPax] = useState<number>(initialRsvp.pax || 1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!rsvp.canRespond) {
    return (
      <div className={styles.card} role="status">
        <h3 className={styles.heading}>RSVP sudah ditutup</h3>
        <p className={styles.description}>
          {rsvp.response === 'YES'
            ? `Anda telah mengkonfirmasi kehadiran untuk ${rsvp.pax} orang.`
            : rsvp.response === 'NO'
            ? 'Anda telah mengkonfirmasi tidak dapat hadir.'
            : 'Waktu konfirmasi kehadiran telah berakhir.'}
        </p>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedResponse) return;

    setIsSubmitting(true);
    setErrorMsg(null);

    const payload = {
      response: selectedResponse,
      ...(selectedResponse === 'YES' ? { pax } : {}),
    };

    try {
      const res = await fetch(`/api-proxy/invitations/public/${uniqueCode}/rsvp`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (res.status === 409) {
        setRsvp({ ...rsvp, canRespond: false });
        return;
      }

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || 'Terjadi kesalahan saat menyimpan RSVP');
      }

      const data = await res.json();
      setRsvp(data.rsvp);
      setSelectedResponse(data.rsvp.response);
      if (data.rsvp.pax) setPax(data.rsvp.pax);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setErrorMsg(err.message);
      } else {
        setErrorMsg('Terjadi kesalahan yang tidak diketahui');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.card}>
      <h3 className={styles.heading}>Konfirmasi Kehadiran</h3>
      
      {errorMsg && (
        <div className={`${styles.notice} ${styles.error}`} role="alert">
          {errorMsg}
        </div>
      )}

      {rsvp.response !== 'PENDING' && (
        <div className={`${styles.notice} ${styles.success}`} role="status">
          Berhasil! RSVP Anda telah disimpan.
        </div>
      )}

      <form onSubmit={handleSubmit} className={styles.form} aria-label="Form konfirmasi kehadiran" aria-busy={isSubmitting}>
        <div className={styles.choices} role="group" aria-label="Pilihan kehadiran">
          <label className={styles.choice}>
            <input
              type="radio"
              name="response"
              value="YES"
              checked={selectedResponse === 'YES'}
              onChange={() => setSelectedResponse('YES')}
              className={styles.radio}
              disabled={isSubmitting}
            />
            <span className={styles.choiceText}>
              Ya, saya hadir
            </span>
          </label>
          
          <label className={styles.choice}>
            <input
              type="radio"
              name="response"
              value="NO"
              checked={selectedResponse === 'NO'}
              onChange={() => setSelectedResponse('NO')}
              className={styles.radio}
              disabled={isSubmitting}
            />
            <span className={styles.choiceText}>
              Maaf, tidak bisa
            </span>
          </label>
        </div>

        {selectedResponse === 'YES' && maxPax > 1 && (
          <div className={styles.field}>
            <label htmlFor="pax" className={styles.label}>
              Jumlah Kehadiran (Maksimal {maxPax})
            </label>
            <select
              id="pax"
              value={pax}
              onChange={(e) => setPax(Number(e.target.value))}
              disabled={isSubmitting}
              className={styles.select}
            >
              {Array.from({ length: maxPax }, (_, i) => i + 1).map((n) => (
                <option key={n} value={n}>
                  {n} Orang
                </option>
              ))}
            </select>
          </div>
        )}

        <button
          type="submit"
          disabled={!selectedResponse || isSubmitting || (selectedResponse === rsvp.response && pax === rsvp.pax)}
          className={styles.submit}
        >
          {isSubmitting ? 'Menyimpan...' : 'Simpan RSVP'}
        </button>
      </form>
    </div>
  );
}
