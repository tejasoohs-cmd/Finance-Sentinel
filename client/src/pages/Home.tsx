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

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary">Overview</h1>
          <p className="text-muted-foreground">Your financial snapshot for this month.</p>
        </div>
        <div className="flex gap-2 items-center">
          <div className="bg-secondary/50 p-1 rounded-xl flex gap-1 mr-4 border border-border">
            <button 
              onClick={() => setViewMode("actual")}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-all ${viewMode === 'actual' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
            >
              Actual Spend
            </button>
            <button 
              onClick={() => setViewMode("full")}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-all ${viewMode === 'full' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
            >
              Full Flow
            </button>
          </div>
          
          <button 
            onClick={loadDemoData}
            className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 transition-colors text-sm font-medium"
          >
            Load Demo Data
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
        <div className="p-6 bg-card border border-border rounded-xl shadow-lg relative overflow-hidden group col-span-1 md:col-span-2 lg:col-span-1">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="flex flex-row items-center justify-between pb-2">
            <h3 className="text-sm font-medium text-muted-foreground">Total Net Worth</h3>
            <Icons.Wallet className="h-4 w-4 text-primary" />
          </div>
          <div className="text-3xl font-bold text-foreground font-mono">
            {formatCurrency(totalBalance)}
          </div>
        </div>
        
        <div className="p-6 bg-card border border-border rounded-xl shadow-lg relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="flex flex-row items-center justify-between pb-2">
            <h3 className="text-sm font-medium text-muted-foreground">{viewMode === 'actual' ? 'Real Income' : 'Total Inflow'}</h3>
            <Icons.TrendingUp className="h-4 w-4 text-green-500" />
          </div>
          <div className="text-3xl font-bold text-foreground font-mono">
            {formatCurrency(income)}
          </div>
        </div>

        <div className="p-6 bg-card border border-border rounded-xl shadow-lg relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-red-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="flex flex-row items-center justify-between pb-2">
            <h3 className="text-sm font-medium text-muted-foreground">{viewMode === 'actual' ? 'Real Expenses' : 'Total Outflow'}</h3>
            <Icons.TrendingDown className="h-4 w-4 text-red-500" />
          </div>
          <div className="text-3xl font-bold text-foreground font-mono">
            {formatCurrency(expenses)}
          </div>
        </div>

        <div className="p-6 bg-card border border-border rounded-xl shadow-lg relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="flex flex-row items-center justify-between pb-2">
            <h3 className="text-sm font-medium text-muted-foreground">Cash Wallet</h3>
            <Icons.Banknote className="h-4 w-4 text-yellow-500" />
          </div>
          <div className="text-3xl font-bold text-foreground font-mono">
            {formatCurrency(cashBalance)}
          </div>
          {cashWallet && (
            <p className="text-xs text-muted-foreground mt-1 tracking-wider uppercase">{cashWallet.name}</p>
          )}
        </div>
      </div>
      
      {/* Placeholder for more components */}
      <div className="h-64 border border-dashed border-border rounded-xl flex flex-col items-center justify-center text-muted-foreground bg-card/50">
        <Icons.BarChart3 className="w-12 h-12 mb-4 opacity-20" />
        <p>Analytics & Category breakdown will appear here.</p>
      </div>
    </div>
  );
}