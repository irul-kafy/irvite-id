import test from 'node:test';
import assert from 'node:assert';
import { POST as EventPost } from './route';
import { PATCH as EventPatch } from './[eventId]/route';
import { POST as GuestPost } from './[eventId]/guests/route';
import { PATCH as GuestPatch } from './[eventId]/guests/[guestId]/route';
import { POST as InvitationPost } from './[eventId]/guests/[guestId]/invitation/route';

test('BFF Origin Rejection', async (t) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-function-type
  const checkOrigin = async (handler: any, params?: Record<string, unknown>) => {
    const req = new Request('http://localhost/api/test', {
      method: handler === EventPatch || handler === GuestPatch ? 'PATCH' : 'POST',
      headers: {
        'origin': 'http://evil.com',
        'content-type': 'application/json'
      }
    });
    const res = await handler(req, { params: Promise.resolve(params) });
    assert.strictEqual(res.status, 403);
    const data = await res.json();
    assert.strictEqual(data.message, 'Forbidden');
  };

  await t.test('Event POST rejects invalid origin', async () => checkOrigin(EventPost));
  await t.test('Event PATCH rejects invalid origin', async () => checkOrigin(EventPatch, { eventId: '1' }));
  await t.test('Guest POST rejects invalid origin', async () => checkOrigin(GuestPost, { eventId: '1' }));
  await t.test('Guest PATCH rejects invalid origin', async () => checkOrigin(GuestPatch, { eventId: '1', guestId: '2' }));
  await t.test('Invitation POST rejects invalid origin', async () => checkOrigin(InvitationPost, { eventId: '1', guestId: '2' }));
});
