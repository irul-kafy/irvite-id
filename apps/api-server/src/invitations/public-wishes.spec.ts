/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { InvitationsService } from './invitations.service';
import { PublicInvitationAccessService } from './public-invitation-access.service';
import { PrismaService } from '../database/prisma.service';
import { PublicWishDto } from './dto/public-wish.dto';

describe('Public wishes', () => {
  const code = 'abcdefghijklmnopqrstuv';
  function setup(status = 'PUBLISHED') {
    const prisma = {
      invitation: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'invitation',
          eventId: 'event',
          uniqueCode: code,
          guest: { maxPax: 2 },
          event: { status, eventDate: new Date(Date.now() + 86400000) },
        }),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    };
    const db = prisma as unknown as PrismaService;
    return {
      prisma,
      service: new InvitationsService(
        db,
        new PublicInvitationAccessService(db),
      ),
    };
  }
  it('trims valid names/messages and rejects blank or overlong input', async () => {
    const dto = plainToInstance(PublicWishDto, {
      name: ' A ',
      message: ' Best wishes ',
    });
    expect(await validate(dto)).toHaveLength(0);
    expect(dto).toEqual({ name: 'A', message: 'Best wishes' });
    expect(
      await validate(
        plainToInstance(PublicWishDto, {
          name: ' ',
          message: 'a'.repeat(1001),
        }),
      ),
    ).toHaveLength(2);
  });
  it.each(['preview', 'invalid'])(
    'rejects %s codes before querying',
    async (uniqueCode) => {
      const { prisma, service } = setup();
      await expect(
        service.savePublicWish(uniqueCode, { name: 'A', message: 'B' }),
      ).rejects.toThrow('Invitation not found');
      expect(prisma.invitation.findUnique).not.toHaveBeenCalled();
      expect(prisma.invitation.updateMany).not.toHaveBeenCalled();
    },
  );
  it('rejects unpublished events', async () => {
    const { prisma, service } = setup('DRAFT');
    await expect(
      service.savePublicWish(code, { name: 'A', message: 'B' }),
    ).rejects.toThrow('Invitation not found');
    expect(prisma.invitation.updateMany).not.toHaveBeenCalled();
  });
  it('writes only the code owner and enforces atomic cooldown', async () => {
    const { prisma, service } = setup();
    expect(
      await service.savePublicWish(code, { name: 'A', message: 'B' }),
    ).toEqual({
      wish: { name: 'A', message: 'B', createdAt: expect.any(String) },
    });
    expect(prisma.invitation.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: 'invitation',
          eventId: 'event',
          event: { status: 'PUBLISHED' },
          OR: expect.any(Array),
        }),
      }),
    );
    prisma.invitation.updateMany.mockResolvedValue({ count: 0 });
    await expect(
      service.savePublicWish(code, { name: 'A', message: 'B' }),
    ).rejects.toMatchObject({ status: 429 });
  });
});
