import { Throttle, seconds } from '@nestjs/throttler';
import {
  Body,
  Controller,
  Get,
  Post,
  Param,
  Header,
  NotFoundException,
} from '@nestjs/common';
import { EventsService } from './events.service';
import { CreatePublicDraftDto } from './dto/create-public-draft.dto';
import { CreateWishDto } from './dto/create-wish.dto';
import { Public } from '../auth/decorators/public.decorator';

@Controller(['api/v1/events/public', 'events/public'])
export class PublicEventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Public()
  @Throttle({ default: { limit: 15, ttl: seconds(60) } })
  @Post('draft')
  @Header('Cache-Control', 'no-store')
  async createPublicDraft(@Body() dto: CreatePublicDraftDto) {
    return this.eventsService.createPublicDraft(dto);
  }

  @Public()
  @Throttle({ default: { limit: 60, ttl: seconds(60) } })
  @Get(':slug')
  @Header('Cache-Control', 'no-store')
  async resolvePublicEvent(@Param('slug') slug: string) {
    const data = await this.eventsService.resolvePublic(slug);
    if (!data) {
      throw new NotFoundException('Event not found');
    }
    return data;
  }

  @Public()
  @Throttle({ default: { limit: 60, ttl: seconds(60) } })
  @Get(':slug/wishes')
  @Header('Cache-Control', 'no-store')
  async getPublicWishes(@Param('slug') slug: string) {
    return this.eventsService.getPublicWishes(slug);
  }

  @Public()
  @Throttle({ default: { limit: 15, ttl: seconds(60) } })
  @Post(':slug/wishes')
  @Header('Cache-Control', 'no-store')
  async createPublicWish(
    @Param('slug') slug: string,
    @Body() dto: CreateWishDto,
  ) {
    return this.eventsService.createPublicWish(slug, dto);
  }
}
