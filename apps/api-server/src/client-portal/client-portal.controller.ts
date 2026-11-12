import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  Header,
  HttpException,
  InternalServerErrorException,
} from '@nestjs/common';
import { Throttle, seconds } from '@nestjs/throttler';
import { Public } from '../auth/decorators/public.decorator';
import { ClientPortalService } from './client-portal.service';
import {
  CreatePortalGuestDto,
  UpdatePortalGuestDto,
  SetPortalWaStatusDto,
} from './dto/client-portal.dto';

@Controller(['api/v1/client-portal', 'client-portal'])
export class ClientPortalController {
  constructor(
    private readonly clientPortalService: ClientPortalService,
  ) {}

  @Public()
  @Throttle({ default: { limit: 120, ttl: seconds(60) } })
  @Get(':eventId')
  @Header('Cache-Control', 'no-store')
  async getPortalData(
    @Param('eventId') eventId: string,
    @Query('key') key?: string,
  ) {
    try {
      return await this.clientPortalService.getPortalData(eventId, key);
    } catch (err: unknown) {
      if (err instanceof HttpException) {
        throw err;
      }
      const msg = err instanceof Error ? err.message : String(err);
      const stack = err instanceof Error ? err.stack : undefined;
      throw new InternalServerErrorException({
        statusCode: 500,
        message: 'Portal processing error: ' + msg,
        details: msg,
        stack,
      });
    }
  }

  @Public()
  @Throttle({ default: { limit: 60, ttl: seconds(60) } })
  @Post(':eventId/guests')
  @Header('Cache-Control', 'no-store')
  async addGuest(
    @Param('eventId') eventId: string,
    @Query('key') key: string | undefined,
    @Body() dto: CreatePortalGuestDto,
  ) {
    return this.clientPortalService.addGuest(eventId, key, dto);
  }

  @Public()
  @Throttle({ default: { limit: 60, ttl: seconds(60) } })
  @Patch(':eventId/guests/:guestId')
  @Header('Cache-Control', 'no-store')
  async updateGuest(
    @Param('eventId') eventId: string,
    @Param('guestId') guestId: string,
    @Query('key') key: string | undefined,
    @Body() dto: UpdatePortalGuestDto,
  ) {
    return this.clientPortalService.updateGuest(eventId, guestId, key, dto);
  }

  @Public()
  @Throttle({ default: { limit: 60, ttl: seconds(60) } })
  @Delete(':eventId/guests/:guestId')
  @Header('Cache-Control', 'no-store')
  async deleteGuest(
    @Param('eventId') eventId: string,
    @Param('guestId') guestId: string,
    @Query('key') key?: string,
  ) {
    return this.clientPortalService.deleteGuest(eventId, guestId, key);
  }

  @Public()
  @Throttle({ default: { limit: 120, ttl: seconds(60) } })
  @Post(':eventId/guests/:guestId/wa-status')
  @Header('Cache-Control', 'no-store')
  async setGuestWaStatus(
    @Param('eventId') eventId: string,
    @Param('guestId') guestId: string,
    @Query('key') key: string | undefined,
    @Body() dto: SetPortalWaStatusDto,
  ) {
    return this.clientPortalService.setGuestWaStatus(
      eventId,
      guestId,
      key,
      dto.isSent,
    );
  }

  @Public()
  @Throttle({ default: { limit: 30, ttl: seconds(60) } })
  @Delete(':eventId/wishes/:wishId')
  @Header('Cache-Control', 'no-store')
  async deleteWish(
    @Param('eventId') eventId: string,
    @Param('wishId') wishId: string,
    @Query('key') key: string | undefined,
  ) {
    return this.clientPortalService.deleteWish(eventId, wishId, key);
  }
}
