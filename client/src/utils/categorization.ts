import { Transaction } from "@/types/finance";

export interface CategorizationRule {
  id: string;
  keyword: string;
  categoryId: string;
  tag: string;
  type?: 'expense' | 'income' | 'transfer';
  isExactMatch?: boolean;
  isEnabled?: boolean;
}

export interface RecurringPattern {
  key: string;
  description: string;
  categoryId: string;
  frequency: 'weekly' | 'monthly' | 'quarterly' | 'annual';
  avgAmount: number;
  count: number;
  lastDate: string;
  nextEstimate?: string;
}

export const DEFAULT_RULES: CategorizationRule[] = [
  // Groceries
  { id: 'rule_groc_1', keyword: 'spinneys', categoryId: 'cat_groceries', tag: 'personal' },
  { id: 'rule_groc_2', keyword: 'carrefour', categoryId: 'cat_groceries', tag: 'personal' },
  { id: 'rule_groc_3', keyword: 'waitrose', categoryId: 'cat_groceries', tag: 'personal' },
  { id: 'rule_groc_4', keyword: 'lulu', categoryId: 'cat_groceries', tag: 'personal' },
  { id: 'rule_groc_5', keyword: 'choithrams', categoryId: 'cat_groceries', tag: 'personal' },
  { id: 'rule_groc_6', keyword: 'zoom', categoryId: 'cat_groceries', tag: 'personal' },
  { id: 'rule_groc_7', keyword: 'al maya', categoryId: 'cat_groceries', tag: 'personal' },
  { id: 'rule_groc_8', keyword: 'union coop', categoryId: 'cat_groceries', tag: 'personal' },
  { id: 'rule_groc_9', keyword: 'kibsons', categoryId: 'cat_groceries', tag: 'personal' },
  { id: 'rule_groc_10', keyword: 'talabat', categoryId: 'cat_groceries', tag: 'personal' },
  { id: 'rule_groc_11', keyword: 'noon groceries', categoryId: 'cat_groceries', tag: 'personal' },

  // Food & Dining
  { id: 'rule_dine_1', keyword: 'zomato', categoryId: 'cat_dining', tag: 'personal' },
  { id: 'rule_dine_2', keyword: 'deliveroo', categoryId: 'cat_dining', tag: 'personal' },
  { id: 'rule_dine_3', keyword: 'mcdonald', categoryId: 'cat_dining', tag: 'personal' },
  { id: 'rule_dine_4', keyword: 'kfc', categoryId: 'cat_dining', tag: 'personal' },
  { id: 'rule_dine_5', keyword: 'starbucks', categoryId: 'cat_dining', tag: 'personal' },
  { id: 'rule_dine_6', keyword: 'costa coffee', categoryId: 'cat_dining', tag: 'personal' },
  { id: 'rule_dine_7', keyword: 'tim hortons', categoryId: 'cat_dining', tag: 'personal' },
  { id: 'rule_dine_8', keyword: 'cafe', categoryId: 'cat_dining', tag: 'personal' },
  { id: 'rule_dine_9', keyword: 'restaurant', categoryId: 'cat_dining', tag: 'personal' },

  // Transport
  { id: 'rule_trans_1', keyword: 'rta', categoryId: 'cat_transport', tag: 'personal' },
  { id: 'rule_trans_2', keyword: 'nol', categoryId: 'cat_transport', tag: 'personal' },
  { id: 'rule_trans_3', keyword: 'salik', categoryId: 'cat_transport', tag: 'personal' },
  { id: 'rule_trans_4', keyword: 'careem', categoryId: 'cat_transport', tag: 'personal' },
  { id: 'rule_trans_5', keyword: 'uber', categoryId: 'cat_transport', tag: 'personal' },
  { id: 'rule_trans_6', keyword: 'taxi', categoryId: 'cat_transport', tag: 'personal' },
  { id: 'rule_trans_7', keyword: 'enoc', categoryId: 'cat_transport', tag: 'personal' },
  { id: 'rule_trans_8', keyword: 'eppco', categoryId: 'cat_transport', tag: 'personal' },
  { id: 'rule_trans_9', keyword: 'adnoc', categoryId: 'cat_transport', tag: 'personal' },
  { id: 'rule_trans_10', keyword: 'cafu', categoryId: 'cat_transport', tag: 'personal' },

  // Utilities
  { id: 'rule_util_1', keyword: 'dewa', categoryId: 'cat_utilities', tag: 'personal' },
  { id: 'rule_util_2', keyword: 'sewa', categoryId: 'cat_utilities', tag: 'personal' },
  { id: 'rule_util_3', keyword: 'etihad we', categoryId: 'cat_utilities', tag: 'personal' },
  { id: 'rule_util_4', keyword: 'etisalat', categoryId: 'cat_utilities', tag: 'personal' },
  { id: 'rule_util_5', keyword: 'du', categoryId: 'cat_utilities', tag: 'personal' },
  { id: 'rule_util_6', keyword: 'empower', categoryId: 'cat_utilities', tag: 'personal' },

  // Shopping
  { id: 'rule_shop_1', keyword: 'amazon', categoryId: 'cat_shopping', tag: 'personal' },
  { id: 'rule_shop_2', keyword: 'noon', categoryId: 'cat_shopping', tag: 'personal' },
  { id: 'rule_shop_3', keyword: 'namshi', categoryId: 'cat_shopping', tag: 'personal' },
  { id: 'rule_shop_4', keyword: 'zara', categoryId: 'cat_shopping', tag: 'personal' },
  { id: 'rule_shop_5', keyword: 'h&m', categoryId: 'cat_shopping', tag: 'personal' },
  { id: 'rule_shop_6', keyword: 'ikea', categoryId: 'cat_shopping', tag: 'personal' },
  { id: 'rule_shop_7', keyword: 'dubai mall', categoryId: 'cat_shopping', tag: 'personal' },
  { id: 'rule_shop_8', keyword: 'mall of the emirates', categoryId: 'cat_shopping', tag: 'personal' },

  // Entertainment
  { id: 'rule_ent_1', keyword: 'netflix', categoryId: 'cat_entertainment', tag: 'personal' },
  { id: 'rule_ent_2', keyword: 'spotify', categoryId: 'cat_entertainment', tag: 'personal' },
  { id: 'rule_ent_3', keyword: 'apple', categoryId: 'cat_entertainment', tag: 'personal' },
  { id: 'rule_ent_4', keyword: 'google', categoryId: 'cat_entertainment', tag: 'personal' },
  { id: 'rule_ent_5', keyword: 'osn', categoryId: 'cat_entertainment', tag: 'personal' },
  { id: 'rule_ent_6', keyword: 'vox cinemas', categoryId: 'cat_entertainment', tag: 'personal' },
  { id: 'rule_ent_7', keyword: 'reel cinemas', categoryId: 'cat_entertainment', tag: 'personal' },

  // Healthcare
  { id: 'rule_health_1', keyword: 'pharmacy', categoryId: 'cat_health', tag: 'personal' },
  { id: 'rule_health_2', keyword: 'aster', categoryId: 'cat_health', tag: 'personal' },
  { id: 'rule_health_3', keyword: 'life pharmacy', categoryId: 'cat_health', tag: 'personal' },
  { id: 'rule_health_4', keyword: 'clinic', categoryId: 'cat_health', tag: 'personal' },
  { id: 'rule_health_5', keyword: 'hospital', categoryId: 'cat_health', tag: 'personal' },

  // Travel
  { id: 'rule_trav_1', keyword: 'emirates airline', categoryId: 'cat_travel', tag: 'personal' },
  { id: 'rule_trav_2', keyword: 'flydubai', categoryId: 'cat_travel', tag: 'personal' },
  { id: 'rule_trav_3', keyword: 'air arabia', categoryId: 'cat_travel', tag: 'personal' },
  { id: 'rule_trav_4', keyword: 'etihad airways', categoryId: 'cat_travel', tag: 'personal' },
  { id: 'rule_trav_5', keyword: 'booking.com', categoryId: 'cat_travel', tag: 'personal' },
  { id: 'rule_trav_6', keyword: 'agoda', categoryId: 'cat_travel', tag: 'personal' },
  { id: 'rule_trav_7', keyword: 'airbnb', categoryId: 'cat_travel', tag: 'personal' },

  // Transfers / Finance
  { id: 'rule_transf_1', keyword: 'transfer', categoryId: 'cat_transfer', tag: 'none', type: 'transfer' },
  { id: 'rule_transf_2', keyword: 'payment received', categoryId: 'cat_transfer', tag: 'none', type: 'transfer' },
  { id: 'rule_transf_3', keyword: 'atm wd', categoryId: 'cat_cash', tag: 'personal', type: 'expense' },
  { id: 'rule_transf_4', keyword: 'cash deposit', categoryId: 'cat_transfer', tag: 'none', type: 'transfer' },
  { id: 'rule_transf_5', keyword: 'card payment', categoryId: 'cat_transfer', tag: 'none', type: 'transfer' },
  { id: 'rule_transf_6', keyword: 'bank payment', categoryId: 'cat_transfer', tag: 'none', type: 'transfer' },
  { id: 'rule_transf_7', keyword: 'cash payment', categoryId: 'cat_transfer', tag: 'none', type: 'transfer' },
  { id: 'rule_transf_8', keyword: 'payment - thank you', categoryId: 'cat_transfer', tag: 'none', type: 'transfer' },
  { id: 'rule_transf_9', keyword: 'payment by transfer', categoryId: 'cat_transfer', tag: 'none', type: 'transfer' },
  { id: 'rule_transf_10', keyword: 'autopay', categoryId: 'cat_transfer', tag: 'none', type: 'transfer' },

  // Income
  { id: 'rule_inc_1', keyword: 'salary', categoryId: 'cat_salary', tag: 'personal', type: 'income' },
  { id: 'rule_inc_2', keyword: 'dividend', categoryId: 'cat_investment', tag: 'personal', type: 'income' },
];

export function autoCategorize(description: string, rules: CategorizationRule[], defaultType: 'expense' | 'income' | 'transfer'): { categoryId: string, tag: string } {
  const lowerDesc = description.toLowerCase();
  const activeRules = rules.filter(r => r.isEnabled !== false);

  const match = activeRules.find(rule => {
    if (rule.type && rule.type !== defaultType) return false;
    if (rule.isExactMatch) {
      const words = lowerDesc.split(/[\s,.-]+/);
      return words.includes(rule.keyword.toLowerCase());
    } else {
      return lowerDesc.includes(rule.keyword.toLowerCase());
    }
  });

  if (match) {
    return { categoryId: match.categoryId, tag: match.tag };
  }

  if (defaultType === 'income') return { categoryId: 'cat_other_income', tag: 'none' };
  if (defaultType === 'transfer') return { categoryId: 'cat_transfer', tag: 'none' };
  return { categoryId: 'cat_uncategorized', tag: 'none' };
}

function normalizeDesc(desc: string): string {
  return desc.toLowerCase().replace(/[0-9#*@\-_\/\\|]+/g, ' ').replace(/\s+/g, ' ').trim().substring(0, 40);
}

export function detectRecurring(transactions: Transaction[]): RecurringPattern[] {
  const expenses = transactions.filter(t => t.type === 'expense' && !t.isTransferMatched);
  const groups: Record<string, Transaction[]> = {};

  expenses.forEach(tx => {
    const key = normalizeDesc(tx.description);
    if (!key || key.length < 3) return;
    if (!groups[key]) groups[key] = [];
    groups[key].push(tx);
  });

  const patterns: RecurringPattern[] = [];

  Object.entries(groups).forEach(([key, txs]) => {
    if (txs.length < 2) return;

    const sorted = [...txs].sort((a, b) => a.date.localeCompare(b.date));
    const dates = sorted.map(t => new Date(t.date).getTime());
    const gaps: number[] = [];
    for (let i = 1; i < dates.length; i++) {
      gaps.push((dates[i] - dates[i - 1]) / (1000 * 60 * 60 * 24));
    }

    const avgGap = gaps.reduce((a, b) => a + b, 0) / gaps.length;
    const avgAmount = Math.abs(sorted.reduce((a, t) => a + t.amount, 0) / sorted.length);

    let frequency: RecurringPattern['frequency'] | null = null;
    if (avgGap >= 5 && avgGap <= 10) frequency = 'weekly';
    else if (avgGap >= 20 && avgGap <= 40) frequency = 'monthly';
    else if (avgGap >= 80 && avgGap <= 105) frequency = 'quarterly';
    else if (avgGap >= 340 && avgGap <= 390) frequency = 'annual';

    if (!frequency) return;

    const lastTx = sorted[sorted.length - 1];
    const lastDate = new Date(lastTx.date);
    const daysToAdd = frequency === 'weekly' ? 7 : frequency === 'monthly' ? 30 : frequency === 'quarterly' ? 91 : 365;
    const nextDate = new Date(lastDate.getTime() + daysToAdd * 24 * 60 * 60 * 1000);

    patterns.push({
      key,
      description: lastTx.description,
      categoryId: lastTx.categoryId,
      frequency,
      avgAmount,
      count: txs.length,
      lastDate: lastTx.date,
      nextEstimate: nextDate.toISOString().split('T')[0],
    });
  });

  return patterns.sort((a, b) => b.count - a.count);
}
