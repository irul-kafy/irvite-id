/* eslint-disable @typescript-eslint/no-unused-vars, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { Role } from 'database';
import { InvitationsService } from '../src/invitations/invitations.service';
import * as argon2 from 'argon2';
import ExcelJS from 'exceljs';

describe('GuestsImportController (e2e)', () => {
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
    await prisma.guest.deleteMany({
      where: { name: { startsWith: 'E2E_IMP_' } },
    });
    await prisma.event.deleteMany({
      where: { slug: { startsWith: 'e2e-imp-event-' } },
    });
    await prisma.user.deleteMany({
      where: {
        email: {
          in: [
            'super_imp@e2e.test',
            'admin_a_imp@e2e.test',
            'admin_b_imp@e2e.test',
            'staff_imp@e2e.test',
          ],
        },
      },
    });

    const pwd = await argon2.hash('password1234');

    const superAdmin = await prisma.user.create({
      data: {
        email: 'super_imp@e2e.test',
        passwordHash: pwd,
        role: Role.SUPER_ADMIN,
        isActive: true,
      },
    });
    const adminA = await prisma.user.create({
      data: {
        email: 'admin_a_imp@e2e.test',
        passwordHash: pwd,
        role: Role.ADMIN,
        isActive: true,
      },
    });
    const adminB = await prisma.user.create({
      data: {
        email: 'admin_b_imp@e2e.test',
        passwordHash: pwd,
        role: Role.ADMIN,
        isActive: true,
      },
    });
    const staff = await prisma.user.create({
      data: {
        email: 'staff_imp@e2e.test',
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
    eventASlug = `e2e-imp-event-a-${Date.now()}`;
    const evA = await prisma.event.create({
      data: {
        title: 'E2E Import Event A',
        slug: eventASlug,
        eventDate: new Date(),
        userId: adminA.id,
        status: 'PUBLISHED',
      },
    });
    eventAId = evA.id;

    const evB = await prisma.event.create({
      data: {
        title: 'E2E Import Event B',
        slug: `e2e-imp-event-b-${Date.now()}`,
        eventDate: new Date(),
        userId: adminB.id,
        status: 'PUBLISHED',
      },
    });
    eventBId = evB.id;
  });

  afterAll(async () => {
    await prisma.guest.deleteMany({
      where: { name: { startsWith: 'E2E_IMP_' } },
    });
    await prisma.event.deleteMany({
      where: { slug: { startsWith: 'e2e-imp-event-' } },
    });
    await prisma.user.deleteMany({
      where: {
        email: {
          in: [
            'super_imp@e2e.test',
            'admin_a_imp@e2e.test',
            'admin_b_imp@e2e.test',
            'staff_imp@e2e.test',
          ],
        },
      },
    });
    await app.close();
  });

  describe('GET /events/:eventId/guests/import/template', () => {
    it('should download a valid XLSX template for ADMIN', async () => {
      const res = await request(app.getHttpServer())
        .get(`/events/${eventAId}/guests/import/template`)
        .set('Authorization', `Bearer ${adminAToken}`)
        .buffer()
        .parse((res, cb) => {
          const chunks: Buffer[] = [];
          res.on('data', (d) => chunks.push(Buffer.from(d)));
          res.on('end', () => cb(null, Buffer.concat(chunks)));
        })
        .expect(200);

      expect(res.header['content-type']).toContain('spreadsheetml.sheet');
      expect(res.header['content-disposition']).toContain(
        'template_data_tamu.xlsx',
      );

      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(res.body);
      const sheet = workbook.getWorksheet('Data Tamu');
      expect(sheet).toBeDefined();

      const headers = sheet?.getRow(1).values as string[];
      expect(headers).toContain('Nama Tamu');
      expect(headers).toContain('Kategori');
      expect(headers).toContain('No. WhatsApp');
      expect(headers).toContain('Email');
      expect(headers).toContain('Jumlah Tamu');
    });

    it('should forbid STAFF from downloading template', async () => {
      await request(app.getHttpServer())
        .get(`/events/${eventAId}/guests/import/template`)
        .set('Authorization', `Bearer ${staffToken}`)
        .expect(403);
    });

    it('should reject unauthenticated request', async () => {
      await request(app.getHttpServer())
        .get(`/events/${eventAId}/guests/import/template`)
        .expect(401);
    });
  });

  describe('POST /events/:eventId/guests/import/file/preview', () => {
    it('should parse XLSX and identify valid, invalid, and formula rows', async () => {
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('Sheet1');
      sheet.addRow([
        'Nama Tamu',
        'Kategori',
        'No. WhatsApp',
        'Email',
        'Jumlah Tamu',
      ]);
      sheet.addRow([
        'E2E_IMP_Alice',
        'VIP',
        '081234567801',
        'alice@test.com',
        2,
      ]);
      sheet.addRow([
        'E2E_IMP_Bob',
        'REGULAR',
        '081234567802',
        'invalid-email',
        1,
      ]);
      sheet.addRow([
        'E2E_IMP_Charlie',
        'FAMILY',
        '081234567803',
        'charlie@test.com',
        { formula: 'SUM(1,2)' },
      ]);

      const buffer = await workbook.xlsx.writeBuffer();

      const res = await request(app.getHttpServer())
        .post(`/events/${eventAId}/guests/import/file/preview`)
        .set('Authorization', `Bearer ${adminAToken}`)
        .attach('file', Buffer.from(buffer), 'test.xlsx')
        .expect(201);

      expect(res.body.totalRows).toBe(3);
      expect(res.body.validRows).toBe(1);
      expect(res.body.invalidRows).toBe(2);

      const rows = res.body.rows;
      expect(rows[0].status).toBe('VALID');
      expect(rows[0].phoneNumber).toBe('6281234567801');
      expect(rows[1].status).toBe('INVALID_EMAIL');
      expect(rows[2].status).toBe('FORMULA_NOT_ALLOWED');
    });

    it('should parse CSV with comma delimiter', async () => {
      const csv = `Nama Tamu,Kategori,No. WhatsApp,Email,Jumlah Tamu\nE2E_IMP_Comma,FAMILY,+6281234567804,comma@test.com,3`;
      const res = await request(app.getHttpServer())
        .post(`/events/${eventAId}/guests/import/file/preview`)
        .set('Authorization', `Bearer ${adminAToken}`)
        .attach('file', Buffer.from(csv, 'utf8'), 'test.csv')
        .expect(201);

      expect(res.body.totalRows).toBe(1);
      expect(res.body.validRows).toBe(1);
      expect(res.body.rows[0].phoneNumber).toBe('6281234567804');
    });

    it('should parse CSV with semicolon delimiter and UTF-8 BOM', async () => {
      const csv = `\uFEFFNama Tamu;Kategori;No. WhatsApp;Email;Jumlah Tamu\nE2E_IMP_Semi;VIP;081234567805;semi@test.com;2`;
      const res = await request(app.getHttpServer())
        .post(`/events/${eventAId}/guests/import/file/preview`)
        .set('Authorization', `Bearer ${adminAToken}`)
        .attach('file', Buffer.from(csv, 'utf8'), 'test.csv')
        .expect(201);

      expect(res.body.totalRows).toBe(1);
      expect(res.body.validRows).toBe(1);
      expect(res.body.rows[0].name).toBe('E2E_IMP_Semi');
    });

    it('should reject file missing Nama Tamu column', async () => {
      const csv = `Email,Kategori\ntest@test.com,VIP`;
      await request(app.getHttpServer())
        .post(`/events/${eventAId}/guests/import/file/preview`)
        .set('Authorization', `Bearer ${adminAToken}`)
        .attach('file', Buffer.from(csv, 'utf8'), 'bad.csv')
        .expect(400);
    });

    it('should reject file exceeding 5MB limit', async () => {
      const hugeBuffer = Buffer.alloc(5 * 1024 * 1024 + 1024, 'a');
      const res = await request(app.getHttpServer())
        .post(`/events/${eventAId}/guests/import/file/preview`)
        .set('Authorization', `Bearer ${adminAToken}`)
        .attach('file', hugeBuffer, 'huge.csv');
      expect([400, 413]).toContain(res.status);
    });

    it('should reject ADMIN accessing foreign event with 404', async () => {
      const csv = `Nama Tamu\nE2E_IMP_Test`;
      await request(app.getHttpServer())
        .post(`/events/${eventBId}/guests/import/file/preview`)
        .set('Authorization', `Bearer ${adminAToken}`)
        .attach('file', Buffer.from(csv, 'utf8'), 'test.csv')
        .expect(404);
    });

    it('should allow SUPER_ADMIN on any event', async () => {
      const csv = `Nama Tamu\nE2E_IMP_Super`;
      const res = await request(app.getHttpServer())
        .post(`/events/${eventAId}/guests/import/file/preview`)
        .set('Authorization', `Bearer ${superToken}`)
        .attach('file', Buffer.from(csv, 'utf8'), 'test.csv')
        .expect(201);

      expect(res.body.totalRows).toBe(1);
    });
  });

  describe('POST /events/:eventId/guests/import/sheets/preview', () => {
    it('should reject non-Google Sheets URL', async () => {
      await request(app.getHttpServer())
        .post(`/events/${eventAId}/guests/import/sheets/preview`)
        .set('Authorization', `Bearer ${adminAToken}`)
        .send({ sheetUrl: 'https://evil.com/spreadsheets/d/123' })
        .expect(400);
    });

    it('should reject localhost or internal IP SSRF attempt', async () => {
      await request(app.getHttpServer())
        .post(`/events/${eventAId}/guests/import/sheets/preview`)
        .set('Authorization', `Bearer ${adminAToken}`)
        .send({ sheetUrl: 'http://127.0.0.1:3000/test' })
        .expect(400);
    });

    it('should reject malformed Google Sheets URL path', async () => {
      await request(app.getHttpServer())
        .post(`/events/${eventAId}/guests/import/sheets/preview`)
        .set('Authorization', `Bearer ${adminAToken}`)
        .send({ sheetUrl: 'https://docs.google.com/document/d/123/edit' })
        .expect(400);
    });
  });

  describe('POST /events/:eventId/guests/import/confirm', () => {
    it('should atomically create Guest and Invitation with 22-char code and allow personal resolution', async () => {
      const confirmPayload = {
        rows: [
          {
            sourceRow: 1,
            name: 'E2E_IMP_Confirm1',
            category: 'VIP',
            phoneNumber: '081234567810',
            email: 'confirm1@test.com',
            maxPax: 2,
          },
          {
            sourceRow: 2,
            name: 'E2E_IMP_Confirm2',
            category: 'REGULAR',
            phoneNumber: '081234567811',
            email: 'confirm2@test.com',
            maxPax: 1,
          },
          {
            sourceRow: 3,
            name: 'E2E_IMP_BadPax',
            category: 'REGULAR',
            maxPax: 999, // Invalid pax (>50)
          },
        ],
      };

      const res = await request(app.getHttpServer())
        .post(`/events/${eventAId}/guests/import/confirm`)
        .set('Authorization', `Bearer ${adminAToken}`)
        .send(confirmPayload)
        .expect(201);

      expect(res.body.totalProcessed).toBe(3);
      expect(res.body.importedCount).toBe(2);
      expect(res.body.invalidCount).toBe(1);

      const item1 = res.body.results.find((r: any) => r.sourceRow === 1);
      const item2 = res.body.results.find((r: any) => r.sourceRow === 2);
      const item3 = res.body.results.find((r: any) => r.sourceRow === 3);

      expect(item1.status).toBe('IMPORTED');
      expect(item1.guestId).toBeDefined();
      expect(item1.uniqueCode).toBeDefined();
      expect(item1.uniqueCode.length).toBe(22);

      expect(item2.status).toBe('IMPORTED');
      expect(item2.uniqueCode.length).toBe(22);

      expect(item3.status).toBe('INVALID');

      // Verify in DB that Guest + Invitation exist
      const guest1 = await prisma.guest.findUnique({
        where: { id: item1.guestId },
        include: { invitation: true },
      });
      expect(guest1).toBeDefined();
      expect(guest1?.invitation).toBeDefined();
      expect(guest1?.invitation?.uniqueCode).toBe(item1.uniqueCode);
      expect(guest1?.phoneNumber).toBe('6281234567810');

      // Verify invalid row was NOT inserted into DB
      const badGuest = await prisma.guest.findFirst({
        where: { name: 'E2E_IMP_BadPax', eventId: eventAId },
      });
      expect(badGuest).toBeNull();

      // Verify personal invitation resolves publicly
      const pubRes = await request(app.getHttpServer())
        .get(`/invitations/public/${item1.uniqueCode}`)
        .expect(200);

      expect(pubRes.body.guest.name).toBe('E2E_IMP_Confirm1');
      expect(pubRes.body.event.title).toBe('E2E Import Event A');
    });

    it('should skip duplicate by default and import when importAnyway is true', async () => {
      // 1. Send duplicate without importAnyway -> SKIPPED_DUPLICATE
      const resSkip = await request(app.getHttpServer())
        .post(`/events/${eventAId}/guests/import/confirm`)
        .set('Authorization', `Bearer ${adminAToken}`)
        .send({
          rows: [
            {
              sourceRow: 1,
              name: 'E2E_IMP_Confirm1', // Same name as existing guest
              phoneNumber: '081234567810',
              importAnyway: false,
            },
          ],
        })
        .expect(201);

      expect(resSkip.body.skippedDuplicateCount).toBe(1);
      expect(resSkip.body.importedCount).toBe(0);
      expect(resSkip.body.results[0].status).toBe('SKIPPED_DUPLICATE');

      // 2. Send duplicate with importAnyway = true -> IMPORTED
      const resForce = await request(app.getHttpServer())
        .post(`/events/${eventAId}/guests/import/confirm`)
        .set('Authorization', `Bearer ${adminAToken}`)
        .send({
          rows: [
            {
              sourceRow: 1,
              name: 'E2E_IMP_Confirm1',
              phoneNumber: '081234567810',
              importAnyway: true,
            },
          ],
        })
        .expect(201);

      expect(resForce.body.importedCount).toBe(1);
      expect(resForce.body.results[0].status).toBe('IMPORTED');
      expect(resForce.body.results[0].uniqueCode).toBeDefined();
    });

    it('should detect duplicate across phone number format variants (+62..., 8...) against existing guest', async () => {
      // E2E_IMP_Confirm1 exists with phone '6281234567810'
      const res = await request(app.getHttpServer())
        .post(`/events/${eventAId}/guests/import/confirm`)
        .set('Authorization', `Bearer ${adminAToken}`)
        .send({
          rows: [
            {
              sourceRow: 1,
              name: 'E2E_IMP_DiffName1',
              phoneNumber: '+6281234567810', // variant with +62
              importAnyway: false,
            },
            {
              sourceRow: 2,
              name: 'E2E_IMP_DiffName2',
              phoneNumber: '81234567810', // variant with 8...
              importAnyway: false,
            },
          ],
        })
        .expect(201);

      expect(res.body.skippedDuplicateCount).toBe(2);
      expect(res.body.importedCount).toBe(0);
      expect(res.body.results[0].status).toBe('SKIPPED_DUPLICATE');
      expect(res.body.results[0].reason).toContain(
        'No. WhatsApp sama dengan tamu terdaftar',
      );
      expect(res.body.results[1].status).toBe('SKIPPED_DUPLICATE');
      expect(res.body.results[1].reason).toContain(
        'No. WhatsApp sama dengan tamu terdaftar',
      );
    });

    it('should validate category boundary at confirm: 50 valid, 51 invalid (INVALID_CATEGORY)', async () => {
      const res = await request(app.getHttpServer())
        .post(`/events/${eventAId}/guests/import/confirm`)
        .set('Authorization', `Bearer ${adminAToken}`)
        .send({
          rows: [
            {
              sourceRow: 1,
              name: 'E2E_IMP_CatValid',
              category: 'X'.repeat(50),
            },
            {
              sourceRow: 2,
              name: 'E2E_IMP_CatInvalid',
              category: 'Y'.repeat(51),
            },
          ],
        })
        .expect(201);

      expect(res.body.importedCount).toBe(1);
      expect(res.body.invalidCount).toBe(1);
      expect(res.body.results[0].status).toBe('IMPORTED');
      expect(res.body.results[1].status).toBe('INVALID');
      expect(res.body.results[1].reason).toContain('INVALID_CATEGORY');
    });
  });

  it('should roll back and not leave orphan Guest when Invitation creation fails', async () => {
    const invitationsService = app.get<InvitationsService>(InvitationsService);
    jest
      .spyOn(invitationsService, 'generateSecureCode')
      .mockImplementationOnce(() => {
        throw new Error('Simulated invitation creation error');
      });

    const res = await request(app.getHttpServer())
      .post(`/events/${eventAId}/guests/import/confirm`)
      .set('Authorization', `Bearer ${adminAToken}`)
      .send({
        rows: [
          {
            sourceRow: 1,
            name: 'E2E_IMP_FailTx',
            category: 'REGULAR',
            maxPax: 1,
          },
        ],
      })
      .expect(201);

    expect(res.body.failedCount).toBe(1);
    expect(res.body.results[0].status).toBe('FAILED');

    // Assert no orphan Guest was created in DB
    const orphan = await prisma.guest.findFirst({
      where: { name: 'E2E_IMP_FailTx', eventId: eventAId },
    });
    expect(orphan).toBeNull();
  });

  describe('POST /events/:eventId/guests/import/report', () => {
    it('should stream a valid XLSX report and sanitize formula injection', async () => {
      const reportPayload = {
        rows: [
          {
            sourceRow: 1,
            name: '=SUM(1,2)', // Hostile formula in guest name
            category: 'VIP',
            phoneNumber: '628123456789',
            email: 'test@test.com',
            maxPax: 2,
            status: 'IMPORTED',
            reason: undefined,
            canonicalUrl: 'http://localhost:3000/i/testcode12345678901234',
          },
        ],
      };

      const res = await request(app.getHttpServer())
        .post(`/events/${eventAId}/guests/import/report`)
        .set('Authorization', `Bearer ${adminAToken}`)
        .send(reportPayload)
        .buffer()
        .parse((res, cb) => {
          const chunks: Buffer[] = [];
          res.on('data', (d) => chunks.push(Buffer.from(d)));
          res.on('end', () => cb(null, Buffer.concat(chunks)));
        })
        .expect(201);

      expect(res.header['content-type']).toContain('spreadsheetml.sheet');
      expect(res.header['content-disposition']).toContain(
        'laporan_import_tamu_',
      );

      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(res.body);
      const sheet = workbook.getWorksheet('Laporan Import');
      expect(sheet).toBeDefined();

      const row2 = sheet?.getRow(2);
      // Verify formula injection prefix sanitization
      expect(row2?.getCell(2).value).toBe("'=SUM(1,2)");
    });
  });
});
