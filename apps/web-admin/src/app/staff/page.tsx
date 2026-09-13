import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import StaffClient from "./StaffClient";

export default async function StaffPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth_token")?.value;

  if (!token) {
    redirect("/login");
  }

  return <StaffClient />;
}
