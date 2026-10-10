/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import request from 'supertest';
import { App } from 'supertest/types';
import { randomBytes, randomUUID } from 'crypto';
import { Role } from 'database';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';
import { MediaStorageService } from '../src/media/media-storage.service';

describe('Template package lifecycle (disposable database)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  const tokens = {} as Record<Role, string>;
  const users: string[] = [];
  const templates: string[] = [];
  let ownerId: string;
  const png = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=',
    'base64',
  );
  const base = {
    schemaVersion: 1,
    name: 'E2E Package Garden',
    themeCode: 'E2E_PACKAGE_GARDEN',
    renderer: 'GENERIC',
    assets: { background: 'garden.png' },
    config: {
      version: 1,
      theme: {
        primaryColor: '#173F5F',
        secondaryColor: '#C9A86A',
        backgroundColor: '#F5F0E8',
        textColor: '#20242A',
      },
      typography: { headingFont: 'PLAYFAIR_DISPLAY', bodyFont: 'INTER' },
      sections: [
        { id: 'eventDetails', enabled: true, order: 1, variant: 'default' },
      ],
    },
  };
  const metadata = JSON.stringify([
    { fieldName: 'asset_0', slot: 'background', order: 0 },
  ]);
  const upload = (token: string, manifest = base, file = png) =>
    request(app.getHttpServer())
      .post('/templates/package')
      .set('Authorization', `Bearer ${token}`)
      .field('manifest', JSON.stringify(manifest))
      .field('assets', metadata)
      .attach('asset_0', file, 'garden.png');

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = module.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
    prisma = app.get(PrismaService);
    const jwt = app.get(JwtService);
    for (const role of [Role.SUPER_ADMIN, Role.ADMIN, Role.STAFF]) {
      const user = await prisma.user.create({
        data: {
          email: `package-${randomUUID()}@e2e.test`,
          passwordHash: 'disabled-test-login',
          role,
          isActive: true,
        },
      });
      users.push(user.id);
      tokens[role] = await jwt.signAsync({
        sub: user.id,
        email: user.email,
        role,
      });
      if (role === Role.SUPER_ADMIN) ownerId = user.id;
    }
  });

  afterAll(async () => {
    if (prisma) {
      await prisma.event.deleteMany({ where: { userId: { in: users } } });
      const assets = await prisma.templateAsset.findMany({
        where: { templateId: { in: templates } },
      });
      for (const asset of assets)
        await app.get(MediaStorageService).deleteFile(asset.storageKey);
      await prisma.templateAsset.deleteMany({
        where: { templateId: { in: templates } },
      });
      await prisma.template.deleteMany({ where: { id: { in: templates } } });
      await prisma.user.deleteMany({ where: { id: { in: users } } });
    }
    await app?.close();
  });

  it('permits only authenticated SUPER_ADMIN imports', async () => {
    await request(app.getHttpServer()).post('/templates/package').expect(401);
    await upload(tokens.ADMIN).expect(403);
    await upload(tokens.STAFF).expect(403);
  });

  it('rejects malformed input, reserved identities, fake images and mismatched assets', async () => {
    await request(app.getHttpServer())
      .post('/templates/package')
      .set('Authorization', `Bearer ${tokens.SUPER_ADMIN}`)
      .expect(400);
    await upload(tokens.SUPER_ADMIN, {
      ...base,
      themeCode: 'IVORY_GARDEN',
    }).expect(400);
    await upload(
      tokens.SUPER_ADMIN,
      base,
      Buffer.from('<script>alert(1)</script>'),
    ).expect(400);
    await request(app.getHttpServer())
      .post('/templates/package')
      .set('Authorization', `Bearer ${tokens.SUPER_ADMIN}`)
      .field('manifest', JSON.stringify(base))
      .field('assets', metadata)
      .expect(400);
  });

  it('imports, previews, publishes, reuses PUBLIC/PERSONAL data, and safely removes an unused archive', async () => {
    const imported = await upload(tokens.SUPER_ADMIN).expect(201);
    const id = imported.body.id as string;
    templates.push(id);
    expect(imported.body).toMatchObject({
      renderer: 'GENERIC',
      status: 'HIDDEN',
      assetCount: 1,
    });
    await upload(tokens.SUPER_ADMIN).expect(409);
    await request(app.getHttpServer())
      .get(`/templates/public/packages/${id}`)
      .expect(404);
    const definition = await request(app.getHttpServer())
      .get(`/templates/${id}/definition`)
      .set('Authorization', `Bearer ${tokens.ADMIN}`)
      .expect(200);
    expect(definition.body.mediaSlots).toEqual(
      expect.arrayContaining([expect.objectContaining({ key: 'gallery' })]),
    );
    await request(app.getHttpServer())
      .patch(`/templates/${id}`)
      .set('Authorization', `Bearer ${tokens.ADMIN}`)
      .send({ status: 'AVAILABLE' })
      .expect(403);
    await request(app.getHttpServer())
      .patch(`/templates/${id}`)
      .set('Authorization', `Bearer ${tokens.SUPER_ADMIN}`)
      .send({ status: 'AVAILABLE' })
      .expect(200);
    const catalog = await request(app.getHttpServer())
      .get('/templates/public/packages')
      .expect(200);
    expect(catalog.body).toEqual(
      expect.arrayContaining([expect.objectContaining({ id })]),
    );
    const preview = await request(app.getHttpServer())
      .get(`/templates/public/packages/${id}`)
      .expect(200);
    expect(preview.body.assets[0]).not.toHaveProperty('storageKey');
    const assetPath = preview.body.assets[0].src as string;
    const file = await request(app.getHttpServer())
      .get(assetPath)
      .expect(200)
      .expect('Content-Type', /image\/png/);
    expect(file.body).toEqual(png);
    const event = await prisma.event.create({
      data: {
        userId: ownerId,
        templateId: id,
        title: 'E2E Package Event',
        slug: `package-${randomUUID()}`,
        eventDate: new Date(Date.now() + 86400000),
        status: 'PUBLISHED',
      },
    });
    const guest = await prisma.guest.create({
      data: { eventId: event.id, name: 'E2E Family', maxPax: 3 },
    });
    const uniqueCode = randomBytes(16).toString('base64url');
    await prisma.invitation.create({
      data: { guestId: guest.id, eventId: event.id, uniqueCode },
    });
    const publicPage = await request(app.getHttpServer())
      .get(`/events/public/${event.slug}`)
      .expect(200);
    expect(publicPage.body).not.toHaveProperty('guest');
    expect(publicPage.body).not.toHaveProperty('rsvp');
    expect(publicPage.body.template.assets[0].src).toBe(assetPath);
    const personalPage = await request(app.getHttpServer())
      .get(`/invitations/public/${uniqueCode}`)
      .expect(200);
    expect(personalPage.body.guest).toMatchObject({
      name: 'E2E Family',
      maxPax: 3,
    });
    expect(personalPage.body.template.assets[0].src).toBe(assetPath);
    await request(app.getHttpServer())
      .patch(`/templates/${id}`)
      .set('Authorization', `Bearer ${tokens.SUPER_ADMIN}`)
      .send({ status: 'ARCHIVED' })
      .expect(200);
    await request(app.getHttpServer())
      .delete(`/templates/${id}/permanent`)
      .set('Authorization', `Bearer ${tokens.SUPER_ADMIN}`)
      .expect(409);
    await prisma.event.delete({ where: { id: event.id } });
    await request(app.getHttpServer())
      .delete(`/templates/${id}/permanent`)
      .set('Authorization', `Bearer ${tokens.SUPER_ADMIN}`)
      .expect(200);
    await request(app.getHttpServer()).get(assetPath).expect(404);
  });
});
