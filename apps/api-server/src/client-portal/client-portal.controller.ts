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
} from '@nestjs/common';
import { Throttle, seconds } from '@nestjs/throttler';
import { Public } from '../auth/decorators/public.decorator';
import { ClientPortalService } from './client-portal.service';
import { ClientPortalWaService } from './client-portal-wa.service';
import {
  CreatePortalGuestDto,
  UpdatePortalGuestDto,
  SetPortalWaStatusDto,
  StartPortalWaQueueDto,
  ControlPortalWaQueueDto,
  SendPortalWaTestDto,
  RequestPortalWaPairingCodeDto,
  SendPortalWaGuestDto,
} from './dto/client-portal.dto';

@Controller(['api/v1/client-portal', 'client-portal'])
export class ClientPortalController {
  constructor(
    private readonly clientPortalService: ClientPortalService,
    private readonly clientPortalWaService: ClientPortalWaService,
  ) {}

  @Public()
  @Throttle({ default: { limit: 120, ttl: seconds(60) } })
  @Get(':eventId')
  @Header('Cache-Control', 'no-store')
  async getPortalData(
    @Param('eventId') eventId: string,
    @Query('key') key?: string,
  ) {
    return this.clientPortalService.getPortalData(eventId, key);
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
  @Throttle({ default: { limit: 60, ttl: seconds(60) } })
  @Get(':eventId/wa/session')
  @Header('Cache-Control', 'no-store')
  async getWaSession(
    @Param('eventId') eventId: string,
    @Query('key') key?: string,
  ) {
    return this.clientPortalWaService.getSessionStatus(eventId, key);
  }

  @Public()
  @Throttle({ default: { limit: 30, ttl: seconds(60) } })
  @Post(':eventId/wa/connect')
  @Header('Cache-Control', 'no-store')
  async connectWa(
    @Param('eventId') eventId: string,
    @Query('key') key?: string,
  ) {
    return this.clientPortalWaService.connectSession(eventId, key);
  }

  @Public()
  @Throttle({ default: { limit: 20, ttl: seconds(60) } })
  @Post(':eventId/wa/pairing-code')
  @Header('Cache-Control', 'no-store')
  async requestWaPairingCode(
    @Param('eventId') eventId: string,
    @Query('key') key: string | undefined,
    @Body() dto: RequestPortalWaPairingCodeDto,
  ) {
    return this.clientPortalWaService.requestPairingCode(
      eventId,
      key,
      dto.phoneNumber,
    );
  }

  @Public()
  @Throttle({ default: { limit: 120, ttl: seconds(60) } })
  @Post(':eventId/wa/send-guest/:guestId')
  @Header('Cache-Control', 'no-store')
  async sendPortalWaGuest(
    @Param('eventId') eventId: string,
    @Param('guestId') guestId: string,
    @Query('key') key: string | undefined,
    @Body() dto: SendPortalWaGuestDto,
  ) {
    return this.clientPortalWaService.sendGuestDirectMessage(
      eventId,
      guestId,
      key,
      dto.originUrl,
      dto.variantIndex,
    );
  }

  @Public()
  @Throttle({ default: { limit: 30, ttl: seconds(60) } })
  @Post(':eventId/wa/disconnect')
  @Header('Cache-Control', 'no-store')
  async disconnectWa(
    @Param('eventId') eventId: string,
    @Query('key') key?: string,
  ) {
    return this.clientPortalWaService.disconnectSession(eventId, key);
  }

  @Public()
  @Throttle({ default: { limit: 30, ttl: seconds(60) } })
  @Post(':eventId/wa/queue/start')
  @Header('Cache-Control', 'no-store')
  async startWaQueue(
    @Param('eventId') eventId: string,
    @Query('key') key: string | undefined,
    @Body() dto: StartPortalWaQueueDto,
  ) {
    return this.clientPortalWaService.startQueue(eventId, key, {
      targetGuestIds: dto.targetGuestIds,
      pacing: dto.pacing || 'relaxed',
      useSpintax: dto.useSpintax ?? true,
      enableBatchBreak: dto.enableBatchBreak ?? true,
      originUrl: dto.originUrl || '',
    });
  }

  @Public()
  @Throttle({ default: { limit: 120, ttl: seconds(60) } })
  @Get(':eventId/wa/queue/status')
  @Header('Cache-Control', 'no-store')
  async getWaQueueStatus(
    @Param('eventId') eventId: string,
  ) {
    return this.clientPortalWaService.getQueueStatus(eventId);
  }

  @Public()
  @Throttle({ default: { limit: 60, ttl: seconds(60) } })
  @Post(':eventId/wa/queue/control')
  @Header('Cache-Control', 'no-store')
  async controlWaQueue(
    @Param('eventId') eventId: string,
    @Body() dto: ControlPortalWaQueueDto,
  ) {
    return this.clientPortalWaService.controlQueue(eventId, dto.action);
  }

  @Public()
  @Throttle({ default: { limit: 30, ttl: seconds(60) } })
  @Post(':eventId/wa/send-test')
  @Header('Cache-Control', 'no-store')
  async sendWaTest(
    @Param('eventId') eventId: string,
    @Body() dto: SendPortalWaTestDto,
  ) {
    return this.clientPortalWaService.sendDirectMessage(
      eventId,
      dto.targetPhone,
      dto.testMessage || 'Halo! Ini adalah pesan uji coba dari sistem WhatsApp Irvite.id.',
    );
  }
}
