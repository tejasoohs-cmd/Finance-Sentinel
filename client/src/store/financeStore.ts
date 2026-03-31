import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import { Transaction, Card, Category, Budget, DEFAULT_CATEGORIES, TransactionTag } from '../types/finance';
import { format, subDays, addDays } from 'date-fns';
import { CategorizationRule, DEFAULT_RULES, autoCategorize } from '../utils/categorization';

interface FinanceState {
  transactions: Transaction[];
  cards: Card[];
  categories: Category[];
  tags: string[];
  budgets: Budget[];
  categorizationRules: CategorizationRule[];
  
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
  linkTransactions: (id1: string, id2: string, transferType?: any) => void;
  unlinkTransaction: (id: string) => void;
  splitTransaction: (id: string, splits: { amount: number, categoryId: string, type: 'expense'|'income'|'transfer', description: string }[]) => void;

  clearAllData: () => void;
  loadDemoData: () => void;

  bulkUpdateTransactions: (ids: string[], updates: Partial<Transaction>) => void;
  bulkDeleteTransactions: (ids: string[]) => void;
  
  // Categorization Rules
  addCategorizationRule: (rule: Omit<CategorizationRule, 'id'>) => void;
  deleteCategorizationRule: (id: string) => void;
  learnFromTransaction: (description: string, categoryId: string, tag: string, type: 'expense' | 'income' | 'transfer') => void;
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

      addTransaction: (tx) => set((state) => {
        // Auto-categorize if it's uncategorized
        let finalTx = { ...tx };
        if (tx.categoryId === 'cat_uncategorized') {
           const result = autoCategorize(tx.description, state.categorizationRules, tx.type);
           finalTx.categoryId = result.categoryId;
           if (tx.tag === 'none') {
             finalTx.tag = result.tag;
           }
        }
        
        return {
          transactions: [{ ...finalTx, id: uuidv4(), createdAt: Date.now() }, ...state.transactions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        }
      }),

      updateTransaction: (id, txUpdate) => set((state) => {
         // If category or tag is manually changed, learn from it
         const oldTx = state.transactions.find(t => t.id === id);
         if (oldTx && txUpdate.categoryId && oldTx.categoryId !== txUpdate.categoryId) {
            get().learnFromTransaction(oldTx.description, txUpdate.categoryId, txUpdate.tag || oldTx.tag, txUpdate.type || oldTx.type);
         }
         
         return {
          transactions: state.transactions.map((tx) => 
            tx.id === id ? { ...tx, ...txUpdate } : tx
          )
         }
      }),

      deleteTransaction: (id) => set((state) => {
        // If it was matched, unmatch the pair
        const tx = state.transactions.find(t => t.id === id);
        let newTransactions = state.transactions.filter((t) => t.id !== id);
        
        if (tx?.isTransferMatched && tx.transferMatchId) {
          newTransactions = newTransactions.map(t => 
            t.id === tx.transferMatchId ? { ...t, isTransferMatched: false, transferMatchId: undefined, transferType: 'none' } : t
          );
        }
        
        return { transactions: newTransactions };
      }),

      importTransactions: (newTransactions) => set((state) => {
        const toAdd = newTransactions.map(tx => {
           let finalTx = { ...tx, id: uuidv4(), createdAt: Date.now() };
           
           if (finalTx.categoryId === 'cat_uncategorized') {
             const result = autoCategorize(finalTx.description, state.categorizationRules, finalTx.type);
             finalTx.categoryId = result.categoryId;
             if (finalTx.tag === 'none') {
               finalTx.tag = result.tag;
             }
           }
           return finalTx;
        });
        
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

      bulkDeleteTransactions: (ids) => set((state) => {
        // Just remove them for now. Complex unmatching logic can be added if needed
        return { transactions: state.transactions.filter(tx => !ids.includes(tx.id)) };
      }),

      addCategorizationRule: (rule) => set((state) => ({
        categorizationRules: [...state.categorizationRules, { ...rule, id: `rule_custom_${uuidv4()}` }]
      })),

      deleteCategorizationRule: (id) => set((state) => ({
        categorizationRules: state.categorizationRules.filter(r => r.id !== id)
      })),

      learnFromTransaction: (description, categoryId, tag, type) => set((state) => {
         if (!description || categoryId === 'cat_uncategorized' || description.length < 3) return state;
         
         // Only learn from the first couple words to be robust against dates/numbers in descriptions
         const words = description.split(/[\s,.-]+/).filter(w => w.length > 2);
         if (words.length === 0) return state;
         
         const keyword = words.slice(0, 2).join(' ').toLowerCase();
         
         // Don't overwrite existing rule for this exact keyword
         if (state.categorizationRules.some(r => r.keyword === keyword)) {
            return state;
         }
         
         const newRule: CategorizationRule = {
            id: `rule_learned_${uuidv4()}`,
            keyword,
            categoryId,
            tag,
            type,
            isExactMatch: false
         };
         
         return {
            categorizationRules: [newRule, ...state.categorizationRules] // Put learned rules first so they take priority
         };
      }),

      linkTransactions: (id1, id2, transferType = 'internal') => set((state) => {
        return {
          transactions: state.transactions.map(tx => {
            if (tx.id === id1) return { ...tx, isTransferMatched: true, transferMatchId: id2, type: 'transfer', categoryId: 'cat_transfer', transferType };
            if (tx.id === id2) return { ...tx, isTransferMatched: true, transferMatchId: id1, type: 'transfer', categoryId: 'cat_transfer', transferType };
            return tx;
          })
        };
      }),

      unlinkTransaction: (id) => set((state) => {
        const tx = state.transactions.find(t => t.id === id);
        if (!tx || !tx.transferMatchId) return state;

        const matchId = tx.transferMatchId;
        
        return {
          transactions: state.transactions.map(t => {
            if (t.id === id || t.id === matchId) {
              return { 
                ...t, 
                isTransferMatched: false, 
                transferMatchId: undefined, 
                transferType: 'none',
                // Revert to expense/income based on amount
                type: t.amount >= 0 ? 'income' : 'expense',
                categoryId: 'cat_uncategorized'
              };
            }
            return t;
          })
        };
      }),

      splitTransaction: (id, splits) => set((state) => {
        const parent = state.transactions.find(t => t.id === id);
        if (!parent) return state;

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

        // Remove parent, insert children
        const newTransactions = [
          ...state.transactions.filter(t => t.id !== id),
          ...newTxs
        ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        return { transactions: newTransactions };
      }),

      matchTransfers: () => set((state) => {
        const transactions = [...state.transactions];
        
        for (let i = 0; i < transactions.length; i++) {
          const t1 = transactions[i];
          // We only auto-match unmatched transactions that are marked as 'transfer' or could be
          if (t1.isTransferMatched) continue;
          
          // Heuristic: If description contains keywords like "transfer", "payment", "deposit" it's a good candidate
          const isLikelyTransfer1 = t1.type === 'transfer' || /transfer|payment|deposit|wd/i.test(t1.description.toLowerCase());

          for (let j = i + 1; j < transactions.length; j++) {
            const t2 = transactions[j];
            if (t2.isTransferMatched) continue;

            const isOpposite = (t1.amount === -t2.amount) || (Math.abs(t1.amount) === Math.abs(t2.amount) && t1.type !== t2.type);
            const isLikelyTransfer2 = t2.type === 'transfer' || /transfer|payment|deposit|wd/i.test(t2.description.toLowerCase());
            
            if (isOpposite && (isLikelyTransfer1 || isLikelyTransfer2)) {
              const d1 = new Date(t1.date);
              const d2 = new Date(t2.date);
              const diffDays = Math.abs(d1.getTime() - d2.getTime()) / (1000 * 3600 * 24);
              
              if (diffDays <= 3) {
                transactions[i] = { ...t1, type: 'transfer', categoryId: 'cat_transfer', isTransferMatched: true, transferMatchId: t2.id, transferType: 'uncertain' };
                transactions[j] = { ...t2, type: 'transfer', categoryId: 'cat_transfer', isTransferMatched: true, transferMatchId: t1.id, transferType: 'uncertain' };
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

        // Criss-cross transfer chain scenario
        const tx1Id = uuidv4(); // Salary
        const tx2Id = uuidv4(); // ENBD transfer out to Mashreq CC
        const tx3Id = uuidv4(); // Mashreq CC payment received
        const tx4Id = uuidv4(); // ATM withdrawal from ENBD
        const tx5Id = uuidv4(); // Cash added to wallet
        const tx6Id = uuidv4(); // Paid ADCB CC with cash
        const tx7Id = uuidv4(); // ADCB CC payment received

        const demoTransactions: Transaction[] = [
          {
            id: tx1Id,
            date: d(5),
            description: 'Salary Transfer',
            originalDescription: 'SALARY TRANSFER CORP',
            amount: 25000.00,
            type: 'income',
            categoryId: 'cat_salary',
            cardId: enbdDebitId,
            tag: 'none',
            isTransferMatched: false,
            createdAt: Date.now()
          },
          {
            id: tx2Id,
            date: d(4),
            description: 'Payment to Mashreq CC',
            originalDescription: 'TRANSFER TO 8831',
            amount: -5000.00,
            type: 'expense', // Unmatched initially
            categoryId: 'cat_uncategorized',
            cardId: enbdDebitId,
            tag: 'none',
            isTransferMatched: false,
            createdAt: Date.now()
          },
          {
            id: tx3Id,
            date: d(4),
            description: 'Online Payment Received',
            originalDescription: 'PAYMENT RECEIVED THANK YOU',
            amount: 5000.00,
            type: 'income', // Unmatched initially
            categoryId: 'cat_uncategorized',
            cardId: mashreqCCId,
            tag: 'none',
            isTransferMatched: false,
            createdAt: Date.now()
          },
          {
            id: tx4Id,
            date: d(3),
            description: 'ATM Withdrawal Marina Mall',
            originalDescription: 'ATM WD MARINA MALL',
            amount: -2000.00,
            type: 'expense',
            categoryId: 'cat_uncategorized',
            cardId: enbdDebitId,
            tag: 'none',
            isTransferMatched: false,
            createdAt: Date.now()
          },
          {
            id: tx5Id,
            date: d(3),
            description: 'Cash from ATM',
            originalDescription: 'Cash deposit to wallet',
            amount: 2000.00,
            type: 'income',
            categoryId: 'cat_uncategorized',
            cardId: cashWalletId,
            tag: 'none',
            isTransferMatched: false,
            createdAt: Date.now()
          },
          {
            id: tx6Id,
            date: d(2),
            description: 'Cash Payment at Branch for ADCB CC',
            originalDescription: 'Cash Payment',
            amount: -1500.00,
            type: 'expense',
            categoryId: 'cat_uncategorized',
            cardId: cashWalletId,
            tag: 'none',
            isTransferMatched: false,
            createdAt: Date.now()
          },
          {
            id: tx7Id,
            date: d(2),
            description: 'Cash Deposit at CDM',
            originalDescription: 'CASH DEPOSIT CDM BR 12',
            amount: 1500.00,
            type: 'income',
            categoryId: 'cat_uncategorized',
            cardId: adcbCCId,
            tag: 'none',
            isTransferMatched: false,
            createdAt: Date.now()
          },
          // And one real expense to show it mixed in
          {
            id: uuidv4(),
            date: d(1),
            description: 'Spinneys Dubai Marina',
            originalDescription: 'POS PUR SPINNEYS DUBAI AE',
            amount: -345.50,
            type: 'expense',
            categoryId: 'cat_groceries',
            cardId: mashreqCCId,
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