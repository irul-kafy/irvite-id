import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { TicketingService } from './ticketing.service';
import { TicketingController } from './ticketing.controller';
import { PAYMENT_SERVICE, createPaymentService } from './payment.service';

@Module({
  imports: [DatabaseModule],
  controllers: [TicketingController],
  providers: [
    TicketingService,
    {
      provide: PAYMENT_SERVICE,
      useFactory: () => createPaymentService(),
    },
  ],
  exports: [TicketingService, PAYMENT_SERVICE],
})
export class TicketingModule {}
