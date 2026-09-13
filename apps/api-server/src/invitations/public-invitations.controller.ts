import {
  Controller,
  Get,
  Patch,
  Post,
  Body,
  Param,
  Header,
  NotFoundException,
} from '@nestjs/common';
import { PublicRsvpDto } from './dto/public-rsvp.dto';
import { PublicWishDto } from './dto/public-wish.dto';
import { InvitationsService } from './invitations.service';
import { Public } from '../auth/decorators/public.decorator';

@Controller({
  path: 'invitations/public',
  version: '1',
})
export class PublicInvitationsController {
  @Public()
  @Post(':uniqueCode/wishes')
  @Header('Cache-Control', 'no-store')
  async saveWish(
    @Param('uniqueCode') uniqueCode: string,
    @Body() dto: PublicWishDto,
  ) {
    return this.invitationsService.savePublicWish(uniqueCode, dto);
  }

  constructor(private readonly invitationsService: InvitationsService) {}

  @Public()
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
  @Patch(':uniqueCode/rsvp')
  @Header('Cache-Control', 'no-store')
  async updatePublicRsvp(
    @Param('uniqueCode') uniqueCode: string,
    @Body() dto: PublicRsvpDto,
  ) {
    return this.invitationsService.updatePublicRsvp(uniqueCode, dto);
  }
}
