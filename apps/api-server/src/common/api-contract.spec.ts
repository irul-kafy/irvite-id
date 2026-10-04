import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../app.module';
import { PrismaService } from '../database/prisma.service';
import { TemplatesService } from '../templates/templates.service';
import { MediaStorageService } from '../media/media-storage.service';

describe('versioned API compatibility and authentication', () => {
  let app: INestApplication<App>;
  beforeAll(async () => {
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService)
      .useValue({})
      .overrideProvider(MediaStorageService)
      .useValue({})
      .overrideProvider(TemplatesService)
      .useValue({
        getPublicAvailability: () => [{ code: 'TEST', status: 'AVAILABLE' }],
      })
      .compile();
    app = module.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });
  afterAll(async () => {
    await app?.close();
  });

  it.each(['', '/api/v1'])(
    'keeps public catalog and protected resources under %s',
    async (prefix) => {
      await request(app.getHttpServer())
        .get(prefix + '/templates/public/availability')
        .expect(200)
        .expect([{ code: 'TEST', status: 'AVAILABLE' }]);
      for (const route of [
        '/events',
        '/templates',
        '/users',
        '/staff',
        '/scanner/events',
        '/events/example/guests',
        '/events/example/invitations',
        '/events/example/staff',
        '/events/example/media',
        '/events/example/guests/export',
        '/events/example/attendance/report',
      ]) {
        await request(app.getHttpServer())
          .get(prefix + route)
          .expect(401);
      }
      for (const route of [
        '/events/example/guests/import/confirm',
        '/events/example/attendance/check-in',
      ]) {
        await request(app.getHttpServer())
          .post(prefix + route)
          .send({})
          .expect(401);
      }
    },
  );
});
