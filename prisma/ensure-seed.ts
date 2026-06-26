// Boot guard:
//  - seed demo content only when the database is empty (protects real data)
//  - guarantee the real ANC roster + admin roles on every boot (idempotent)
import { PrismaClient } from "@prisma/client";
import { seed, ROSTER } from "./seed";

const db = new PrismaClient();

async function ensureRoster() {
  for (const r of ROSTER) {
    await db.user.upsert({
      where: { email: r.email },
      update: { name: r.name, role: r.role as any, color: r.color },
      create: { email: r.email, name: r.name, role: r.role as any, color: r.color },
    });
  }
  console.log("ensure-seed: roster guaranteed —", ROSTER.length, "people");
}

async function main() {
  const users = await db.user.count();
  if (users === 0) {
    console.log("ensure-seed: empty database — seeding starter content.");
    await seed();
  } else {
    console.log(`ensure-seed: ${users} users present — skipping demo seed.`);
  }
  await ensureRoster();
}

main()
  .catch((e) => console.error("ensure-seed failed (continuing to start anyway):", e))
  .finally(() => db.$disconnect());
