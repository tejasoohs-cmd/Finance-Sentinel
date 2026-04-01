import { drizzle } from "drizzle-orm/node-postgres";
import pkg from "pg";
const { Pool } = pkg;
import { eq, and, desc } from "drizzle-orm";
import {
  users, cards, categories, transactions, budgets, categorizationRules, userTags,
  type User, type InsertUser,
  type Card, type InsertCard,
  type Category, type InsertCategory,
  type Transaction, type InsertTransaction,
  type Budget, type InsertBudget,
  type CategorizationRule, type InsertRule,
} from "@shared/schema";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzle(pool);

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  getCards(userId: string): Promise<Card[]>;
  createCard(userId: string, card: InsertCard): Promise<Card>;
  updateCard(userId: string, id: string, card: Partial<InsertCard>): Promise<Card | undefined>;
  deleteCard(userId: string, id: string): Promise<void>;

  getCategories(userId: string): Promise<Category[]>;
  upsertCategory(userId: string, category: InsertCategory): Promise<Category>;
  deleteCategory(userId: string, id: string): Promise<void>;

  getTransactions(userId: string): Promise<Transaction[]>;
  createTransaction(userId: string, tx: InsertTransaction): Promise<Transaction>;
  createTransactions(userId: string, txs: InsertTransaction[]): Promise<Transaction[]>;
  updateTransaction(userId: string, id: string, tx: Partial<InsertTransaction>): Promise<Transaction | undefined>;
  deleteTransaction(userId: string, id: string): Promise<void>;
  bulkUpdateTransactions(userId: string, ids: string[], updates: Partial<InsertTransaction>): Promise<void>;
  bulkDeleteTransactions(userId: string, ids: string[]): Promise<void>;
  linkTransactions(userId: string, id1: string, id2: string, transferType: string): Promise<void>;
  unlinkTransaction(userId: string, id: string): Promise<void>;

  getBudgets(userId: string): Promise<Budget[]>;
  upsertBudget(userId: string, budget: InsertBudget): Promise<Budget>;
  deleteBudget(userId: string, id: string): Promise<void>;

  getRules(userId: string): Promise<CategorizationRule[]>;
  upsertRule(userId: string, rule: InsertRule): Promise<CategorizationRule>;
  deleteRule(userId: string, id: string): Promise<void>;

  getTags(userId: string): Promise<string[]>;
  addTag(userId: string, tag: string): Promise<void>;
  deleteTag(userId: string, tag: string): Promise<void>;

  getAllData(userId: string): Promise<{
    transactions: Transaction[];
    cards: Card[];
    categories: Category[];
    budgets: Budget[];
    rules: CategorizationRule[];
    tags: string[];
  }>;

  syncAllData(userId: string, data: {
    transactions: InsertTransaction[];
    cards: InsertCard[];
    categories: InsertCategory[];
    budgets: InsertBudget[];
    rules: InsertRule[];
    tags: string[];
  }): Promise<void>;
}

export class DbStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values({ ...insertUser, createdAt: Date.now() }).returning();
    return user;
  }

  async getCards(userId: string): Promise<Card[]> {
    return db.select().from(cards).where(eq(cards.userId, userId));
  }

  async createCard(userId: string, card: InsertCard): Promise<Card> {
    const [created] = await db.insert(cards).values({ ...card, userId }).returning();
    return created;
  }

  async updateCard(userId: string, id: string, card: Partial<InsertCard>): Promise<Card | undefined> {
    const [updated] = await db.update(cards).set(card).where(and(eq(cards.id, id), eq(cards.userId, userId))).returning();
    return updated;
  }

  async deleteCard(userId: string, id: string): Promise<void> {
    await db.delete(cards).where(and(eq(cards.id, id), eq(cards.userId, userId)));
  }

  async getCategories(userId: string): Promise<Category[]> {
    return db.select().from(categories).where(eq(categories.userId, userId));
  }

  async upsertCategory(userId: string, category: InsertCategory): Promise<Category> {
    const [upserted] = await db.insert(categories)
      .values({ ...category, userId })
      .onConflictDoUpdate({ target: categories.id, set: { name: category.name, icon: category.icon, color: category.color, type: category.type, isCustom: category.isCustom } })
      .returning();
    return upserted;
  }

  async deleteCategory(userId: string, id: string): Promise<void> {
    await db.delete(categories).where(and(eq(categories.id, id), eq(categories.userId, userId)));
  }

  async getTransactions(userId: string): Promise<Transaction[]> {
    return db.select().from(transactions).where(eq(transactions.userId, userId)).orderBy(desc(transactions.date));
  }

  async createTransaction(userId: string, tx: InsertTransaction): Promise<Transaction> {
    const [created] = await db.insert(transactions).values({ ...tx, userId }).returning();
    return created;
  }

  async createTransactions(userId: string, txs: InsertTransaction[]): Promise<Transaction[]> {
    if (txs.length === 0) return [];
    return db.insert(transactions).values(txs.map(tx => ({ ...tx, userId }))).returning();
  }

  async updateTransaction(userId: string, id: string, tx: Partial<InsertTransaction>): Promise<Transaction | undefined> {
    const [updated] = await db.update(transactions).set(tx).where(and(eq(transactions.id, id), eq(transactions.userId, userId))).returning();
    return updated;
  }

  async deleteTransaction(userId: string, id: string): Promise<void> {
    await db.delete(transactions).where(and(eq(transactions.id, id), eq(transactions.userId, userId)));
  }

  async bulkUpdateTransactions(userId: string, ids: string[], updates: Partial<InsertTransaction>): Promise<void> {
    for (const id of ids) {
      await db.update(transactions).set(updates).where(and(eq(transactions.id, id), eq(transactions.userId, userId)));
    }
  }

  async bulkDeleteTransactions(userId: string, ids: string[]): Promise<void> {
    for (const id of ids) {
      await db.delete(transactions).where(and(eq(transactions.id, id), eq(transactions.userId, userId)));
    }
  }

  async linkTransactions(userId: string, id1: string, id2: string, transferType: string): Promise<void> {
    await db.update(transactions).set({ isTransferMatched: true, transferMatchId: id2, type: 'transfer', categoryId: 'cat_transfer', transferType }).where(and(eq(transactions.id, id1), eq(transactions.userId, userId)));
    await db.update(transactions).set({ isTransferMatched: true, transferMatchId: id1, type: 'transfer', categoryId: 'cat_transfer', transferType }).where(and(eq(transactions.id, id2), eq(transactions.userId, userId)));
  }

  async unlinkTransaction(userId: string, id: string): Promise<void> {
    const [tx] = await db.select().from(transactions).where(and(eq(transactions.id, id), eq(transactions.userId, userId)));
    if (!tx?.transferMatchId) return;
    const matchId = tx.transferMatchId;
    const revertType = (t: Transaction) => t.amount >= 0 ? 'income' : 'expense';
    await db.update(transactions).set({ isTransferMatched: false, transferMatchId: null, transferType: 'none', type: revertType(tx), categoryId: 'cat_uncategorized' } as any).where(and(eq(transactions.id, id), eq(transactions.userId, userId)));
    const [match] = await db.select().from(transactions).where(and(eq(transactions.id, matchId), eq(transactions.userId, userId)));
    if (match) {
      await db.update(transactions).set({ isTransferMatched: false, transferMatchId: null, transferType: 'none', type: revertType(match), categoryId: 'cat_uncategorized' } as any).where(and(eq(transactions.id, matchId), eq(transactions.userId, userId)));
    }
  }

  async getBudgets(userId: string): Promise<Budget[]> {
    return db.select().from(budgets).where(eq(budgets.userId, userId));
  }

  async upsertBudget(userId: string, budget: InsertBudget): Promise<Budget> {
    const id = budget.id || `bdg_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
    const [upserted] = await db.insert(budgets)
      .values({ ...budget, id, userId })
      .onConflictDoUpdate({ target: budgets.id, set: { categoryId: budget.categoryId, amount: budget.amount, month: budget.month } })
      .returning();
    return upserted;
  }

  async deleteBudget(userId: string, id: string): Promise<void> {
    await db.delete(budgets).where(and(eq(budgets.id, id), eq(budgets.userId, userId)));
  }

  async getRules(userId: string): Promise<CategorizationRule[]> {
    return db.select().from(categorizationRules).where(eq(categorizationRules.userId, userId)).orderBy(desc(categorizationRules.priority));
  }

  async upsertRule(userId: string, rule: InsertRule): Promise<CategorizationRule> {
    const [upserted] = await db.insert(categorizationRules)
      .values({ ...rule, userId })
      .onConflictDoUpdate({ target: categorizationRules.id, set: { keyword: rule.keyword, categoryId: rule.categoryId, tag: rule.tag, type: rule.type, isExactMatch: rule.isExactMatch, priority: rule.priority } })
      .returning();
    return upserted;
  }

  async deleteRule(userId: string, id: string): Promise<void> {
    await db.delete(categorizationRules).where(and(eq(categorizationRules.id, id), eq(categorizationRules.userId, userId)));
  }

  async getTags(userId: string): Promise<string[]> {
    const rows = await db.select().from(userTags).where(eq(userTags.userId, userId));
    return rows.map(r => r.tag);
  }

  async addTag(userId: string, tag: string): Promise<void> {
    await db.insert(userTags).values({ userId, tag }).onConflictDoNothing();
  }

  async deleteTag(userId: string, tag: string): Promise<void> {
    await db.delete(userTags).where(and(eq(userTags.userId, userId), eq(userTags.tag, tag)));
  }

  async getAllData(userId: string) {
    const [txs, cardList, catList, budgetList, ruleList, tagList] = await Promise.all([
      this.getTransactions(userId),
      this.getCards(userId),
      this.getCategories(userId),
      this.getBudgets(userId),
      this.getRules(userId),
      this.getTags(userId),
    ]);
    return { transactions: txs, cards: cardList, categories: catList, budgets: budgetList, rules: ruleList, tags: tagList };
  }

  async syncAllData(userId: string, data: {
    transactions: InsertTransaction[];
    cards: InsertCard[];
    categories: InsertCategory[];
    budgets: InsertBudget[];
    rules: InsertRule[];
    tags: string[];
  }): Promise<void> {
    await db.delete(transactions).where(eq(transactions.userId, userId));
    await db.delete(cards).where(eq(cards.userId, userId));
    await db.delete(categories).where(eq(categories.userId, userId));
    await db.delete(budgets).where(eq(budgets.userId, userId));
    await db.delete(categorizationRules).where(eq(categorizationRules.userId, userId));
    await db.delete(userTags).where(eq(userTags.userId, userId));

    if (data.cards.length > 0) await db.insert(cards).values(data.cards.map(c => ({ ...c, userId })));
    if (data.categories.length > 0) await db.insert(categories).values(data.categories.map(c => ({ ...c, userId })));
    if (data.transactions.length > 0) await db.insert(transactions).values(data.transactions.map(t => ({ ...t, userId })));
    if (data.budgets.length > 0) {
      await db.insert(budgets).values(data.budgets.map(b => ({ ...b, id: b.id || `bdg_${Date.now()}_${Math.random()}`, userId })));
    }
    if (data.rules.length > 0) await db.insert(categorizationRules).values(data.rules.map(r => ({ ...r, userId })));
    for (const tag of data.tags) {
      await db.insert(userTags).values({ userId, tag }).onConflictDoNothing();
    }
  }
}

export const storage = new DbStorage();
