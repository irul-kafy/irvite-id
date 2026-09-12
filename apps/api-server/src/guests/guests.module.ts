import { Module } from '@nestjs/common';
import { GuestsService } from './guests.service';
import { GuestsController } from './guests.controller';
import { GuestsImportService } from './guests-import.service';
import { GuestsImportController } from './guests-import.controller';
import { DatabaseModule } from '../database/database.module';
import { InvitationsModule } from '../invitations/invitations.module';

@Module({
  imports: [DatabaseModule, InvitationsModule],
  controllers: [GuestsController, GuestsImportController],
  providers: [GuestsService, GuestsImportService],
  exports: [GuestsService, GuestsImportService],
})
export class GuestsModule {}
