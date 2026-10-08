import { auth } from "@/../auth";
import { getPrisma } from "@/lib/db/prisma";
import { isAdminTwoFactorSatisfied } from "@/modules/auth/admin-2fa";

export type AccessDeniedReason =
  | "AUTH_REQUIRED"
  | "ADMIN_REQUIRED"
  | "TWO_FACTOR_REQUIRED";

export class AccessDeniedError extends Error {
  constructor(
    public readonly status: 401 | 403,
    message: string,
    public readonly reason: AccessDeniedReason
  ) {
    super(message);
    this.name = "AccessDeniedError";
  }
}

export async function getPrimaryAdminUser() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return null;

  return getPrisma().user.findFirst({
    where: {
      id: userId,
      role: "ADMIN"
    },
    select: {
      id: true,
      email: true,
      name: true,
      role: true
    }
  });
}

// Page code keeps using this helper. The /admin layout enforces 2FA.
export async function getAdminUser() {
  return getPrimaryAdminUser();
}

export async function requirePrimaryAdminUser() {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    throw new AccessDeniedError(
      401,
      "Authentication required",
      "AUTH_REQUIRED"
    );
  }

  const user = await getPrisma().user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      role: true
    }
  });

  if (!user || user.role !== "ADMIN") {
    throw new AccessDeniedError(
      403,
      "Admin access required",
      "ADMIN_REQUIRED"
    );
  }

  return user;
}

export async function requireAdminUser() {
  const user = await requirePrimaryAdminUser();

  const satisfied = await isAdminTwoFactorSatisfied(
    getPrisma(),
    user.id
  );

  if (!satisfied) {
    throw new AccessDeniedError(
      403,
      "Admin two-factor authentication required",
      "TWO_FACTOR_REQUIRED"
    );
  }

  return user;
}
