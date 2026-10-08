import { redirect } from "next/navigation";
import { getPrimaryAdminUser } from "@/lib/auth/admin";
import { getPrisma } from "@/lib/db/prisma";
import { isAdminTwoFactorSatisfied } from "@/modules/auth/admin-2fa";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children
}: {
  children: React.ReactNode;
}) {
  const admin = await getPrimaryAdminUser();

  if (!admin) {
    redirect("/api/auth/signin?callbackUrl=/admin");
  }

  const secondFactorSatisfied =
    await isAdminTwoFactorSatisfied(
      getPrisma(),
      admin.id
    );

  if (!secondFactorSatisfied) {
    redirect("/admin-2fa?callbackUrl=/admin");
  }

  return children;
}
