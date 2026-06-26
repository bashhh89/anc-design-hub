// V1 session model. No real login yet (Microsoft sign-in lands in V3), so the
// "current user" resolves from a cookie set by the Viewing-as switcher, falling
// back to the first seeded admin. This makes the role/permission model real and
// demonstrable today, and swaps cleanly for SSO later (config-only).
import { cookies } from "next/headers";
import { db } from "./db";
import type { User } from "@prisma/client";

export async function currentUser(): Promise<User | null> {
  const id = cookies().get("dh_user")?.value;
  if (id) {
    const u = await db.user.findUnique({ where: { id } });
    if (u) return u;
  }
  return db.user.findFirst({ orderBy: { createdAt: "asc" } });
}

export function isAdmin(user: { role: string } | null | undefined) {
  return user?.role === "ADMIN";
}

export function listUsers() {
  return db.user.findMany({ orderBy: [{ role: "asc" }, { name: "asc" }] });
}
