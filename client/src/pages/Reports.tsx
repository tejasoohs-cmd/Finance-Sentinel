import { useMemo, useState } from "react";
import { useFinanceStore } from "@/store/financeStore";
import { formatCurrency } from "@/lib/utils";
import * as Icons from "lucide-react";
import { useLocation } from "wouter";

export function Reports() {
  const { transactions, categories, cards } = useFinanceStore();
  const [, setLocation] = useLocation();
  const [selectedMonth, setSelectedMonth] = useState<string>("all");

  const navigateToLedger = (params: Record<string, string>) => {
    const query = new URLSearchParams({ view: 'all', ...params }).toString();
    setLocation(`/ledger?${query}`);
  };

  const getCategoryColor = (id: string) => categories.find(c => c.id === id)?.color || '#94a3b8';
  const getCategoryName = (id: string) => categories.find(c => c.id === id)?.name || 'Unknown';
  const getCardName = (id: string) => cards.find(c => c.id === id)?.name || 'Unknown';

  const months = useMemo(() => {
     return Array.from(new Set(transactions.map(t => t.date.substring(0, 7)))).sort().reverse();
  }, [transactions]);

  const stats = useMemo(() => {
    // We base reports on "Actual" money flow, so we ignore matched internal transfers.
    let actualTxs = transactions.filter(t => !t.isTransferMatched);
    
    if (selectedMonth !== 'all') {
       actualTxs = actualTxs.filter(t => t.date.startsWith(selectedMonth));
    }

    let income = 0;
    let expense = 0;
    let personalSpend = 0;
    let businessSpend = 0;
    const byCategory: Record<string, number> = {};
    const byAccount: Record<string, number> = {};
    let cashSpend = 0;

    actualTxs.forEach(tx => {
      if (tx.type === 'income') {
        income += tx.amount;
      } else if (tx.type === 'expense') {
        const absAmount = Math.abs(tx.amount);
        expense += absAmount;

        if (tx.tag === 'personal') personalSpend += absAmount;
        if (tx.tag === 'business') businessSpend += absAmount;

        byCategory[tx.categoryId] = (byCategory[tx.categoryId] || 0) + absAmount;

        if (tx.cardId) {
          byAccount[tx.cardId] = (byAccount[tx.cardId] || 0) + absAmount;
          const card = cards.find(c => c.id === tx.cardId);
          if (card?.type === 'cash') cashSpend += absAmount;
        }
      }
    });

    return {
      income,
      expense,
      net: income - expense,
      personalSpend,
      businessSpend,
      byCategory: Object.entries(byCategory).sort((a, b) => b[1] - a[1]),
      byAccount: Object.entries(byAccount).sort((a, b) => b[1] - a[1]),
      cashSpend
    };
  }, [transactions, cards, selectedMonth]);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-24">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary">Reports</h1>
          <p className="text-muted-foreground">Detailed breakdown of your financial activity.</p>
        </div>
        <div className="flex items-center gap-2">
           <Icons.Calendar className="w-5 h-5 text-muted-foreground" />
           <select 
             value={selectedMonth}
             onChange={e => setSelectedMonth(e.target.value)}
             className="px-4 py-2.5 bg-secondary/30 border border-border rounded-xl text-sm font-bold focus:outline-none"
           >
             <option value="all">All Time</option>
             {months.map(m => (
               <option key={m} value={m}>{new Date(`${m}-01`).toLocaleDateString('default', { month: 'long', year: 'numeric' })}</option>
             ))}
           </select>
        </div>
      </div>

      {/* High-Level Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div 
          onClick={() => navigateToLedger({ type: 'income' })}
          className="bg-card border border-border p-4 rounded-2xl shadow-sm cursor-pointer hover:border-green-500/50 transition-colors group"
        >
          <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1 flex items-center gap-1"><Icons.TrendingUp className="w-3 h-3 text-green-500" /> Income</div>
          <div className="text-xl font-mono font-bold text-green-500 group-hover:scale-105 transition-transform origin-left">{formatCurrency(stats.income)}</div>
        </div>
        <div 
          onClick={() => navigateToLedger({ type: 'expense' })}
          className="bg-card border border-border p-4 rounded-2xl shadow-sm cursor-pointer hover:border-red-500/50 transition-colors group"
        >
          <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1 flex items-center gap-1"><Icons.TrendingDown className="w-3 h-3 text-red-500" /> Expense</div>
          <div className="text-xl font-mono font-bold text-foreground group-hover:scale-105 transition-transform origin-left">{formatCurrency(stats.expense)}</div>
        </div>
        <div className="bg-card border border-border p-4 rounded-2xl shadow-sm">
          <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1 flex items-center gap-1"><Icons.Scale className="w-3 h-3 text-primary" /> Net Flow</div>
          <div className={`text-xl font-mono font-bold ${stats.net >= 0 ? 'text-green-500' : 'text-orange-500'}`}>
            {stats.net > 0 ? '+' : ''}{formatCurrency(stats.net)}
          </div>
        </div>
        <div 
          onClick={() => navigateToLedger({ type: 'expense', tag: 'personal' })}
          className="bg-card border border-border p-4 rounded-2xl shadow-sm cursor-pointer hover:border-blue-500/50 transition-colors group"
        >
          <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1 flex items-center gap-1"><Icons.User className="w-3 h-3 text-blue-500" /> Personal Spend</div>
          <div className="text-xl font-mono font-bold text-foreground group-hover:scale-105 transition-transform origin-left">{formatCurrency(stats.personalSpend)}</div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Category Breakdown */}
        <div className="bg-card border border-border rounded-3xl p-6 shadow-sm">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Icons.PieChart className="w-5 h-5 text-primary" />
            Spending by Category
          </h2>
          <div className="space-y-4">
            {stats.byCategory.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No categorized expenses yet.</p>
            ) : (
              stats.byCategory.map(([categoryId, amount]) => {
                const percent = stats.expense > 0 ? (amount / stats.expense) * 100 : 0;
                return (
                  <div 
                    key={categoryId} 
                    onClick={() => navigateToLedger({ type: 'expense', category: categoryId })}
                    className="group cursor-pointer"
                  >
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium group-hover:text-primary transition-colors flex items-center gap-2">
                        {getCategoryName(categoryId)}
                        {percent > 20 && <span className="bg-orange-500/20 text-orange-500 px-1.5 rounded text-[10px] uppercase font-bold tracking-wider">Top Spend</span>}
                      </span>
                      <div className="text-right">
                         <span className="font-mono font-bold">{formatCurrency(amount)}</span>
                         <span className="text-xs text-muted-foreground ml-2">({percent.toFixed(1)}%)</span>
                      </div>
                    </div>
                    <div className="w-full bg-secondary rounded-full h-2 overflow-hidden flex">
                      <div 
                        className="h-full rounded-full transition-all" 
                        style={{ width: `${percent}%`, backgroundColor: getCategoryColor(categoryId) }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Account Breakdown & Ownership */}
        <div className="space-y-6">
          <div className="bg-card border border-border rounded-3xl p-6 shadow-sm">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Icons.CreditCard className="w-5 h-5 text-primary" />
              Spending by Account
            </h2>
            <div className="space-y-3">
              {stats.byAccount.length === 0 ? (
                 <p className="text-sm text-muted-foreground py-4 text-center">No account spending yet.</p>
              ) : (
                stats.byAccount.map(([cardId, amount]) => (
                  <div 
                    key={cardId} 
                    onClick={() => navigateToLedger({ type: 'expense', card: cardId })}
                    className="flex justify-between items-center p-3 rounded-xl border border-transparent hover:border-border hover:bg-secondary/30 cursor-pointer transition-all"
                  >
                    <span className="font-medium text-sm">{getCardName(cardId)}</span>
                    <span className="font-mono font-bold text-sm">{formatCurrency(amount)}</span>
                  </div>
                ))
              )}
            </div>
            
            {stats.cashSpend > 0 && (
              <div className="mt-4 pt-4 border-t border-border flex justify-between items-center text-sm">
                <span className="font-bold flex items-center gap-2"><Icons.Banknote className="w-4 h-4 text-green-500"/> Total Cash Spent</span>
                <span className="font-mono font-bold">{formatCurrency(stats.cashSpend)}</span>
              </div>
            )}
          </div>

          <div className="bg-card border border-border rounded-3xl p-6 shadow-sm">
             <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Icons.Briefcase className="w-5 h-5 text-primary" />
              Ownership Split
            </h2>
            <div className="flex h-4 rounded-full overflow-hidden mb-3 bg-secondary">
               <div className="bg-blue-500 h-full transition-all" style={{ width: `${stats.expense > 0 ? (stats.personalSpend/stats.expense)*100 : 0}%` }}></div>
               <div className="bg-purple-500 h-full transition-all" style={{ width: `${stats.expense > 0 ? (stats.businessSpend/stats.expense)*100 : 0}%` }}></div>
            </div>
            <div className="flex justify-between text-sm">
               <div 
                 onClick={() => navigateToLedger({ type: 'expense', tag: 'personal' })}
                 className="flex items-center gap-2 cursor-pointer hover:opacity-70 transition-opacity"
               >
                  <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                  <span className="font-medium">Personal ({stats.expense > 0 ? Math.round((stats.personalSpend/stats.expense)*100) : 0}%)</span>
               </div>
               <div 
                 onClick={() => navigateToLedger({ type: 'expense', tag: 'business' })}
                 className="flex items-center gap-2 cursor-pointer hover:opacity-70 transition-opacity"
               >
                  <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                  <span className="font-medium">Business ({stats.expense > 0 ? Math.round((stats.businessSpend/stats.expense)*100) : 0}%)</span>
               </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}