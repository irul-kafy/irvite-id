/* eslint-disable @typescript-eslint/no-unused-vars, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-call */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { Role, InvitationStatus, AttendanceStatus } from 'database';
import * as argon2 from 'argon2';
import ExcelJS from 'exceljs';
import { ReportsService } from '../src/reports/reports.service';

describe('Reports & Export (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let jwtService: JwtService;

  let superToken: string;
  let adminAToken: string;
  let adminBToken: string;
  let staffToken: string;

  let eventAId: string;
  let eventBId: string;
  let eventASlug: string;

  let guest1Id: string;
  let guest2Id: string;
  let guest3Id: string;
  let guest4Id: string;
  let guest5Id: string;

  let uniqueCode1: string;
  let uniqueCode2: string;

  const binaryParser = (
    res: any,
    cb: (err: Error | null, res: Buffer) => void,
  ) => {
    const chunks: Buffer[] = [];
    res.on('data', (d: Buffer) => chunks.push(Buffer.from(d)));
    res.on('end', () => {
      cb(null, Buffer.concat(chunks));
    });
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();

    prisma = app.get<PrismaService>(PrismaService);
    jwtService = app.get<JwtService>(JwtService);

    // Defensive cleanup
    await prisma.attendance.deleteMany({
      where: { event: { slug: { startsWith: 'e2e-rep-event-' } } },
    });
    await prisma.invitation.deleteMany({
      where: { event: { slug: { startsWith: 'e2e-rep-event-' } } },
    });
    await prisma.guest.deleteMany({
      where: { event: { slug: { startsWith: 'e2e-rep-event-' } } },
    });
    await prisma.staffEvent.deleteMany({
      where: { event: { slug: { startsWith: 'e2e-rep-event-' } } },
    });
    await prisma.event.deleteMany({
      where: { slug: { startsWith: 'e2e-rep-event-' } },
    });
    await prisma.user.deleteMany({
      where: {
        email: {
          in: [
            'super_rep@e2e.test',
            'admin_a_rep@e2e.test',
            'admin_b_rep@e2e.test',
            'staff_rep@e2e.test',
          ],
        },
      },
    });

    const pwd = await argon2.hash('password1234');

    const superAdmin = await prisma.user.create({
      data: {
        email: 'super_rep@e2e.test',
        passwordHash: pwd,
        role: Role.SUPER_ADMIN,
        isActive: true,
      },
    });
    const adminA = await prisma.user.create({
      data: {
        email: 'admin_a_rep@e2e.test',
        passwordHash: pwd,
        role: Role.ADMIN,
        isActive: true,
      },
    });
    const adminB = await prisma.user.create({
      data: {
        email: 'admin_b_rep@e2e.test',
        passwordHash: pwd,
        role: Role.ADMIN,
        isActive: true,
      },
    });
    const staff = await prisma.user.create({
      data: {
        email: 'staff_rep@e2e.test',
        passwordHash: pwd,
        role: Role.STAFF,
        isActive: true,
      },
    });

    superToken = await jwtService.signAsync({
      sub: superAdmin.id,
      email: superAdmin.email,
      role: superAdmin.role,
    });
    adminAToken = await jwtService.signAsync({
      sub: adminA.id,
      email: adminA.email,
      role: adminA.role,
    });
    adminBToken = await jwtService.signAsync({
      sub: adminB.id,
      email: adminB.email,
      role: adminB.role,
    });
    staffToken = await jwtService.signAsync({
      sub: staff.id,
      email: staff.email,
      role: staff.role,
    });

    // Create events
    eventASlug = `e2e-rep-event-a-${Date.now()}`;
    const evA = await prisma.event.create({
      data: {
        title: 'E2E Report Event A',
        slug: eventASlug,
        eventDate: new Date('2026-10-01T09:00:00Z'),
        locationDetails: 'Grand Ballroom Jakarta',
        userId: adminA.id,
        status: 'PUBLISHED',
      },
    });
    eventAId = evA.id;

    // Assign staff to Event A
    await prisma.staffEvent.create({
      data: {
        eventId: eventAId,
        userId: staff.id,
      },
    });

    // Event B is DRAFT owned by Admin B
    const evB = await prisma.event.create({
      data: {
        title: 'E2E Report Event B Draft',
        slug: `e2e-rep-event-b-${Date.now()}`,
        eventDate: new Date('2026-11-01T09:00:00Z'),
        userId: adminB.id,
        status: 'DRAFT',
      },
    });
    eventBId = evB.id;

    // Seed test guests on Event A:
    uniqueCode1 = `code1_${Date.now()}`;
    const g1 = await prisma.guest.create({
      data: {
        eventId: eventAId,
        name: '=Cmd|Calc',
        category: 'VIP',
        phoneNumber: '081200000001',
        email: 'g1@example.com',
        maxPax: 2,
        invitation: {
          create: {
            eventId: eventAId,
            uniqueCode: uniqueCode1,
            status: InvitationStatus.RSVP_YES,
            rsvpPax: 2,
            attendances: {
              create: {
                eventId: eventAId,
                scannedById: staff.id,
                scannedPax: 2,
                scannedAt: new Date('2026-10-01T02:00:00Z'),
                status: AttendanceStatus.VALID,
              },
            },
          },
        },
      },
    });
    guest1Id = g1.id;

    uniqueCode2 = `code2_${Date.now()}`;
    const g2 = await prisma.guest.create({
      data: {
        eventId: eventAId,
        name: '+Budi Santoso',
        category: 'KELUARGA',
        phoneNumber: '081200000002',
        email: 'g2@example.com',
        maxPax: 4,
        invitation: {
          create: {
            eventId: eventAId,
            uniqueCode: uniqueCode2,
            status: InvitationStatus.RSVP_YES,
            rsvpPax: 3,
          },
        },
      },
    });
    guest2Id = g2.id;

    const g3 = await prisma.guest.create({
      data: {
        eventId: eventAId,
        name: '@Siti Rahma',
        category: 'VIP',
        phoneNumber: '081200000003',
        email: 'g3@example.com',
        maxPax: 2,
        invitation: {
          create: {
            eventId: eventAId,
            uniqueCode: `code3_${Date.now()}`,
            status: InvitationStatus.RSVP_NO,
            rsvpPax: null,
            attendances: {
              create: {
                eventId: eventAId,
                scannedById: staff.id,
                scannedPax: 2,
                scannedAt: new Date('2026-10-01T03:00:00Z'),
                status: AttendanceStatus.VALID,
              },
            },
          },
        },
      },
    });
    guest3Id = g3.id;

    const g4 = await prisma.guest.create({
      data: {
        eventId: eventAId,
        name: '-Andi Wijaya',
        category: 'REGULAR',
        phoneNumber: '081200000004',
        email: 'g4@example.com',
        maxPax: 1,
        invitation: {
          create: {
            eventId: eventAId,
            uniqueCode: `code4_${Date.now()}`,
            status: InvitationStatus.PENDING,
            rsvpPax: null,
            attendances: {
              create: {
                eventId: eventAId,
                scannedById: staff.id,
                scannedPax: 1,
                scannedAt: new Date('2026-10-01T03:30:00Z'),
                status: AttendanceStatus.VALID,
              },
            },
          },
        },
      },
    });
    guest4Id = g4.id;

    const g5 = await prisma.guest.create({
      data: {
        eventId: eventAId,
        name: 'Dewi Lestari',
        category: 'REGULAR',
        phoneNumber: '081200000005',
        email: 'g5@example.com',
        maxPax: 1,
      },
    });
    guest5Id = g5.id;
  });

  afterAll(async () => {
    // Cleanup
    await prisma.attendance.deleteMany({
      where: { event: { slug: { startsWith: 'e2e-rep-event-' } } },
    });
    await prisma.invitation.deleteMany({
      where: { event: { slug: { startsWith: 'e2e-rep-event-' } } },
    });
    await prisma.guest.deleteMany({
      where: { event: { slug: { startsWith: 'e2e-rep-event-' } } },
    });
    await prisma.staffEvent.deleteMany({
      where: { event: { slug: { startsWith: 'e2e-rep-event-' } } },
    });
    await prisma.event.deleteMany({
      where: { slug: { startsWith: 'e2e-rep-event-' } },
    });
    await prisma.user.deleteMany({
      where: {
        email: {
          in: [
            'super_rep@e2e.test',
            'admin_a_rep@e2e.test',
            'admin_b_rep@e2e.test',
            'staff_rep@e2e.test',
          ],
        },
      },
    });
    await app.close();
  });

  describe('1. Export Matrix (All 4 Outputs)', () => {
    it('1) Guest Data XLSX: returns 200, correct headers, single sheet with 12 columns', async () => {
      const res = await request(app.getHttpServer())
        .get(`/events/${eventAId}/guests/export?format=xlsx`)
        .set('Authorization', `Bearer ${adminAToken}`)
        .buffer()
        .parse(binaryParser)
        .expect(200);

      expect(res.headers['content-type']).toContain(
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );
      expect(res.headers['content-disposition']).toMatch(
        /attachment; filename="data-tamu-.*\.xlsx"/,
      );
      expect(res.headers['cache-control']).toBe('no-store');

      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(res.body);

      expect(workbook.worksheets.length).toBe(1);
      const sheet = workbook.getWorksheet('Data Tamu');
      expect(sheet).toBeDefined();

      const headerRow = sheet!.getRow(1);
      expect(headerRow.actualCellCount).toBe(12);
      expect(headerRow.getCell(1).value).toBe('No.');
      expect(headerRow.getCell(2).value).toBe('Nama Tamu');
      expect(headerRow.getCell(12).value).toBe('Waktu Check-in');

      // 5 guest rows
      expect(sheet!.rowCount).toBe(6); // 1 header + 5 rows
    });

    it('2) Guest Data CSV: returns 200, UTF-8 BOM, 12 columns, sanitized formulas', async () => {
      const res = await request(app.getHttpServer())
        .get(`/events/${eventAId}/guests/export?format=csv`)
        .set('Authorization', `Bearer ${adminAToken}`)
        .expect(200);

      expect(res.headers['content-type']).toContain('text/csv');
      expect(res.headers['content-disposition']).toMatch(
        /attachment; filename="data-tamu-.*\.csv"/,
      );
      expect(res.headers['cache-control']).toBe('no-store');

      const text = res.text;
      // UTF-8 BOM
      expect(text.charCodeAt(0)).toBe(0xfeff);

      const lines = text
        .replace(/^\uFEFF/, '')
        .trim()
        .split('\r\n');
      expect(lines.length).toBe(6); // 1 header + 5 guests
      expect(lines[0]).toBe(
        'No.,Nama Tamu,Kategori,No. WhatsApp,Email,Max Pax,Status Undangan,Status RSVP,RSVP Pax,Status Kehadiran,Pax Check-in,Waktu Check-in',
      );

      // Formula injection check:
      expect(text).toContain("'=Cmd|Calc");
      expect(text).toContain("'+Budi Santoso");
      expect(text).toContain("'@Siti Rahma");
      expect(text).toContain("'-Andi Wijaya");
    });

    it('3) Attendance Report XLSX: returns 200, two sheets with correct metrics and 13 columns', async () => {
      const res = await request(app.getHttpServer())
        .get(`/events/${eventAId}/attendance/report?format=xlsx`)
        .set('Authorization', `Bearer ${adminAToken}`)
        .buffer()
        .parse(binaryParser)
        .expect(200);

      expect(res.headers['content-type']).toContain(
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );
      expect(res.headers['content-disposition']).toMatch(
        /attachment; filename="laporan-kehadiran-.*\.xlsx"/,
      );

      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(res.body);

      expect(workbook.worksheets.length).toBe(2);
      const sheet1 = workbook.getWorksheet('Ringkasan Kehadiran');
      const sheet2 = workbook.getWorksheet('Detail Kehadiran');

      expect(sheet1).toBeDefined();
      expect(sheet2).toBeDefined();

      const detailHeader = sheet2!.getRow(1);
      expect(detailHeader.actualCellCount).toBe(13);
      expect(detailHeader.getCell(13).value).toBe('Petugas Check-in');
    });

    it('4) Attendance Report CSV: returns 200, UTF-8 BOM, exactly 13 columns, detail rows only', async () => {
      const res = await request(app.getHttpServer())
        .get(`/events/${eventAId}/attendance/report?format=csv`)
        .set('Authorization', `Bearer ${adminAToken}`)
        .expect(200);

      expect(res.headers['content-type']).toContain('text/csv');
      expect(res.headers['content-disposition']).toMatch(
        /attachment; filename="laporan-kehadiran-.*\.csv"/,
      );

      const text = res.text;
      expect(text.charCodeAt(0)).toBe(0xfeff);

      const lines = text
        .replace(/^\uFEFF/, '')
        .trim()
        .split('\r\n');
      expect(lines.length).toBe(6); // 1 header + 5 guests
      expect(lines[0]).toBe(
        'No.,Nama Tamu,Kategori,No. WhatsApp,Email,Max Pax,Status Undangan,Status RSVP,RSVP Pax,Status Kehadiran,Pax Check-in,Waktu Check-in,Petugas Check-in',
      );
    });
  });

  describe('2. Data Semantics & Aggregation', () => {
    it('accurately distinguishes checked-in units (3) from actual physical pax (5)', async () => {
      const res = await request(app.getHttpServer())
        .get(`/events/${eventAId}/attendance/report?format=xlsx`)
        .set('Authorization', `Bearer ${adminAToken}`)
        .buffer()
        .parse(binaryParser)
        .expect(200);

      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(res.body);
      const sheet1 = workbook.getWorksheet('Ringkasan Kehadiran')!;

      const textRows: string[] = [];
      sheet1.eachRow((r) => {
        textRows.push(r.values ? (r.values as any[]).join(' | ') : '');
      });

      const allText = textRows.join('\n');

      expect(allText).toContain('Total Unit Tamu Terdaftar | 5');
      expect(allText).toContain('Unit Konfirmasi Hadir (RSVP YES) | 2');
      expect(allText).toContain('Unit Konfirmasi Tidak Hadir (RSVP NO) | 1');
      expect(allText).toContain('Unit Belum Konfirmasi RSVP | 2');
      expect(allText).toContain('Unit Sudah Check-in | 3');
      expect(allText).toContain('Unit Belum Check-in | 2');

      // Headcount pax
      expect(allText).toContain('Total Kuota Kapasitas Diundang | 10');
      expect(allText).toContain('Estimasi Kedatangan RSVP (Pax) | 5');
      expect(allText).toContain('Realisasi Fisik Kehadiran (Pax) | 5');
    });
  });

  describe('3. Server-side Filters', () => {
    it('filters by rsvp=yes (returns only G1 and G2)', async () => {
      const res = await request(app.getHttpServer())
        .get(`/events/${eventAId}/guests/export?format=csv&rsvp=yes`)
        .set('Authorization', `Bearer ${adminAToken}`)
        .expect(200);

      const lines = res.text
        .replace(/^\uFEFF/, '')
        .trim()
        .split('\r\n');
      expect(lines.length).toBe(3); // 1 header + 2 guests
      expect(res.text).toContain('Cmd|Calc');
      expect(res.text).toContain('Budi Santoso');
      expect(res.text).not.toContain('Siti Rahma');
    });

    it('filters by attendance=checked-in (returns only G1, G3, G4)', async () => {
      const res = await request(app.getHttpServer())
        .get(
          `/events/${eventAId}/guests/export?format=csv&attendance=checked-in`,
        )
        .set('Authorization', `Bearer ${adminAToken}`)
        .expect(200);

      const lines = res.text
        .replace(/^\uFEFF/, '')
        .trim()
        .split('\r\n');
      expect(lines.length).toBe(4); // 1 header + 3 guests
      expect(res.text).toContain('Cmd|Calc');
      expect(res.text).toContain('Siti Rahma');
      expect(res.text).toContain('Andi Wijaya');
      expect(res.text).not.toContain('Budi Santoso');
      expect(res.text).not.toContain('Dewi Lestari');
    });

    it('filters by category=VIP (returns only G1 and G3)', async () => {
      const res = await request(app.getHttpServer())
        .get(`/events/${eventAId}/guests/export?format=csv&category=VIP`)
        .set('Authorization', `Bearer ${adminAToken}`)
        .expect(200);

      const lines = res.text
        .replace(/^\uFEFF/, '')
        .trim()
        .split('\r\n');
      expect(lines.length).toBe(3); // 1 header + 2 guests
      expect(res.text).toContain('Cmd|Calc');
      expect(res.text).toContain('Siti Rahma');
      expect(res.text).not.toContain('Budi Santoso');
    });
  });

  describe('4. Security & Exclusions', () => {
    it('does NOT expose uniqueCode, personal URLs, or internal UUIDs in output', async () => {
      const resGuests = await request(app.getHttpServer())
        .get(`/events/${eventAId}/guests/export?format=csv`)
        .set('Authorization', `Bearer ${adminAToken}`)
        .expect(200);

      const resAtt = await request(app.getHttpServer())
        .get(`/events/${eventAId}/attendance/report?format=csv`)
        .set('Authorization', `Bearer ${adminAToken}`)
        .expect(200);

      for (const text of [resGuests.text, resAtt.text]) {
        expect(text).not.toContain(uniqueCode1);
        expect(text).not.toContain(uniqueCode2);
        expect(text).not.toContain('/i/');
        expect(text).not.toContain(guest1Id);
        expect(text).not.toContain(eventAId);
      }
    });
  });

  describe('5. Authorization & RBAC', () => {
    it('SUPER_ADMIN can export reports for any event', async () => {
      await request(app.getHttpServer())
        .get(`/events/${eventAId}/guests/export?format=csv`)
        .set('Authorization', `Bearer ${superToken}`)
        .expect(200);

      await request(app.getHttpServer())
        .get(`/events/${eventAId}/attendance/report?format=csv`)
        .set('Authorization', `Bearer ${superToken}`)
        .expect(200);
    });

    it('Foreign ADMIN receives opaque 404 Not Found', async () => {
      await request(app.getHttpServer())
        .get(`/events/${eventAId}/guests/export?format=csv`)
        .set('Authorization', `Bearer ${adminBToken}`)
        .expect(404);

      await request(app.getHttpServer())
        .get(`/events/${eventAId}/attendance/report?format=csv`)
        .set('Authorization', `Bearer ${adminBToken}`)
        .expect(404);
    });

    it('STAFF is rejected with 403 Forbidden', async () => {
      await request(app.getHttpServer())
        .get(`/events/${eventAId}/guests/export?format=csv`)
        .set('Authorization', `Bearer ${staffToken}`)
        .expect(403);

      await request(app.getHttpServer())
        .get(`/events/${eventAId}/attendance/report?format=csv`)
        .set('Authorization', `Bearer ${staffToken}`)
        .expect(403);
    });

    it('Unauthenticated request receives 401 Unauthorized', async () => {
      await request(app.getHttpServer())
        .get(`/events/${eventAId}/guests/export?format=csv`)
        .expect(401);

      await request(app.getHttpServer())
        .get(`/events/${eventAId}/attendance/report?format=csv`)
        .expect(401);
    });
  });

  describe('6. DRAFT Event & Read-Only Guarantee', () => {
    it('allows exporting DRAFT event (Event B) without mutating status', async () => {
      const beforeEvent = await prisma.event.findUnique({
        where: { id: eventBId },
      });
      expect(beforeEvent!.status).toBe('DRAFT');

      await request(app.getHttpServer())
        .get(`/events/${eventBId}/guests/export?format=csv`)
        .set('Authorization', `Bearer ${adminBToken}`)
        .expect(200);

      await request(app.getHttpServer())
        .get(`/events/${eventBId}/attendance/report?format=csv`)
        .set('Authorization', `Bearer ${adminBToken}`)
        .expect(200);

      const afterEvent = await prisma.event.findUnique({
        where: { id: eventBId },
      });
      expect(afterEvent!.status).toBe('DRAFT');
      expect(afterEvent!.updatedAt.toISOString()).toBe(
        beforeEvent!.updatedAt.toISOString(),
      );
    });
  });

  describe('7. Safety Limit (5,000)', () => {
    it('allows export when count is exactly 5,000 without safety-limit rejection', async () => {
      jest.spyOn(prisma.guest, 'count').mockResolvedValueOnce(5000);

      const res = await request(app.getHttpServer())
        .get(`/events/${eventAId}/guests/export?format=csv`)
        .set('Authorization', `Bearer ${adminAToken}`)
        .expect(200);

      expect(res.headers['content-type']).toContain('text/csv');
    });

    it('rejects with deterministic 400 Bad Request when count exceeds 5,000 (5001)', async () => {
      jest.spyOn(prisma.guest, 'count').mockResolvedValueOnce(5001);

      const res = await request(app.getHttpServer())
        .get(`/events/${eventAId}/guests/export?format=csv`)
        .set('Authorization', `Bearer ${adminAToken}`)
        .expect(400);

      expect(res.body.message).toContain(
        'Jumlah data tamu melebihi batas ekspor 5.000 baris',
      );
    });

    it('rejects with deterministic 400 Bad Request when category filter exceeds 50 characters', async () => {
      const longCategory = 'A'.repeat(51);

      const res = await request(app.getHttpServer())
        .get(`/events/${eventAId}/guests/export?category=${longCategory}`)
        .set('Authorization', `Bearer ${adminAToken}`)
        .expect(400);

      expect(res.body.message).toBeDefined();
    });
  });
});
