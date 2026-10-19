import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { z } from "zod";

export async function GET() {
  try {
    await requireUser(["ADMIN"]);

    const [users, authResult] = await Promise.all([
      prisma.user.findMany({
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          email: true,
          fullName: true,
          role: true,
          isActive: true,
          authId: true,
          createdAt: true,
        },
      }),
      supabaseAdmin.auth.admin.listUsers({ perPage: 1000 }),
    ]);

    const signedInAuthIds = new Set(
      (authResult.data?.users || []).filter((u) => u.last_sign_in_at).map((u) => u.id)
    );

    return NextResponse.json({
      users: users.map(({ authId, ...u }) => ({
        ...u,
        invitePending: !authId || !signedInAuthIds.has(authId),
      })),
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Internal error";
    if (message === "Unauthorized" || message === "Forbidden") {
      return NextResponse.json({ error: message }, { status: 403 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

const createUserSchema = z.object({
  email: z.string().email(),
  fullName: z.string().min(1),
  role: z.enum(["ADMIN", "INTERNAL_SALES", "FIELD_SALES"]),
});

export async function POST(request: NextRequest) {
  try {
    const currentUser = await requireUser(["ADMIN"]);

    const body = await request.json();
    const data = createUserSchema.parse(body);

    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) {
      return NextResponse.json({ error: "A user with this email already exists" }, { status: 409 });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
      data.email,
      {
        redirectTo: `${appUrl}/auth/callback?next=/auth/setup-password`,
        data: { full_name: data.fullName },
      }
    );

    if (authError) {
      return NextResponse.json({ error: `Failed to send invitation: ${authError.message}` }, { status: 500 });
    }

    const user = await prisma.user.create({
      data: {
        email: data.email,
        fullName: data.fullName,
        role: data.role,
        authId: authData.user?.id || null,
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });

    await prisma.auditLog.create({
      data: {
        action: "user_created",
        entityType: "user",
        entityId: user.id,
        userId: currentUser.id,
        details: { email: user.email, role: user.role },
      },
    });

    return NextResponse.json({ user }, { status: 201 });
  } catch (e: unknown) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation error", details: e.errors }, { status: 400 });
    }
    const message = e instanceof Error ? e.message : "Internal error";
    if (message === "Unauthorized" || message === "Forbidden") {
      return NextResponse.json({ error: message }, { status: 403 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
