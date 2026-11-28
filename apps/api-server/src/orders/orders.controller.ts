import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UnauthorizedException,
} from '@nestjs/common';
import { Role } from 'database';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderQueryDto } from './dto/order-query.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { UpdateMasterPricingConfigDto } from './dto/update-pricing-config.dto';
import { OrdersService } from './orders.service';
import { PACKAGES } from './packages';

@Controller(['api/v1/orders', 'orders'])
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Public()
  @Get('public/pricing-config')
  getPublicPricingConfig() {
    return this.ordersService.getMasterPricingConfig();
  }

  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @Get('pricing-config')
  getPricingConfig() {
    return this.ordersService.getMasterPricingConfig();
  }

  @Roles(Role.SUPER_ADMIN)
  @Put('pricing-config')
  updatePricingConfig(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateMasterPricingConfigDto,
  ) {
    return this.ordersService.saveMasterPricingConfig(dto.config, user);
  }

  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @Get('packages')
  getPackages() {
    return Object.values(PACKAGES);
  }

  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @Get()
  listOrders(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: OrderQueryDto,
  ) {
    return this.ordersService.listOrders(query, user);
  }

  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @Get(':id')
  getOrder(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.ordersService.getOrder(id, user);
  }

  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @Post()
  createOrder(
    @CurrentUser() _user: AuthenticatedUser,
    @Body() dto: CreateOrderDto,
  ) {
    return this.ordersService.createOrder(dto);
  }

  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @Patch(':id')
  updateOrder(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateOrderDto,
  ) {
    return this.ordersService.updateOrder(id, dto, user);
  }

  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @Patch(':id/status')
  updateOrderStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateOrderDto,
  ) {
    return this.ordersService.updateOrder(id, dto, user);
  }

  /**
   * Cron endpoint to archive expired events.
   * Protected with CRON_SECRET header or bearer token.
   */
  @Public()
  @Post('cron/expire-events')
  async runExpiryCron(
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

    return this.ordersService.expireEventsCron();
  }
}
