import { auth } from "@/../auth";
import { getPrisma } from "@/lib/db/prisma";

export class UserAccessDeniedError extends Error {
  constructor(
    public readonly status: 401 | 403,
    message: string
  ) {
    super(message);
    this.name = "UserAccessDeniedError";
  }
}

export async function requireUser() {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    throw new UserAccessDeniedError(401, "Authentication required");
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

  if (!user) {
    throw new UserAccessDeniedError(401, "User not found");
  }

  return user;
}

export async function requireLawyerUser() {
  const user = await requireUser();
  const lawyer = await getPrisma().lawyer.findFirst({
    where: {
      userId: user.id,
      active: true
    },
    select: {
      id: true,
      fullName: true,
      slug: true,
      verified: true,
      active: true
    }
  });

  if (!lawyer) {
    throw new UserAccessDeniedError(
      403,
      "Linked lawyer profile required"
    );
  }

  return { user, lawyer };
}
