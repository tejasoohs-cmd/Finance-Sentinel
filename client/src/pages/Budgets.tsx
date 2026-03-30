import { useFinanceStore } from "@/store/financeStore";
import * as Icons from "lucide-react";
import { formatCurrency } from "@/lib/utils";

export function Budgets() {
  const { budgets, transactions, categories } = useFinanceStore();

  // Basic mock calculation for the current month
  const currentMonthTransactions = transactions.filter(t => t.type === 'expense');

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary">Budgets</h1>
          <p className="text-muted-foreground">Track your spending limits.</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium">
          <Icons.Plus className="h-4 w-4" />
          Create Budget
        </button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {budgets.length === 0 ? (
          <div className="col-span-full border-2 border-dashed border-border rounded-xl p-12 flex flex-col items-center justify-center text-muted-foreground text-center">
            <Icons.PieChart className="w-12 h-12 mb-4 opacity-20" />
            <h3 className="text-lg font-medium text-foreground mb-1">No budgets yet</h3>
            <p className="max-w-sm">Create a budget to monitor your spending in specific categories like Groceries, Dining, or Shopping.</p>
          </div>
        ) : (
          budgets.map(budget => {
            const category = categories.find(c => c.id === budget.categoryId);
            const spent = Math.abs(currentMonthTransactions
              .filter(t => t.categoryId === budget.categoryId)
              .reduce((sum, t) => sum + t.amount, 0));
            const percentage = Math.min(100, Math.round((spent / budget.amount) * 100));
            
            const Icon = category && (Icons as any)[category.icon] ? (Icons as any)[category.icon] : Icons.HelpCircle;

            return (
              <div key={budget.id} className="bg-card border border-border p-6 rounded-xl shadow-sm">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-10 h-10 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: `${category?.color || '#64748b'}20`, color: category?.color || '#64748b' }}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-medium">{category?.name || 'Unknown'}</h3>
                      <p className="text-xs text-muted-foreground">{budget.month}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono font-bold text-lg">{formatCurrency(spent)}</div>
                    <div className="text-xs text-muted-foreground">of {formatCurrency(budget.amount)}</div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span>{percentage}% Used</span>
                    <span className={percentage >= 100 ? "text-destructive font-medium" : "text-muted-foreground"}>
                      {formatCurrency(budget.amount - spent)} remaining
                    </span>
                  </div>
                  <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                    <div 
                      className="h-full rounded-full transition-all duration-1000"
                      style={{ 
                        width: `${percentage}%`,
                        backgroundColor: percentage >= 100 ? 'hsl(var(--destructive))' : percentage > 80 ? '#f59e0b' : category?.color || 'hsl(var(--primary))'
                      }}
                    />
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}