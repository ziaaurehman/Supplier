import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import type { UserRole } from "@prisma/client";

export async function getCurrentUser() {
  const supabase = await createClient();
  // getClaims verifies the JWT locally against the cached JWKS (ES256), avoiding an Auth server round trip per request.
  const { data, error } = await supabase.auth.getClaims();
  const authId = data?.claims?.sub;
  if (error || !authId) return null;
  const email = typeof data.claims.email === "string" ? data.claims.email : null;

  let dbUser = await prisma.user.findUnique({
    where: { authId },
  });

  if (!dbUser && email) {
    dbUser = await prisma.user.findUnique({
      where: { email },
    });
    if (dbUser && !dbUser.authId) {
      dbUser = await prisma.user.update({
        where: { id: dbUser.id },
        data: { authId },
      });
    }
  }

  if (!dbUser?.isActive) return null;
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
