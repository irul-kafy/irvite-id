import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  Headers,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { Throttle, seconds } from '@nestjs/throttler';
import { Role } from 'database';
import { TicketingService } from './ticketing.service';
import { ListPublicEventsQueryDto } from './dto/list-public-events-query.dto';
import {
  CheckoutTicketDto,
  PaymentWebhookDto,
  QuoteTicketOrderDto,
} from './dto/checkout-ticket.dto';
import {
  CheckInTicketDto,
  CreateTicketingEventDto,
  CreateTicketTierDto,
  ListEventOrdersQueryDto,
  SearchEventTicketsQueryDto,
  SyncOfflineTicketCheckInsDto,
  UndoTicketCheckInDto,
  UpdateTicketingEventDto,
  UpdateTicketTierDto,
} from './dto/admin-ticketing.dto';
import {
  CreateEoInquiryDto,
  ListEoInquiriesQueryDto,
  UpdateEoInquiryStatusDto,
  VerifyOrderAccessTokenDto,
} from './dto/eo-inquiry.dto';
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { TicketingEnabledGuard } from './ticketing-enabled.middleware';
import { getTicketingCronSecret, safeCompareSecret } from './ticketing-secrets';

@UseGuards(TicketingEnabledGuard)
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
  @Throttle({ default: { limit: 30, ttl: seconds(60) } })
  @Post(['events/:slug/quote', 'public/events/:slug/quote'])
  quoteTicketOrder(
    @Param('slug') slug: string,
    @Body() dto: QuoteTicketOrderDto,
  ) {
    return this.ticketingService.quoteTicketOrder(slug, dto);
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: seconds(60) } })
  @Post(['checkout', 'public/checkout', 'orders/checkout'])
  checkoutTicket(@Body() dto: CheckoutTicketDto) {
    return this.ticketingService.checkoutTicket(dto);
  }

  @Public()
  @Throttle({ default: { limit: 20, ttl: seconds(60) } })
  @Get(['orders/:orderCode', 'public/orders/:orderCode'])
  getPublicOrderByCode(
    @Param('orderCode') orderCode: string,
    @Query('accessToken') queryToken?: string,
    @Headers('x-access-token') headerToken?: string,
  ) {
    return this.ticketingService.getPublicOrderByCode(
      orderCode,
      headerToken || queryToken,
    );
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 20, ttl: seconds(60) } })
  @Post([
    'orders/:orderCode',
    'public/orders/:orderCode',
    'orders/:orderCode/verify',
  ])
  verifyPublicOrderByPost(
    @Param('orderCode') orderCode: string,
    @Body() body?: VerifyOrderAccessTokenDto,
    @Headers('x-access-token') headerToken?: string,
    @Query('accessToken') queryToken?: string,
  ) {
    return this.ticketingService.getPublicOrderByCode(
      orderCode,
      headerToken || body?.accessToken || queryToken,
    );
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: seconds(600) } })
  @Post(['public/inquiries', 'inquiries/public'])
  createPublicEoInquiry(@Body() dto: CreateEoInquiryDto) {
    return this.ticketingService.createEoInquiry(dto);
  }

  @Public()
  @Throttle({ default: { limit: 20, ttl: seconds(60) } })
  @Get(['public/inquiries/:code', 'inquiries/public/:code'])
  getPublicEoInquiryByCode(
    @Param('code') code: string,
    @Query('accessToken') queryToken?: string,
    @Headers('x-access-token') headerToken?: string,
  ) {
    return this.ticketingService.getPublicEoInquiryByCode(
      code,
      headerToken || queryToken,
    );
  }

  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @Get(['inquiries', 'admin/inquiries'])
  listAdminEoInquiries(@Query() query: ListEoInquiriesQueryDto) {
    return this.ticketingService.listAdminEoInquiries(query);
  }

  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @Patch(['inquiries/:id/status', 'admin/inquiries/:id/status'])
  updateEoInquiryStatus(
    @Param('id') id: string,
    @Body() dto: UpdateEoInquiryStatusDto,
    @CurrentUser() user: AuthenticatedUser | undefined,
  ) {
    return this.ticketingService.updateEoInquiryStatus(id, dto, user);
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post(['webhooks/payment', 'public/webhooks/payment'])
  handlePaymentWebhook(
    @Body() rawBody: Record<string, unknown>,
    @Headers('x-payment-signature') signature?: string,
  ) {
    return this.ticketingService.handlePaymentWebhook(
      rawBody as unknown as PaymentWebhookDto,
      signature,
    );
  }

  @Public()
  @Post('cron/expire-orders')
  runExpireOrdersCron(
    @Headers('authorization') authHeader?: string,
    @Headers('x-cron-secret') cronSecretHeader?: string,
  ) {
    const configuredSecret = getTicketingCronSecret();
    const bearerSecret = authHeader?.replace(/^Bearer\s+/i, '').trim();
    const providedSecret = cronSecretHeader?.trim() || bearerSecret;

    if (!safeCompareSecret(providedSecret, configuredSecret)) {
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
      user,
      dto.gateName || 'Gerbang utama',
    );
  }

  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @Post('check-in/undo')
  undoTicketCheckIn(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Body() dto: UndoTicketCheckInDto,
  ) {
    return this.ticketingService.undoTicketCheckIn(dto, user);
  }

  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.STAFF)
  @Get('events/:eventId/offline-snapshot')
  getEventOfflineSnapshot(
    @Param('eventId') eventId: string,
    @CurrentUser() user: AuthenticatedUser | undefined,
  ) {
    return this.ticketingService.getEventOfflineSnapshot(eventId, user);
  }

  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.STAFF)
  @Post('events/:eventId/offline-sync')
  syncOfflineTicketCheckIns(
    @Param('eventId') eventId: string,
    @Body() dto: SyncOfflineTicketCheckInsDto,
    @CurrentUser() user: AuthenticatedUser | undefined,
  ) {
    return this.ticketingService.syncOfflineTicketCheckIns(eventId, dto, user);
  }

  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.STAFF)
  @Get('events/:eventId/checkin-stats')
  getEventCheckInStats(
    @Param('eventId') eventId: string,
    @CurrentUser() user: AuthenticatedUser | undefined,
  ) {
    return this.ticketingService.getEventCheckInStats(eventId, user);
  }

  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.STAFF)
  @Get('events/:eventId/tickets/search')
  searchEventTicketsManual(
    @Param('eventId') eventId: string,
    @Query() query: SearchEventTicketsQueryDto,
    @CurrentUser() user: AuthenticatedUser | undefined,
  ) {
    return this.ticketingService.searchEventTicketsManual(eventId, query, user);
  }
}
