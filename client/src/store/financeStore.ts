import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import { Transaction, Card, Category, Budget, DEFAULT_CATEGORIES, TransactionTag } from '../types/finance';
import { format } from 'date-fns';

interface FinanceState {
  transactions: Transaction[];
  cards: Card[];
  categories: Category[];
  tags: string[];
  budgets: Budget[];
  
  // Actions
  addTransaction: (tx: Omit<Transaction, 'id' | 'createdAt'>) => void;
  updateTransaction: (id: string, tx: Partial<Transaction>) => void;
  deleteTransaction: (id: string) => void;
  importTransactions: (transactions: Omit<Transaction, 'id' | 'createdAt'>[]) => void;
  
  addCard: (card: Omit<Card, 'id'>) => void;
  updateCard: (id: string, card: Partial<Card>) => void;
  deleteCard: (id: string) => void;
  
  addCategory: (category: Omit<Category, 'id'>) => void;
  updateCategory: (id: string, category: Partial<Category>) => void;
  deleteCategory: (id: string) => void;

  addTag: (tag: string) => void;
  deleteTag: (tag: string) => void;

  addBudget: (budget: Omit<Budget, 'id'>) => void;
  updateBudget: (id: string, budget: Partial<Budget>) => void;
  deleteBudget: (id: string) => void;

  matchTransfers: () => void;
  clearAllData: () => void;
  loadDemoData: () => void;

  bulkUpdateTransactions: (ids: string[], updates: Partial<Transaction>) => void;
  bulkDeleteTransactions: (ids: string[]) => void;
}

export const useFinanceStore = create<FinanceState>()(
  persist(
    (set, get) => ({
      transactions: [],
      cards: [],
      categories: DEFAULT_CATEGORIES,
      tags: ['none', 'personal', 'business'],
      budgets: [],

      addTransaction: (tx) => set((state) => ({
        transactions: [{ ...tx, id: uuidv4(), createdAt: Date.now() }, ...state.transactions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      })),

      updateTransaction: (id, txUpdate) => set((state) => ({
        transactions: state.transactions.map((tx) => 
          tx.id === id ? { ...tx, ...txUpdate } : tx
        )
      })),

      deleteTransaction: (id) => set((state) => ({
        transactions: state.transactions.filter((tx) => tx.id !== id)
      })),

      importTransactions: (newTransactions) => set((state) => {
        const toAdd = newTransactions.map(tx => ({ ...tx, id: uuidv4(), createdAt: Date.now() }));
        return {
          transactions: [...toAdd, ...state.transactions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        };
      }),

      addCard: (card) => set((state) => ({
        cards: [...state.cards, { ...card, id: uuidv4() }]
      })),

      updateCard: (id, cardUpdate) => set((state) => ({
        cards: state.cards.map((card) => card.id === id ? { ...card, ...cardUpdate } : card)
      })),

      deleteCard: (id) => set((state) => ({
        cards: state.cards.filter((card) => card.id !== id),
        transactions: state.transactions.map(tx => tx.cardId === id ? { ...tx, cardId: null } : tx)
      })),

      addCategory: (category) => set((state) => ({
        categories: [...state.categories, { ...category, id: `cat_custom_${uuidv4()}`, isCustom: true }]
      })),

      updateCategory: (id, categoryUpdate) => set((state) => ({
        categories: state.categories.map((c) => c.id === id ? { ...c, ...categoryUpdate } : c)
      })),

      deleteCategory: (id) => set((state) => ({
        categories: state.categories.filter((c) => c.id !== id),
        transactions: state.transactions.map(tx => tx.categoryId === id ? { ...tx, categoryId: 'cat_uncategorized' } : tx)
      })),

      addTag: (tag) => set((state) => ({
        tags: state.tags.includes(tag.toLowerCase()) ? state.tags : [...state.tags, tag.toLowerCase()]
      })),

      deleteTag: (tag) => set((state) => ({
        tags: state.tags.filter(t => t !== tag),
        transactions: state.transactions.map(tx => tx.tag === tag ? { ...tx, tag: 'none' } : tx)
      })),

      addBudget: (budget) => set((state) => ({
        budgets: [...state.budgets, { ...budget, id: uuidv4() }]
      })),

      updateBudget: (id, budgetUpdate) => set((state) => ({
        budgets: state.budgets.map((b) => b.id === id ? { ...b, ...budgetUpdate } : b)
      })),

      deleteBudget: (id) => set((state) => ({
        budgets: state.budgets.filter((b) => b.id !== id)
      })),

      bulkUpdateTransactions: (ids, updates) => set((state) => ({
        transactions: state.transactions.map(tx => ids.includes(tx.id) ? { ...tx, ...updates } : tx)
      })),

      bulkDeleteTransactions: (ids) => set((state) => ({
        transactions: state.transactions.filter(tx => !ids.includes(tx.id))
      })),

      matchTransfers: () => set((state) => {
        const transactions = [...state.transactions];
        
        for (let i = 0; i < transactions.length; i++) {
          const t1 = transactions[i];
          if (t1.isTransferMatched || t1.type !== 'expense' && t1.type !== 'income') continue;

          for (let j = i + 1; j < transactions.length; j++) {
            const t2 = transactions[j];
            if (t2.isTransferMatched) continue;

            const isOpposite = (t1.amount === -t2.amount) || (Math.abs(t1.amount) === Math.abs(t2.amount) && t1.type !== t2.type);
            
            if (isOpposite) {
              const d1 = new Date(t1.date);
              const d2 = new Date(t2.date);
              const diffDays = Math.abs(d1.getTime() - d2.getTime()) / (1000 * 3600 * 24);
              
              if (diffDays <= 3) {
                transactions[i] = { ...t1, type: 'transfer', categoryId: 'cat_transfer', isTransferMatched: true, transferMatchId: t2.id };
                transactions[j] = { ...t2, type: 'transfer', categoryId: 'cat_transfer', isTransferMatched: true, transferMatchId: t1.id };
                break;
              }
            }
          }
        }

        return { transactions };
      }),

      clearAllData: () => set({
        transactions: [],
        cards: [],
        budgets: [],
        categories: DEFAULT_CATEGORIES,
        tags: ['none', 'personal', 'business']
      }),

      loadDemoData: () => set((state) => {
        const demoCardId1 = uuidv4();
        const demoCardId2 = uuidv4();
        
        const demoCards: Card[] = [
          { id: demoCardId1, name: 'Emirates NBD Skywards', bank: 'ENBD', last4: '4532', type: 'credit', color: 'bg-blue-600' },
          { id: demoCardId2, name: 'ADCB Debit', bank: 'ADCB', last4: '1198', type: 'debit', color: 'bg-red-600' }
        ];

        const today = new Date();
        const demoTransactions: Transaction[] = [
          {
            id: uuidv4(),
            date: format(today, 'yyyy-MM-dd'),
            description: 'Spinneys Dubai Marina',
            originalDescription: 'POS PUR SPINNEYS DUBAI AE',
            amount: -345.50,
            type: 'expense',
            categoryId: 'cat_groceries',
            cardId: demoCardId1,
            tag: 'personal',
            isTransferMatched: false,
            createdAt: Date.now()
          },
          {
            id: uuidv4(),
            date: format(new Date(today.setDate(today.getDate() - 2)), 'yyyy-MM-dd'),
            description: 'DEWA Bill',
            originalDescription: 'DEWA ONLINE PAYMENT',
            amount: -850.00,
            type: 'expense',
            categoryId: 'cat_utilities',
            cardId: demoCardId1,
            tag: 'personal',
            isTransferMatched: false,
            createdAt: Date.now()
          },
          {
            id: uuidv4(),
            date: format(new Date(today.setDate(today.getDate() - 3)), 'yyyy-MM-dd'),
            description: 'Monthly Salary',
            originalDescription: 'SALARY TRANSFER CORP',
            amount: 25000.00,
            type: 'income',
            categoryId: 'cat_salary',
            cardId: demoCardId2,
            tag: 'personal',
            isTransferMatched: false,
            createdAt: Date.now()
          }
        ];

        return {
          cards: demoCards,
          transactions: demoTransactions,
          categories: state.categories?.length > 0 ? state.categories : DEFAULT_CATEGORIES,
          tags: state.tags?.length > 0 ? state.tags : ['none', 'personal', 'business']
        };
      })
    }),
    {
      name: 'moneytrace-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);