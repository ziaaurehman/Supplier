import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Create categories
  const categories = await Promise.all(
    [
      "Werbemittel",
      "Kleidung",
      "Socken",
      "Badeschlappen",
      "Küchenwaage",
      "Water Bottles",
      "Notebooks",
      "Bags",
      "Electronics",
    ].map((name) =>
      prisma.category.upsert({ where: { name }, update: {}, create: { name } })
    )
  );

  const catMap = Object.fromEntries(categories.map((c) => [c.name, c.id]));

  // Seed the client's real suppliers
  const suppliers = [
    {
      name: "Extern - Pakistan",
      customerNumber: "smshrs.",
      language: "de",
      contacts: [
        {
          firstName: "Moti",
          lastName: "Zia khan",
          email: "motikhan74@hotmail.com",
          phone: "+92 346 6765922",
          isPrimary: true,
        },
      ],
      categoryNames: ["Werbemittel", "Kleidung"],
    },
    {
      name: "Great Sea International. LLC",
      customerNumber: "PSI Mitglied Nr. 20706 - Smashers GmbH",
      language: "en",
      contacts: [
        {
          firstName: "Mark",
          lastName: "Deng",
          email: "Mark@gsigift.com",
          phone: "801-702-8494",
          isPrimary: true,
        },
      ],
      categoryNames: ["Werbemittel", "Kleidung"],
    },
    {
      name: "CI-Sky GmbH",
      customerNumber: "Kd.Nr. 3025 - Smashers GmbH",
      language: "de",
      contacts: [
        {
          firstName: "Max",
          lastName: "Hiss",
          email: "max@ci-sky.eu",
          phone: "+49 7633 9202681",
          isPrimary: true,
        },
      ],
      categoryNames: ["Socken", "Badeschlappen", "Werbemittel"],
    },
    {
      name: "GW Promo",
      customerNumber: "PSI-Nr. 20706 - Smashers GmbH",
      language: "de",
      contacts: [
        {
          firstName: "Suzy",
          lastName: "Wu",
          email: "suzywu@greatwallpromo.com",
          phone: null,
          isPrimary: true,
        },
      ],
      categoryNames: ["Küchenwaage", "Werbemittel"],
    },
  ];

  for (const s of suppliers) {
    const existing = await prisma.supplier.findFirst({
      where: { name: s.name },
    });

    if (existing) {
      console.log(`Skipping existing supplier: ${s.name}`);
      continue;
    }

    await prisma.supplier.create({
      data: {
        name: s.name,
        customerNumber: s.customerNumber,
        language: s.language,
        contacts: { create: s.contacts },
        categories: {
          create: s.categoryNames
            .filter((n) => catMap[n])
            .map((n) => ({ categoryId: catMap[n] })),
        },
      },
    });

    console.log(`Created supplier: ${s.name}`);
  }

  // Create a default admin user (will be linked to Supabase auth later)
  const admin = await prisma.user.upsert({
    where: { email: "admin@supplier-rfq.com" },
    update: {},
    create: {
      email: "admin@supplier-rfq.com",
      fullName: "Platform Admin",
      role: "ADMIN",
    },
  });

  console.log(`Admin user: ${admin.email}`);
  console.log("Seed complete!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
