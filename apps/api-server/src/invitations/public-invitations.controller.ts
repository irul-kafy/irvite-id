import { Throttle, seconds } from '@nestjs/throttler';
import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Header,
  NotFoundException,
} from '@nestjs/common';
import { PublicRsvpDto } from './dto/public-rsvp.dto';
import { CreateWishDto } from '../events/dto/create-wish.dto';
import { InvitationsService } from './invitations.service';
import { Public } from '../auth/decorators/public.decorator';

@Controller(['api/v1/invitations/public', 'invitations/public'])
export class PublicInvitationsController {
  constructor(private readonly invitationsService: InvitationsService) {}

  @Public()
  @Throttle({ default: { limit: 60, ttl: seconds(60) } })
  @Get(':uniqueCode')
  @Header('Cache-Control', 'no-store')
  async resolvePublic(@Param('uniqueCode') uniqueCode: string) {
    const data = await this.invitationsService.resolvePublic(uniqueCode);
    if (!data) {
      throw new NotFoundException('Invitation not found');
    }
    return data;
  }

  @Public()
  @Throttle({ default: { limit: 15, ttl: seconds(60) } })
  @Patch(':uniqueCode/rsvp')
  @Header('Cache-Control', 'no-store')
  async updatePublicRsvp(
    @Param('uniqueCode') uniqueCode: string,
    @Body() dto: PublicRsvpDto,
  ) {
    return this.invitationsService.updatePublicRsvp(uniqueCode, dto);
  }

  @Public()
  @Throttle({ default: { limit: 60, ttl: seconds(60) } })
  @Get(':uniqueCode/wishes')
  @Header('Cache-Control', 'no-store')
  async getPublicWishes(@Param('uniqueCode') uniqueCode: string) {
    return this.invitationsService.getPublicWishes(uniqueCode);
  }

  @Public()
  @Throttle({ default: { limit: 15, ttl: seconds(60) } })
  @Post(':uniqueCode/wishes')
  @Header('Cache-Control', 'no-store')
  async createPublicWish(
    @Param('uniqueCode') uniqueCode: string,
    @Body() dto: CreateWishDto,
  ) {
    return this.invitationsService.createPublicWish(uniqueCode, dto);
  }
}
