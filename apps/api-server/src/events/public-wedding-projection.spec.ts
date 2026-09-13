/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { EventsService } from './events.service';
import { InvitationsService } from '../invitations/invitations.service';
import { PublicInvitationAccessService } from '../invitations/public-invitation-access.service';
import { PrismaService } from '../database/prisma.service';

describe('Public wedding resolver integration', () => {
  it('projects identical content, gift and wishes from both public routes', async () => {
    const event = {
      id: 'event',
      title: 'A & B',
      description: null,
      eventDate: new Date(Date.now() + 86400000),
      locationDetails: 'Garden',
      slug: 'garden',
      status: 'PUBLISHED',
      template: null,
      content: {
        partnerOneName: 'A',
        giftQrMediaId: 'gift',
        galleryMediaIds: ['photo'],
      },
      invitations: [
        {
          wishName: 'Guest',
          wishMessage: 'Best wishes',
          wishedAt: new Date('2026-09-01T00:00:00Z'),
        },
      ],
    };
    const media = [
      { id: 'gift', type: 'PHOTO', order: 1 },
      { id: 'photo', type: 'PHOTO', order: 2 },
    ];
    const prisma = {
      event: { findUnique: jest.fn().mockResolvedValue(event) },
      media: { findMany: jest.fn().mockResolvedValue(media) },
      invitation: {
        findUnique: jest.fn().mockResolvedValue({
          event,
          guest: { name: 'Guest', maxPax: 1, customGreeting: null },
          customMessage: null,
          status: 'PENDING',
          rsvpPax: null,
        }),
      },
    };
    const db = prisma as unknown as PrismaService;
    const access = {
      getEligibleContext: jest.fn().mockResolvedValue({
        invitationId: 'invite',
        eventId: 'event',
        eventDate: event.eventDate,
      }),
    } as unknown as PublicInvitationAccessService;
    const generic = await new EventsService(db).resolvePublic('garden');
    const personal = await new InvitationsService(db, access).resolvePublic(
      'abcdefghijklmnopqrstuv',
    );
    for (const result of [generic, personal]) {
      expect(result.event.content).toEqual({ partnerOneName: 'A' });
      expect(result.event.wishes).toEqual([
        {
          name: 'Guest',
          message: 'Best wishes',
          createdAt: '2026-09-01T00:00:00.000Z',
        },
      ]);
      expect(result.media).toHaveLength(1);
      expect(result.media[0].src).toMatch(/\/photo$/);
      expect(result.event.giftQr?.src).toMatch(/\/gift$/);
    }
    expect(generic.event.giftQr?.src).toBe('/events/public/garden/media/gift');
    expect(personal.event.giftQr?.src).toBe(
      '/invitations/public/abcdefghijklmnopqrstuv/media/gift',
    );
    // A replacement uploaded later must retain the first slot selected by admin.
    event.content.galleryMediaIds = ['replacement', 'photo'];
    media.push(
      { id: 'replacement', type: 'PHOTO', order: 99 },
      { id: 'audio', type: 'AUDIO', order: 25 },
    );
    const replacedResults = await Promise.all([
      new EventsService(db).resolvePublic('garden'),
      new InvitationsService(db, access).resolvePublic(
        'abcdefghijklmnopqrstuv',
      ),
    ]);
    for (const result of replacedResults) {
      expect(
        result.media
          .filter((item) => item.type === 'PHOTO')
          .sort((a, b) => a.order - b.order)
          .map((item) => item.src.split('/').pop()),
      ).toEqual(['replacement', 'photo']);
      expect(result.media.find((item) => item.type === 'AUDIO')?.order).toBe(
        25,
      );
    }
    expect(prisma.event.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        select: expect.objectContaining({
          invitations: expect.objectContaining({ take: 20 }),
        }),
      }),
    );
  });
});
