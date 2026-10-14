import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import type { UserRole } from "@prisma/client";

export async function getCurrentUser() {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) return null;

  let dbUser = await prisma.user.findUnique({
    where: { authId: authUser.id },
  });

  if (!dbUser) {
    dbUser = await prisma.user.findUnique({
      where: { email: authUser.email! },
    });
    if (dbUser && !dbUser.authId) {
      dbUser = await prisma.user.update({
        where: { id: dbUser.id },
        data: { authId: authUser.id },
      });
    }
  }

  return dbUser;
}

export async function requireUser(allowedRoles?: UserRole[]) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    throw new Error("Forbidden");
  }
  return user;
}

export async function requireAdmin() {
  return requireUser(["ADMIN"]);
}
