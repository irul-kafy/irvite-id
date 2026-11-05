import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { ClientPortalService } from './client-portal.service';
import { ClientPortalController } from './client-portal.controller';

@Module({
  imports: [DatabaseModule],
  controllers: [ClientPortalController],
  providers: [ClientPortalService],
  exports: [ClientPortalService],
})
export class ClientPortalModule {}
