import { Module } from '@nestjs/common';
import { InvitationsService } from './invitations.service';
import { InvitationsController } from './invitations.controller';
import { PublicInvitationsController } from './public-invitations.controller';
import { DatabaseModule } from '../database/database.module';
import { PublicInvitationAccessService } from './public-invitation-access.service';

@Module({
  imports: [DatabaseModule],
  controllers: [InvitationsController, PublicInvitationsController],
  providers: [InvitationsService, PublicInvitationAccessService],
  exports: [InvitationsService, PublicInvitationAccessService],
})
export class InvitationsModule {}
