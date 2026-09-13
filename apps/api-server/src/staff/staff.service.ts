import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { Role, Prisma } from 'database';
import * as argon2 from 'argon2';
import { CreateStaffDto } from './dto/create-staff.dto';
import { UpdateStaffDto } from './dto/update-staff.dto';
import { ResetStaffPasswordDto } from './dto/reset-staff-password.dto';
import { StaffQueryDto } from './dto/staff-query.dto';

@Injectable()
export class StaffService {
  constructor(private readonly prisma: PrismaService) {}

  private selectSafeStaff() {
    return {
      id: true,
      email: true,
      role: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
    };
  }

  async getCandidates() {
    const data = await this.prisma.user.findMany({
      where: {
        role: Role.STAFF,
        isActive: true,
      },
      select: {
        id: true,
        email: true,
      },
      orderBy: [{ email: 'asc' }, { id: 'asc' }],
    });

    return { data };
  }

  async findAll(query: StaffQueryDto) {
    const { page = 1, limit = 20, search, status = 'all' } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.UserWhereInput = {
      role: Role.STAFF,
    };

    if (status === 'active') {
      where.isActive = true;
    } else if (status === 'inactive') {
      where.isActive = false;
    }

    if (search && search.trim() !== '') {
      where.email = {
        contains: search.trim().toLowerCase(),
      };
    }

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        select: {
          id: true,
          email: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              staffEvents: true,
            },
          },
        },
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
      }),
      this.prisma.user.count({ where }),
    ]);

    const data = users.map((u) => ({
      id: u.id,
      email: u.email,
      isActive: u.isActive,
      createdAt: u.createdAt,
      updatedAt: u.updatedAt,
      assignedEventCount: u._count.staffEvents,
    }));

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 0,
      },
    };
  }

  async create(dto: CreateStaffDto) {
    const normalizedEmail = dto.email.trim().toLowerCase();

    const existing = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existing) {
      throw new ConflictException('Email already in use');
    }

    const passwordHash = await argon2.hash(dto.password, {
      type: argon2.argon2id,
    });

    try {
      const user = await this.prisma.user.create({
        data: {
          email: normalizedEmail,
          passwordHash,
          role: Role.STAFF,
          isActive: true,
        },
        select: this.selectSafeStaff(),
      });

      return user;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('Email already in use');
      }
      throw error;
    }
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        staffEvents: {
          select: {
            createdAt: true,
            event: {
              select: {
                id: true,
                title: true,
                slug: true,
                status: true,
                eventDate: true,
              },
            },
          },
          orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
        },
      },
    });

    if (!user || user.role !== Role.STAFF) {
      throw new NotFoundException('Staff not found');
    }

    return {
      id: user.id,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      assignedEvents: user.staffEvents.map((se) => ({
        id: se.event.id,
        title: se.event.title,
        slug: se.event.slug,
        status: se.event.status,
        eventDate: se.event.eventDate,
        assignedAt: se.createdAt,
      })),
    };
  }

  async update(id: string, dto: UpdateStaffDto) {
    if (dto.email === undefined && dto.isActive === undefined) {
      throw new BadRequestException(
        'At least one field (email, isActive) must be provided',
      );
    }

    const user = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true, role: true, email: true },
    });

    if (!user || user.role !== Role.STAFF) {
      throw new NotFoundException('Staff not found');
    }

    const dataToUpdate: Prisma.UserUpdateInput = {};

    if (dto.email !== undefined) {
      const normalizedEmail = dto.email.trim().toLowerCase();
      if (normalizedEmail !== user.email) {
        const existing = await this.prisma.user.findUnique({
          where: { email: normalizedEmail },
        });
        if (existing) {
          throw new ConflictException('Email already in use');
        }
        dataToUpdate.email = normalizedEmail;
      }
    }

    if (dto.isActive !== undefined) {
      dataToUpdate.isActive = dto.isActive;
    }

    try {
      const updated = await this.prisma.user.update({
        where: { id },
        data: dataToUpdate,
        select: this.selectSafeStaff(),
      });

      return updated;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('Email already in use');
      }
      throw error;
    }
  }

  async resetPassword(id: string, dto: ResetStaffPasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true, role: true },
    });

    if (!user || user.role !== Role.STAFF) {
      throw new NotFoundException('Staff not found');
    }

    const passwordHash = await argon2.hash(dto.password, {
      type: argon2.argon2id,
    });

    await this.prisma.user.update({
      where: { id },
      data: { passwordHash },
    });
  }
}
