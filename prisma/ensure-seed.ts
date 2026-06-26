// Boot guard: seed demo content only when the database is empty.
// Protects real data from being wiped on redeploy.
import { PrismaClient } from "@prisma/client";
import { seed } from "./seed";

const db = new PrismaClient();

async function main() {
  const users = await db.user.count();
  if (users > 0) {
    console.log(`ensure-seed: ${users} users already present — skipping seed.`);
    return;
  }
  console.log("ensure-seed: empty database — seeding starter content.");
  await seed();
}

main()
  .catch((e) => {
    console.error("ensure-seed failed (continuing to start anyway):", e);
  })
  .finally(() => db.$disconnect());
