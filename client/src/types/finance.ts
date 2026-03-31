export type TransactionType = 'expense' | 'income' | 'transfer';
export type TransactionTag = string;

export type TransferType = 'internal' | 'cc_payment' | 'cash_withdrawal' | 'cash_deposit' | 'own_funding' | 'uncertain' | 'none';

export interface Card {
  id: string;
  name: string; // e.g., "Emirates NBD SkyShopper"
  bank: string;
  last4: string;
  type: 'credit' | 'debit' | 'prepaid' | 'cash';
  balance?: number; // Optional, mostly for debit
  creditLimit?: number; // For credit cards
  statementDate?: number; // 1-31
  dueDate?: number; // 1-31
  color?: string; // UI color hex or class
}

export interface Transaction {
  id: string;
  date: string; // ISO format YYYY-MM-DD
  description: string;
  originalDescription: string;
  amount: number; // Positive for income, negative for expense
  type: TransactionType;
  categoryId: string;
  cardId: string | null;
  tag: TransactionTag;
  
  // Transfer Matching & Classification
  isTransferMatched: boolean;
  transferMatchId?: string; // ID of the matching transaction if it's a transfer
  transferType?: TransferType;
  
  // Splitting
  parentId?: string; // If this transaction was created by splitting another
  
  notes?: string;
  createdAt: number;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  type: 'expense' | 'income' | 'transfer';
  isCustom?: boolean;
}

export interface Budget {
  id: string;
  categoryId: string;
  amount: number;
  month: string; // YYYY-MM
}

export interface CashflowSummary {
  month: string;
  income: number;
  expense: number;
  savings: number;
  savingsRate: number;
}

// Built-in default categories
export const DEFAULT_CATEGORIES: Category[] = [
  { id: 'cat_groceries', name: 'Groceries', icon: 'ShoppingCart', color: '#10b981', type: 'expense' },
  { id: 'cat_dining', name: 'Food & Dining', icon: 'Utensils', color: '#f59e0b', type: 'expense' },
  { id: 'cat_transport', name: 'Transport', icon: 'Car', color: '#3b82f6', type: 'expense' },
  { id: 'cat_utilities', name: 'Utilities', icon: 'Zap', color: '#8b5cf6', type: 'expense' },
  { id: 'cat_housing', name: 'Housing & Rent', icon: 'Home', color: '#6366f1', type: 'expense' },
  { id: 'cat_shopping', name: 'Shopping', icon: 'ShoppingBag', color: '#ec4899', type: 'expense' },
  { id: 'cat_entertainment', name: 'Entertainment', icon: 'Tv', color: '#8b5cf6', type: 'expense' },
  { id: 'cat_health', name: 'Healthcare', icon: 'Heart', color: '#ef4444', type: 'expense' },
  { id: 'cat_travel', name: 'Travel', icon: 'Plane', color: '#0ea5e9', type: 'expense' },
  { id: 'cat_education', name: 'Education', icon: 'BookOpen', color: '#f43f5e', type: 'expense' },
  { id: 'cat_cc_payment', name: 'CC Payment', icon: 'CreditCard', color: '#64748b', type: 'transfer' },
  { id: 'cat_cash', name: 'Cash', icon: 'Banknote', color: '#84cc16', type: 'expense' },
  { id: 'cat_other', name: 'Other', icon: 'MoreHorizontal', color: '#94a3b8', type: 'expense' },
  { id: 'cat_salary', name: 'Salary', icon: 'Briefcase', color: '#22c55e', type: 'income' },
  { id: 'cat_investment', name: 'Investment', icon: 'TrendingUp', color: '#14b8a6', type: 'income' },
  { id: 'cat_other_income', name: 'Other Income', icon: 'PlusCircle', color: '#84cc16', type: 'income' },
  { id: 'cat_transfer', name: 'Transfer', icon: 'ArrowRightLeft', color: '#94a3b8', type: 'transfer' },
  { id: 'cat_uncategorized', name: 'Uncategorized', icon: 'HelpCircle', color: '#64748b', type: 'expense' }
];