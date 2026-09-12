import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  UseGuards,
  HttpCode,
  Header,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { StaffEventsService } from './staff-events.service';
import { AssignStaffDto } from './dto/assign-staff.dto';

@Controller('events/:eventId/staff')
@UseGuards(JwtAuthGuard)
export class StaffEventsController {
  constructor(private readonly staffEventsService: StaffEventsService) {}

  @Get()
  @Header('Cache-Control', 'no-store')
  async getStaffForEvent(
    @Param('eventId') eventId: string,
    @Request() req: { user: { id: string; role: string } },
  ) {
    return this.staffEventsService.getStaffForEvent(eventId, req.user);
  }

  @Post()
  @Header('Cache-Control', 'no-store')
  async assignStaff(
    @Param('eventId') eventId: string,
    @Body() dto: AssignStaffDto,
    @Request() req: { user: { id: string; role: string } },
  ) {
    return this.staffEventsService.assignStaff(eventId, dto.userId, req.user);
  }

  @Delete(':userId')
  @HttpCode(204)
  @Header('Cache-Control', 'no-store')
  async unassignStaff(
    @Param('eventId') eventId: string,
    @Param('userId') targetUserId: string,
    @Request() req: { user: { id: string; role: string } },
  ) {
    await this.staffEventsService.unassignStaff(
      eventId,
      targetUserId,
      req.user,
    );
  }
}
