import { Module } from '@nestjs/common';
import { StaffEventsService } from './staff-events.service';
import { StaffEventsController } from './staff-events.controller';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [StaffEventsController],
  providers: [StaffEventsService],
  exports: [StaffEventsService],
})
export class StaffEventsModule {}
