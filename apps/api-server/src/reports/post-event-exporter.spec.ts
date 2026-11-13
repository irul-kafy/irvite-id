import {
  generatePostEventHtmlReport,
  PostEventData,
} from './post-event-exporter';

describe('generatePostEventHtmlReport', () => {
  const mockData: PostEventData = {
    event: {
      id: 'event-uuid-1',
      title: 'The Wedding of Sarah & Farhan',
      slug: 'sarah-farhan',
      eventDate: new Date('2026-12-25T10:00:00Z'),
      locationDetails: 'Grand Ballroom Hotel Mulia, Jakarta',
    },
    metrics: {
      totalGuests: 200,
      totalExpectedPax: 400,
      totalAttendedGuests: 180,
      totalAttendedPax: 360,
      attendanceRatePercent: 90,
      vipAttendedCount: 20,
      walkInCount: 10,
    },
    hourlyDistribution: [
      { hourSlot: '10:00 - 11:00', count: 120, pax: 240 },
      { hourSlot: '11:00 - 12:00', count: 60, pax: 120 },
    ],
    vipAttendees: [
      {
        name: 'Bpk. Prof. Bambang',
        category: 'VIP',
        tableNumber: 'Table 1',
        scannedPax: 2,
        scannedAt: new Date('2026-12-25T10:15:00Z'),
      },
    ],
    walkInAttendees: [
      {
        name: 'Bpk. Hendra (Walk-in)',
        scannedPax: 1,
        scannedAt: new Date('2026-12-25T11:00:00Z'),
        scannedByName: 'Operator Pintu 1',
      },
    ],
    wishes: [
      {
        name: 'Ahmad & Keluarga',
        message: 'Selamat menempuh hidup baru!',
        createdAt: new Date('2026-12-25T09:00:00Z'),
      },
    ],
  };

  it('renders a complete HTML report with header, metrics, tables, and styles', () => {
    const html = generatePostEventHtmlReport(mockData);

    expect(html).toContain('The Wedding of Sarah & Farhan');
    expect(html).toContain('Grand Ballroom Hotel Mulia, Jakarta');
    expect(html).toContain('360'); // total attended pax
    expect(html).toContain('90%'); // attendance rate
    expect(html).toContain('10:00 - 11:00');
    expect(html).toContain('Bpk. Prof. Bambang');
    expect(html).toContain('Table 1');
    expect(html).toContain('Bpk. Hendra (Walk-in)');
    expect(html).toContain('Selamat menempuh hidup baru!');
    expect(html).toContain('@page { size: A4 portrait;');
  });

  it('handles empty attendees and wishes safely', () => {
    const emptyData: PostEventData = {
      ...mockData,
      vipAttendees: [],
      walkInAttendees: [],
      wishes: [],
      hourlyDistribution: [],
    };

    const html = generatePostEventHtmlReport(emptyData);
    expect(html).toContain('The Wedding of Sarah & Farhan');
    expect(html).toContain('Belum ada tamu hadir');
    expect(html).toContain('Tidak ada tamu VIP yang tercatat');
    expect(html).not.toContain('Daftar Tamu Dadakan / Walk-In');
    expect(html).not.toContain('Buku Ucapan & Doa Tamu');
  });
});
