import AdminShell from "../../components/admin-shell";

export default function StaffLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AdminShell>{children}</AdminShell>;
}
