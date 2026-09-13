'use client';

import { useEffect, useState } from 'react';

export interface CeremonyContent { title: string; dateTime: string; venue: string; address: string; mapsUrl?: string }
export interface EventContent {
  partnerOneName?: string; partnerTwoName?: string; partnerOneParents?: string; partnerTwoParents?: string;
  openingText?: string; prayerText?: string; prayerSource?: string; closingText?: string; mapsUrl?: string;
  timeZone?: 'Asia/Jakarta' | 'Asia/Makassar' | 'Asia/Jayapura'; ceremonies?: CeremonyContent[];
  giftQrMediaId?: string; galleryMediaIds?: string[]; giftTitle?: string; giftAccountName?: string; giftMessage?: string;
}

export function localEventTime(iso: string, zone: EventContent['timeZone'] = 'Asia/Jakarta') {
  const parts = new Intl.DateTimeFormat('sv-SE', { timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(iso));
  return parts.replace(' ', 'T');
}
export function eventTimeIso(local: string, zone: EventContent['timeZone'] = 'Asia/Jakarta') {
  const offset = zone === 'Asia/Jayapura' ? '+09:00' : zone === 'Asia/Makassar' ? '+08:00' : '+07:00';
  const date = new Date(`${local}${offset}`);
  return Number.isNaN(date.getTime()) ? '' : date.toISOString();
}

export function cleanEventContent(value: EventContent): EventContent {
  return { ...value, mapsUrl: value.mapsUrl?.trim() || undefined, ceremonies: value.ceremonies?.map((ceremony) => ({ ...ceremony, mapsUrl: ceremony.mapsUrl?.trim() || undefined })) };
}

const fields = [
  ['partnerOneName', 'Nama mempelai pertama', 120], ['partnerOneParents', 'Orang tua mempelai pertama', 250],
  ['partnerTwoName', 'Nama mempelai kedua', 120], ['partnerTwoParents', 'Orang tua mempelai kedua', 250],
  ['openingText', 'Kalimat pembuka', 2000], ['prayerText', 'Doa / kutipan', 2000], ['prayerSource', 'Sumber doa / ayat', 120],
  ['closingText', 'Kalimat penutup', 2000], ['mapsUrl', 'Link Google Maps lokasi utama', 2000],
  ['giftTitle', 'Judul hadiah', 80], ['giftAccountName', 'Nama pemilik rekening / QR', 120], ['giftMessage', 'Pesan hadiah', 1000],
] as const;

export function EventContentForm({ value, onChange, eventId, onBusyChange }: { value: EventContent; onChange: (value: EventContent) => void; eventId?: string; onBusyChange?: (busy: boolean) => void }) {
  const [media, setMedia] = useState<{ id: string; type: string; order: number }[]>([]);
  const [busy, setBusy] = useState(false);
  const [mediaLoaded, setMediaLoaded] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    if (!eventId) return;
    let active = true;
    void (async () => {
      try {
        const all: typeof media = [];
        let page = 1;
        let lastPage = 1;
        do {
          const res = await fetch(`/api/events/${eventId}/media?page=${page}&limit=100`);
          if (!res.ok) throw new Error('Gagal memuat foto. Muat ulang halaman sebelum mengunggah.');
          const result = await res.json();
          all.push(...(result.data || []));
          lastPage = result.meta?.lastPage || 1;
          page++;
        } while (page <= lastPage);
        if (active) { setMedia(all); setMediaLoaded(true); }
      } catch (e) { if (active) setError(e instanceof Error ? e.message : 'Gagal memuat foto'); }
    })();
    return () => { active = false; };
  }, [eventId]);
  const gallery = value.galleryMediaIds ? value.galleryMediaIds.flatMap((id) => media.find((m) => m.id === id) || []) : media.filter((item) => item.type === 'PHOTO' && item.id !== value.giftQrMediaId).slice(0, 3);
  async function upload(file: File | undefined, qr: boolean, replaceIndex?: number) {
    if (!file || !eventId) return;
    setError('');
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) {
      setError('Gunakan PNG, JPEG, atau WebP maksimal 5 MB.'); return;
    }
    setBusy(true); onBusyChange?.(true);
    try {
      const body = new FormData(); body.set('file', file); body.set('type', 'PHOTO');
      body.set('order', String(media.length));
      const response = await fetch(`/api/events/${eventId}/media`, { method: 'POST', body });
      const result = await response.json();
      if (!response.ok) throw new Error(Array.isArray(result.message) ? result.message.join(', ') : result.message || 'Unggah gagal');
      const item = result.data || result;
      const ids = gallery.map((m) => m.id);
      if (qr) onChange({ ...value, galleryMediaIds: ids, giftQrMediaId: item.id });
      else { if (replaceIndex !== undefined) ids[replaceIndex] = item.id; else ids.push(item.id); onChange({ ...value, galleryMediaIds: ids }); }
      setMedia((previous) => [...previous, item]);
    } catch (e) { setError(e instanceof Error ? e.message : 'Unggah gagal'); }
    finally { setBusy(false); onBusyChange?.(false); }
  }
  return <section className="card">
    <div className="card-header"><h2 className="card-header__title">Personalisasi isi undangan</h2></div>
    <fieldset disabled={busy} className="card-body" style={{ display: 'grid', gap: '1.25rem', border: 0, minWidth: 0 }}>
      <p className="form-hint">Semua isian opsional dan disimpan khusus untuk acara ini. Ivory Garden mendukung seluruh isian berikut; tampilan template lain mengikuti dukungan masing-masing.</p>
      <label className="form-label">Zona waktu acara<select className="form-select" value={value.timeZone || 'Asia/Jakarta'} onChange={(e) => onChange({ ...value, timeZone: e.target.value as EventContent['timeZone'] })}>
        <option value="Asia/Jakarta">WIB — Jakarta</option><option value="Asia/Makassar">WITA — Makassar</option><option value="Asia/Jayapura">WIT — Jayapura</option>
      </select></label>
      {fields.map(([key, label, max]) => <label className="form-label" key={key}>{label}
        {max >= 1000 && key !== 'mapsUrl' ? <textarea className="form-textarea" rows={3} maxLength={max} value={value[key] || ''} onChange={(e) => onChange({ ...value, [key]: e.target.value })} /> : <input className="form-input" type={key === 'mapsUrl' ? 'url' : 'text'} maxLength={max} value={value[key] || ''} onChange={(e) => onChange({ ...value, [key]: e.target.value })} />}
      </label>)}
      <p className="form-hint">Google Maps: gunakan tautan HTTPS google.com/maps, maps.google.com, maps.app.goo.gl, atau goo.gl/maps.</p>
      <details><summary>Jadwal akad / pemberkatan dan resepsi (maksimal 2)</summary>
        {(value.ceremonies || []).map((ceremony, index) => <fieldset key={index} style={{ marginTop: '1rem', display: 'grid', gap: '.75rem' }}><legend>Acara {index + 1}</legend>
          {(['title', 'venue', 'address', 'mapsUrl'] as const).map((key) => <label className="form-label" key={key}>{({ title: 'Nama acara', venue: 'Tempat', address: 'Alamat', mapsUrl: 'Link Google Maps' })[key]}<input required={key !== 'mapsUrl'} className="form-input" type={key === 'mapsUrl' ? 'url' : 'text'} maxLength={key === 'title' ? 80 : key === 'venue' ? 255 : 1000} value={ceremony[key] || ''} onChange={(e) => onChange({ ...value, ceremonies: value.ceremonies?.map((c, i) => i === index ? { ...c, [key]: e.target.value } : c) })} /></label>)}
          <label className="form-label">Tanggal dan waktu<input required className="form-input" type="datetime-local" value={ceremony.dateTime ? localEventTime(ceremony.dateTime, value.timeZone) : ''} onChange={(e) => onChange({ ...value, ceremonies: value.ceremonies?.map((c, i) => i === index ? { ...c, dateTime: e.target.value ? eventTimeIso(e.target.value, value.timeZone) : '' } : c) })} /></label>
          <button type="button" className="btn btn-secondary" onClick={() => onChange({ ...value, ceremonies: value.ceremonies?.filter((_, i) => i !== index) })}>Hapus jadwal</button>
        </fieldset>)}
        {(value.ceremonies?.length || 0) < 2 && <button type="button" className="btn btn-secondary" onClick={() => onChange({ ...value, ceremonies: [...(value.ceremonies || []), { title: '', dateTime: '', venue: '', address: '' }] })}>Tambah jadwal</button>}
      </details>
      {!eventId ? <p className="form-hint">Simpan acara dahulu, lalu unggah hingga 3 foto dan gambar QR bank melalui Edit Event.</p> : <fieldset disabled={busy || !mediaLoaded} style={{ display: 'grid', gap: '1rem' }}><legend>Foto dan QR hadiah</legend>
        <p className="form-hint">PNG, JPEG, WebP • maksimal 5 MB per gambar. Simpan perubahan untuk menerapkan pilihan foto dan QR hadiah.</p>
        {error && <p role="alert" className="alert alert--error">{error}</p>}
        {gallery.map((item, index) => <label key={item.id} className="form-label">Foto {index + 1}
          {/* Authenticated image route, deliberately bypassing image optimization. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`/api/events/${eventId}/media/${item.id}/file`} alt={`Foto acara ${index + 1}`} style={{ display: 'block', width: 160, height: 120, objectFit: 'cover' }} />
          Ganti foto<input type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => { void upload(e.target.files?.[0], false, index); e.target.value = ''; }} />
          <button type="button" className="btn btn-secondary" onClick={() => onChange({ ...value, galleryMediaIds: gallery.filter((m) => m.id !== item.id).map((m) => m.id) })}>Lepas foto</button>
        </label>)}
        {gallery.length < 3 && <label className="form-label">Tambah foto ({gallery.length}/3)<input type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => { void upload(e.target.files?.[0], false); e.target.value = ''; }} /></label>}
        {value.giftQrMediaId && <div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`/api/events/${eventId}/media/${value.giftQrMediaId}/file`} alt="QR bank hadiah yang dipilih" style={{ width: 180, height: 180, objectFit: 'contain' }} />
          <button type="button" className="btn btn-secondary" onClick={() => { const next = { ...value, galleryMediaIds: gallery.map((m) => m.id) }; delete next.giftQrMediaId; onChange(next); }}>Lepas QR dari undangan</button>
        </div>}
        <label className="form-label">{value.giftQrMediaId ? 'Ganti' : 'Unggah'} QR bank asli<input type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => { void upload(e.target.files?.[0], true); e.target.value = ''; }} /></label>
        <p className="form-hint">Gunakan QR dari bank atau penyedia pembayaran Anda. Gambar lama tetap tersimpan saat diganti. {busy ? 'Sedang mengunggah…' : ''}</p>
      </fieldset>}
    </fieldset>
  </section>;
}
