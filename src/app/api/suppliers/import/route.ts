import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();

    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

    const text = await file.text();
    const lines = text.split("\n").filter((line) => line.trim());

    if (lines.length < 2) {
      return NextResponse.json({ error: "CSV must have a header and at least one row" }, { status: 400 });
    }

    const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
    const nameIdx = headers.indexOf("name");
    const emailIdx = headers.indexOf("email");
    const firstNameIdx = headers.indexOf("first_name");
    const lastNameIdx = headers.indexOf("last_name");
    const languageIdx = headers.indexOf("language");
    const categoriesIdx = headers.indexOf("categories");
    const phoneIdx = headers.indexOf("phone");
    const erpIdIdx = headers.indexOf("external_supplier_id");

    if (nameIdx === -1 || emailIdx === -1) {
      return NextResponse.json(
        { error: "CSV must have 'name' and 'email' columns" },
        { status: 400 }
      );
    }

    let imported = 0;
    let skipped = 0;

    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(",").map((c) => c.trim());
      const name = cols[nameIdx];
      const email = cols[emailIdx];

      if (!name || !email) { skipped++; continue; }

      const language = languageIdx >= 0 ? (cols[languageIdx] || "de") : "de";
      const categories = categoriesIdx >= 0 ? (cols[categoriesIdx] || "").split(";").filter(Boolean) : [];

      const categoryIds = await Promise.all(
        categories.map(async (catName) => {
          const cat = await prisma.category.upsert({
            where: { name: catName.trim() },
            update: {},
            create: { name: catName.trim() },
          });
          return cat.id;
        })
      );

      await prisma.supplier.create({
        data: {
          name,
          language: ["de", "en"].includes(language) ? language : "de",
          externalSupplierId: erpIdIdx >= 0 ? cols[erpIdIdx] || null : null,
          contacts: {
            create: {
              firstName: firstNameIdx >= 0 ? cols[firstNameIdx] || "Contact" : "Contact",
              lastName: lastNameIdx >= 0 ? cols[lastNameIdx] || name : name,
              email,
              phone: phoneIdx >= 0 ? cols[phoneIdx] || null : null,
              isPrimary: true,
            },
          },
          categories: {
            create: categoryIds.map((categoryId) => ({ categoryId })),
          },
        },
      });

      imported++;
    }

    return NextResponse.json({ imported, skipped });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
