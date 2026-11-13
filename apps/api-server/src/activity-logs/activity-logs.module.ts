import { Global, Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { ActivityLogsController } from './activity-logs.controller';
import { ActivityLogsService } from './activity-logs.service';

@Global()
@Module({
  imports: [DatabaseModule],
  controllers: [ActivityLogsController],
  providers: [ActivityLogsService],
  exports: [ActivityLogsService],
})
export class ActivityLogsModule {}

