export interface PostEventData {
  event: {
    id: string;
    title: string;
    slug: string;
    eventDate: Date;
    locationDetails: string | null;
  };
  metrics: {
    totalGuests: number;
    totalExpectedPax: number;
    totalAttendedGuests: number;
    totalAttendedPax: number;
    attendanceRatePercent: number;
    vipAttendedCount: number;
    walkInCount: number;
  };
  hourlyDistribution: Array<{
    hourSlot: string;
    count: number;
    pax: number;
  }>;
  vipAttendees: Array<{
    name: string;
    category: string;
    tableNumber: string | null;
    scannedPax: number;
    scannedAt: Date;
  }>;
  walkInAttendees: Array<{
    name: string;
    scannedPax: number;
    scannedAt: Date;
    scannedByName: string;
  }>;
  wishes: Array<{
    name: string;
    message: string;
    createdAt: Date;
  }>;
}

export function generatePostEventHtmlReport(data: PostEventData): string {
  const { event, metrics, hourlyDistribution, vipAttendees, walkInAttendees, wishes } = data;
  const eventDateFormatted = new Date(event.eventDate).toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <title>Laporan Pasca-Acara — ${event.title}</title>
  <style>
    @page { size: A4 portrait; margin: 15mm; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #111827; background: #fff; margin: 0; padding: 24px; line-height: 1.5; font-size: 13px; }
    .header { border-bottom: 2px solid #111814; padding-bottom: 16px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: flex-end; }
    .brand { font-size: 18px; font-weight: 800; letter-spacing: 2px; color: #111814; }
    .report-title { font-size: 20px; font-weight: 700; margin: 6px 0 2px; color: #111814; }
    .meta-line { font-size: 12px; color: #4b5563; }
    .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 24px; }
    .kpi-card { border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px; background: #f9fafb; }
    .kpi-label { font-size: 11px; text-transform: uppercase; color: #6b7280; font-weight: 600; letter-spacing: 0.5px; }
    .kpi-value { font-size: 22px; font-weight: 700; color: #111814; margin-top: 4px; }
    .section-title { font-size: 14px; font-weight: 700; color: #111814; border-left: 3px solid #C4A06A; padding-left: 8px; margin: 20px 0 10px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 16px; font-size: 12px; }
    th { background: #f3f4f6; text-align: left; padding: 8px 10px; font-weight: 600; border-bottom: 1px solid #d1d5db; color: #374151; }
    td { padding: 8px 10px; border-bottom: 1px solid #e5e7eb; }
    tr:nth-child(even) td { background: #fafafa; }
    .badge-vip { background: #fef3c7; color: #92400e; padding: 2px 6px; border-radius: 4px; font-weight: 700; font-size: 10px; border: 1px solid #fde68a; }
    .badge-walkin { background: #dcfce7; color: #166534; padding: 2px 6px; border-radius: 4px; font-weight: 700; font-size: 10px; border: 1px solid #bbf7d0; }
    .wishes-list { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
    .wish-box { border: 1px solid #e5e7eb; border-radius: 6px; padding: 10px; background: #fffdf8; }
    .wish-author { font-weight: 600; color: #111814; margin-bottom: 2px; }
    .wish-text { font-style: italic; color: #4b5563; font-size: 11px; }
    @media print {
      body { padding: 0; }
      .no-print { display: none; }
      .page-break { page-break-before: always; }
    }
  </style>
</head>
<body>
  <div class="no-print" style="margin-bottom: 16px; display: flex; justify-content: flex-end;">
    <button onclick="window.print()" style="padding: 8px 16px; background: #111814; color: #fff; border: none; border-radius: 6px; font-weight: 600; cursor: pointer;">
      🖨️ Cetak / Simpan PDF
    </button>
  </div>

  <div class="header">
    <div>
      <div class="brand">IRVITE</div>
      <div class="report-title">${event.title}</div>
      <div class="meta-line">Tanggal: ${eventDateFormatted} · Lokasi: ${event.locationDetails || '-'}</div>
    </div>
    <div style="text-align: right;">
      <div style="font-size: 11px; color: #6b7280;">Laporan Resmi Pasca-Acara</div>
      <div style="font-size: 11px; color: #9ca3af;">Dibuat: ${new Date().toLocaleDateString('id-ID')}</div>
    </div>
  </div>

  <div class="kpi-grid">
    <div class="kpi-card">
      <div class="kpi-label">Total Tamu Diundang</div>
      <div class="kpi-value">${metrics.totalGuests}</div>
      <div style="font-size: 11px; color: #6b7280; margin-top: 2px;">Estimasi ${metrics.totalExpectedPax} pax</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Tamu Hadir (Check-In)</div>
      <div class="kpi-value">${metrics.totalAttendedGuests}</div>
      <div style="font-size: 11px; color: #059669; font-weight: 600; margin-top: 2px;">${metrics.totalAttendedPax} pax aktual</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Tingkat Kehadiran</div>
      <div class="kpi-value">${metrics.attendanceRatePercent}%</div>
      <div style="font-size: 11px; color: #6b7280; margin-top: 2px;">Berdasarkan unit undangan</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Tamu VIP & Walk-In</div>
      <div class="kpi-value">${metrics.vipAttendedCount} <span style="font-size: 13px; font-weight: normal; color: #6b7280;">VIP</span> · ${metrics.walkInCount} <span style="font-size: 13px; font-weight: normal; color: #6b7280;">Dadakan</span></div>
      <div style="font-size: 11px; color: #6b7280; margin-top: 2px;">Tercatat di pintu</div>
    </div>
  </div>

  <div class="section-title">Distribusi Waktu Kehadiran Tamu (Per Jam)</div>
  <table>
    <thead>
      <tr>
        <th>Rentang Waktu</th>
        <th>Jumlah Check-In</th>
        <th>Total Pax Masuk</th>
      </tr>
    </thead>
    <tbody>
      ${hourlyDistribution.length === 0 ? '<tr><td colspan="3" style="text-align: center; color: #9ca3af;">Belum ada tamu hadir</td></tr>' : hourlyDistribution.map(h => `
        <tr>
          <td>${h.hourSlot}</td>
          <td>${h.count} undangan</td>
          <td><strong>${h.pax} pax</strong></td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  <div class="section-title">Daftar Tamu VIP Hadir (${vipAttendees.length})</div>
  <table>
    <thead>
      <tr>
        <th>Nama Tamu VIP</th>
        <th>Kategori</th>
        <th>No. Meja</th>
        <th>Pax Hadir</th>
        <th>Waktu Masuk</th>
      </tr>
    </thead>
    <tbody>
      ${vipAttendees.length === 0 ? '<tr><td colspan="5" style="text-align: center; color: #9ca3af;">Tidak ada tamu VIP yang tercatat</td></tr>' : vipAttendees.map(v => `
        <tr>
          <td><strong>${v.name}</strong></td>
          <td><span class="badge-vip">${v.category}</span></td>
          <td>${v.tableNumber || '-'}</td>
          <td>${v.scannedPax} pax</td>
          <td>${new Date(v.scannedAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB</td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  ${walkInAttendees.length > 0 ? `
    <div class="section-title">Daftar Tamu Dadakan / Walk-In (${walkInAttendees.length})</div>
    <table>
      <thead>
        <tr>
          <th>Nama Tamu</th>
          <th>Pax</th>
          <th>Waktu Pendaftaran</th>
          <th>Staf Penerima</th>
        </tr>
      </thead>
      <tbody>
        ${walkInAttendees.map(w => `
          <tr>
            <td><strong>${w.name}</strong> <span class="badge-walkin">WALK-IN</span></td>
            <td>${w.scannedPax} pax</td>
            <td>${new Date(w.scannedAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB</td>
            <td>${w.scannedByName}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  ` : ''}

  ${wishes.length > 0 ? `
    <div class="section-title page-break">Buku Ucapan & Doa Tamu (${wishes.length})</div>
    <div class="wishes-list">
      ${wishes.map(w => `
        <div class="wish-box">
          <div class="wish-author">${w.name}</div>
          <div class="wish-text">“${w.message}”</div>
        </div>
      `).join('')}
    </div>
  ` : ''}

  <div style="margin-top: 32px; padding-top: 12px; border-top: 1px solid #e5e7eb; font-size: 10px; color: #9ca3af; text-align: center;">
    IRVITE Digital Invitation Platform — Laporan ini di-generate secara otomatis dan sah.
  </div>
</body>
</html>`;
}

