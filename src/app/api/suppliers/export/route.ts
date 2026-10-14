import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

export async function GET() {
  try {
    await requireUser();

    const suppliers = await prisma.supplier.findMany({
      include: {
        contacts: { orderBy: { isPrimary: "desc" } },
        categories: { include: { category: true } },
      },
      orderBy: { name: "asc" },
    });

    const rows: string[][] = [
      [
        "Supplier Name",
        "Language",
        "Active",
        "External ID",
        "Customer Number",
        "Categories",
        "Contact First Name",
        "Contact Last Name",
        "Contact Email",
        "Contact Phone",
        "Is Primary Contact",
      ],
    ];

    for (const supplier of suppliers) {
      const categories = supplier.categories.map((sc) => sc.category.name).join("; ");
      if (supplier.contacts.length === 0) {
        rows.push([
          supplier.name,
          supplier.language,
          supplier.isActive ? "Yes" : "No",
          supplier.externalSupplierId || "",
          supplier.customerNumber || "",
          categories,
          "",
          "",
          "",
          "",
          "",
        ]);
      } else {
        for (const contact of supplier.contacts) {
          rows.push([
            supplier.name,
            supplier.language,
            supplier.isActive ? "Yes" : "No",
            supplier.externalSupplierId || "",
            supplier.customerNumber || "",
            categories,
            contact.firstName,
            contact.lastName,
            contact.email,
            contact.phone || "",
            contact.isPrimary ? "Yes" : "No",
          ]);
        }
      }
    }

    const csv = rows
      .map((row) =>
        row.map((cell) => {
          const val = String(cell);
          return val.includes(",") || val.includes('"') || val.includes("\n")
            ? `"${val.replace(/"/g, '""')}"`
            : val;
        }).join(",")
      )
      .join("\n");

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="suppliers-export.csv"`,
      },
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
