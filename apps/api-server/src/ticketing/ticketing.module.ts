import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { TicketingService } from './ticketing.service';
import { TicketingController } from './ticketing.controller';

@Module({
  imports: [DatabaseModule],
  controllers: [TicketingController],
  providers: [TicketingService],
  exports: [TicketingService],
})
export class TicketingModule {}
