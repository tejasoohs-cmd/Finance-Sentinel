import { useFinanceStore } from "@/store/financeStore";
import { Card, Category, Transaction } from "@/types/finance";
import * as Icons from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";

// Mockup dashboard component
export function Dashboard() {
  const { transactions, loadDemoData, clearAllData } = useFinanceStore();

  const totalBalance = transactions.reduce((acc, tx) => acc + tx.amount, 0);
  const income = transactions.filter(t => t.type === 'income').reduce((acc, tx) => acc + tx.amount, 0);
  const expenses = transactions.filter(t => t.type === 'expense').reduce((acc, tx) => acc + Math.abs(tx.amount), 0);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary">Overview</h1>
          <p className="text-muted-foreground">Your financial snapshot for this month.</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={loadDemoData}
            className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 transition-colors text-sm font-medium"
          >
            Load Demo Data
          </button>
          <button 
            onClick={clearAllData}
            className="px-4 py-2 bg-destructive/10 text-destructive border border-destructive/20 rounded-lg hover:bg-destructive/20 transition-colors text-sm font-medium"
          >
            Clear Data
          </button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="p-6 bg-card border border-border rounded-xl shadow-lg relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="flex flex-row items-center justify-between pb-2">
            <h3 className="text-sm font-medium text-muted-foreground">Total Balance</h3>
            <Icons.Wallet className="h-4 w-4 text-primary" />
          </div>
          <div className="text-3xl font-bold text-foreground font-mono">
            {formatCurrency(totalBalance)}
          </div>
        </div>
        
        <div className="p-6 bg-card border border-border rounded-xl shadow-lg relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="flex flex-row items-center justify-between pb-2">
            <h3 className="text-sm font-medium text-muted-foreground">Total Income</h3>
            <Icons.TrendingUp className="h-4 w-4 text-green-500" />
          </div>
          <div className="text-3xl font-bold text-foreground font-mono">
            {formatCurrency(income)}
          </div>
        </div>

        <div className="p-6 bg-card border border-border rounded-xl shadow-lg relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-red-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="flex flex-row items-center justify-between pb-2">
            <h3 className="text-sm font-medium text-muted-foreground">Total Expenses</h3>
            <Icons.TrendingDown className="h-4 w-4 text-red-500" />
          </div>
          <div className="text-3xl font-bold text-foreground font-mono">
            {formatCurrency(expenses)}
          </div>
        </div>
      </div>
      
      {/* Placeholder for more components */}
      <div className="h-64 border border-dashed border-border rounded-xl flex items-center justify-center text-muted-foreground bg-card/50">
        Transactions Chart / Recent Activity will go here
      </div>
    </div>
  );
}