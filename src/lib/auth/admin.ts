import { auth } from "@/../auth";
import { getPrisma } from "@/lib/db/prisma";

export class AccessDeniedError extends Error {
  constructor(
    public readonly status: 401 | 403,
    message: string
  ) {
    super(message);
    this.name = "AccessDeniedError";
  }
}

export async function getAdminUser() {
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

export async function requireAdminUser() {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    throw new AccessDeniedError(401, "Authentication required");
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
    throw new AccessDeniedError(403, "Admin access required");
  }

  return user;
}
