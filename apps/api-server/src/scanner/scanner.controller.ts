import { Controller, Get } from '@nestjs/common';
import { ScannerService } from './scanner.service';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { Role } from 'database';

@Controller('scanner')
@Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.STAFF)
export class ScannerController {
  constructor(private readonly scannerService: ScannerService) {}

  @Get('events')
  getScannerEvents(@CurrentUser() user: AuthenticatedUser) {
    return this.scannerService.getScannerEvents(user.id, user.role);
  }
}
