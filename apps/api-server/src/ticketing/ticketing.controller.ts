import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  Headers,
  UnauthorizedException,
} from '@nestjs/common';
import { Throttle, seconds } from '@nestjs/throttler';
import { Role } from 'database';
import { TicketingService } from './ticketing.service';
import { ListPublicEventsQueryDto } from './dto/list-public-events-query.dto';
import {
  CheckoutTicketDto,
  PaymentWebhookDto,
} from './dto/checkout-ticket.dto';
import {
  CheckInTicketDto,
  CreateTicketingEventDto,
  CreateTicketTierDto,
  ListEventOrdersQueryDto,
  UpdateTicketingEventDto,
  UpdateTicketTierDto,
} from './dto/admin-ticketing.dto';
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type';

@Controller(['api/v1/ticketing', 'ticketing'])
export class TicketingController {
  constructor(private readonly ticketingService: TicketingService) {}

  @Public()
  @Get(['events', 'public/events'])
  listPublicEvents(@Query() query: ListPublicEventsQueryDto) {
    return this.ticketingService.listPublicEvents(query);
  }

  @Public()
  @Get(['events/:slug', 'public/events/:slug'])
  getPublicEventBySlug(@Param('slug') slug: string) {
    return this.ticketingService.getPublicEventBySlug(slug);
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: seconds(60) } })
  @Post(['checkout', 'public/checkout', 'orders/checkout'])
  checkoutTicket(@Body() dto: CheckoutTicketDto) {
    return this.ticketingService.checkoutTicket(dto);
  }

  @Public()
  @Get(['orders/:orderCode', 'public/orders/:orderCode'])
  getPublicOrderByCode(
    @Param('orderCode') orderCode: string,
    @Query('accessToken') queryToken?: string,
    @Headers('x-access-token') headerToken?: string,
  ) {
    return this.ticketingService.getPublicOrderByCode(
      orderCode,
      queryToken || headerToken,
    );
  }

  @Public()
  @Post(['webhooks/payment', 'public/webhooks/payment'])
  handlePaymentWebhook(
    @Body() dto: PaymentWebhookDto,
    @Headers('x-payment-signature') signature?: string,
  ) {
    return this.ticketingService.handlePaymentWebhook(dto, signature);
  }

  @Public()
  @Post('cron/expire-orders')
  runExpireOrdersCron(
    @Headers('authorization') authHeader?: string,
    @Headers('x-cron-secret') cronSecretHeader?: string,
  ) {
    const configuredSecret =
      process.env.CRON_SECRET || 'irvite-cron-default-secret';
    const bearerSecret = authHeader?.replace(/^Bearer\s+/i, '').trim();
    const providedSecret = cronSecretHeader?.trim() || bearerSecret;

    if (!providedSecret || providedSecret !== configuredSecret) {
      throw new UnauthorizedException('Invalid or missing cron secret');
    }

    return this.ticketingService.expireOverdueOrdersCron();
  }

  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @Get('summary')
  getAdminSummary() {
    return this.ticketingService.getAdminSummary();
  }

  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @Post(['events', 'admin/events'])
  createTicketingEvent(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Body() dto: CreateTicketingEventDto,
  ) {
    return this.ticketingService.createTicketingEvent(dto, user?.id);
  }

  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @Patch(['events/:eventId', 'admin/events/:eventId'])
  updateTicketingEvent(
    @Param('eventId') eventId: string,
    @Body() dto: UpdateTicketingEventDto,
  ) {
    return this.ticketingService.updateTicketingEvent(eventId, dto);
  }

  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @Post(['events/:eventId/publish', 'admin/events/:eventId/publish'])
  publishTicketingEvent(@Param('eventId') eventId: string) {
    return this.ticketingService.publishTicketingEvent(eventId);
  }

  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @Post(['events/:eventId/tiers', 'admin/events/:eventId/tiers'])
  createTicketTier(
    @Param('eventId') eventId: string,
    @Body() dto: CreateTicketTierDto,
  ) {
    return this.ticketingService.createTicketTier(eventId, dto);
  }

  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @Patch(['tiers/:tierId', 'admin/tiers/:tierId'])
  updateTicketTier(
    @Param('tierId') tierId: string,
    @Body() dto: UpdateTicketTierDto,
  ) {
    return this.ticketingService.updateTicketTier(tierId, dto);
  }

  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @Get(['events/:eventId/orders', 'admin/events/:eventId/orders'])
  listOrdersByEvent(
    @Param('eventId') eventId: string,
    @Query() query: ListEventOrdersQueryDto,
  ) {
    return this.ticketingService.listOrdersByEvent(eventId, query);
  }

  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.STAFF)
  @Post('check-in')
  checkInTicket(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Body() dto: CheckInTicketDto,
  ) {
    return this.ticketingService.checkInTicket(
      dto,
      user?.email || 'Petugas gerbang',
      dto.gateName || 'Gerbang utama',
    );
  }
}
