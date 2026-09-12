'use client';

import { useState } from 'react';
import type { PublicInvitationResponse } from '../types/public-invitation';

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
      <div className="mt-8 p-4 bg-gray-50 border border-gray-200 rounded-lg text-center">
        <h3 className="text-lg font-semibold text-gray-700">RSVP sudah ditutup</h3>
        <p className="text-gray-500 mt-2">
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
    <div className="mt-8 p-6 bg-white border border-gray-200 shadow-sm rounded-lg">
      <h3 className="text-xl font-semibold text-gray-800 mb-4 text-center">Konfirmasi Kehadiran</h3>
      
      {errorMsg && (
        <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-md text-sm">
          {errorMsg}
        </div>
      )}

      {rsvp.response !== 'PENDING' && (
        <div className="mb-4 p-3 bg-green-50 text-green-700 rounded-md text-sm text-center">
          Berhasil! RSVP Anda telah disimpan.
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex gap-4">
          <label className="flex-1 cursor-pointer">
            <input
              type="radio"
              name="response"
              value="YES"
              checked={selectedResponse === 'YES'}
              onChange={() => setSelectedResponse('YES')}
              className="peer sr-only"
              disabled={isSubmitting}
            />
            <div className="p-3 text-center border rounded-md peer-checked:bg-indigo-50 peer-checked:border-indigo-600 peer-checked:text-indigo-700 hover:bg-gray-50 transition-colors">
              Ya, saya hadir
            </div>
          </label>
          
          <label className="flex-1 cursor-pointer">
            <input
              type="radio"
              name="response"
              value="NO"
              checked={selectedResponse === 'NO'}
              onChange={() => setSelectedResponse('NO')}
              className="peer sr-only"
              disabled={isSubmitting}
            />
            <div className="p-3 text-center border rounded-md peer-checked:bg-indigo-50 peer-checked:border-indigo-600 peer-checked:text-indigo-700 hover:bg-gray-50 transition-colors">
              Maaf, tidak bisa
            </div>
          </label>
        </div>

        {selectedResponse === 'YES' && maxPax > 1 && (
          <div className="mt-4">
            <label htmlFor="pax" className="block text-sm font-medium text-gray-700 mb-1">
              Jumlah Kehadiran (Maksimal {maxPax})
            </label>
            <select
              id="pax"
              value={pax}
              onChange={(e) => setPax(Number(e.target.value))}
              disabled={isSubmitting}
              className="w-full p-2 border rounded-md focus:ring-indigo-500 focus:border-indigo-500"
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
          className="w-full mt-6 bg-indigo-600 text-white font-medium py-3 px-4 rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isSubmitting ? 'Menyimpan...' : 'Simpan RSVP'}
        </button>
      </form>
    </div>
  );
}
