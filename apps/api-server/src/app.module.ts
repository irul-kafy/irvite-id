import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard, seconds } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { join } from 'path';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { RolesGuard } from './auth/guards/roles.guard';
import { DatabaseModule } from './database/database.module';
import { EventsModule } from './events/events.module';
import { GuestsModule } from './guests/guests.module';
import { InvitationsModule } from './invitations/invitations.module';
import { AttendanceModule } from './attendance/attendance.module';
import { MediaModule } from './media/media.module';
import { UsersModule } from './users/users.module';
import { TemplatesModule } from './templates/templates.module';
import { StaffEventsModule } from './staff-events/staff-events.module';
import { ScannerModule } from './scanner/scanner.module';
import { StaffModule } from './staff/staff.module';
import { ReportsModule } from './reports/reports.module';
import { validateEnvironment } from './common/validate-environment';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: [
        join(process.cwd(), '.env'),
        join(__dirname, '../../..', '.env'),
        join(__dirname, '../../../..', '.env'),
      ],
      isGlobal: true,
      validate: validateEnvironment,
    }),
    DatabaseModule,
    AuthModule,
    UsersModule,
    TemplatesModule,
    EventsModule,
    GuestsModule,
    InvitationsModule,
    AttendanceModule,
    MediaModule,
    StaffEventsModule,
    ScannerModule,
    StaffModule,
    ReportsModule,
    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: seconds(60),
        limit: 300,
      },
    ]),
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
})
export class AppModule {}
