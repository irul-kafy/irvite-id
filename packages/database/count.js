const { PrismaClient } = require('@prisma/client');
async function getCount() {
  const p = new PrismaClient();
  console.log('Counts:', {
    User: await p.user.count(),
    Event: await p.event.count(),
    Template: await p.template.count(),
    Guest: await p.guest.count(),
    Invitation: await p.invitation.count(),
    Attendance: await p.attendance.count(),
    StaffEvent: await p.staffEvent.count(),
    Media: await p.media.count(),
  });
  const rootAdmin = await p.user.findFirst({
    where: { role: 'SUPER_ADMIN' },
    select: { id: true, email: true, role: true },
  });
  console.log('Root SUPER_ADMIN:', rootAdmin);
  await p.$disconnect();
}
getCount();
