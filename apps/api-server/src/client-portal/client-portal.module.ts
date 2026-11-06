import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { ClientPortalService } from './client-portal.service';
import { ClientPortalWaService } from './client-portal-wa.service';
import { ClientPortalController } from './client-portal.controller';

@Module({
  imports: [DatabaseModule],
  controllers: [ClientPortalController],
  providers: [ClientPortalService, ClientPortalWaService],
  exports: [ClientPortalService, ClientPortalWaService],
})
export class ClientPortalModule {}
