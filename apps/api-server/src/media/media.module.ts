import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { MediaController } from './media.controller';
import { MediaService } from './media.service';
import { MediaStorageService } from './media-storage.service';
import { PublicMediaController } from './public-media.controller';
import { PublicEventMediaController } from './public-event-media.controller';
import { PublicMediaService } from './public-media.service';
import { InvitationsModule } from '../invitations/invitations.module';

@Module({
  imports: [DatabaseModule, InvitationsModule],
  controllers: [
    MediaController,
    PublicMediaController,
    PublicEventMediaController,
  ],
  providers: [MediaService, MediaStorageService, PublicMediaService],
  exports: [MediaStorageService],
})
export class MediaModule {}
