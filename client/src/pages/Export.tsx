import { useState } from "react";
import { useFinanceStore } from "@/store/financeStore";
import * as Icons from "lucide-react";
import Papa from "papaparse";
import { format } from "date-fns";

export function ExportCenter() {
  const { transactions, cards, categories, tags, budgets } = useFinanceStore();
  const [selectedMonth, setSelectedMonth] = useState<string>("all");
  const [selectedCard, setSelectedCard] = useState<string>("all");

  const months = Array.from(new Set(transactions.map(t => t.date.substring(0, 7)))).sort().reverse();

  // Helper to format transactions for CSV
  const formatTransactionsForExport = (txs: typeof transactions) => {
    return txs.map(tx => {
      const card = cards.find(c => c.id === tx.cardId);
      const category = categories.find(c => c.id === tx.categoryId);
      
      return {
        Date: tx.date,
        Description: tx.description,
        "Original Description": tx.originalDescription || "",
        "Account/Card": card ? `${card.name} (${card.bank})` : "None",
        "Account Type": card ? card.type : "None",
        Direction: tx.amount > 0 ? "In" : "Out",
        Amount: Math.abs(tx.amount).toFixed(2),
        Nature: tx.type, // expense, income, transfer
        Ownership: tx.tag === 'business' ? 'Business' : (tx.tag === 'personal' ? 'Personal' : 'Uncategorized'),
        Category: category ? category.name : "Uncategorized",
        Tags: tx.tag,
        "Transfer Type": tx.transferType || "none",
        Notes: tx.notes || ""
      };
    });
  };

  const downloadCSV = (data: any[], filename: string) => {
    if (data.length === 0) {
      alert("No data found for this export.");
      return;
    }
    const csv = Papa.unparse(data);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `${filename}_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export handlers
  const exportAll = () => {
    downloadCSV(formatTransactionsForExport(transactions), "all_transactions");
  };

  const exportBusinessExpenses = () => {
    const data = transactions.filter(t => t.type === 'expense' && t.tag === 'business' && !t.isTransferMatched);
    downloadCSV(formatTransactionsForExport(data), "business_expenses");
  };

  const exportPersonalExpenses = () => {
    const data = transactions.filter(t => t.type === 'expense' && t.tag === 'personal' && !t.isTransferMatched);
    downloadCSV(formatTransactionsForExport(data), "personal_expenses");
  };

  const exportTransfers = () => {
    const data = transactions.filter(t => t.type === 'transfer' || t.isTransferMatched);
    downloadCSV(formatTransactionsForExport(data), "transfers");
  };

  const exportIncome = () => {
    const data = transactions.filter(t => t.type === 'income' && !t.isTransferMatched);
    downloadCSV(formatTransactionsForExport(data), "income");
  };

  const exportFiltered = () => {
    let filtered = transactions;
    if (selectedMonth !== "all") {
      filtered = filtered.filter(t => t.date.startsWith(selectedMonth));
    }
    if (selectedCard !== "all") {
      filtered = filtered.filter(t => t.cardId === selectedCard);
    }
    downloadCSV(formatTransactionsForExport(filtered), `filtered_report`);
  };

  const exportMonthlySummary = () => {
    if (selectedMonth === "all") {
        alert("Please select a specific month for the summary.");
        return;
    }
    const filtered = transactions.filter(t => t.date.startsWith(selectedMonth));
    
    // Calculate category summary for the month
    const summary: Record<string, number> = {};
    filtered.forEach(tx => {
        if (tx.isTransferMatched) return; // Skip transfers for spend summary
        const cat = categories.find(c => c.id === tx.categoryId)?.name || "Uncategorized";
        if (!summary[cat]) summary[cat] = 0;
        summary[cat] += tx.amount;
    });

    const data = Object.keys(summary).map(cat => ({
        Month: selectedMonth,
        Category: cat,
        Type: summary[cat] > 0 ? "Income" : "Expense",
        Total: Math.abs(summary[cat]).toFixed(2)
    }));

    downloadCSV(data, `monthly_summary_${selectedMonth}`);
  };

  const handleBackupExport = () => {
    const backupData = {
      version: 1,
      exportDate: new Date().toISOString(),
      data: { transactions, cards, categories, tags, budgets }
    };
    
    const dataStr = JSON.stringify(backupData, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', url);
    linkElement.setAttribute('download', `moneytrace_full_backup_${format(new Date(), 'yyyy-MM-dd')}.json`);
    linkElement.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-24">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-primary">Export Center</h1>
        <p className="text-muted-foreground">Generate accountant-friendly reports and CSV exports.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Quick CSV Exports */}
        <div className="p-6 bg-card border border-border rounded-3xl shadow-lg space-y-6 md:col-span-2">
          <div className="flex items-center gap-3 border-b border-border pb-4">
            <div className="p-2.5 bg-green-500/10 text-green-500 rounded-xl">
              <Icons.FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Standard Reports (CSV)</h2>
              <p className="text-xs text-muted-foreground">Ready for Excel or accounting software</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button onClick={exportAll} className="flex items-center justify-between p-4 bg-secondary/30 hover:bg-secondary rounded-2xl border border-border transition-all text-left group">
              <div>
                <div className="font-bold text-sm">All Transactions</div>
                <div className="text-xs text-muted-foreground">Complete ledger dump</div>
              </div>
              <Icons.Download className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
            </button>
            
            <button onClick={exportBusinessExpenses} className="flex items-center justify-between p-4 bg-secondary/30 hover:bg-secondary rounded-2xl border border-border transition-all text-left group">
              <div>
                <div className="font-bold text-sm">Business Expenses</div>
                <div className="text-xs text-muted-foreground">Filtered by 'business' tag</div>
              </div>
              <Icons.Download className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
            </button>
            
            <button onClick={exportPersonalExpenses} className="flex items-center justify-between p-4 bg-secondary/30 hover:bg-secondary rounded-2xl border border-border transition-all text-left group">
              <div>
                <div className="font-bold text-sm">Personal Expenses</div>
                <div className="text-xs text-muted-foreground">Filtered by 'personal' tag</div>
              </div>
              <Icons.Download className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
            </button>

            <button onClick={exportIncome} className="flex items-center justify-between p-4 bg-secondary/30 hover:bg-secondary rounded-2xl border border-border transition-all text-left group">
              <div>
                <div className="font-bold text-sm">Income Only</div>
                <div className="text-xs text-muted-foreground">Salary and deposits</div>
              </div>
              <Icons.Download className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
            </button>

            <button onClick={exportTransfers} className="flex items-center justify-between p-4 bg-secondary/30 hover:bg-secondary rounded-2xl border border-border transition-all text-left group">
              <div>
                <div className="font-bold text-sm">Transfers & CC Payments</div>
                <div className="text-xs text-muted-foreground">Internal money movement</div>
              </div>
              <Icons.Download className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
            </button>
          </div>
        </div>

        {/* Custom Filter Export */}
        <div className="p-6 bg-card border border-border rounded-3xl shadow-lg space-y-6">
          <div className="flex items-center gap-3 border-b border-border pb-4">
            <div className="p-2.5 bg-blue-500/10 text-blue-500 rounded-xl">
              <Icons.Filter className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Custom Export</h2>
              <p className="text-xs text-muted-foreground">Filter by time & account</p>
            </div>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Month</label>
              <select 
                className="w-full px-4 py-3 bg-secondary/30 border border-border rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-primary/50"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
              >
                <option value="all">All Time</option>
                {months.map(m => <option key={m} value={m}>{format(new Date(`${m}-01`), 'MMMM yyyy')}</option>)}
              </select>
            </div>
            
            <div>
              <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Account / Card</label>
              <select 
                className="w-full px-4 py-3 bg-secondary/30 border border-border rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-primary/50"
                value={selectedCard}
                onChange={(e) => setSelectedCard(e.target.value)}
              >
                <option value="all">All Accounts</option>
                {cards.map(c => <option key={c.id} value={c.id}>{c.name} (...{c.last4})</option>)}
              </select>
            </div>

            <div className="flex flex-col gap-2 pt-2">
              <button 
                onClick={exportFiltered}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-secondary text-foreground rounded-xl hover:bg-secondary/80 transition-colors text-sm font-bold"
              >
                <Icons.Download className="w-4 h-4" />
                Export Filtered (CSV)
              </button>
              
              <button 
                onClick={exportMonthlySummary}
                disabled={selectedMonth === "all"}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary/10 text-primary rounded-xl hover:bg-primary/20 transition-colors text-sm font-bold disabled:opacity-50"
              >
                <Icons.PieChart className="w-4 h-4" />
                Monthly Category Summary
              </button>
            </div>
          </div>
        </div>

        {/* Full Backup */}
        <div className="p-6 bg-card border border-border rounded-3xl shadow-lg space-y-6 md:col-span-3">
          <div className="flex items-center gap-3 border-b border-border pb-4">
            <div className="p-2.5 bg-primary/10 text-primary rounded-xl">
              <Icons.Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold">System Backup</h2>
              <p className="text-xs text-muted-foreground">Full snapshot of your data for safe keeping</p>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row items-center gap-6 justify-between bg-secondary/20 p-6 rounded-2xl border border-border">
             <div className="max-w-xl">
               <h3 className="font-bold mb-1">Full JSON Backup</h3>
               <p className="text-sm text-muted-foreground">
                 This exports your entire database including accounts, custom categories, tags, and settings. 
                 Use this file to restore your data on another device or if you clear your browser. 
                 <strong className="text-foreground"> This is not meant for Excel.</strong>
               </p>
             </div>
             <button 
                onClick={handleBackupExport}
                className="flex items-center justify-center gap-2 px-6 py-3.5 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-colors font-bold shadow-lg shadow-primary/20 whitespace-nowrap"
              >
                <Icons.Save className="w-5 h-5" />
                Download JSON Backup
              </button>
          </div>
        </div>

      </div>
    </div>
  );
}