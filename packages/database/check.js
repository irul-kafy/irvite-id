const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  console.log('User:', await prisma.user.count());
  console.log('SUPER_ADMIN:', await prisma.user.count({ where: { role: 'SUPER_ADMIN' } }));
  console.log('ADMIN:', await prisma.user.count({ where: { role: 'ADMIN' } }));
  console.log('STAFF:', await prisma.user.count({ where: { role: 'STAFF' } }));
  console.log('Event:', await prisma.event.count());
  console.log('Guest:', await prisma.guest.count());
  console.log('Invitation:', await prisma.invitation.count());
  console.log('Attendance:', await prisma.attendance.count());
  console.log('Template:', await prisma.template.count());
  console.log('Media:', await prisma.media.count());
  console.log('Root isActive:', (await prisma.user.findFirst({ where: { role: 'SUPER_ADMIN' } })).isActive);
}
main().then(() => prisma.$disconnect()).catch(console.error);
