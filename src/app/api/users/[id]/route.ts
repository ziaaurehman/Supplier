import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { z } from "zod";

const updateUserSchema = z.object({
  fullName: z.string().min(1).optional(),
  role: z.enum(["ADMIN", "INTERNAL_SALES", "FIELD_SALES"]).optional(),
  isActive: z.boolean().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireUser(["ADMIN"]);
    const { id } = await params;

    const body = await request.json();
    const data = updateUserSchema.parse(body);

    const user = await prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ user });
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
