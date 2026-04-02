import {
  index,
  pgTable,
  text,
  timestamp,
  uuid,
  integer,
  real,
  jsonb,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  /** `anonymous` = browser session cookie; legacy `internal` rows may exist from Phase 1A. */
  kind: text("kind").notNull().default("anonymous"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Durable research thread: many runs (`research_jobs`) can point at one research. */
export const researches = pgTable("researches", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id),
  topic: text("topic").notNull(),
  /** User-facing label; null = show `topic`. Does not affect rerun query semantics. */
  displayTitle: text("display_title"),
  /** Soft-hide from default History; null = active. */
  archivedAt: timestamp("archived_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [index("researches_user_id_idx").on(table.userId)]);

export const researchJobs = pgTable("research_jobs", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id),
  /** Nullable for legacy rows until backfill; new runs always set this. */
  researchId: uuid("research_id").references(() => researches.id),
  topic: text("topic").notNull(),
  status: text("status").notNull(), // queued | running | succeeded | failed
  error: text("error"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [index("research_jobs_research_id_idx").on(table.researchId)]);

export const researchSourceRuns = pgTable("research_source_runs", {
  id: uuid("id").primaryKey().defaultRandom(),
  jobId: uuid("job_id")
    .notNull()
    .references(() => researchJobs.id, { onDelete: "cascade" }),
  source: text("source").notNull(), // hn | polymarket | reddit
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
  /** `deterministic` | `openai`; null = legacy row before column existed */
  reportMode: text("report_mode"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
