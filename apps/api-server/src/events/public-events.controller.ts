import {
  Controller,
  Get,
  Param,
  Header,
  NotFoundException,
} from '@nestjs/common';
import { EventsService } from './events.service';
import { Public } from '../auth/decorators/public.decorator';

@Controller({
  path: 'events/public',
  version: '1',
})
export class PublicEventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Public()
  @Get(':slug')
  @Header('Cache-Control', 'no-store')
  async resolvePublicEvent(@Param('slug') slug: string) {
    const data = await this.eventsService.resolvePublic(slug);
    if (!data) {
      throw new NotFoundException('Event not found');
    }
    return data;
  }
}
