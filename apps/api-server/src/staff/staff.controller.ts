import { Controller, Get } from '@nestjs/common';
import { StaffService } from './staff.service';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from 'database';

@Controller('staff')
@Roles(Role.SUPER_ADMIN, Role.ADMIN)
export class StaffController {
  constructor(private readonly staffService: StaffService) {}

  @Get('candidates')
  getCandidates() {
    return this.staffService.getCandidates();
  }
}
