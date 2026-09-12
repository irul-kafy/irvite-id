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
import { InvitationsService } from './invitations.service';
import { CreateInvitationDto } from './dto/create-invitation.dto';
import { UpdateInvitationDto } from './dto/update-invitation.dto';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { Role } from 'database';

@Roles(Role.SUPER_ADMIN, Role.ADMIN)
@Controller({ version: '1' })
export class InvitationsController {
  constructor(private readonly invitationsService: InvitationsService) {}

  @Post('events/:eventId/guests/:guestId/invitation')
  create(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Param('guestId', ParseUUIDPipe) guestId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() createInvitationDto: CreateInvitationDto,
  ) {
    return this.invitationsService.create(
      eventId,
      guestId,
      user.id,
      user.role,
      createInvitationDto,
    );
  }

  @Get('events/:eventId/invitations')
  findAll(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: PaginationQueryDto,
  ) {
    return this.invitationsService.findAll(eventId, user.id, user.role, query);
  }

  @Get('events/:eventId/invitations/:invitationId')
  findOne(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Param('invitationId', ParseUUIDPipe) invitationId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.invitationsService.findOne(
      eventId,
      invitationId,
      user.id,
      user.role,
    );
  }

  @Patch('events/:eventId/invitations/:invitationId')
  update(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Param('invitationId', ParseUUIDPipe) invitationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() updateInvitationDto: UpdateInvitationDto,
  ) {
    return this.invitationsService.update(
      eventId,
      invitationId,
      user.id,
      user.role,
      updateInvitationDto,
    );
  }
}
