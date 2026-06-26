// Boot guard: seed demo content only when the database is empty.
// Protects real data from being wiped on redeploy.
import { PrismaClient } from "@prisma/client";
import { seed } from "./seed";

const db = new PrismaClient();

// Admins who may delete/archive (Daniel + Charlie). Upserted on every boot so an
// already-seeded database picks up role changes without a manual migration.
const ADMINS = [
  { email: "daniel@leda.design", name: "Daniel Croci", color: "#5a4be0" },
  { email: "charlie@ancsports.net", name: "Charlie Dinh", color: "#c9852b" },
];

async function ensureAdmins() {
  for (const a of ADMINS) {
    await db.user.upsert({
      where: { email: a.email },
      update: { role: "ADMIN" },
      create: { email: a.email, name: a.name, color: a.color, role: "ADMIN" },
    });
  }
  console.log("ensure-seed: admins guaranteed —", ADMINS.map((a) => a.name).join(", "));
}

async function main() {
  const users = await db.user.count();
  if (users === 0) {
    console.log("ensure-seed: empty database — seeding starter content.");
    await seed();
  } else {
    console.log(`ensure-seed: ${users} users present — skipping demo seed.`);
  }
  await ensureAdmins();
}

main()
  .catch((e) => {
    console.error("ensure-seed failed (continuing to start anyway):", e);
  })
  .finally(() => db.$disconnect());
