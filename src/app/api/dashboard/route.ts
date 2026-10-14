import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

export async function GET() {
  try {
    const user = await requireUser();

    const whereClause = user.role === "FIELD_SALES" ? { createdBy: user.id } : {};

    const [totalProjects, activeRfqs, quotesReceived, recentActivity] = await Promise.all([
      prisma.project.count({ where: whereClause }),
      prisma.rfq.count({
        where: {
          status: { in: ["sent", "opened"] },
          ...(user.role === "FIELD_SALES" ? { project: { createdBy: user.id } } : {}),
        },
      }),
      prisma.quote.count({
        where: user.role === "FIELD_SALES"
          ? { rfq: { project: { createdBy: user.id } } }
          : {},
      }),
      prisma.auditLog.findMany({
        take: 20,
        orderBy: { createdAt: "desc" },
        include: { user: { select: { fullName: true, email: true } } },
      }),
    ]);

    return NextResponse.json({
      totalProjects,
      activeRfqs,
      quotesReceived,
      recentActivity: recentActivity.map((a) => ({
        id: a.id,
        action: a.action,
        entityType: a.entityType,
        entityId: a.entityId,
        details: a.details,
        userName: a.user?.fullName || a.user?.email || "System",
        createdAt: a.createdAt,
      })),
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
