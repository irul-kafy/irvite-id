import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import StaffClient from './StaffClient';

export default async function StaffManagementPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const cookieStore = await cookies();
  const token = cookieStore.get('auth_token')?.value;

  if (!token) {
    redirect('/login');
  }

  return (
    <div className="staff-management-container">
      <header className="staff-header">
        <h1>Staff Assignment</h1>
      </header>
      <main className="staff-main">
        <StaffClient eventId={eventId} />
      </main>
    </div>
  );
}
