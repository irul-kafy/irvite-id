import {
  MiddlewareConsumer,
  Module,
  NestModule,
  OnModuleInit,
} from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { TicketingService } from './ticketing.service';
import { TicketingController } from './ticketing.controller';
import { PAYMENT_SERVICE, createPaymentService } from './payment.service';
import {
  TicketingEnabledGuard,
  TicketingEnabledMiddleware,
} from './ticketing-enabled.middleware';
import { validateTicketingSecrets } from './ticketing-secrets';

@Module({
  imports: [DatabaseModule],
  controllers: [TicketingController],
  providers: [
    TicketingService,
    TicketingEnabledGuard,
    TicketingEnabledMiddleware,
    {
      provide: PAYMENT_SERVICE,
      useFactory: () => createPaymentService(),
    },
  ],
  exports: [TicketingService, PAYMENT_SERVICE],
})
export class TicketingModule implements NestModule, OnModuleInit {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(TicketingEnabledMiddleware).forRoutes(TicketingController);
  }

  onModuleInit(): void {
    validateTicketingSecrets();
  }
}
