import { Injectable, Optional, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { LoginDto } from './dto/login.dto';
import * as argon2 from 'argon2';
import { PrismaService } from '../database/prisma.service';
import { ActivityLogsService } from '../activity-logs/activity-logs.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
    @Optional() private readonly activityLogs?: ActivityLogsService,
  ) {}

  async login(loginDto: LoginDto) {
    const normalizedEmail = loginDto.email.trim().toLowerCase();

    let user: import('@prisma/client').User | null = null;

    user = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user || !user.isActive) {
      this.activityLogs?.record({
        action: 'AUTH_LOGIN_FAILED',
        entityType: 'User',
        entityId: normalizedEmail,
        metadata: { attemptedEmail: normalizedEmail },
      });
      throw new UnauthorizedException('Invalid email or password');
    }

    const isPasswordValid = await argon2.verify(
      user.passwordHash,
      loginDto.password,
    );
    if (!isPasswordValid) {
      this.activityLogs?.record({
        actorUserId: user.id,
        actorRole: user.role,
        action: 'AUTH_LOGIN_FAILED',
        entityType: 'User',
        entityId: user.id,
        metadata: { attemptedEmail: normalizedEmail },
      });
      throw new UnauthorizedException('Invalid email or password');
    }

    this.activityLogs?.record({
      actorUserId: user.id,
      actorRole: user.role,
      action: 'AUTH_LOGIN_SUCCESS',
      entityType: 'User',
      entityId: user.id,
      metadata: { email: user.email },
    });

    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const accessToken = await this.jwtService.signAsync(payload);

    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
    };
  }
}
