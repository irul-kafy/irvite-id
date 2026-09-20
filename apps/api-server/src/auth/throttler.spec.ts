import {
  Controller,
  Get,
  Post,
  Patch,
  HttpStatus,
  INestApplication,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import {
  ThrottlerModule,
  ThrottlerGuard,
  Throttle,
  SkipThrottle,
  seconds,
} from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import request from 'supertest';
import type { Server } from 'http';

@Controller('test-throttling')
class TestThrottlingController {
  @Throttle({ default: { limit: 2, ttl: seconds(60) } })
  @Post('login')
  login() {
    return { ok: true };
  }

  @Throttle({ default: { limit: 3, ttl: seconds(60) } })
  @Patch('rsvp')
  rsvp() {
    return { ok: true };
  }

  @Throttle({ default: { limit: 4, ttl: seconds(60) } })
  @Get('public-data')
  publicData() {
    return { ok: true };
  }

  @SkipThrottle()
  @Get('media-stream')
  mediaStream() {
    return { ok: true };
  }
}

describe('API Rate Limiting Policy', () => {
  let app: INestApplication;
  let server: Server;

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [
        ThrottlerModule.forRoot([
          {
            name: 'default',
            ttl: seconds(60),
            limit: 100,
          },
        ]),
      ],
      controllers: [TestThrottlingController],
      providers: [
        {
          provide: APP_GUARD,
          useClass: ThrottlerGuard,
        },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
    server = app.getHttpServer() as Server;
  });

  afterAll(async () => {
    await app.close();
  });

  it('login route: allowed below threshold (limit=2), throttled on 3rd with 429', async () => {
    await request(server).post('/test-throttling/login').expect(201);
    await request(server).post('/test-throttling/login').expect(201);
    const res = await request(server).post('/test-throttling/login');
    expect(res.status).toBe(HttpStatus.TOO_MANY_REQUESTS);
  });

  it('rsvp route: allowed below threshold (limit=3), throttled on 4th with 429', async () => {
    await request(server).patch('/test-throttling/rsvp').expect(200);
    await request(server).patch('/test-throttling/rsvp').expect(200);
    await request(server).patch('/test-throttling/rsvp').expect(200);
    const res = await request(server).patch('/test-throttling/rsvp');
    expect(res.status).toBe(HttpStatus.TOO_MANY_REQUESTS);
  });

  it('public read route: allowed below threshold (limit=4), throttled on 5th with 429', async () => {
    await request(server).get('/test-throttling/public-data').expect(200);
    await request(server).get('/test-throttling/public-data').expect(200);
    await request(server).get('/test-throttling/public-data').expect(200);
    await request(server).get('/test-throttling/public-data').expect(200);
    const res = await request(server).get('/test-throttling/public-data');
    expect(res.status).toBe(HttpStatus.TOO_MANY_REQUESTS);
  });

  it('media stream route: @SkipThrottle exempts from rate limiting', async () => {
    for (let i = 0; i < 10; i++) {
      await request(server).get('/test-throttling/media-stream').expect(200);
    }
  });
});
