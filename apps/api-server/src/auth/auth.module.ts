import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { DatabaseModule } from '../database/database.module';

type Unit =
  | 'Years'
  | 'Y'
  | 'y'
  | 'Days'
  | 'D'
  | 'd'
  | 'Hours'
  | 'H'
  | 'h'
  | 'Minutes'
  | 'M'
  | 'm'
  | 'Seconds'
  | 'S'
  | 's'
  | 'Milliseconds'
  | 'MS'
  | 'ms';
type StringValue = `${number}` | `${number}${Unit}` | `${number} ${Unit}`;

@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_ACCESS_SECRET'),
        signOptions: {
          expiresIn: configService.get<string>(
            'JWT_ACCESS_EXPIRATION',
          ) as StringValue,
        },
      }),
      inject: [ConfigService],
    }),
    DatabaseModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
})
export class AuthModule {}
