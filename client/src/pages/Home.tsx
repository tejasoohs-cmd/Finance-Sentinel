import { useState } from "react";
import { useFinanceStore } from "@/store/financeStore";
import { Card, Category, Transaction } from "@/types/finance";
import * as Icons from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";

export function Dashboard() {
  const { transactions, loadDemoData, clearAllData, cards } = useFinanceStore();
  const [viewMode, setViewMode] = useState<"actual" | "full">("actual");

  // Filter transactions based on view mode
  // "actual" mode excludes internal transfers and CC payments from expense/income calculation
  // "full" mode shows all money movement in and out, ignoring the isTransferMatched flag
  const effectiveTxs = viewMode === "actual" 
    ? transactions.filter(t => !t.isTransferMatched) 
    : transactions;

  const totalBalance = transactions.reduce((acc, tx) => acc + tx.amount, 0);
  
  const income = effectiveTxs.filter(t => t.type === 'income' || (t.amount > 0 && viewMode === "full")).reduce((acc, tx) => acc + tx.amount, 0);
  const expenses = effectiveTxs.filter(t => t.type === 'expense' || (t.amount < 0 && viewMode === "full")).reduce((acc, tx) => acc + Math.abs(tx.amount), 0);

  // Cash wallet calculation
  const cashWallet = cards.find(c => c.type === 'cash');
  const cashBalance = cashWallet ? transactions.filter(t => t.cardId === cashWallet.id).reduce((acc, tx) => acc + tx.amount, 0) : 0;

  const personalTxs = effectiveTxs.filter(t => t.type === 'expense' && t.tag === 'personal');
  const businessTxs = effectiveTxs.filter(t => t.type === 'expense' && t.tag === 'business');
  
  const personalExpenses = personalTxs.reduce((acc, tx) => acc + Math.abs(tx.amount), 0);
  const businessExpenses = businessTxs.reduce((acc, tx) => acc + Math.abs(tx.amount), 0);
  
  // Calculate spend by account
  const accountSpend: Record<string, number> = {};
  effectiveTxs.filter(t => t.type === 'expense').forEach(tx => {
     if (tx.cardId) {
        accountSpend[tx.cardId] = (accountSpend[tx.cardId] || 0) + Math.abs(tx.amount);
     }
  });

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-24">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary">Overview</h1>
          <p className="text-muted-foreground">Your financial snapshot for this month.</p>
        </div>
        <div className="flex gap-2 items-center flex-wrap">
          <div className="bg-secondary/50 p-1 rounded-xl flex gap-1 mr-2 sm:mr-4 border border-border">
            <button 
              onClick={() => setViewMode("actual")}
              className={`px-3 py-1.5 text-sm font-bold rounded-lg transition-all ${viewMode === 'actual' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
            >
              Actual Spend
            </button>
            <button 
              onClick={() => setViewMode("full")}
              className={`px-3 py-1.5 text-sm font-bold rounded-lg transition-all ${viewMode === 'full' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
            >
              Full Flow
            </button>
          </div>
          
          <button 
            onClick={loadDemoData}
            className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 transition-colors text-sm font-medium"
          >
            Demo Data
          </button>
          <button 
            onClick={clearAllData}
            className="px-4 py-2 bg-destructive/10 text-destructive border border-destructive/20 rounded-lg hover:bg-destructive/20 transition-colors text-sm font-medium p-2"
            title="Clear Data"
          >
            <Icons.Trash2 className="w-4 h-4"/>
          </button>
        </div>
      </div>

      {viewMode === 'actual' && (
        <div className="bg-primary/10 border border-primary/20 text-primary px-4 py-3 rounded-xl flex items-start gap-3 mb-6">
          <Icons.Info className="w-5 h-5 shrink-0 mt-0.5" />
          <p className="text-sm font-medium">
            <strong>Actual Spend Mode:</strong> Internal transfers, credit card payments, and cash withdrawals are excluded from these totals to show your true net worth growth and real spending.
          </p>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-4">
        <div className="p-6 bg-card border border-border rounded-3xl shadow-xl relative overflow-hidden group col-span-1 md:col-span-2 lg:col-span-1 hover:border-primary/50 transition-colors">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="flex flex-row items-center justify-between pb-2">
            <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Total Net Worth</h3>
            <div className="p-2 bg-primary/10 rounded-xl">
              <Icons.Wallet className="h-5 w-5 text-primary" />
            </div>
          </div>
          <div className="text-3xl font-bold text-foreground font-mono mt-2">
            {formatCurrency(totalBalance)}
          </div>
        </div>
        
        <div className="p-6 bg-card border border-border rounded-3xl shadow-xl relative overflow-hidden group hover:border-green-500/50 transition-colors">
          <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="flex flex-row items-center justify-between pb-2">
            <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider">{viewMode === 'actual' ? 'Real Income' : 'Total Inflow'}</h3>
            <div className="p-2 bg-green-500/10 rounded-xl">
              <Icons.TrendingUp className="h-5 w-5 text-green-500" />
            </div>
          </div>
          <div className="text-3xl font-bold text-foreground font-mono mt-2 text-green-500">
            {formatCurrency(income)}
          </div>
        </div>

        <div className="p-6 bg-card border border-border rounded-3xl shadow-xl relative overflow-hidden group hover:border-red-500/50 transition-colors">
          <div className="absolute inset-0 bg-gradient-to-br from-red-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="flex flex-row items-center justify-between pb-2">
            <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider">{viewMode === 'actual' ? 'Real Expenses' : 'Total Outflow'}</h3>
            <div className="p-2 bg-red-500/10 rounded-xl">
              <Icons.TrendingDown className="h-5 w-5 text-red-500" />
            </div>
          </div>
          <div className="text-3xl font-bold text-foreground font-mono mt-2 text-foreground">
            {formatCurrency(expenses)}
          </div>
          <div className="flex gap-4 mt-4 pt-4 border-t border-border">
             <div>
                <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Personal</p>
                <p className="font-mono font-bold text-sm">{formatCurrency(personalExpenses)}</p>
             </div>
             <div>
                <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Business</p>
                <p className="font-mono font-bold text-sm">{formatCurrency(businessExpenses)}</p>
             </div>
          </div>
        </div>

        <div className="p-6 bg-card border border-border rounded-3xl shadow-xl relative overflow-hidden group hover:border-yellow-500/50 transition-colors bg-gradient-to-br from-yellow-900/10 to-transparent">
          <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="flex flex-row items-center justify-between pb-2">
            <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Cash Wallet</h3>
            <div className="p-2 bg-yellow-500/10 rounded-xl">
              <Icons.Banknote className="h-5 w-5 text-yellow-500" />
            </div>
          </div>
          <div className="text-3xl font-bold text-foreground font-mono mt-2">
            {formatCurrency(cashBalance)}
          </div>
          {cashWallet && (
            <p className="text-xs text-muted-foreground mt-1 font-medium">{cashWallet.name}</p>
          )}
        </div>
      </div>
      
      {/* Quick Actions & Recent Activity Mockup */}
      <div className="grid gap-6 md:grid-cols-3">
         <div className="md:col-span-2 border border-border rounded-3xl bg-card p-6 shadow-lg">
            <h3 className="font-bold text-lg mb-4">Recent Activity</h3>
            <div className="space-y-4">
               {transactions.slice(0, 5).map(tx => (
                 <div key={tx.id} className="flex justify-between items-center py-2 border-b border-border/50 last:border-0">
                    <div className="flex items-center gap-3">
                       <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center">
                          <Icons.Receipt className="w-5 h-5 text-muted-foreground"/>
                       </div>
                       <div>
                          <p className="font-bold text-sm">{tx.description}</p>
                          <p className="text-xs text-muted-foreground">{tx.date}</p>
                       </div>
                    </div>
                    <div className={`font-mono font-bold text-sm ${tx.amount > 0 ? 'text-green-500' : 'text-foreground'}`}>
                       {tx.amount > 0 ? '+' : ''}{formatCurrency(tx.amount)}
                    </div>
                 </div>
               ))}
               {transactions.length === 0 && (
                 <p className="text-sm text-muted-foreground text-center py-8">No recent transactions. Go to Ledger to add some.</p>
               )}
            </div>
         </div>
         
         <div className="border border-border rounded-3xl bg-card p-6 shadow-lg flex flex-col items-center justify-center text-center">
             <div className="w-16 h-16 rounded-2xl bg-primary/20 text-primary flex items-center justify-center mb-4">
                 <Icons.CreditCard className="w-8 h-8" />
             </div>
             <h3 className="font-bold mb-2">Spend by Account</h3>
             <div className="w-full space-y-2 mt-4 text-left">
                {Object.entries(accountSpend).sort((a,b) => b[1] - a[1]).slice(0,3).map(([cardId, amount]) => {
                   const c = cards.find(c => c.id === cardId);
                   return (
                     <div key={cardId} className="flex justify-between text-sm items-center">
                        <span className="text-muted-foreground truncate pr-2">{c?.name || 'Unknown'}</span>
                        <span className="font-mono font-bold">{formatCurrency(amount)}</span>
                     </div>
                   );
                })}
             </div>
         </div>
      </div>
    </div>
  );
}