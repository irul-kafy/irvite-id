import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { TicketingService } from './ticketing.service';
import type {
  CreateTicketingEventInput,
  CheckoutTicketInput,
  CorrectTypoEmailInput,
} from './ticketing.service';
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { Role } from 'database';

@Controller(['api/v1/ticketing', 'ticketing'])
export class TicketingController {
  constructor(private readonly ticketingService: TicketingService) {}

  @Public()
  @Get(['public/events', 'events'])
  listPublicEvents(
    @Query('search') search?: string,
    @Query('category') category?: string,
  ) {
    return this.ticketingService.listPublicEvents({ search, category });
  }

  @Public()
  @Get(['public/events/:slug', 'events/:slug'])
  getPublicEventBySlug(@Param('slug') slug: string) {
    return this.ticketingService.getPublicEventBySlug(slug);
  }

  @Public()
  @Post(['public/checkout', 'orders/checkout'])
  checkoutTicket(@Body() body: CheckoutTicketInput) {
    return this.ticketingService.checkoutTicket(body);
  }

  @Public()
  @Get(['public/tickets/:code', 'orders/:code'])
  getTicketOrOrderByCode(@Param('code') code: string) {
    return this.ticketingService.getTicketOrOrderByCode(code);
  }

  @Public()
  @Post(['public/cs/correct-email', 'cs/correct-email'])
  correctTypoEmail(@Body() body: CorrectTypoEmailInput) {
    return this.ticketingService.correctTypoEmail(body);
  }

  @Public()
  @Get('summary')
  getSummary() {
    return this.ticketingService.getTicketingSummary();
  }

  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @Post('events')
  createTicketingEvent(@Body() body: CreateTicketingEventInput) {
    return this.ticketingService.createTicketingEvent(body);
  }

  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.STAFF)
  @Post('check-in')
  checkInTicket(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Body() body: { ticketCode: string; gateName?: string },
  ) {
    return this.ticketingService.checkInTicket(
      body.ticketCode,
      user?.email || 'Petugas Gate',
      body.gateName || 'Main Gate',
    );
  }
}
