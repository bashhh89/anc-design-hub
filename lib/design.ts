// Single source of truth for how the workflow vocabulary renders.
// Labels are written from the user's side of the screen — what they recognize.

import type { Status, Priority, ProjectType, Category } from "@prisma/client";

export const STATUS_ORDER: Status[] = [
  "REQUEST",
  "BRIEF",
  "IN_PROGRESS",
  "REVIEW",
  "REVISIONS",
  "APPROVED",
  "DELIVERED",
];

export const STATUS_META: Record<
  Status,
  { label: string; dot: string; tint: string; ink: string }
> = {
  REQUEST: { label: "New request", dot: "#9b9ba3", tint: "#f1f0ec", ink: "#5b5b63" },
  BRIEF: { label: "Brief in", dot: "#5a4be0", tint: "#eeebfd", ink: "#2c1f9c" },
  IN_PROGRESS: { label: "In progress", dot: "#2e7dd1", tint: "#e7f1fb", ink: "#1c5694" },
  REVIEW: { label: "In review", dot: "#c9852b", tint: "#fbf2e2", ink: "#8a5a14" },
  REVISIONS: { label: "Revisions", dot: "#d24b8f", tint: "#fbe9f2", ink: "#9a2c63" },
  APPROVED: { label: "Approved", dot: "#2fa36b", tint: "#e6f5ee", ink: "#1c6b45" },
  DELIVERED: { label: "Delivered", dot: "#16161a", tint: "#ecebe6", ink: "#16161a" },
};

export const PRIORITY_META: Record<
  Priority,
  { label: string; color: string; rank: number }
> = {
  LOW: { label: "Low", color: "#9b9ba3", rank: 0 },
  MEDIUM: { label: "Medium", color: "#2e7dd1", rank: 1 },
  HIGH: { label: "High", color: "#c9852b", rank: 2 },
  URGENT: { label: "Urgent", color: "#d24b8f", rank: 3 },
};

export const TYPE_META: Record<ProjectType, { label: string; color: string }> = {
  DEVELOPMENT: { label: "Development", color: "var(--cat-development)" },
  DESIGN: { label: "Design", color: "var(--cat-design)" },
  ENGINEERING: { label: "Engineering", color: "var(--cat-engineering)" },
  MARKETING: { label: "Marketing", color: "var(--cat-marketing)" },
  OTHER: { label: "Other", color: "var(--cat-other)" },
};

export const CATEGORY_META: Record<Category, { label: string }> = {
  INTERNAL: { label: "Internal" },
  EXTERNAL: { label: "External" },
};
