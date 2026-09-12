import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
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

function validateEnv(config: Record<string, unknown>) {
  if (
    !config.JWT_ACCESS_SECRET ||
    typeof config.JWT_ACCESS_SECRET !== 'string' ||
    config.JWT_ACCESS_SECRET.trim() === ''
  ) {
    throw new Error(
      'Environment variable JWT_ACCESS_SECRET is required and must be non-empty.',
    );
  }
  if (!config.JWT_ACCESS_EXPIRATION) {
    config.JWT_ACCESS_EXPIRATION = '12h';
  } else if (
    typeof config.JWT_ACCESS_EXPIRATION !== 'string' ||
    !/^\d+[smhd]$/.test(config.JWT_ACCESS_EXPIRATION)
  ) {
    throw new Error(
      'Environment variable JWT_ACCESS_EXPIRATION must be a valid duration (e.g. 12h, 15m, 60s).',
    );
  }
  return config;
}

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: [
        join(process.cwd(), '.env'),
        join(__dirname, '../../..', '.env'),
        join(__dirname, '../../../..', '.env'),
      ],
      isGlobal: true,
      validate: validateEnv,
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
  ],
  controllers: [AppController],
  providers: [
    AppService,
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
