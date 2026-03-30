import { useState, useRef, useMemo } from "react";
import { useFinanceStore } from "@/store/financeStore";
import { formatCurrency, formatDate } from "@/lib/utils";
import * as Icons from "lucide-react";
import Papa from "papaparse";

type ColumnMapping = {
  date?: string;
  description?: string;
  amount?: string;
  debit?: string;
  credit?: string;
  type?: string;
  balance?: string;
  reference?: string;
  notes?: string;
};

export function Ledger() {
  const { transactions, categories, cards, deleteTransaction, importTransactions, updateTransaction } = useFinanceStore();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  
  // Modal states
  const [editingTx, setEditingTx] = useState<any>(null);
  
  // Advanced Import Wizard State
  const [isImportWizardOpen, setIsImportWizardOpen] = useState(false);
  const [importStep, setImportStep] = useState<"upload" | "mapping" | "preview">("upload");
  const [importData, setImportData] = useState<any[]>([]);
  const [importHeaders, setImportHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<ColumnMapping>({});
  const [amountMode, setAmountMode] = useState<"single" | "dual">("single");
  const [dateMode, setDateMode] = useState<"DD/MM/YYYY" | "MM/DD/YYYY" | "YYYY-MM-DD" | "auto">("auto");
  const [selectedCardId, setSelectedCardId] = useState<string>("");
  
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
        if (results.data.length > 0) {
          setImportHeaders(Object.keys(results.data[0] as object));
          setImportData(results.data);
          
          // Auto-guess mapping
          const headers = Object.keys(results.data[0] as object);
          const guessedMapping: ColumnMapping = {};
          
          headers.forEach(h => {
            const hLower = h.toLowerCase();
            if (hLower.includes('date')) guessedMapping.date = h;
            else if (hLower.includes('desc') || hLower.includes('detail')) guessedMapping.description = h;
            else if (hLower.includes('amount') || hLower.includes('value')) guessedMapping.amount = h;
            else if (hLower.includes('debit')) { guessedMapping.debit = h; setAmountMode("dual"); }
            else if (hLower.includes('credit')) { guessedMapping.credit = h; setAmountMode("dual"); }
            else if (hLower.includes('balance')) guessedMapping.balance = h;
          });
          
          setMapping(guessedMapping);
          setImportStep("mapping");
          setIsImportWizardOpen(true);
        }
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    });
  };

  const parseDate = (dateStr: string, mode: string) => {
    if (!dateStr) return new Date().toISOString().split('T')[0];
    try {
      // Very basic handling for custom formats, ideally use date-fns here
      if (mode === "DD/MM/YYYY") {
        const parts = dateStr.split(/[-/]/);
        if (parts.length === 3) return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
      } else if (mode === "MM/DD/YYYY") {
        const parts = dateStr.split(/[-/]/);
        if (parts.length === 3) return `${parts[2]}-${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}`;
      }
      // Fallback
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return new Date().toISOString().split('T')[0];
      return d.toISOString().split('T')[0];
    } catch {
      return new Date().toISOString().split('T')[0];
    }
  };

  const previewData = useMemo(() => {
    if (importStep !== "preview") return [];
    
    return importData.slice(0, 10).map((row) => {
      let amount = 0;
      
      if (amountMode === "single" && mapping.amount && row[mapping.amount]) {
        amount = parseFloat(row[mapping.amount].toString().replace(/[^0-9.-]+/g, "")) || 0;
      } else if (amountMode === "dual") {
        const debit = mapping.debit && row[mapping.debit] ? parseFloat(row[mapping.debit].toString().replace(/[^0-9.-]+/g, "")) : 0;
        const credit = mapping.credit && row[mapping.credit] ? parseFloat(row[mapping.credit].toString().replace(/[^0-9.-]+/g, "")) : 0;
        amount = credit > 0 ? credit : -Math.abs(debit);
      }
      
      const type = amount >= 0 ? 'income' : 'expense';
      const desc = mapping.description && row[mapping.description] ? row[mapping.description] : 'Unknown';
      const dateStr = mapping.date && row[mapping.date] ? row[mapping.date] : '';
      
      return {
        date: parseDate(dateStr, dateMode),
        description: desc,
        originalDescription: desc,
        amount,
        type,
        categoryId: 'cat_uncategorized',
        cardId: selectedCardId || null,
        tag: 'personal',
        isTransferMatched: false
      };
    });
  }, [importData, mapping, amountMode, dateMode, importStep, selectedCardId]);

  const handleFinalizeImport = () => {
    const finalData = importData.map((row) => {
      let amount = 0;
      
      if (amountMode === "single" && mapping.amount && row[mapping.amount]) {
        amount = parseFloat(row[mapping.amount].toString().replace(/[^0-9.-]+/g, "")) || 0;
      } else if (amountMode === "dual") {
        const debit = mapping.debit && row[mapping.debit] ? parseFloat(row[mapping.debit].toString().replace(/[^0-9.-]+/g, "")) : 0;
        const credit = mapping.credit && row[mapping.credit] ? parseFloat(row[mapping.credit].toString().replace(/[^0-9.-]+/g, "")) : 0;
        amount = credit > 0 ? credit : -Math.abs(debit);
      }
      
      const type = amount >= 0 ? 'income' : 'expense';
      const desc = mapping.description && row[mapping.description] ? row[mapping.description] : 'Unknown';
      const dateStr = mapping.date && row[mapping.date] ? row[mapping.date] : '';
      const notes = mapping.notes && row[mapping.notes] ? row[mapping.notes] : undefined;
      
      return {
        date: parseDate(dateStr, dateMode),
        description: desc,
        originalDescription: desc,
        amount,
        type: type as any,
        categoryId: 'cat_uncategorized',
        cardId: selectedCardId || null,
        tag: 'personal' as any,
        isTransferMatched: false,
        notes
      };
    });

    importTransactions(finalData);
    setIsImportWizardOpen(false);
    setImportStep("upload");
    setImportData([]);
    setMapping({});
  };

  const isMappingValid = mapping.date && mapping.description && (amountMode === "single" ? mapping.amount : (mapping.debit || mapping.credit));

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
            Import Wizard
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

      {/* Advanced Import Wizard Modal */}
      {isImportWizardOpen && (
        <div className="fixed inset-0 z-50 bg-background/90 backdrop-blur-md flex items-center justify-center p-4 md:p-8 animate-in fade-in duration-200">
          <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-border flex justify-between items-center sticky top-0 bg-card z-10 rounded-t-2xl">
              <div>
                <h2 className="text-2xl font-bold text-primary">Import Wizard</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  {importStep === "mapping" ? "Map CSV columns to transaction fields." : "Preview your transactions before importing."}
                </p>
              </div>
              <button 
                onClick={() => {
                  setIsImportWizardOpen(false);
                  setImportStep("upload");
                  setImportData([]);
                  setMapping({});
                }} 
                className="text-muted-foreground hover:text-foreground p-2 rounded-full hover:bg-secondary/50 transition-colors"
              >
                <Icons.X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
              {importStep === "mapping" && (
                <div className="space-y-8">
                  {/* Step 1: Mode Selection */}
                  <div className="space-y-4 bg-secondary/20 p-5 rounded-xl border border-border">
                    <h3 className="font-semibold text-lg flex items-center gap-2"><Icons.Settings2 className="w-5 h-5 text-primary"/> Statement Format</h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-muted-foreground mb-2">Amount Format</label>
                        <div className="flex gap-2 bg-background p-1 rounded-lg border border-border">
                          <button 
                            className={`flex-1 py-1.5 px-3 rounded-md text-sm transition-colors ${amountMode === 'single' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:bg-secondary/50'}`}
                            onClick={() => setAmountMode('single')}
                          >
                            Single Column (+/-)
                          </button>
                          <button 
                            className={`flex-1 py-1.5 px-3 rounded-md text-sm transition-colors ${amountMode === 'dual' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:bg-secondary/50'}`}
                            onClick={() => setAmountMode('dual')}
                          >
                            Debit / Credit
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-muted-foreground mb-2">Date Format</label>
                        <select 
                          className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm"
                          value={dateMode}
                          onChange={(e) => setDateMode(e.target.value as any)}
                        >
                          <option value="auto">Auto-detect (Recommended)</option>
                          <option value="DD/MM/YYYY">DD/MM/YYYY (Common in UAE)</option>
                          <option value="MM/DD/YYYY">MM/DD/YYYY (US Format)</option>
                          <option value="YYYY-MM-DD">YYYY-MM-DD (ISO)</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Step 2: Mapping */}
                  <div className="space-y-4">
                    <h3 className="font-semibold text-lg flex items-center gap-2"><Icons.Columns className="w-5 h-5 text-primary"/> Column Mapping</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {/* Date */}
                      <div className="bg-card border border-border p-4 rounded-xl shadow-sm">
                        <label className="block text-sm font-bold mb-2 flex items-center gap-2">
                          Date <span className="text-red-500">*</span>
                        </label>
                        <select 
                          className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm"
                          value={mapping.date || ""}
                          onChange={(e) => setMapping({...mapping, date: e.target.value})}
                        >
                          <option value="">-- Select Column --</option>
                          {importHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                        </select>
                      </div>

                      {/* Description */}
                      <div className="bg-card border border-border p-4 rounded-xl shadow-sm">
                        <label className="block text-sm font-bold mb-2 flex items-center gap-2">
                          Description <span className="text-red-500">*</span>
                        </label>
                        <select 
                          className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm"
                          value={mapping.description || ""}
                          onChange={(e) => setMapping({...mapping, description: e.target.value})}
                        >
                          <option value="">-- Select Column --</option>
                          {importHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                        </select>
                      </div>

                      {/* Amount(s) */}
                      {amountMode === 'single' ? (
                        <div className="bg-card border border-border p-4 rounded-xl shadow-sm">
                          <label className="block text-sm font-bold mb-2 flex items-center gap-2">
                            Amount <span className="text-red-500">*</span>
                          </label>
                          <select 
                            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm"
                            value={mapping.amount || ""}
                            onChange={(e) => setMapping({...mapping, amount: e.target.value})}
                          >
                            <option value="">-- Select Column --</option>
                            {importHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                          </select>
                        </div>
                      ) : (
                        <>
                          <div className="bg-card border border-border p-4 rounded-xl shadow-sm">
                            <label className="block text-sm font-bold mb-2 flex items-center gap-2">
                              Debit (Out)
                            </label>
                            <select 
                              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm"
                              value={mapping.debit || ""}
                              onChange={(e) => setMapping({...mapping, debit: e.target.value})}
                            >
                              <option value="">-- Select Column --</option>
                              {importHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                            </select>
                          </div>
                          <div className="bg-card border border-border p-4 rounded-xl shadow-sm">
                            <label className="block text-sm font-bold mb-2 flex items-center gap-2">
                              Credit (In)
                            </label>
                            <select 
                              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm"
                              value={mapping.credit || ""}
                              onChange={(e) => setMapping({...mapping, credit: e.target.value})}
                            >
                              <option value="">-- Select Column --</option>
                              {importHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                            </select>
                          </div>
                        </>
                      )}

                      {/* Optional fields */}
                      <div className="bg-card border border-border p-4 rounded-xl shadow-sm opacity-70 hover:opacity-100 transition-opacity">
                        <label className="block text-sm font-bold mb-2 text-muted-foreground">Notes (Optional)</label>
                        <select 
                          className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm"
                          value={mapping.notes || ""}
                          onChange={(e) => setMapping({...mapping, notes: e.target.value})}
                        >
                          <option value="">-- None --</option>
                          {importHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                        </select>
                      </div>
                      
                      <div className="bg-card border border-border p-4 rounded-xl shadow-sm opacity-70 hover:opacity-100 transition-opacity">
                        <label className="block text-sm font-bold mb-2 text-muted-foreground">Balance (Optional)</label>
                        <select 
                          className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm"
                          value={mapping.balance || ""}
                          onChange={(e) => setMapping({...mapping, balance: e.target.value})}
                        >
                          <option value="">-- None --</option>
                          {importHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Account Assignment */}
                  <div className="space-y-4">
                     <h3 className="font-semibold text-lg flex items-center gap-2"><Icons.CreditCard className="w-5 h-5 text-primary"/> Assign to Account</h3>
                     <div className="bg-card border border-border p-4 rounded-xl shadow-sm max-w-md">
                        <select 
                          className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm"
                          value={selectedCardId}
                          onChange={(e) => setSelectedCardId(e.target.value)}
                        >
                          <option value="">-- No specific account --</option>
                          {cards.map(c => (
                            <option key={c.id} value={c.id}>{c.name} (...{c.last4}) - {c.bank}</option>
                          ))}
                        </select>
                        <p className="text-xs text-muted-foreground mt-2">All imported transactions will be linked to this account.</p>
                     </div>
                  </div>
                  
                  {/* Sample Raw Data */}
                  <div className="mt-8 border-t border-border pt-6">
                    <h4 className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wider">Raw File Sample</h4>
                    <div className="overflow-x-auto bg-secondary/10 rounded-lg border border-border">
                      <table className="w-full text-xs text-left whitespace-nowrap">
                        <thead className="bg-secondary/30 text-muted-foreground">
                          <tr>
                            {importHeaders.map((h, i) => <th key={i} className="px-4 py-2 font-medium">{h}</th>)}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/50">
                          {importData.slice(0, 3).map((row, i) => (
                            <tr key={i}>
                              {importHeaders.map((h, j) => <td key={j} className="px-4 py-2 text-muted-foreground">{row[h]}</td>)}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                </div>
              )}

              {importStep === "preview" && (
                <div className="space-y-6">
                  <div className="bg-primary/10 border border-primary/20 text-primary px-4 py-3 rounded-xl flex items-start gap-3">
                    <Icons.Info className="w-5 h-5 shrink-0 mt-0.5" />
                    <p className="text-sm">
                      Review the first few parsed transactions. If dates or amounts look incorrect, go back and adjust your column mapping or format settings.
                    </p>
                  </div>
                  
                  <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm text-left">
                        <thead className="text-xs text-muted-foreground uppercase bg-secondary/30 border-b border-border">
                          <tr>
                            <th className="px-6 py-3 font-medium">Date</th>
                            <th className="px-6 py-3 font-medium">Description</th>
                            <th className="px-6 py-3 font-medium text-right">Amount</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {previewData.map((tx, i) => (
                            <tr key={i} className="bg-card hover:bg-secondary/20 transition-colors">
                              <td className="px-6 py-4 whitespace-nowrap font-mono text-xs">
                                {tx.date}
                              </td>
                              <td className="px-6 py-4 font-medium text-foreground">
                                {tx.description}
                              </td>
                              <td className={`px-6 py-4 text-right font-mono font-medium ${
                                tx.type === 'income' ? 'text-green-500' : 'text-foreground'
                              }`}>
                                {tx.type === 'income' ? '+' : ''}{formatCurrency(tx.amount)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground text-center">Showing {Math.min(10, importData.length)} of {importData.length} total transactions to be imported.</p>
                </div>
              )}
            </div>
            
            <div className="p-6 border-t border-border flex justify-between items-center bg-card rounded-b-2xl">
              {importStep === "mapping" ? (
                <>
                  <span className="text-sm text-muted-foreground">
                    {!isMappingValid && "Please map all required fields (*)"}
                  </span>
                  <div className="flex gap-3">
                    <button 
                      onClick={() => setIsImportWizardOpen(false)}
                      className="px-6 py-2.5 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 transition-colors font-medium"
                    >
                      Cancel
                    </button>
                    <button 
                      onClick={() => setImportStep("preview")}
                      disabled={!isMappingValid}
                      className="px-6 py-2.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      Preview Data <Icons.ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <button 
                    onClick={() => setImportStep("mapping")}
                    className="px-6 py-2.5 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 transition-colors font-medium flex items-center gap-2"
                  >
                    <Icons.ArrowLeft className="w-4 h-4" /> Back to Mapping
                  </button>
                  <button 
                    onClick={handleFinalizeImport}
                    className="px-6 py-2.5 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-bold shadow-lg shadow-green-500/20 flex items-center gap-2"
                  >
                    <Icons.Check className="w-5 h-5" />
                    Import {importData.length} Transactions
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}