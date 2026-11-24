import {
  CanActivate,
  Injectable,
  NestMiddleware,
  NotFoundException,
} from '@nestjs/common';
import type { Request, Response, NextFunction } from 'express';
import { isTicketingFeatureEnabled } from './ticketing-secrets';

@Injectable()
export class TicketingEnabledMiddleware implements NestMiddleware {
  use(_req: Request, _res: Response, next: NextFunction): void {
    if (!isTicketingFeatureEnabled()) {
      throw new NotFoundException('Layanan tiket tidak aktif.');
    }
    next();
  }
}

@Injectable()
export class TicketingEnabledGuard implements CanActivate {
  canActivate(): boolean {
    if (!isTicketingFeatureEnabled()) {
      throw new NotFoundException('Layanan tiket tidak aktif.');
    }
    return true;
  }
}
