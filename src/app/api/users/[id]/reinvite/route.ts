import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireUser(["ADMIN"]);
    const { id } = await params;

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    if (user.authId) {
      const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user.authId);
      if (deleteError) {
        console.error("Failed to delete old auth user:", deleteError.message);
      }
    }

    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
      user.email,
      {
        redirectTo: `${appUrl}/auth/callback?next=/auth/setup-password`,
        data: { full_name: user.fullName },
      }
    );

    if (authError) {
      return NextResponse.json({ error: `Failed to send invitation: ${authError.message}` }, { status: 500 });
    }

    if (authData.user) {
      await prisma.user.update({
        where: { id },
        data: { authId: authData.user.id },
      });
    }

    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Internal error";
    if (message === "Unauthorized" || message === "Forbidden") {
      return NextResponse.json({ error: message }, { status: 403 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
