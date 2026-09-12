import AdminShell from '../../components/admin-shell';

export default function TemplatesLayout({ children }: { children: React.ReactNode }) {
  return <AdminShell>{children}</AdminShell>;
}
