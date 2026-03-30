import { useState, useRef } from "react";
import { useFinanceStore } from "@/store/financeStore";
import { formatCurrency, formatDate } from "@/lib/utils";
import * as Icons from "lucide-react";
import Papa from "papaparse";

export function Ledger() {
  const { transactions, categories, cards, deleteTransaction, importTransactions, updateTransaction } = useFinanceStore();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  
  // Modal states
  const [isImporting, setIsImporting] = useState(false);
  const [editingTx, setEditingTx] = useState<any>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filteredTransactions = transactions.filter((tx) => {
    const matchesSearch = tx.description.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (tx.originalDescription && tx.originalDescription.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesType = filterType === "all" || tx.type === filterType;
    return matchesSearch && matchesType;
  });

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        // Basic mapping for generic bank CSVs
        const imported = results.data.map((row: any) => {
          // Attempt to find common column names
          const dateCol = Object.keys(row).find(k => k.toLowerCase().includes('date')) || '';
          const descCol = Object.keys(row).find(k => k.toLowerCase().includes('desc') || k.toLowerCase().includes('detail')) || '';
          const amountCol = Object.keys(row).find(k => k.toLowerCase().includes('amount') || k.toLowerCase().includes('value')) || '';
          
          let amount = parseFloat(row[amountCol]?.replace(/[^0-9.-]+/g,"")) || 0;
          
          // Heuristic for type
          const type = amount >= 0 ? 'income' : 'expense';
          
          return {
            date: row[dateCol] || new Date().toISOString().split('T')[0],
            description: row[descCol] || 'Unknown Transaction',
            originalDescription: row[descCol] || 'Unknown Transaction',
            amount: amount,
            type: type as any,
            categoryId: 'cat_uncategorized',
            cardId: null,
            tag: 'personal' as any,
            isTransferMatched: false
          };
        });

        if (imported.length > 0) {
          importTransactions(imported);
        }
        setIsImporting(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary">Ledger</h1>
          <p className="text-muted-foreground">Manage your transactions and imports.</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 transition-colors text-sm font-medium"
          >
            <Icons.Upload className="h-4 w-4" />
            Import CSV
          </button>
          <input 
            type="file" 
            accept=".csv" 
            ref={fileInputRef} 
            className="hidden" 
            onChange={handleFileUpload} 
          />
          <button 
            onClick={() => setEditingTx({})}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium"
          >
            <Icons.Plus className="h-4 w-4" />
            Add Manual
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-center bg-card p-4 rounded-xl border border-border shadow-sm">
        <div className="relative flex-1 w-full">
          <Icons.Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search transactions..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
          />
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="w-full sm:w-auto px-4 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all cursor-pointer"
          >
            <option value="all">All Types</option>
            <option value="expense">Expenses</option>
            <option value="income">Income</option>
            <option value="transfer">Transfers</option>
          </select>
        </div>
      </div>

      {/* Transaction List */}
      <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
        {filteredTransactions.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground flex flex-col items-center">
            <Icons.Receipt className="h-12 w-12 mb-4 opacity-20" />
            <h3 className="text-lg font-medium text-foreground mb-1">No transactions found</h3>
            <p>Try adjusting your search or import a CSV file.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground uppercase bg-secondary/30 border-b border-border">
                <tr>
                  <th className="px-6 py-3 font-medium">Date</th>
                  <th className="px-6 py-3 font-medium">Description</th>
                  <th className="px-6 py-3 font-medium">Category</th>
                  <th className="px-6 py-3 font-medium text-right">Amount</th>
                  <th className="px-6 py-3 font-medium text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredTransactions.map((tx) => {
                  const category = categories.find((c) => c.id === tx.categoryId);
                  const Icon = category && (Icons as any)[category.icon] ? (Icons as any)[category.icon] : Icons.HelpCircle;
                  
                  return (
                    <tr key={tx.id} className="bg-card hover:bg-secondary/20 transition-colors group">
                      <td className="px-6 py-4 whitespace-nowrap text-muted-foreground font-mono text-xs">
                        {formatDate(tx.date)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-medium text-foreground">{tx.description}</span>
                          {tx.originalDescription && tx.originalDescription !== tx.description && (
                            <span className="text-xs text-muted-foreground truncate max-w-[250px]" title={tx.originalDescription}>
                              {tx.originalDescription}
                            </span>
                          )}
                          <div className="flex gap-1 mt-1">
                            {tx.tag !== 'none' && (
                              <span className={`text-[10px] px-1.5 py-0.5 rounded-sm uppercase font-semibold tracking-wider ${
                                tx.tag === 'business' ? 'bg-purple-500/10 text-purple-500' : 'bg-blue-500/10 text-blue-500'
                              }`}>
                                {tx.tag}
                              </span>
                            )}
                            {tx.isTransferMatched && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded-sm uppercase font-semibold tracking-wider bg-green-500/10 text-green-500 flex items-center gap-1">
                                <Icons.CheckCircle2 className="w-3 h-3" /> Matched
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 w-fit cursor-pointer hover:bg-secondary/50 p-1.5 -ml-1.5 rounded-md transition-colors" onClick={() => setEditingTx(tx)}>
                          <div 
                            className="w-7 h-7 rounded flex items-center justify-center shrink-0"
                            style={{ backgroundColor: `${category?.color || '#64748b'}20`, color: category?.color || '#64748b' }}
                          >
                            <Icon className="w-3.5 h-3.5" />
                          </div>
                          <span className="text-xs font-medium text-muted-foreground">
                            {category?.name || 'Uncategorized'}
                          </span>
                        </div>
                      </td>
                      <td className={`px-6 py-4 text-right font-mono font-medium ${
                        tx.type === 'income' ? 'text-green-500' : 
                        tx.type === 'expense' ? 'text-foreground' : 'text-muted-foreground'
                      }`}>
                        {tx.type === 'income' ? '+' : ''}{formatCurrency(tx.amount)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => setEditingTx(tx)}
                            className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded transition-colors"
                            title="Edit"
                          >
                            <Icons.Edit2 className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => {
                              if(window.confirm('Are you sure you want to delete this transaction?')) {
                                deleteTransaction(tx.id);
                              }
                            }}
                            className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded transition-colors"
                            title="Delete"
                          >
                            <Icons.Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {editingTx && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-card border border-border p-6 rounded-2xl shadow-2xl max-w-lg w-full animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold">{editingTx.id ? 'Edit Transaction' : 'New Transaction'}</h2>
              <button onClick={() => setEditingTx(null)} className="text-muted-foreground hover:text-foreground">
                <Icons.X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1 uppercase tracking-wider">Date</label>
                  <input 
                    type="date" 
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm"
                    defaultValue={editingTx.date || new Date().toISOString().split('T')[0]}
                    id="edit-date"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1 uppercase tracking-wider">Amount</label>
                  <input 
                    type="number" 
                    step="0.01"
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm font-mono"
                    defaultValue={editingTx.amount || ''}
                    id="edit-amount"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1 uppercase tracking-wider">Description</label>
                <input 
                  type="text" 
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm"
                  defaultValue={editingTx.description || ''}
                  id="edit-desc"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1 uppercase tracking-wider">Category</label>
                  <select 
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm"
                    defaultValue={editingTx.categoryId || 'cat_uncategorized'}
                    id="edit-category"
                  >
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1 uppercase tracking-wider">Account / Card</label>
                  <select 
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm"
                    defaultValue={editingTx.cardId || ''}
                    id="edit-card"
                  >
                    <option value="">None</option>
                    {cards.map(c => (
                      <option key={c.id} value={c.id}>{c.name} (...{c.last4})</option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1 uppercase tracking-wider">Tag</label>
                <div className="flex gap-2">
                  {['none', 'personal', 'business'].map(tag => (
                    <label key={tag} className={`flex-1 flex items-center justify-center p-2 rounded-lg border cursor-pointer transition-colors ${
                      editingTx.tag === tag ? 'bg-primary/10 border-primary text-primary' : 'bg-background border-border text-muted-foreground hover:bg-secondary/50'
                    }`}>
                      <input type="radio" name="tag" value={tag} className="hidden" defaultChecked={editingTx.tag === tag || (tag === 'none' && !editingTx.tag)} />
                      <span className="text-sm capitalize">{tag}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-8 flex justify-end gap-3 pt-4 border-t border-border">
              <button 
                onClick={() => setEditingTx(null)}
                className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={() => {
                  const tagRadios = document.getElementsByName('tag') as NodeListOf<HTMLInputElement>;
                  const selectedTag = Array.from(tagRadios).find(r => r.checked)?.value || 'none';
                  
                  const updates = {
                    date: (document.getElementById('edit-date') as HTMLInputElement).value,
                    amount: parseFloat((document.getElementById('edit-amount') as HTMLInputElement).value),
                    description: (document.getElementById('edit-desc') as HTMLInputElement).value,
                    categoryId: (document.getElementById('edit-category') as HTMLSelectElement).value,
                    cardId: (document.getElementById('edit-card') as HTMLSelectElement).value || null,
                    tag: selectedTag as any,
                  };

                  if (editingTx.id) {
                    updateTransaction(editingTx.id, updates);
                  } else {
                    useFinanceStore.getState().addTransaction({
                      ...updates,
                      type: updates.amount >= 0 ? 'income' : 'expense',
                      originalDescription: updates.description,
                      isTransferMatched: false
                    } as any);
                  }
                  setEditingTx(null);
                }}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}