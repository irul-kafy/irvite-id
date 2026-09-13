import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateGuestDto } from './dto/create-guest.dto';
import { UpdateGuestDto } from './dto/update-guest.dto';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { Role, Prisma } from 'database';
import { ReportsService } from '../reports/reports.service';
import { ExportQueryDto } from '../reports/dto/export-query.dto';

@Injectable()
export class GuestsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reportsService: ReportsService,
  ) {}

  private async assertEventAccessible(
    eventId: string,
    currentUserId: string,
    role: Role,
  ): Promise<void> {
    const where: Prisma.EventWhereInput =
      role === Role.SUPER_ADMIN
        ? { id: eventId }
        : { id: eventId, userId: currentUserId };

    const event = await this.prisma.event.findFirst({
      where,
      select: { id: true },
    });

    if (!event) {
      throw new NotFoundException('Event not found');
    }
  }

  async exportGuests(
    eventId: string,
    currentUserId: string,
    role: Role,
    query: ExportQueryDto,
  ) {
    if (role === Role.STAFF) {
      throw new ForbiddenException(
        'Staff is not authorized to export guest data',
      );
    }

    const whereScope: Prisma.EventWhereInput =
      role === Role.SUPER_ADMIN
        ? { id: eventId }
        : { id: eventId, userId: currentUserId };

    const event = await this.prisma.event.findFirst({
      where: whereScope,
      select: {
        title: true,
        slug: true,
        eventDate: true,
        locationDetails: true,
      },
    });

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    return this.reportsService.exportGuestData(eventId, event, query);
  }

  async create(
    eventId: string,
    currentUserId: string,
    role: Role,
    createGuestDto: CreateGuestDto,
  ) {
    await this.assertEventAccessible(eventId, currentUserId, role);

    const data: Prisma.GuestUncheckedCreateInput = {
      eventId,
      name: createGuestDto.name,
    };

    if (createGuestDto.customGreeting !== undefined) {
      data.customGreeting = createGuestDto.customGreeting;
    }
    if (createGuestDto.email !== undefined) {
      data.email = createGuestDto.email;
    }
    if (createGuestDto.phoneNumber !== undefined) {
      data.phoneNumber = createGuestDto.phoneNumber;
    }
    if (createGuestDto.category !== undefined) {
      data.category = createGuestDto.category;
    }
    if (createGuestDto.maxPax !== undefined) {
      data.maxPax = createGuestDto.maxPax;
    }

    const guest = await this.prisma.guest.create({
      data,
      select: this.safeGuestSelect(),
    });

    return guest;
  }

  async findAll(
    eventId: string,
    currentUserId: string,
    role: Role,
    query: PaginationQueryDto,
  ) {
    await this.assertEventAccessible(eventId, currentUserId, role);

    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;

    const [total, data] = await Promise.all([
      this.prisma.guest.count({ where: { eventId } }),
      this.prisma.guest.findMany({
        where: { eventId },
        skip,
        take: limit,
        select: this.safeGuestListSelect(),
      }),
    ]);

    const lastPage = Math.ceil(total / limit);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        lastPage,
      },
    };
  }

  async findOne(
    eventId: string,
    id: string,
    currentUserId: string,
    role: Role,
  ) {
    await this.assertEventAccessible(eventId, currentUserId, role);

    const guest = await this.prisma.guest.findFirst({
      where: {
        id,
        eventId,
      },
      select: this.safeGuestSelect(),
    });

    if (!guest) {
      throw new NotFoundException('Guest not found');
    }

    return guest;
  }

  async update(
    eventId: string,
    id: string,
    currentUserId: string,
    role: Role,
    updateGuestDto: UpdateGuestDto,
  ) {
    await this.assertEventAccessible(eventId, currentUserId, role);

    const data: Prisma.GuestUpdateInput = {};

    if (updateGuestDto.name !== undefined) {
      data.name = updateGuestDto.name;
    }
    if (updateGuestDto.customGreeting !== undefined) {
      data.customGreeting = updateGuestDto.customGreeting;
    }
    if (updateGuestDto.email !== undefined) {
      data.email = updateGuestDto.email;
    }
    if (updateGuestDto.phoneNumber !== undefined) {
      data.phoneNumber = updateGuestDto.phoneNumber;
    }
    if (updateGuestDto.category !== undefined) {
      data.category = updateGuestDto.category;
    }
    if (updateGuestDto.maxPax !== undefined) {
      data.maxPax = updateGuestDto.maxPax;
    }

    try {
      const guest = await this.prisma.guest.update({
        where: {
          id,
          eventId,
        },
        data,
        select: this.safeGuestSelect(),
      });
      return guest;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException('Guest not found');
      }
      throw error;
    }
  }

  private safeGuestSelect(): Prisma.GuestSelect {
    return {
      id: true,
      eventId: true,
      name: true,
      customGreeting: true,
      email: true,
      phoneNumber: true,
      category: true,
      maxPax: true,
      createdAt: true,
    };
  }

  private safeGuestListSelect(): Prisma.GuestSelect {
    return {
      ...this.safeGuestSelect(),
      invitation: {
        select: {
          uniqueCode: true,
          status: true,
          rsvpPax: true,
          attendances: {
            select: {
              scannedAt: true,
              status: true,
              scannedPax: true,
            },
          },
        },
      },
    };
  }
}
