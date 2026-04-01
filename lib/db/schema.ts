import {
  pgTable,
  text,
  timestamp,
  uuid,
  integer,
  real,
  jsonb,
} from "drizzle-orm/pg-core";

/** Phase 1A: single internal user row; Phase 1B will add anonymous cookie-linked rows. */
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  /** 'internal' = Phase 1A dev owner; 'anonymous' reserved for cookie sessions */
  kind: text("kind").notNull().default("internal"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const researchJobs = pgTable("research_jobs", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id),
  topic: text("topic").notNull(),
  status: text("status").notNull(), // queued | running | succeeded | failed
  error: text("error"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const researchSourceRuns = pgTable("research_source_runs", {
  id: uuid("id").primaryKey().defaultRandom(),
  jobId: uuid("job_id")
    .notNull()
    .references(() => researchJobs.id, { onDelete: "cascade" }),
  source: text("source").notNull(), // hn | polymarket
  status: text("status").notNull(), // succeeded | failed
  error: text("error"),
  itemCount: integer("item_count").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const researchItems = pgTable("research_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  jobId: uuid("job_id")
    .notNull()
    .references(() => researchJobs.id, { onDelete: "cascade" }),
  source: text("source").notNull(),
  title: text("title").notNull(),
  url: text("url").notNull(),
  snippet: text("snippet").notNull(),
  score: real("score").notNull(),
  raw: jsonb("raw"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const reports = pgTable("reports", {
  id: uuid("id").primaryKey().defaultRandom(),
  jobId: uuid("job_id")
    .notNull()
    .unique()
    .references(() => researchJobs.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
