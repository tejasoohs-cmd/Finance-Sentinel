import { sql } from "drizzle-orm";
import { pgTable, text, varchar, boolean, real, integer, bigint } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  displayName: text("display_name"),
  createdAt: bigint("created_at", { mode: "number" }).notNull().default(sql`extract(epoch from now()) * 1000`),
});

export const cards = pgTable("cards", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  bank: text("bank").notNull(),
  last4: text("last4").notNull(),
  type: text("type").notNull(),
  balance: real("balance"),
  creditLimit: real("credit_limit"),
  statementDate: integer("statement_date"),
  dueDate: integer("due_date"),
  color: text("color"),
});

export const categories = pgTable("categories", {
  id: varchar("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  icon: text("icon").notNull(),
  color: text("color").notNull(),
  type: text("type").notNull(),
  isCustom: boolean("is_custom").default(false),
});

export const transactions = pgTable("transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  date: text("date").notNull(),
  description: text("description").notNull(),
  originalDescription: text("original_description").notNull(),
  amount: real("amount").notNull(),
  type: text("type").notNull(),
  categoryId: text("category_id").notNull(),
  cardId: text("card_id"),
  tag: text("tag").notNull().default("none"),
  isTransferMatched: boolean("is_transfer_matched").notNull().default(false),
  transferMatchId: text("transfer_match_id"),
  transferType: text("transfer_type"),
  parentId: text("parent_id"),
  isReviewed: boolean("is_reviewed").default(false),
  notes: text("notes"),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
});

export const budgets = pgTable("budgets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  categoryId: text("category_id").notNull(),
  amount: real("amount").notNull(),
  month: text("month").notNull(),
});

export const categorizationRules = pgTable("categorization_rules", {
  id: varchar("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  keyword: text("keyword").notNull(),
  categoryId: text("category_id").notNull(),
  tag: text("tag").notNull().default("none"),
  type: text("type"),
  isExactMatch: boolean("is_exact_match").default(false),
  priority: integer("priority").default(0),
});

export const userTags = pgTable("user_tags", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  tag: text("tag").notNull(),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  displayName: true,
});

export const insertCardSchema = createInsertSchema(cards).omit({ userId: true });
export const insertCategorySchema = createInsertSchema(categories).omit({ userId: true });
export const insertTransactionSchema = createInsertSchema(transactions).omit({ userId: true });
export const insertBudgetSchema = createInsertSchema(budgets).omit({ userId: true });
export const insertRuleSchema = createInsertSchema(categorizationRules).omit({ userId: true });

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertCard = z.infer<typeof insertCardSchema>;
export type Card = typeof cards.$inferSelect;

export type InsertCategory = z.infer<typeof insertCategorySchema>;
export type Category = typeof categories.$inferSelect;

export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
export type Transaction = typeof transactions.$inferSelect;

export type InsertBudget = z.infer<typeof insertBudgetSchema>;
export type Budget = typeof budgets.$inferSelect;

export type InsertRule = z.infer<typeof insertRuleSchema>;
export type CategorizationRule = typeof categorizationRules.$inferSelect;
