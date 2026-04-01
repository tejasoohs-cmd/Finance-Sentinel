import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import session from "express-session";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { scrypt, randomBytes, timingSafeEqual, randomUUID } from "crypto";
import { promisify } from "util";
import connectPgSimple from "connect-pg-simple";
import { storage } from "./storage";
import { DEFAULT_CATEGORIES, DEFAULT_RULES } from "./defaults";

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePassword(supplied: string, stored: string): Promise<boolean> {
  const [hashedPassword, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashedPassword, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (req.isAuthenticated()) return next();
  res.status(401).json({ message: "Not authenticated" });
}

export async function registerRoutes(httpServer: Server, app: Express): Promise<Server> {
  const PgSession = connectPgSimple(session);

  app.use(session({
    store: new PgSession({
      conString: process.env.DATABASE_URL,
      tableName: "session",
      createTableIfMissing: true,
    }),
    secret: process.env.SESSION_SECRET || "moneytrace-secret-key-2024",
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false, maxAge: 30 * 24 * 60 * 60 * 1000 },
  }));

  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(new LocalStrategy(async (username, password, done) => {
    try {
      const user = await storage.getUserByUsername(username);
      if (!user) return done(null, false, { message: "Invalid username or password" });
      const valid = await comparePassword(password, user.password);
      if (!valid) return done(null, false, { message: "Invalid username or password" });
      return done(null, user);
    } catch (err) {
      return done(err);
    }
  }));

  passport.serializeUser((user: any, done) => done(null, user.id));
  passport.deserializeUser(async (id: string, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user || false);
    } catch (err) {
      done(err);
    }
  });

  // Auth routes
  app.post("/api/auth/register", async (req, res) => {
    try {
      const { username, password, displayName } = req.body;
      if (!username || !password) return res.status(400).json({ message: "Username and password required" });
      if (username.length < 3) return res.status(400).json({ message: "Username must be at least 3 characters" });
      if (password.length < 6) return res.status(400).json({ message: "Password must be at least 6 characters" });

      const existing = await storage.getUserByUsername(username);
      if (existing) return res.status(409).json({ message: "Username already taken" });

      const hashed = await hashPassword(password);
      const user = await storage.createUser({ username, password: hashed, displayName: displayName || username });

      // Seed default categories and rules for new users
      for (const cat of DEFAULT_CATEGORIES) {
        await storage.upsertCategory(user.id, { id: cat.id, name: cat.name, icon: cat.icon, color: cat.color, type: cat.type, isCustom: cat.isCustom || false });
      }
      for (const rule of DEFAULT_RULES) {
        // Use generated UUIDs — static template IDs are global PKs that collide across users
        await storage.upsertRule(user.id, {
          id: randomUUID(),
          keyword: rule.keyword,
          categoryId: rule.categoryId,
          tag: rule.tag || 'none',
          type: rule.type || null,
          isExactMatch: rule.isExactMatch || false,
          priority: 0,
        });
      }
      await storage.addTag(user.id, 'none');
      await storage.addTag(user.id, 'personal');
      await storage.addTag(user.id, 'business');

      req.login(user, (err) => {
        if (err) return res.status(500).json({ message: "Login failed after registration" });
        const { password: _, ...safeUser } = user;
        res.status(201).json(safeUser);
      });
    } catch (err: any) {
      console.error("Register error:", err);
      res.status(500).json({ message: "Registration failed" });
    }
  });

  app.post("/api/auth/login", (req, res, next) => {
    passport.authenticate("local", (err: any, user: any, info: any) => {
      if (err) return next(err);
      if (!user) return res.status(401).json({ message: info?.message || "Invalid credentials" });
      req.login(user, (err) => {
        if (err) return next(err);
        const { password: _, ...safeUser } = user;
        res.json(safeUser);
      });
    })(req, res, next);
  });

  app.post("/api/auth/logout", (req, res) => {
    req.logout(() => res.json({ message: "Logged out" }));
  });

  app.get("/api/auth/me", (req, res) => {
    if (!req.isAuthenticated() || !req.user) return res.status(401).json({ message: "Not authenticated" });
    const user = req.user as any;
    const { password: _, ...safeUser } = user;
    res.json(safeUser);
  });

  // Update profile (displayName)
  app.patch("/api/auth/profile", requireAuth, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const { displayName } = req.body;
      if (!displayName || displayName.trim().length < 1) {
        return res.status(400).json({ message: "Display name cannot be empty" });
      }
      const updated = await storage.updateUser(userId, { displayName: displayName.trim() });
      if (!updated) return res.status(404).json({ message: "User not found" });
      const { password: _, ...safeUser } = updated;
      res.json(safeUser);
    } catch (err) {
      res.status(500).json({ message: "Failed to update profile" });
    }
  });

  // Change password (requires current password)
  app.post("/api/auth/change-password", requireAuth, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const { currentPassword, newPassword } = req.body;
      if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: "Current and new password are required" });
      }
      if (newPassword.length < 6) {
        return res.status(400).json({ message: "New password must be at least 6 characters" });
      }
      const user = await storage.getUser(userId);
      if (!user) return res.status(404).json({ message: "User not found" });
      const valid = await comparePassword(currentPassword, user.password);
      if (!valid) return res.status(400).json({ message: "Current password is incorrect" });
      const hashed = await hashPassword(newPassword);
      await storage.updateUserPassword(userId, hashed);
      res.json({ message: "Password changed successfully" });
    } catch (err) {
      res.status(500).json({ message: "Failed to change password" });
    }
  });

  // Forgot password — generates a one-time reset token (shown on screen, no email needed)
  app.post("/api/auth/forgot-password", async (req, res) => {
    try {
      const { username } = req.body;
      if (!username) return res.status(400).json({ message: "Username is required" });
      const user = await storage.getUserByUsername(username);
      // Always return success to avoid user enumeration
      if (!user) return res.json({ message: "If that account exists, a reset token has been generated." });
      const token = randomBytes(24).toString("hex");
      const expiresAt = Date.now() + 60 * 60 * 1000; // 1 hour
      await storage.createResetToken(user.id, token, expiresAt);
      // Return token directly since no email system
      res.json({ token, expiresAt, message: "Copy this token — it expires in 1 hour." });
    } catch (err) {
      res.status(500).json({ message: "Failed to generate reset token" });
    }
  });

  // Reset password using a reset token
  app.post("/api/auth/reset-password", async (req, res) => {
    try {
      const { token, newPassword } = req.body;
      if (!token || !newPassword) {
        return res.status(400).json({ message: "Token and new password are required" });
      }
      if (newPassword.length < 6) {
        return res.status(400).json({ message: "Password must be at least 6 characters" });
      }
      const resetRow = await storage.getResetToken(token);
      if (!resetRow) return res.status(400).json({ message: "Invalid or expired reset token" });
      if (resetRow.usedAt) return res.status(400).json({ message: "Reset token has already been used" });
      if (Date.now() > resetRow.expiresAt) return res.status(400).json({ message: "Reset token has expired" });
      const hashed = await hashPassword(newPassword);
      await storage.updateUserPassword(resetRow.userId, hashed);
      await storage.markResetTokenUsed(token);
      res.json({ message: "Password reset successfully. You can now log in." });
    } catch (err) {
      res.status(500).json({ message: "Failed to reset password" });
    }
  });

  // Sync - get all data for logged in user
  app.get("/api/sync", requireAuth, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const data = await storage.getAllData(userId);
      // Auto-seed defaults for users created before seeding was added
      if (data.categories.length === 0) {
        for (const cat of DEFAULT_CATEGORIES) {
          await storage.upsertCategory(userId, {
            id: cat.id, name: cat.name, icon: cat.icon,
            color: cat.color, type: cat.type, isCustom: cat.isCustom || false,
          });
        }
        data.categories = await storage.getCategories(userId);
      }
      if (data.rules.length === 0) {
        // Use generated UUIDs — static template IDs like "rule_groc_1" are global PKs
        // and may already be owned by another user, so we never reuse them.
        for (const rule of DEFAULT_RULES) {
          await storage.upsertRule(userId, {
            id: randomUUID(),
            keyword: rule.keyword,
            categoryId: rule.categoryId,
            tag: rule.tag || 'none',
            type: (rule as any).type || null,
            isExactMatch: false,
            priority: 0,
            isEnabled: true,
          });
        }
        data.rules = await storage.getRules(userId);
      }
      res.json(data);
    } catch (err) {
      console.error('[sync] Error loading data:', err);
      res.status(500).json({ message: "Failed to load data" });
    }
  });

  // Push all local data to server (initial migration from localStorage)
  app.post("/api/sync/push", requireAuth, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const { transactions, cards, categories, budgets, rules, tags } = req.body;
      await storage.syncAllData(userId, { transactions: transactions || [], cards: cards || [], categories: categories || [], budgets: budgets || [], rules: rules || [], tags: tags || [] });
      res.json({ message: "Data synced" });
    } catch (err: any) {
      console.error("Sync push error:", err);
      res.status(500).json({ message: "Sync failed" });
    }
  });

  // Cards
  app.get("/api/cards", requireAuth, async (req, res) => {
    const cards = await storage.getCards((req.user as any).id);
    res.json(cards);
  });

  app.post("/api/cards", requireAuth, async (req, res) => {
    try {
      const card = await storage.createCard((req.user as any).id, req.body);
      res.status(201).json(card);
    } catch (err) {
      res.status(500).json({ message: "Failed to create card" });
    }
  });

  app.patch("/api/cards/:id", requireAuth, async (req, res) => {
    const card = await storage.updateCard((req.user as any).id, req.params.id, req.body);
    if (!card) return res.status(404).json({ message: "Card not found" });
    res.json(card);
  });

  app.delete("/api/cards/:id", requireAuth, async (req, res) => {
    await storage.deleteCard((req.user as any).id, req.params.id);
    res.json({ message: "Deleted" });
  });

  // Categories
  app.get("/api/categories", requireAuth, async (req, res) => {
    const cats = await storage.getCategories((req.user as any).id);
    res.json(cats);
  });

  app.post("/api/categories", requireAuth, async (req, res) => {
    try {
      const cat = await storage.upsertCategory((req.user as any).id, req.body);
      res.status(201).json(cat);
    } catch (err) {
      res.status(500).json({ message: "Failed to create category" });
    }
  });

  app.patch("/api/categories/:id", requireAuth, async (req, res) => {
    try {
      const cat = await storage.upsertCategory((req.user as any).id, { ...req.body, id: req.params.id });
      res.json(cat);
    } catch (err) {
      res.status(500).json({ message: "Failed to update category" });
    }
  });

  app.delete("/api/categories/:id", requireAuth, async (req, res) => {
    await storage.deleteCategory((req.user as any).id, req.params.id);
    res.json({ message: "Deleted" });
  });

  // Transactions
  app.get("/api/transactions", requireAuth, async (req, res) => {
    const txs = await storage.getTransactions((req.user as any).id);
    res.json(txs);
  });

  app.post("/api/transactions", requireAuth, async (req, res) => {
    try {
      const tx = await storage.createTransaction((req.user as any).id, req.body);
      res.status(201).json(tx);
    } catch (err) {
      res.status(500).json({ message: "Failed to create transaction" });
    }
  });

  app.post("/api/transactions/import", requireAuth, async (req, res) => {
    try {
      const { transactions: txs } = req.body;
      if (!Array.isArray(txs) || txs.length === 0) {
        return res.status(400).json({ message: "No transactions provided" });
      }
      // Sanitize and validate each transaction before hitting the DB
      const sanitized = txs.map((tx: any) => {
        const row: Record<string, any> = {};
        // Required fields — fall back to safe defaults rather than letting nulls hit NOT NULL columns
        row.id          = tx.id || randomUUID();
        row.date        = typeof tx.date === 'string' && tx.date ? tx.date : new Date().toISOString().split('T')[0];
        row.description = typeof tx.description === 'string' && tx.description ? tx.description : 'Unknown';
        row.originalDescription = typeof tx.originalDescription === 'string' && tx.originalDescription
          ? tx.originalDescription : row.description;
        row.amount      = typeof tx.amount === 'number' && isFinite(tx.amount) ? tx.amount : 0;
        row.type        = ['expense', 'income', 'transfer'].includes(tx.type) ? tx.type : (row.amount >= 0 ? 'income' : 'expense');
        row.categoryId  = typeof tx.categoryId === 'string' && tx.categoryId ? tx.categoryId : 'cat_uncategorized';
        row.tag         = typeof tx.tag === 'string' && tx.tag ? tx.tag : 'none';
        row.createdAt   = typeof tx.createdAt === 'number' ? tx.createdAt : Date.now();
        // Optional / nullable fields
        row.cardId            = typeof tx.cardId === 'string' && tx.cardId ? tx.cardId : null;
        row.isTransferMatched = tx.isTransferMatched === true;
        row.transferMatchId   = tx.transferMatchId || null;
        row.transferType      = tx.transferType || null;
        row.parentId          = tx.parentId || null;
        row.isReviewed        = tx.isReviewed === true;
        row.notes             = typeof tx.notes === 'string' && tx.notes ? tx.notes : null;
        return row;
      });
      console.log(`[import] Attempting to insert ${sanitized.length} transactions for user ${(req.user as any).id}`);
      if (sanitized.length > 0) {
        const s = sanitized[0];
        console.log(`[import] Sample row: date="${s.date}" desc="${String(s.description).slice(0,40)}" amount=${s.amount} type="${s.type}" cardId="${s.cardId}" tag="${s.tag}"`);
      }
      const created = await storage.createTransactions((req.user as any).id, sanitized as any);
      console.log(`[import] Inserted ${created.length} transactions (${sanitized.length - created.length} skipped as duplicates)`);
      res.status(201).json(created);
    } catch (err: any) {
      console.error('[import] Failed to insert transactions:', err?.message || err);
      if (err?.detail) console.error('[import] DB detail:', err.detail);
      res.status(500).json({ message: `Import failed: ${err?.message || 'Unknown server error'}` });
    }
  });

  app.patch("/api/transactions/:id", requireAuth, async (req, res) => {
    // Whitelist only known DB-level fields so that frontend-only properties
    // (e.g. isMalformed, optimistic flags) never reach Drizzle's set().
    const ALLOWED: (keyof typeof req.body)[] = [
      'date', 'description', 'originalDescription', 'amount', 'type',
      'categoryId', 'cardId', 'tag', 'isTransferMatched', 'transferMatchId',
      'transferType', 'parentId', 'isReviewed', 'notes', 'createdAt',
    ];
    const safe: Record<string, any> = {};
    for (const key of ALLOWED) {
      if (key in req.body) safe[key] = req.body[key];
    }
    const tx = await storage.updateTransaction((req.user as any).id, req.params.id, safe as any);
    if (!tx) return res.status(404).json({ message: "Transaction not found" });
    res.json(tx);
  });

  app.delete("/api/transactions/:id", requireAuth, async (req, res) => {
    await storage.deleteTransaction((req.user as any).id, req.params.id);
    res.json({ message: "Deleted" });
  });

  app.post("/api/transactions/bulk-update", requireAuth, async (req, res) => {
    const { ids, updates } = req.body;
    const ALLOWED = [
      'date', 'description', 'originalDescription', 'amount', 'type',
      'categoryId', 'cardId', 'tag', 'isTransferMatched', 'transferMatchId',
      'transferType', 'parentId', 'isReviewed', 'notes', 'createdAt',
    ];
    const safe: Record<string, any> = {};
    for (const key of ALLOWED) {
      if (updates && key in updates) safe[key] = updates[key];
    }
    await storage.bulkUpdateTransactions((req.user as any).id, ids, safe as any);
    res.json({ message: "Updated" });
  });

  app.post("/api/transactions/bulk-delete", requireAuth, async (req, res) => {
    const { ids } = req.body;
    await storage.bulkDeleteTransactions((req.user as any).id, ids);
    res.json({ message: "Deleted" });
  });

  app.post("/api/transactions/bulk-categorize", requireAuth, async (req, res) => {
    const { updates } = req.body;
    if (!Array.isArray(updates) || updates.length === 0) {
      return res.json({ matched: 0 });
    }
    const userId = (req.user as any).id;
    let matched = 0;
    for (const u of updates) {
      if (typeof u.id === 'string' && typeof u.categoryId === 'string') {
        await storage.updateTransaction(userId, u.id, {
          categoryId: u.categoryId,
          tag: u.tag ?? 'none',
          isReviewed: u.isReviewed ?? true,
        } as any);
        matched++;
      }
    }
    res.json({ matched });
  });

  app.post("/api/transactions/link", requireAuth, async (req, res) => {
    const { id1, id2, transferType } = req.body;
    await storage.linkTransactions((req.user as any).id, id1, id2, transferType || 'internal');
    const txs = await storage.getTransactions((req.user as any).id);
    res.json(txs);
  });

  app.post("/api/transactions/unlink/:id", requireAuth, async (req, res) => {
    await storage.unlinkTransaction((req.user as any).id, req.params.id);
    const txs = await storage.getTransactions((req.user as any).id);
    res.json(txs);
  });

  // Budgets
  app.get("/api/budgets", requireAuth, async (req, res) => {
    const buds = await storage.getBudgets((req.user as any).id);
    res.json(buds);
  });

  app.post("/api/budgets", requireAuth, async (req, res) => {
    try {
      const bud = await storage.upsertBudget((req.user as any).id, req.body);
      res.status(201).json(bud);
    } catch (err) {
      res.status(500).json({ message: "Failed to create budget" });
    }
  });

  app.patch("/api/budgets/:id", requireAuth, async (req, res) => {
    try {
      const bud = await storage.upsertBudget((req.user as any).id, { ...req.body, id: req.params.id });
      res.json(bud);
    } catch (err) {
      res.status(500).json({ message: "Failed to update budget" });
    }
  });

  app.delete("/api/budgets/:id", requireAuth, async (req, res) => {
    await storage.deleteBudget((req.user as any).id, req.params.id);
    res.json({ message: "Deleted" });
  });

  // Rules
  app.get("/api/rules", requireAuth, async (req, res) => {
    const rules = await storage.getRules((req.user as any).id);
    res.json(rules);
  });

  app.post("/api/rules", requireAuth, async (req, res) => {
    try {
      const rule = await storage.upsertRule((req.user as any).id, req.body);
      res.status(201).json(rule);
    } catch (err) {
      res.status(500).json({ message: "Failed to create rule" });
    }
  });

  app.patch("/api/rules/:id", requireAuth, async (req, res) => {
    try {
      const updated = await storage.updateRule((req.user as any).id, req.params.id, req.body);
      if (!updated) return res.status(404).json({ message: "Rule not found" });
      res.json(updated);
    } catch (err) {
      res.status(500).json({ message: "Failed to update rule" });
    }
  });

  app.delete("/api/rules/:id", requireAuth, async (req, res) => {
    await storage.deleteRule((req.user as any).id, req.params.id);
    res.json({ message: "Deleted" });
  });

  // Tags
  app.get("/api/tags", requireAuth, async (req, res) => {
    const tags = await storage.getTags((req.user as any).id);
    res.json(tags);
  });

  app.post("/api/tags", requireAuth, async (req, res) => {
    await storage.addTag((req.user as any).id, req.body.tag);
    res.json({ message: "Added" });
  });

  app.delete("/api/tags/:tag", requireAuth, async (req, res) => {
    await storage.deleteTag((req.user as any).id, req.params.tag);
    res.json({ message: "Deleted" });
  });

  return httpServer;
}
