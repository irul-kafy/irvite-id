import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import { StaffService } from './staff.service';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from 'database';
import { CreateStaffDto } from './dto/create-staff.dto';
import { UpdateStaffDto } from './dto/update-staff.dto';
import { ResetStaffPasswordDto } from './dto/reset-staff-password.dto';
import { StaffQueryDto } from './dto/staff-query.dto';

@Controller('staff')
@Roles(Role.SUPER_ADMIN)
export class StaffController {
  constructor(private readonly staffService: StaffService) {}

  @Get('candidates')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  getCandidates() {
    return this.staffService.getCandidates();
  }

  @Get()
  findAll(@Query() query: StaffQueryDto) {
    return this.staffService.findAll(query);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateStaffDto) {
    return this.staffService.create(dto);
  }

  @Get(':staffId')
  findOne(@Param('staffId', ParseUUIDPipe) staffId: string) {
    return this.staffService.findOne(staffId);
  }

  @Patch(':staffId')
  update(
    @Param('staffId', ParseUUIDPipe) staffId: string,
    @Body() dto: UpdateStaffDto,
  ) {
    return this.staffService.update(staffId, dto);
  }

  @Patch(':staffId/password')
  @HttpCode(HttpStatus.NO_CONTENT)
  resetPassword(
    @Param('staffId', ParseUUIDPipe) staffId: string,
    @Body() dto: ResetStaffPasswordDto,
  ) {
    return this.staffService.resetPassword(staffId, dto);
  }
}
