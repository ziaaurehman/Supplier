import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { z } from "zod";

const createProjectSchema = z.object({
  title: z.string().min(1),
  customerName: z.string().optional(),
  quoteDeadline: z.string().nullable().optional(),
  requestedDeliveryDate: z.string().nullable().optional(),
  internalDescription: z.string().nullable().optional(),
  items: z.array(
    z.object({
      name: z.string().min(1),
      description: z.string().nullable().optional(),
      decorationMethod: z.string().optional(),
      sortOrder: z.number().optional(),
      quantityTiers: z.array(
        z.object({
          quantity: z.number().positive(),
          sortOrder: z.number().optional(),
        })
      ).min(1),
    })
  ).min(1),
});

export async function GET(request: NextRequest) {
  try {
    const user = await requireUser();

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");

    const projects = await prisma.project.findMany({
      where: {
        ...(user.role === "FIELD_SALES" && { createdBy: user.id }),
        ...(status && { status: status as never }),
      },
      include: {
        items: { include: { quantityTiers: true } },
        rfqs: { include: { supplier: true } },
        creator: { select: { fullName: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      projects: projects.map((p) => ({
        id: p.id,
        projectNumber: p.projectNumber,
        title: p.title,
        customerReference: p.customerName,
        quoteDeadline: p.quoteDeadline,
        deliveryDate: p.requestedDeliveryDate,
        status: p.status,
        internalDescription: p.internalDescription,
        createdBy: p.creator?.fullName || null,
        items: p.items,
        rfqs: p.rfqs,
      })),
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Internal error";
    if (message === "Unauthorized") return NextResponse.json({ error: message }, { status: 401 });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser();

    const body = await request.json();
    const mapped = {
      ...body,
      customerName: body.customerName || body.customerReference || "",
      requestedDeliveryDate: body.requestedDeliveryDate || body.deliveryDate || null,
    };
    const data = createProjectSchema.parse(mapped);

    const project = await prisma.project.create({
      data: {
        title: data.title,
        customerName: data.customerName || "",
        quoteDeadline: data.quoteDeadline ? new Date(data.quoteDeadline) : new Date(Date.now() + 14 * 86400000),
        requestedDeliveryDate: data.requestedDeliveryDate
          ? new Date(data.requestedDeliveryDate)
          : undefined,
        internalDescription: data.internalDescription,
        createdBy: user.id,
        items: {
          create: data.items.map((item, i) => ({
            name: item.name,
            description: item.description,
            decorationMethod: item.decorationMethod,
            sortOrder: item.sortOrder ?? i,
            quantityTiers: {
              create: item.quantityTiers.map((qt, j) => ({
                quantity: qt.quantity,
                sortOrder: qt.sortOrder ?? j,
              })),
            },
          })),
        },
      },
      include: {
        items: { include: { quantityTiers: true } },
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "project_created",
        entityType: "project",
        entityId: project.id,
        details: { title: project.title },
      },
    });

    return NextResponse.json({ project }, { status: 201 });
  } catch (e: unknown) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation error", details: e.errors }, { status: 400 });
    }
    const message = e instanceof Error ? e.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
