// V1 session model. Single-tenant ANC internal tool — current user resolves to
// the seeded admin. V3 swaps this for Microsoft login (pluggable, config-only).
import { db } from "./db";

export async function currentUser() {
  const user = await db.user.findFirst({ orderBy: { createdAt: "asc" } });
  return user;
}
