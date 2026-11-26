import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger, ValidationPipe } from '@nestjs/common';
import { json, urlencoded } from 'express';
import { warnIfVercelBlobMissingOnStartup } from './media/media-storage.service';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  if (process.env.NODE_ENV === 'production') {
    warnIfVercelBlobMissingOnStartup(logger, process.env);
  }
  const app = await NestFactory.create(AppModule);
  app.enableCors();
  app.use(json({ limit: '15mb' }));
  app.use(urlencoded({ extended: true, limit: '15mb' }));
  app.enableShutdownHooks();
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap().catch(console.error);
