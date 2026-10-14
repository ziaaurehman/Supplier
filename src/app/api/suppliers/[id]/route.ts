import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { z } from "zod";

const updateSupplierSchema = z.object({
  name: z.string().min(1).optional(),
  language: z.enum(["de", "en"]).optional(),
  isActive: z.boolean().optional(),
  externalSupplierId: z.string().nullable().optional(),
  customerNumber: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  categoryNames: z.array(z.string()).optional(),
  contacts: z
    .array(
      z.object({
        id: z.string().optional(),
        firstName: z.string().min(1),
        lastName: z.string().min(1),
        email: z.string().email(),
        phone: z.string().optional(),
        isPrimary: z.boolean().default(false),
      })
    )
    .optional(),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireUser();
    const { id } = await params;

    const supplier = await prisma.supplier.findUnique({
      where: { id },
      include: {
        contacts: true,
        categories: { include: { category: true } },
      },
    });

    if (!supplier) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ supplier });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireUser(["ADMIN"]);
    const { id } = await params;
    const body = await request.json();
    const data = updateSupplierSchema.parse(body);

    if (data.categoryNames) {
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

      await prisma.supplierCategory.deleteMany({ where: { supplierId: id } });
      await prisma.supplierCategory.createMany({
        data: categoryIds.map((categoryId) => ({ supplierId: id, categoryId })),
      });
    }

    if (data.contacts) {
      await prisma.supplierContact.deleteMany({ where: { supplierId: id } });
      await prisma.supplierContact.createMany({
        data: data.contacts.map((c) => ({
          supplierId: id,
          firstName: c.firstName,
          lastName: c.lastName,
          email: c.email,
          phone: c.phone,
          isPrimary: c.isPrimary,
        })),
      });
    }

    const supplier = await prisma.supplier.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.language !== undefined && { language: data.language }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
        ...(data.externalSupplierId !== undefined && { externalSupplierId: data.externalSupplierId }),
        ...(data.customerNumber !== undefined && { customerNumber: data.customerNumber }),
        ...(data.notes !== undefined && { notes: data.notes }),
      },
      include: {
        contacts: true,
        categories: { include: { category: true } },
      },
    });

    return NextResponse.json({ supplier });
  } catch (e: unknown) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation error", details: e.errors }, { status: 400 });
    }
    const message = e instanceof Error ? e.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
