import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Query,
  ParseUUIDPipe,
} from '@nestjs/common';
import { GuestsService } from './guests.service';
import { CreateGuestDto } from './dto/create-guest.dto';
import { UpdateGuestDto } from './dto/update-guest.dto';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { Role } from 'database';

@Roles(Role.SUPER_ADMIN, Role.ADMIN)
@Controller({ path: 'events/:eventId/guests', version: '1' })
export class GuestsController {
  constructor(private readonly guestsService: GuestsService) {}

  @Post()
  async create(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() createGuestDto: CreateGuestDto,
  ) {
    return this.guestsService.create(
      eventId,
      user.id,
      user.role,
      createGuestDto,
    );
  }

  @Get()
  async findAll(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: PaginationQueryDto,
  ) {
    return this.guestsService.findAll(eventId, user.id, user.role, query);
  }

  @Get(':guestId')
  async findOne(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Param('guestId', ParseUUIDPipe) guestId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.guestsService.findOne(eventId, guestId, user.id, user.role);
  }

  @Patch(':guestId')
  async update(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Param('guestId', ParseUUIDPipe) guestId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() updateGuestDto: UpdateGuestDto,
  ) {
    return this.guestsService.update(
      eventId,
      guestId,
      user.id,
      user.role,
      updateGuestDto,
    );
  }
}
