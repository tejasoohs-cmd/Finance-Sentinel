import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import { Transaction, Card, Category, Budget, DEFAULT_CATEGORIES, TransactionTag } from '../types/finance';
import { format, subDays } from 'date-fns';
import { CategorizationRule, DEFAULT_RULES, autoCategorize } from '../utils/categorization';

const API = async (path: string, options?: RequestInit) => {
  const res = await fetch(path, { credentials: 'include', ...options, headers: { 'Content-Type': 'application/json', ...(options?.headers || {}) } });
  if (!res.ok) throw new Error(`API error ${res.status}`);
  return res.json();
};

interface FinanceState {
  transactions: Transaction[];
  cards: Card[];
  categories: Category[];
  tags: string[];
  budgets: Budget[];
  categorizationRules: CategorizationRule[];
  isOnline: boolean;
  
  // Actions
  addTransaction: (tx: Omit<Transaction, 'id' | 'createdAt'>) => Promise<void>;
  updateTransaction: (id: string, tx: Partial<Transaction>) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  importTransactions: (transactions: Omit<Transaction, 'id' | 'createdAt'>[]) => Promise<void>;
  
  addCard: (card: Omit<Card, 'id'>) => Promise<void>;
  updateCard: (id: string, card: Partial<Card>) => Promise<void>;
  deleteCard: (id: string) => Promise<void>;
  
  addCategory: (category: Omit<Category, 'id'>) => Promise<void>;
  updateCategory: (id: string, category: Partial<Category>) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;

  addTag: (tag: string) => Promise<void>;
  deleteTag: (tag: string) => Promise<void>;

  addBudget: (budget: Omit<Budget, 'id'>) => Promise<void>;
  updateBudget: (id: string, budget: Partial<Budget>) => Promise<void>;
  deleteBudget: (id: string) => Promise<void>;

  matchTransfers: () => Promise<void>;
  linkTransactions: (id1: string, id2: string, transferType?: any) => Promise<void>;
  unlinkTransaction: (id: string) => Promise<void>;
  splitTransaction: (id: string, splits: { amount: number, categoryId: string, type: 'expense'|'income'|'transfer', description: string }[]) => Promise<void>;

  clearAllData: () => void;
  loadDemoData: () => Promise<void>;

  bulkUpdateTransactions: (ids: string[], updates: Partial<Transaction>) => Promise<void>;
  bulkDeleteTransactions: (ids: string[]) => Promise<void>;
  
  addCategorizationRule: (rule: Omit<CategorizationRule, 'id'>) => Promise<void>;
  deleteCategorizationRule: (id: string) => Promise<void>;
  learnFromTransaction: (description: string, categoryId: string, tag: string, type: 'expense' | 'income' | 'transfer') => Promise<void>;

  // Server sync
  loadFromServer: () => Promise<void>;
  syncToServer: () => Promise<void>;
}

export const useFinanceStore = create<FinanceState>()(
  persist(
    (set, get) => ({
      transactions: [],
      cards: [],
      categories: DEFAULT_CATEGORIES,
      tags: ['none', 'personal', 'business'],
      budgets: [],
      categorizationRules: DEFAULT_RULES,
      isOnline: false,

      loadFromServer: async () => {
        try {
          const data = await API('/api/sync');
          // Map server CategorizationRule to client CategorizationRule shape
          const rules: CategorizationRule[] = (data.rules || []).map((r: any) => ({
            id: r.id,
            keyword: r.keyword,
            categoryId: r.categoryId,
            tag: r.tag || 'none',
            type: r.type || undefined,
            isExactMatch: r.isExactMatch || false,
          }));
          set({
            transactions: data.transactions || [],
            cards: data.cards || [],
            categories: data.categories?.length > 0 ? data.categories : DEFAULT_CATEGORIES,
            budgets: data.budgets || [],
            rules,
            tags: data.tags?.length > 0 ? data.tags : ['none', 'personal', 'business'],
            isOnline: true,
          } as any);
        } catch (err) {
          console.error('Failed to load from server:', err);
          set({ isOnline: false });
        }
      },

      syncToServer: async () => {
        const state = get();
        try {
          await API('/api/sync/push', {
            method: 'POST',
            body: JSON.stringify({
              transactions: state.transactions,
              cards: state.cards,
              categories: state.categories,
              budgets: state.budgets,
              rules: state.categorizationRules,
              tags: state.tags,
            }),
          });
        } catch (err) {
          console.error('Sync failed:', err);
        }
      },

      addTransaction: async (tx) => {
        const state = get();
        let finalTx = { ...tx, isReviewed: true };
        if (tx.categoryId === 'cat_uncategorized') {
          const result = autoCategorize(tx.description, state.categorizationRules, tx.type);
          finalTx.categoryId = result.categoryId;
          if (tx.tag === 'none') finalTx.tag = result.tag;
        }
        const toPost = { ...finalTx, id: uuidv4(), createdAt: Date.now() };
        try {
          const created = await API('/api/transactions', { method: 'POST', body: JSON.stringify(toPost) });
          set(s => ({ transactions: [created, ...s.transactions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()) }));
        } catch {
          // Optimistic fallback
          set(s => ({ transactions: [toPost, ...s.transactions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()) }));
        }
      },

      updateTransaction: async (id, txUpdate) => {
        const state = get();
        const oldTx = state.transactions.find(t => t.id === id);
        if (oldTx && txUpdate.categoryId && oldTx.categoryId !== txUpdate.categoryId) {
          get().learnFromTransaction(oldTx.description, txUpdate.categoryId, txUpdate.tag || oldTx.tag, txUpdate.type || oldTx.type);
        }
        set(s => ({ transactions: s.transactions.map(tx => tx.id === id ? { ...tx, ...txUpdate, isReviewed: true } : tx) }));
        try {
          await API(`/api/transactions/${id}`, { method: 'PATCH', body: JSON.stringify({ ...txUpdate, isReviewed: true }) });
        } catch (err) {
          console.error('Update tx failed:', err);
        }
      },

      deleteTransaction: async (id) => {
        const state = get();
        const tx = state.transactions.find(t => t.id === id);
        set(s => {
          let newTransactions = s.transactions.filter(t => t.id !== id);
          if (tx?.isTransferMatched && tx.transferMatchId) {
            newTransactions = newTransactions.map(t => t.id === tx.transferMatchId ? { ...t, isTransferMatched: false, transferMatchId: undefined, transferType: 'none' as any } : t);
          }
          return { transactions: newTransactions };
        });
        try { await API(`/api/transactions/${id}`, { method: 'DELETE' }); } catch {}
      },

      importTransactions: async (newTransactions) => {
        const state = get();
        const toAdd = newTransactions.map(tx => {
          let finalTx = { ...tx, id: uuidv4(), createdAt: Date.now(), isReviewed: false };
          if (finalTx.categoryId === 'cat_uncategorized') {
            const result = autoCategorize(finalTx.description, state.categorizationRules, finalTx.type);
            finalTx.categoryId = result.categoryId;
            if (finalTx.tag === 'none') finalTx.tag = result.tag;
            if (result.categoryId !== 'cat_uncategorized' && result.categoryId !== 'cat_other' && result.categoryId !== 'cat_transfer') {
              finalTx.isReviewed = true;
            }
          }
          return finalTx;
        });
        set(s => ({ transactions: [...toAdd, ...s.transactions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()) }));
        try {
          const created = await API('/api/transactions/import', { method: 'POST', body: JSON.stringify({ transactions: toAdd }) });
          // Update IDs in store from server response (server may reassign IDs)
          // For now just ensure store stays up-to-date
        } catch (err) {
          console.error('Import failed:', err);
        }
      },

      addCard: async (card) => {
        const newCard = { ...card, id: uuidv4() };
        set(s => ({ cards: [...s.cards, newCard] }));
        try {
          const created = await API('/api/cards', { method: 'POST', body: JSON.stringify(newCard) });
          set(s => ({ cards: s.cards.map(c => c.id === newCard.id ? created : c) }));
        } catch {}
      },

      updateCard: async (id, cardUpdate) => {
        set(s => ({ cards: s.cards.map(c => c.id === id ? { ...c, ...cardUpdate } : c) }));
        try { await API(`/api/cards/${id}`, { method: 'PATCH', body: JSON.stringify(cardUpdate) }); } catch {}
      },

      deleteCard: async (id) => {
        set(s => ({
          cards: s.cards.filter(c => c.id !== id),
          transactions: s.transactions.map(tx => tx.cardId === id ? { ...tx, cardId: null } : tx)
        }));
        try { await API(`/api/cards/${id}`, { method: 'DELETE' }); } catch {}
      },

      addCategory: async (category) => {
        const newCat = { ...category, id: `cat_custom_${uuidv4()}`, isCustom: true };
        set(s => ({ categories: [...s.categories, newCat] }));
        try { await API('/api/categories', { method: 'POST', body: JSON.stringify(newCat) }); } catch {}
      },

      updateCategory: async (id, categoryUpdate) => {
        set(s => ({ categories: s.categories.map(c => c.id === id ? { ...c, ...categoryUpdate } : c) }));
        try { await API(`/api/categories/${id}`, { method: 'PATCH', body: JSON.stringify(categoryUpdate) }); } catch {}
      },

      deleteCategory: async (id) => {
        set(s => ({
          categories: s.categories.filter(c => c.id !== id),
          transactions: s.transactions.map(tx => tx.categoryId === id ? { ...tx, categoryId: 'cat_uncategorized' } : tx)
        }));
        try { await API(`/api/categories/${id}`, { method: 'DELETE' }); } catch {}
      },

      addTag: async (tag) => {
        set(s => ({ tags: s.tags.includes(tag.toLowerCase()) ? s.tags : [...s.tags, tag.toLowerCase()] }));
        try { await API('/api/tags', { method: 'POST', body: JSON.stringify({ tag: tag.toLowerCase() }) }); } catch {}
      },

      deleteTag: async (tag) => {
        set(s => ({
          tags: s.tags.filter(t => t !== tag),
          transactions: s.transactions.map(tx => tx.tag === tag ? { ...tx, tag: 'none' } : tx)
        }));
        try { await API(`/api/tags/${tag}`, { method: 'DELETE' }); } catch {}
      },

      addBudget: async (budget) => {
        const newBudget = { ...budget, id: uuidv4() };
        set(s => ({ budgets: [...s.budgets, newBudget] }));
        try { await API('/api/budgets', { method: 'POST', body: JSON.stringify(newBudget) }); } catch {}
      },

      updateBudget: async (id, budgetUpdate) => {
        set(s => ({ budgets: s.budgets.map(b => b.id === id ? { ...b, ...budgetUpdate } : b) }));
        try { await API(`/api/budgets/${id}`, { method: 'PATCH', body: JSON.stringify(budgetUpdate) }); } catch {}
      },

      deleteBudget: async (id) => {
        set(s => ({ budgets: s.budgets.filter(b => b.id !== id) }));
        try { await API(`/api/budgets/${id}`, { method: 'DELETE' }); } catch {}
      },

      bulkUpdateTransactions: async (ids, updates) => {
        set(s => ({ transactions: s.transactions.map(tx => ids.includes(tx.id) ? { ...tx, ...updates } : tx) }));
        try { await API('/api/transactions/bulk-update', { method: 'POST', body: JSON.stringify({ ids, updates }) }); } catch {}
      },

      bulkDeleteTransactions: async (ids) => {
        set(s => ({ transactions: s.transactions.filter(tx => !ids.includes(tx.id)) }));
        try { await API('/api/transactions/bulk-delete', { method: 'POST', body: JSON.stringify({ ids }) }); } catch {}
      },

      addCategorizationRule: async (rule) => {
        const newRule = { ...rule, id: `rule_custom_${uuidv4()}` };
        set(s => ({ categorizationRules: [...s.categorizationRules, newRule] }));
        try { await API('/api/rules', { method: 'POST', body: JSON.stringify(newRule) }); } catch {}
      },

      deleteCategorizationRule: async (id) => {
        set(s => ({ categorizationRules: s.categorizationRules.filter(r => r.id !== id) }));
        try { await API(`/api/rules/${id}`, { method: 'DELETE' }); } catch {}
      },

      learnFromTransaction: async (description, categoryId, tag, type) => {
        if (!description || categoryId === 'cat_uncategorized' || description.length < 3) return;
        const words = description.split(/[\s,.-]+/).filter(w => w.length > 2);
        if (words.length === 0) return;
        const keyword = words.slice(0, 2).join(' ').toLowerCase();
        const state = get();
        if (state.categorizationRules.some(r => r.keyword === keyword)) return;
        const newRule: CategorizationRule = {
          id: `rule_learned_${uuidv4()}`,
          keyword,
          categoryId,
          tag,
          type,
          isExactMatch: false
        };
        set(s => ({ categorizationRules: [newRule, ...s.categorizationRules] }));
        try { await API('/api/rules', { method: 'POST', body: JSON.stringify({ ...newRule, priority: 10 }) }); } catch {}
      },

      linkTransactions: async (id1, id2, transferType = 'internal') => {
        set(s => ({
          transactions: s.transactions.map(tx => {
            if (tx.id === id1) return { ...tx, isTransferMatched: true, transferMatchId: id2, type: 'transfer' as any, categoryId: 'cat_transfer', transferType };
            if (tx.id === id2) return { ...tx, isTransferMatched: true, transferMatchId: id1, type: 'transfer' as any, categoryId: 'cat_transfer', transferType };
            return tx;
          })
        }));
        try {
          const txs = await API('/api/transactions/link', { method: 'POST', body: JSON.stringify({ id1, id2, transferType }) });
          set({ transactions: txs });
        } catch {}
      },

      unlinkTransaction: async (id) => {
        const tx = get().transactions.find(t => t.id === id);
        if (!tx?.transferMatchId) return;
        const matchId = tx.transferMatchId;
        set(s => ({
          transactions: s.transactions.map(t => {
            if (t.id === id || t.id === matchId) {
              return { ...t, isTransferMatched: false, transferMatchId: undefined, transferType: 'none' as any, type: t.amount >= 0 ? 'income' as any : 'expense' as any, categoryId: 'cat_uncategorized' };
            }
            return t;
          })
        }));
        try {
          const txs = await API(`/api/transactions/unlink/${id}`, { method: 'POST' });
          set({ transactions: txs });
        } catch {}
      },

      splitTransaction: async (id, splits) => {
        const parent = get().transactions.find(t => t.id === id);
        if (!parent) return;
        const newTxs: Transaction[] = splits.map(split => ({
          ...parent,
          id: uuidv4(),
          amount: split.amount,
          categoryId: split.categoryId,
          type: split.type,
          description: split.description,
          parentId: parent.id,
          createdAt: Date.now()
        }));
        set(s => ({
          transactions: [...s.transactions.filter(t => t.id !== id), ...newTxs].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        }));
        try {
          await API(`/api/transactions/${id}`, { method: 'DELETE' });
          await API('/api/transactions/import', { method: 'POST', body: JSON.stringify({ transactions: newTxs }) });
        } catch {}
      },

      matchTransfers: async () => {
        const transactions = [...get().transactions];
        const toLink: { id1: string; id2: string }[] = [];
        
        for (let i = 0; i < transactions.length; i++) {
          const t1 = transactions[i];
          if (t1.isTransferMatched) continue;
          const isLikelyTransfer1 = t1.type === 'transfer' || /transfer|payment|deposit|wd/i.test(t1.description.toLowerCase());
          for (let j = i + 1; j < transactions.length; j++) {
            const t2 = transactions[j];
            if (t2.isTransferMatched) continue;
            const isOpposite = (t1.amount === -t2.amount) || (Math.abs(t1.amount) === Math.abs(t2.amount) && t1.type !== t2.type);
            const isLikelyTransfer2 = t2.type === 'transfer' || /transfer|payment|deposit|wd/i.test(t2.description.toLowerCase());
            if (isOpposite && (isLikelyTransfer1 || isLikelyTransfer2)) {
              const diffDays = Math.abs(new Date(t1.date).getTime() - new Date(t2.date).getTime()) / (1000 * 3600 * 24);
              if (diffDays <= 3) {
                transactions[i] = { ...t1, type: 'transfer', categoryId: 'cat_transfer', isTransferMatched: true, transferMatchId: t2.id, transferType: 'uncertain' };
                transactions[j] = { ...t2, type: 'transfer', categoryId: 'cat_transfer', isTransferMatched: true, transferMatchId: t1.id, transferType: 'uncertain' };
                toLink.push({ id1: t1.id, id2: t2.id });
                break;
              }
            }
          }
        }
        set({ transactions });
        for (const { id1, id2 } of toLink) {
          try { await API('/api/transactions/link', { method: 'POST', body: JSON.stringify({ id1, id2, transferType: 'uncertain' }) }); } catch {}
        }
      },

      clearAllData: () => set({
        transactions: [],
        cards: [],
        budgets: [],
        categories: DEFAULT_CATEGORIES,
        tags: ['none', 'personal', 'business'],
        categorizationRules: DEFAULT_RULES,
        isOnline: false,
      }),

      loadDemoData: async () => {
        const state = get();
        const enbdDebitId = uuidv4();
        const mashreqCCId = uuidv4();
        const adcbCCId = uuidv4();
        const cashWalletId = uuidv4();
        
        const demoCards: Card[] = [
          { id: enbdDebitId, name: 'ENBD Current Account', bank: 'Emirates NBD', last4: '4532', type: 'debit', color: 'bg-blue-600' },
          { id: mashreqCCId, name: 'Mashreq Cashback CC', bank: 'Mashreq', last4: '8831', type: 'credit', color: 'bg-orange-500' },
          { id: adcbCCId, name: 'ADCB TouchPoints CC', bank: 'ADCB', last4: '1198', type: 'credit', color: 'bg-red-600' },
          { id: cashWalletId, name: 'Physical Cash', bank: 'Wallet', last4: 'CASH', type: 'cash', color: 'bg-green-600' }
        ];

        const today = new Date();
        const d = (days: number) => format(subDays(today, days), 'yyyy-MM-dd');

        const demoTransactions: Omit<Transaction, 'id' | 'createdAt'>[] = [
          { date: d(5), description: 'Salary Transfer', originalDescription: 'SALARY TRANSFER CORP', amount: 25000, type: 'income', categoryId: 'cat_salary', cardId: enbdDebitId, tag: 'none', isTransferMatched: false },
          { date: d(4), description: 'Payment to Mashreq CC', originalDescription: 'TRANSFER TO 8831', amount: -5000, type: 'expense', categoryId: 'cat_uncategorized', cardId: enbdDebitId, tag: 'none', isTransferMatched: false },
          { date: d(4), description: 'Online Payment Received', originalDescription: 'PAYMENT RECEIVED THANK YOU', amount: 5000, type: 'income', categoryId: 'cat_uncategorized', cardId: mashreqCCId, tag: 'none', isTransferMatched: false },
          { date: d(3), description: 'ATM Withdrawal Marina Mall', originalDescription: 'ATM WD MARINA MALL', amount: -2000, type: 'expense', categoryId: 'cat_uncategorized', cardId: enbdDebitId, tag: 'none', isTransferMatched: false },
          { date: d(3), description: 'Cash from ATM', originalDescription: 'Cash deposit to wallet', amount: 2000, type: 'income', categoryId: 'cat_uncategorized', cardId: cashWalletId, tag: 'none', isTransferMatched: false },
          { date: d(2), description: 'Cash Payment at Branch for ADCB CC', originalDescription: 'Cash Payment', amount: -1500, type: 'expense', categoryId: 'cat_uncategorized', cardId: cashWalletId, tag: 'none', isTransferMatched: false },
          { date: d(2), description: 'Cash Deposit at CDM', originalDescription: 'CASH DEPOSIT CDM BR 12', amount: 1500, type: 'income', categoryId: 'cat_uncategorized', cardId: adcbCCId, tag: 'none', isTransferMatched: false },
          { date: d(1), description: 'Spinneys Dubai Marina', originalDescription: 'POS PUR SPINNEYS DUBAI AE', amount: -345.50, type: 'expense', categoryId: 'cat_groceries', cardId: mashreqCCId, tag: 'personal', isTransferMatched: false },
        ];

        // Add cards first
        for (const card of demoCards) {
          const { id, ...rest } = card;
          await get().addCard({ ...rest });
        }
        await get().importTransactions(demoTransactions);
      }
    }),
    {
      name: 'moneytrace-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
