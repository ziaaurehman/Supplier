import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { z } from "zod";

const createSupplierSchema = z.object({
  name: z.string().min(1),
  language: z.enum(["de", "en"]).default("de"),
  externalSupplierId: z.string().optional(),
  customerNumber: z.string().optional(),
  notes: z.string().optional(),
  categoryNames: z.array(z.string()).default([]),
  contacts: z.array(
    z.object({
      firstName: z.string().min(1),
      lastName: z.string().min(1),
      email: z.string().email(),
      phone: z.string().nullable().optional(),
      isPrimary: z.boolean().default(false),
    })
  ).min(1),
});

export async function GET(request: NextRequest) {
  try {
    await requireUser();

    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    const search = searchParams.get("search");
    const activeOnly = searchParams.get("active") !== "false";

    const suppliers = await prisma.supplier.findMany({
      where: {
        ...(activeOnly && { isActive: true }),
        ...(search && {
          name: { contains: search, mode: "insensitive" as const },
        }),
        ...(category && {
          categories: {
            some: { category: { name: { equals: category, mode: "insensitive" as const } } },
          },
        }),
      },
      include: {
        contacts: true,
        categories: { include: { category: true } },
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ suppliers });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Internal error";
    if (message === "Unauthorized") return NextResponse.json({ error: message }, { status: 401 });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireUser(["ADMIN"]);

    const body = await request.json();
    const data = createSupplierSchema.parse(body);

    const categoryIds = await Promise.all(
      data.categoryNames.map(async (name) => {
        const cat = await prisma.category.upsert({
          where: { name },
          update: {},
          create: { name },
        });
        return cat.id;
      })
    );

    const supplier = await prisma.supplier.create({
      data: {
        name: data.name,
        language: data.language,
        externalSupplierId: data.externalSupplierId,
        customerNumber: data.customerNumber,
        notes: data.notes,
        contacts: {
          create: data.contacts,
        },
        categories: {
          create: categoryIds.map((categoryId) => ({ categoryId })),
        },
      },
      include: {
        contacts: true,
        categories: { include: { category: true } },
      },
    });

    return NextResponse.json({ supplier }, { status: 201 });
  } catch (e: unknown) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation error", details: e.errors }, { status: 400 });
    }
    const message = e instanceof Error ? e.message : "Internal error";
    if (message === "Unauthorized" || message === "Forbidden") {
      return NextResponse.json({ error: message }, { status: message === "Unauthorized" ? 401 : 403 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
