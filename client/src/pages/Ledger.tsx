import { useState, useRef, useMemo, useEffect } from "react";
import { useFinanceStore } from "@/store/financeStore";
import { formatCurrency, formatDate } from "@/lib/utils";
import * as Icons from "lucide-react";
import Papa from "papaparse";
import { useLocation, useSearch } from "wouter";

type ColumnMapping = {
  date?: string;
  description?: string;
  amount?: string;
  debit?: string;
  credit?: string;
  direction?: string;
  type?: string;
  balance?: string;
  reference?: string;
  notes?: string;
};

// Sub-component for editing/tagging a transaction to keep Ledger clean
function EditTransactionModal({ 
  transaction, 
  onClose, 
  onSave 
}: { 
  transaction: any, 
  onClose: () => void, 
  onSave: (updates: any) => void 
}) {
  const { categories, tags, cards, addTag, addCategory } = useFinanceStore();
  
  const [draftDate, setDraftDate] = useState(transaction?.date || new Date().toISOString().split('T')[0]);
  const [draftAmount, setDraftAmount] = useState(transaction?.amount ? Math.abs(transaction.amount).toString() : '');
  const [draftDesc, setDraftDesc] = useState(transaction?.description || '');
  const [draftCategory, setDraftCategory] = useState(transaction?.categoryId || 'cat_uncategorized');
  const [draftTag, setDraftTag] = useState(transaction?.tag || 'none');
  const [draftCard, setDraftCard] = useState(transaction?.cardId || '');
  const [draftNotes, setDraftNotes] = useState(transaction?.notes || '');
  const [draftType, setDraftType] = useState(transaction?.type || 'expense');

  const handleAddCategory = () => {
    const name = window.prompt("New Category Name:");
    if (!name) return;
    const color = window.prompt("Color (hex, e.g. #3b82f6):", "#3b82f6") || "#3b82f6";
    const id = `cat_custom_${Date.now()}`;
    addCategory({ name, color, icon: 'Tag', type: draftType as any, isCustom: true } as any);
    setDraftCategory(id); 
  };

  const handleSave = () => {
    let finalAmount = parseFloat(draftAmount) || 0;
    // Apply correct sign based on type
    if (draftType === 'expense' && finalAmount > 0) finalAmount = -finalAmount;
    if (draftType === 'income' && finalAmount < 0) finalAmount = Math.abs(finalAmount);
    
    onSave({
      date: draftDate,
      amount: finalAmount,
      type: draftType,
      description: draftDesc,
      categoryId: draftCategory,
      cardId: draftCard || null,
      tag: draftTag,
      notes: draftNotes
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-4 animate-in fade-in duration-200">
      <div className="bg-card border border-border sm:rounded-3xl rounded-t-3xl shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col animate-in slide-in-from-bottom-10 sm:zoom-in-95 duration-300">
        
        {/* Header */}
        <div className="p-6 border-b border-border flex justify-between items-center sticky top-0 bg-card z-10 sm:rounded-t-3xl rounded-t-3xl">
          <h2 className="text-xl font-bold tracking-tight">{transaction?.id ? 'Edit Transaction' : 'New Transaction'}</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground p-2 rounded-full hover:bg-secondary/50 transition-colors">
            <Icons.X className="w-5 h-5" />
          </button>
        </div>
        
        {/* Body */}
        <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-8">
          
          {/* Core Info */}
          <div className="space-y-4">
            <div>
              <input 
                type="text" 
                placeholder="Description"
                className="w-full text-xl font-medium bg-transparent border-b border-transparent hover:border-border focus:border-primary focus:outline-none py-1 transition-colors"
                value={draftDesc}
                onChange={(e) => setDraftDesc(e.target.value)}
              />
              {transaction?.originalDescription && transaction.originalDescription !== draftDesc && (
                <p className="text-xs text-muted-foreground mt-1">Original: {transaction.originalDescription}</p>
              )}
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="relative">
                <Icons.Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input 
                  type="date" 
                  className="w-full pl-9 pr-3 py-2 bg-secondary/30 border border-border rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-primary/50"
                  value={draftDate}
                  onChange={(e) => setDraftDate(e.target.value)}
                />
              </div>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-medium">AED</span>
                <input 
                  type="number" 
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  className={`w-full pl-12 pr-3 py-2 bg-secondary/30 border border-border rounded-xl text-sm font-mono focus:outline-none focus:ring-1 focus:ring-primary/50 ${draftType === 'income' ? 'text-green-500' : ''}`}
                  value={draftAmount}
                  onChange={(e) => setDraftAmount(e.target.value)}
                />
              </div>
            </div>
            
            <div className="flex gap-2 p-1 bg-secondary/30 rounded-xl border border-border">
              {(['expense', 'income', 'transfer'] as const).map(t => (
                 <button
                   key={t}
                   type="button"
                   onClick={() => setDraftType(t)}
                   className={`flex-1 py-1.5 text-xs font-semibold capitalize rounded-lg transition-colors ${draftType === t ? 'bg-card shadow text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                 >
                   {t}
                 </button>
              ))}
            </div>

            <select 
              className="w-full px-3 py-2 bg-secondary/30 border border-border rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-primary/50"
              value={draftCard}
              onChange={(e) => setDraftCard(e.target.value)}
            >
              <option value="">-- Select Account / Card --</option>
              {cards.map(c => (
                <option key={c.id} value={c.id}>{c.name} (...{c.last4})</option>
              ))}
            </select>
          </div>

          {/* Type / Tag */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 block">Tags</label>
            <div className="flex flex-wrap gap-2">
              {tags.map(tag => (
                <button 
                  key={tag}
                  type="button"
                  onClick={() => setDraftTag(tag)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-all capitalize ${
                    draftTag === tag 
                      ? 'bg-primary text-primary-foreground shadow-md' 
                      : 'bg-secondary/50 text-secondary-foreground hover:bg-secondary'
                  }`}
                >
                  {tag}
                </button>
              ))}
              <button 
                type="button"
                onClick={() => {
                    const newTag = window.prompt('New Tag Name:');
                    if (newTag) {
                        addTag(newTag);
                        setDraftTag(newTag.toLowerCase());
                    }
                }}
                className="px-4 py-2 rounded-xl text-sm font-medium border border-dashed border-border text-muted-foreground hover:text-foreground hover:border-primary transition-all flex items-center gap-1"
              >
                <Icons.Plus className="w-3 h-3" /> Custom Tag
              </button>
            </div>
          </div>

          {/* Categories */}
          <div>
            <div className="flex justify-between items-center mb-3">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Category</label>
                <button type="button" onClick={handleAddCategory} className="text-xs text-primary hover:underline font-medium flex items-center gap-1">
                  <Icons.Plus className="w-3 h-3" /> New Category
                </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {categories.map(c => {
                  const Icon = (Icons as any)[c.icon] || Icons.HelpCircle;
                  return (
                    <button 
                      key={c.id}
                      type="button"
                      onClick={() => setDraftCategory(c.id)}
                      className={`flex items-center gap-3 p-2.5 rounded-xl border text-sm transition-all text-left group ${
                        draftCategory === c.id 
                          ? 'border-primary bg-primary/10 text-primary ring-1 ring-primary/20' 
                          : 'border-border bg-card hover:bg-secondary/50 text-foreground'
                      }`}
                    >
                      <div 
                        className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                          draftCategory === c.id ? 'bg-primary text-primary-foreground' : ''
                        }`}
                        style={draftCategory !== c.id ? { backgroundColor: `${c.color}15`, color: c.color } : {}}
                      >
                        <Icon className="w-4 h-4" />
                      </div>
                      <span className="truncate font-medium">{c.name}</span>
                    </button>
                  )
              })}
            </div>
          </div>
          
          {/* Notes */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 block">Notes</label>
            <textarea 
              className="w-full px-4 py-3 bg-secondary/30 border border-border rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-primary/50 min-h-[80px] resize-none"
              placeholder="Add personal notes or context..."
              value={draftNotes}
              onChange={(e) => setDraftNotes(e.target.value)}
            />
          </div>

        </div>

        {/* Footer */}
        <div className="p-6 border-t border-border bg-card sm:rounded-b-3xl flex justify-end gap-3 z-10">
          <button 
            onClick={onClose}
            className="px-6 py-2.5 bg-secondary text-secondary-foreground rounded-xl hover:bg-secondary/80 transition-colors font-medium"
          >
            Cancel
          </button>
          <button 
            onClick={handleSave}
            disabled={!draftAmount || isNaN(parseFloat(draftAmount))}
            className="px-6 py-2.5 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-colors font-medium shadow-lg shadow-primary/20 disabled:opacity-50"
          >
            Save Transaction
          </button>
        </div>

      </div>
    </div>
  );
}


export function Ledger() {
  const { 
    transactions, categories, cards, tags,
    deleteTransaction, importTransactions, updateTransaction, addTransaction,
    bulkUpdateTransactions, bulkDeleteTransactions
  } = useFinanceStore();
  
  const searchString = useSearch();
  const searchParams = new URLSearchParams(searchString);
  
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<string>(searchParams.get("type") || "all");
  const [filterCategory, setFilterCategory] = useState<string>(searchParams.get("category") || "all");
  const [filterCard, setFilterCard] = useState<string>(searchParams.get("card") || "all");
  const [filterTag, setFilterTag] = useState<string>(searchParams.get("tag") || "all");
  
  // Review workflow state
  const [viewMode, setViewMode] = useState<"unreviewed" | "reviewed" | "all">(
    (searchParams.get("view") as any) || "unreviewed"
  );
  
  // Update filters if URL changes
  useEffect(() => {
    if (searchParams.get("type")) setFilterType(searchParams.get("type")!);
    if (searchParams.get("category")) setFilterCategory(searchParams.get("category")!);
    if (searchParams.get("card")) setFilterCard(searchParams.get("card")!);
    if (searchParams.get("tag")) setFilterTag(searchParams.get("tag")!);
    if (searchParams.get("view")) setViewMode(searchParams.get("view") as any);
  }, [searchString]);
  
  // Selection state
  const [selectedTxs, setSelectedTxs] = useState<Set<string>>(new Set());
  
  // Modals
  const [editingTx, setEditingTx] = useState<any>(null);
  const [bulkEditMode, setBulkEditMode] = useState<'category' | 'tag' | 'note' | null>(null);
  const [bulkEditValue, setBulkEditValue] = useState<string>('');
  
  // Advanced Import Wizard State
  const [isImportWizardOpen, setIsImportWizardOpen] = useState(false);
  const [importStep, setImportStep] = useState<"upload" | "mapping" | "preview">("upload");
  const [importData, setImportData] = useState<any[]>([]);
  const [importHeaders, setImportHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<ColumnMapping>({});
  const [amountMode, setAmountMode] = useState<"single" | "dual" | "direction">("single");
  const [dateMode, setDateMode] = useState<"DD/MM/YYYY" | "MM/DD/YYYY" | "YYYY-MM-DD" | "auto">("auto");
  const [selectedCardId, setSelectedCardId] = useState<string>("");
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filteredTransactions = transactions.filter((tx) => {
    const matchesSearch = tx.description.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (tx.originalDescription && tx.originalDescription.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesType = filterType === "all" || tx.type === filterType;
    const matchesCategory = filterCategory === "all" || tx.categoryId === filterCategory;
    const matchesCard = filterCard === "all" || tx.cardId === filterCard;
    const matchesTag = filterTag === "all" || tx.tag === filterTag;
    
    const matchesViewMode = 
      viewMode === "all" ? true :
      viewMode === "reviewed" ? tx.isReviewed :
      !tx.isReviewed; // unreviewed
      
    return matchesSearch && matchesType && matchesCategory && matchesCard && matchesTag && matchesViewMode;
  });

  const unreviewedCount = transactions.filter(t => !t.isReviewed).length;

  const isAllSelected = filteredTransactions.length > 0 && selectedTxs.size === filteredTransactions.length;

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedTxs(new Set());
    } else {
      setSelectedTxs(new Set(filteredTransactions.map(t => t.id)));
    }
  };

  const toggleSelect = (id: string) => {
    const newSet = new Set(selectedTxs);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedTxs(newSet);
  };

  const handleBulkUpdate = () => {
    if (bulkEditMode === 'category') {
      bulkUpdateTransactions(Array.from(selectedTxs), { categoryId: bulkEditValue, isReviewed: true });
    } else if (bulkEditMode === 'tag') {
      bulkUpdateTransactions(Array.from(selectedTxs), { tag: bulkEditValue, isReviewed: true });
    } else if (bulkEditMode === 'note') {
      bulkUpdateTransactions(Array.from(selectedTxs), { notes: bulkEditValue });
    }
    setBulkEditMode(null);
    setBulkEditValue('');
    setSelectedTxs(new Set());
  };

  const handleBulkMarkReviewed = () => {
    bulkUpdateTransactions(Array.from(selectedTxs), { isReviewed: true });
    setSelectedTxs(new Set());
  };

  const handleBulkDelete = () => {
    if (confirm(`Are you sure you want to delete ${selectedTxs.size} transactions?`)) {
      bulkDeleteTransactions(Array.from(selectedTxs));
      setSelectedTxs(new Set());
    }
  };

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
          
          const headers = Object.keys(results.data[0] as object);
          const guessedMapping: ColumnMapping = {};
          
          headers.forEach(h => {
            const hLower = h.toLowerCase();
            if (hLower.includes('date')) guessedMapping.date = h;
            else if (hLower.includes('desc') || hLower.includes('detail') || hLower.includes('particular')) guessedMapping.description = h;
            else if (hLower.includes('amount') || hLower.includes('value') || hLower.includes('transaction')) guessedMapping.amount = h;
            else if (hLower.includes('debit')) { guessedMapping.debit = h; setAmountMode("dual"); }
            else if (hLower.includes('credit')) { guessedMapping.credit = h; setAmountMode("dual"); }
            else if (hLower.includes('balance')) guessedMapping.balance = h;
            else if (hLower === 'type' || hLower.includes('dr/cr') || hLower.includes('direction') || hLower.includes('dr cr')) { guessedMapping.direction = h; setAmountMode("direction"); }
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
      if (mode === "DD/MM/YYYY") {
        const parts = dateStr.split(/[-/]/);
        if (parts.length === 3) return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
      } else if (mode === "MM/DD/YYYY") {
        const parts = dateStr.split(/[-/]/);
        if (parts.length === 3) return `${parts[2]}-${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}`;
      }
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
      let isMalformed = false;
      
      if (amountMode === "single" && mapping.amount && row[mapping.amount]) {
        const parsed = parseFloat(row[mapping.amount].toString().replace(/[^0-9.-]+/g, ""));
        if (!isNaN(parsed)) amount = parsed;
        else isMalformed = true;
      } else if (amountMode === "dual") {
        const debitStr = mapping.debit && row[mapping.debit] ? row[mapping.debit].toString().trim() : "";
        const creditStr = mapping.credit && row[mapping.credit] ? row[mapping.credit].toString().trim() : "";
        
        const debitRaw = parseFloat(debitStr.replace(/[^0-9.-]+/g, ""));
        const creditRaw = parseFloat(creditStr.replace(/[^0-9.-]+/g, ""));

        const isDebitValid = !isNaN(debitRaw) && debitStr !== "";
        const isCreditValid = !isNaN(creditRaw) && creditStr !== "";

        const debitValue = isDebitValid ? Math.abs(debitRaw) : 0;
        const creditValue = isCreditValid ? Math.abs(creditRaw) : 0;

        if (debitValue > 0 && creditValue > 0) {
           isMalformed = true;
           amount = 0;
        } else if (creditValue > 0) {
           amount = creditValue;
        } else if (debitValue > 0) {
           amount = -debitValue;
        } else {
           isMalformed = true;
           amount = 0;
        }
      } else if (amountMode === "direction") {
        const rawAmount = mapping.amount && row[mapping.amount] ? row[mapping.amount].toString().trim() : "";
        const dirStr = mapping.direction && row[mapping.direction] ? row[mapping.direction].toString().trim().toLowerCase() : "";
        
        const parsed = parseFloat(rawAmount.replace(/[^0-9.-]+/g, ""));
        
        if (!isNaN(parsed) && rawAmount !== "") {
          const isCredit = dirStr === 'cr' || dirStr === 'credit' || dirStr === 'c' || dirStr === 'in' || dirStr === 'deposit';
          const isDebit = dirStr === 'dr' || dirStr === 'debit' || dirStr === 'd' || dirStr === 'out' || dirStr === 'withdrawal';
          
          if (isCredit) {
            amount = Math.abs(parsed);
          } else if (isDebit) {
            amount = -Math.abs(parsed);
          } else {
            isMalformed = true;
            amount = 0;
          }
        } else {
          isMalformed = true;
          amount = 0;
        }
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
        tag: 'none',
        isTransferMatched: false,
        isMalformed
      };
    });
  }, [importData, mapping, amountMode, dateMode, importStep, selectedCardId]);

  const handleFinalizeImport = () => {
    const finalData = importData.map((row) => {
      let amount = 0;
      let isMalformed = false;
      
      if (amountMode === "single" && mapping.amount && row[mapping.amount]) {
        const parsed = parseFloat(row[mapping.amount].toString().replace(/[^0-9.-]+/g, ""));
        if (!isNaN(parsed)) amount = parsed;
        else isMalformed = true;
      } else if (amountMode === "dual") {
        const debitStr = mapping.debit && row[mapping.debit] ? row[mapping.debit].toString().trim() : "";
        const creditStr = mapping.credit && row[mapping.credit] ? row[mapping.credit].toString().trim() : "";
        
        const debitRaw = parseFloat(debitStr.replace(/[^0-9.-]+/g, ""));
        const creditRaw = parseFloat(creditStr.replace(/[^0-9.-]+/g, ""));

        const isDebitValid = !isNaN(debitRaw) && debitStr !== "";
        const isCreditValid = !isNaN(creditRaw) && creditStr !== "";

        const debitValue = isDebitValid ? Math.abs(debitRaw) : 0;
        const creditValue = isCreditValid ? Math.abs(creditRaw) : 0;

        if (debitValue > 0 && creditValue > 0) {
           isMalformed = true;
           amount = 0;
        } else if (creditValue > 0) {
           amount = creditValue;
        } else if (debitValue > 0) {
           amount = -debitValue;
        } else {
           isMalformed = true;
           amount = 0;
        }
      } else if (amountMode === "direction") {
        const rawAmount = mapping.amount && row[mapping.amount] ? row[mapping.amount].toString().trim() : "";
        const dirStr = mapping.direction && row[mapping.direction] ? row[mapping.direction].toString().trim().toLowerCase() : "";
        
        const parsed = parseFloat(rawAmount.replace(/[^0-9.-]+/g, ""));
        
        if (!isNaN(parsed) && rawAmount !== "") {
          const isCredit = dirStr === 'cr' || dirStr === 'credit' || dirStr === 'c' || dirStr === 'in' || dirStr === 'deposit';
          const isDebit = dirStr === 'dr' || dirStr === 'debit' || dirStr === 'd' || dirStr === 'out' || dirStr === 'withdrawal';
          
          if (isCredit) {
            amount = Math.abs(parsed);
          } else if (isDebit) {
            amount = -Math.abs(parsed);
          } else {
            isMalformed = true;
            amount = 0;
          }
        } else {
          isMalformed = true;
          amount = 0;
        }
      }
      
      const type = amount >= 0 ? 'income' : 'expense';
      const desc = mapping.description && row[mapping.description] ? row[mapping.description] : 'Unknown';
      const dateStr = mapping.date && row[mapping.date] ? row[mapping.date] : '';
      const notes = mapping.notes && row[mapping.notes] ? row[mapping.notes] : undefined;
      
      return {
        date: parseDate(dateStr, dateMode),
        description: isMalformed ? `[REVIEW REQUIRED] ${desc}` : desc,
        originalDescription: desc,
        amount,
        type: type as any,
        categoryId: 'cat_uncategorized',
        cardId: selectedCardId || null,
        tag: 'none' as any,
        isTransferMatched: false,
        isReviewed: false,
        notes: isMalformed ? `Malformed amount row in CSV. Please manually update the correct amount.` : notes
      };
    });

    importTransactions(finalData);
    setIsImportWizardOpen(false);
    setImportStep("upload");
    setImportData([]);
    setMapping({});
  };

  const isMappingValid = mapping.date && mapping.description && (
    amountMode === "single" ? mapping.amount : 
    amountMode === "dual" ? (mapping.debit || mapping.credit) : 
    (mapping.amount && mapping.direction)
  );

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-24">
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
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium shadow-lg shadow-primary/20"
          >
            <Icons.Plus className="h-4 w-4" />
            Add Manual
          </button>
        </div>
      </div>

      {/* View Mode Tabs */}
      <div className="flex gap-2 border-b border-border pb-px mb-4 overflow-x-auto custom-scrollbar">
        <button 
          onClick={() => setViewMode("unreviewed")}
          className={`px-4 py-2 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${viewMode === "unreviewed" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"}`}
        >
          To Review {unreviewedCount > 0 && <span className="bg-primary text-primary-foreground px-1.5 py-0.5 rounded-full text-[10px]">{unreviewedCount}</span>}
        </button>
        <button 
          onClick={() => setViewMode("reviewed")}
          className={`px-4 py-2 text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${viewMode === "reviewed" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"}`}
        >
          Reviewed
        </button>
        <button 
          onClick={() => setViewMode("all")}
          className={`px-4 py-2 text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${viewMode === "all" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"}`}
        >
          All History
        </button>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center bg-card p-4 rounded-2xl border border-border shadow-sm">
        <div className="relative w-full md:col-span-2">
          <Icons.Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search descriptions..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-secondary/30 border border-border rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all"
          />
        </div>
        
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="w-full px-4 py-2.5 bg-secondary/30 border border-border rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all cursor-pointer"
        >
          <option value="all">All Types</option>
          <option value="expense">Expenses</option>
          <option value="income">Income</option>
          <option value="transfer">Transfers</option>
        </select>

        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="w-full px-4 py-2.5 bg-secondary/30 border border-border rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all cursor-pointer"
        >
          <option value="all">All Categories</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        
        <select
          value={filterCard}
          onChange={(e) => setFilterCard(e.target.value)}
          className="w-full px-4 py-2.5 bg-secondary/30 border border-border rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all cursor-pointer"
        >
          <option value="all">All Accounts</option>
          {cards.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        
        <select
          value={filterTag}
          onChange={(e) => setFilterTag(e.target.value)}
          className="w-full px-4 py-2.5 bg-secondary/30 border border-border rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all cursor-pointer"
        >
          <option value="all">All Tags</option>
          {tags.map(t => <option key={t} value={t} className="capitalize">{t}</option>)}
        </select>
      </div>

      {/* Bulk Actions */}
      {selectedTxs.size > 0 && (
        <div className="bg-primary/10 border border-primary/20 p-3 rounded-2xl flex flex-wrap items-center gap-3 animate-in slide-in-from-top-2 mb-4">
          <span className="text-sm font-bold text-primary pl-2">{selectedTxs.size} selected</span>
          <div className="w-px h-6 bg-primary/20 mx-1"></div>
          
          <div className="flex gap-2 items-center flex-1">
            {!bulkEditMode ? (
              <>
                <button onClick={handleBulkMarkReviewed} className="px-3 py-1.5 bg-background border border-border rounded-lg text-xs font-medium hover:bg-secondary transition-colors flex items-center gap-1.5">
                  <Icons.CheckCircle2 className="w-3.5 h-3.5" /> Mark Reviewed
                </button>
                <button onClick={() => setBulkEditMode('category')} className="px-3 py-1.5 bg-background border border-border rounded-lg text-xs font-medium hover:bg-secondary transition-colors flex items-center gap-1.5">
                  <Icons.Tag className="w-3.5 h-3.5" /> Set Category
                </button>
                <button onClick={() => setBulkEditMode('tag')} className="px-3 py-1.5 bg-background border border-border rounded-lg text-xs font-medium hover:bg-secondary transition-colors flex items-center gap-1.5">
                  <Icons.Hash className="w-3.5 h-3.5" /> Set Tag
                </button>
                <button onClick={handleBulkDelete} className="px-3 py-1.5 bg-destructive/10 text-destructive border border-destructive/20 rounded-lg text-xs font-medium hover:bg-destructive hover:text-destructive-foreground transition-colors ml-auto flex items-center gap-1.5">
                  <Icons.Trash2 className="w-3.5 h-3.5" /> Delete
                </button>
              </>
            ) : (
              <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-4">
                {bulkEditMode === 'category' && (
                  <select 
                    className="px-3 py-1.5 bg-background border border-border rounded-lg text-sm focus:outline-none"
                    value={bulkEditValue}
                    onChange={(e) => setBulkEditValue(e.target.value)}
                  >
                    <option value="">Select Category...</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                )}
                {bulkEditMode === 'tag' && (
                  <select 
                    className="px-3 py-1.5 bg-background border border-border rounded-lg text-sm focus:outline-none"
                    value={bulkEditValue}
                    onChange={(e) => setBulkEditValue(e.target.value)}
                  >
                    <option value="">Select Tag...</option>
                    {tags.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                )}
                <button 
                  onClick={handleBulkUpdate}
                  disabled={!bulkEditValue}
                  className="px-4 py-1.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium disabled:opacity-50"
                >
                  Apply
                </button>
                <button onClick={() => setBulkEditMode(null)} className="px-2 py-1.5 text-muted-foreground hover:text-foreground">
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Transaction List */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm relative">
        {filteredTransactions.length === 0 ? (
          <div className="p-16 text-center text-muted-foreground flex flex-col items-center">
            <div className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center mb-4">
              <Icons.Receipt className="h-8 w-8 opacity-50" />
            </div>
            <h3 className="text-lg font-bold text-foreground mb-1">No transactions found</h3>
            <p className="text-sm">Try adjusting your filters or import a CSV statement.</p>
          </div>
        ) : (
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground uppercase tracking-wider bg-secondary/30 border-b border-border">
                <tr>
                  <th className="px-4 py-4 w-10 text-center">
                    <input 
                      type="checkbox" 
                      className="rounded border-border bg-background checked:bg-primary w-4 h-4 cursor-pointer"
                      checked={isAllSelected}
                      onChange={toggleSelectAll}
                    />
                  </th>
                  <th className="px-6 py-4 font-semibold">Date</th>
                  <th className="px-6 py-4 font-semibold">Description</th>
                  <th className="px-6 py-4 font-semibold">Category</th>
                  <th className="px-6 py-4 font-semibold text-right">Amount</th>
                  <th className="px-6 py-4 font-semibold text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredTransactions.map((tx) => {
                  const category = categories.find((c) => c.id === tx.categoryId);
                  const Icon = category && (Icons as any)[category.icon] ? (Icons as any)[category.icon] : Icons.HelpCircle;
                  const isSelected = selectedTxs.has(tx.id);
                  const card = cards.find(c => c.id === tx.cardId);
                  
                  return (
                    <tr 
                      key={tx.id} 
                      className={`transition-colors group ${isSelected ? 'bg-primary/5' : 'bg-card hover:bg-secondary/20'}`}
                      onClick={(e) => {
                        if ((e.target as HTMLElement).tagName !== 'INPUT' && (e.target as HTMLElement).tagName !== 'BUTTON' && (e.target as HTMLElement).tagName !== 'SVG') {
                           toggleSelect(tx.id);
                        }
                      }}
                    >
                      <td className="px-4 py-4 w-10 text-center" onClick={e => e.stopPropagation()}>
                        <input 
                          type="checkbox" 
                          className="rounded border-border bg-background checked:bg-primary w-4 h-4 cursor-pointer"
                          checked={isSelected}
                          onChange={() => toggleSelect(tx.id)}
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-muted-foreground font-medium">
                        {formatDate(tx.date)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-bold text-foreground">{tx.description}</div>
                        <div className="text-xs text-muted-foreground flex items-center gap-2 mt-1">
                          {card && <span className="bg-secondary px-2 py-0.5 rounded-md font-mono font-medium">{card.last4 !== 'CASH' ? `...${card.last4}` : 'CASH'}</span>}
                          {tx.tag && tx.tag !== 'none' && <span className="text-primary font-medium capitalize">#{tx.tag}</span>}
                          {tx.isTransferMatched && <span className="text-orange-500 font-medium flex items-center gap-1"><Icons.Link2 className="w-3 h-3"/> Linked</span>}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span 
                          className="inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-bold border"
                          style={{ backgroundColor: `${category?.color}15` || '#ccc15', color: category?.color || '#ccc', borderColor: `${category?.color}30` || '#ccc30' }}
                        >
                          <Icon className="w-3.5 h-3.5" />
                          {category?.name || 'Uncategorized'}
                        </span>
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-right font-mono font-bold text-[15px] ${tx.amount > 0 ? 'text-green-500' : 'text-foreground'}`}>
                        {tx.amount > 0 ? '+' : ''}{formatCurrency(tx.amount)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          {!tx.isReviewed && (
                             <button 
                               onClick={() => updateTransaction(tx.id, { isReviewed: true })}
                               className="p-2 text-orange-500 hover:bg-orange-500/10 rounded-lg transition-colors"
                               title="Mark as Reviewed"
                             >
                               <Icons.CheckCircle2 className="w-4 h-4" />
                             </button>
                          )}
                          <button 
                            onClick={() => setEditingTx(tx)}
                            className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                            title="Edit Transaction"
                          >
                            <Icons.Edit2 className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => {
                              if(confirm('Delete transaction?')) deleteTransaction(tx.id);
                            }}
                            className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                            title="Delete Transaction"
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

      {/* Floating Bulk Action Bar */}
      {selectedTxs.size > 0 && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 bg-card border border-border shadow-2xl rounded-2xl px-6 py-4 flex items-center gap-6 animate-in slide-in-from-bottom-10 fade-in z-40">
          <div className="flex items-center gap-2 border-r border-border pr-6">
             <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold">
               {selectedTxs.size}
             </div>
             <span className="text-sm font-semibold">Selected</span>
          </div>
          
          <div className="flex items-center gap-2">
            {!bulkEditMode ? (
              <>
                <button onClick={() => setBulkEditMode('category')} className="px-3 py-1.5 hover:bg-secondary rounded-lg text-sm font-medium transition-colors flex items-center gap-2">
                  <Icons.Tag className="w-4 h-4"/> Category
                </button>
                <button onClick={() => setBulkEditMode('tag')} className="px-3 py-1.5 hover:bg-secondary rounded-lg text-sm font-medium transition-colors flex items-center gap-2">
                  <Icons.Hash className="w-4 h-4"/> Tag
                </button>
                <button onClick={handleBulkDelete} className="px-3 py-1.5 hover:bg-destructive/10 text-destructive rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ml-2">
                  <Icons.Trash2 className="w-4 h-4"/> Delete
                </button>
                <button onClick={() => setSelectedTxs(new Set())} className="px-2 py-1.5 text-muted-foreground hover:text-foreground ml-2">
                  <Icons.X className="w-4 h-4"/>
                </button>
              </>
            ) : (
              <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-4">
                {bulkEditMode === 'category' && (
                  <select 
                    className="px-3 py-1.5 bg-secondary border border-border rounded-lg text-sm focus:outline-none"
                    value={bulkEditValue}
                    onChange={(e) => setBulkEditValue(e.target.value)}
                  >
                    <option value="">Select Category...</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                )}
                {bulkEditMode === 'tag' && (
                  <select 
                    className="px-3 py-1.5 bg-secondary border border-border rounded-lg text-sm focus:outline-none"
                    value={bulkEditValue}
                    onChange={(e) => setBulkEditValue(e.target.value)}
                  >
                    <option value="">Select Tag...</option>
                    {tags.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                )}
                <button 
                  onClick={handleBulkUpdate}
                  disabled={!bulkEditValue}
                  className="px-4 py-1.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium disabled:opacity-50"
                >
                  Apply
                </button>
                <button onClick={() => setBulkEditMode(null)} className="px-2 py-1.5 text-muted-foreground hover:text-foreground">
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingTx && (
        <EditTransactionModal 
          transaction={editingTx}
          onClose={() => setEditingTx(null)}
          onSave={(updates) => {
            if (editingTx.id) {
              updateTransaction(editingTx.id, updates);
            } else {
               addTransaction({
                 ...updates,
                 originalDescription: updates.description,
                 isTransferMatched: false
               });
            }
            setEditingTx(null);
          }}
        />
      )}

      {/* Import Wizard Modal */}
      {isImportWizardOpen && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-card border border-border p-6 rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-200">
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/20 text-primary flex items-center justify-center">
                <Icons.UploadCloud className="w-5 h-5" />
              </div>
              Import Wizard
            </h2>
            
            <div className="flex-1 overflow-y-auto pr-4 space-y-8 custom-scrollbar">
              
              {/* Step 1: Mapping */}
              {importStep === "mapping" && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-secondary/20 p-6 rounded-2xl border border-border">
                    <div>
                      <h3 className="font-bold mb-4 text-xs uppercase tracking-wider text-muted-foreground">Global Settings</h3>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium mb-1">Target Account</label>
                          <select 
                            className="w-full px-4 py-2.5 bg-background border border-border rounded-xl text-sm"
                            value={selectedCardId}
                            onChange={(e) => setSelectedCardId(e.target.value)}
                          >
                            <option value="">-- No Account --</option>
                            {cards.map(c => <option key={c.id} value={c.id}>{c.name} (...{c.last4})</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1">Date Format override</label>
                          <select 
                            className="w-full px-4 py-2.5 bg-background border border-border rounded-xl text-sm"
                            value={dateMode}
                            onChange={(e) => setDateMode(e.target.value as any)}
                          >
                            <option value="auto">Auto-detect (YYYY-MM-DD)</option>
                            <option value="DD/MM/YYYY">DD/MM/YYYY (Common in UAE)</option>
                            <option value="MM/DD/YYYY">MM/DD/YYYY (US Format)</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1">Amount Column Style</label>
                          <div className="flex bg-background border border-border rounded-xl overflow-hidden p-1">
                            <button 
                              className={`flex-1 py-2 text-xs font-bold rounded-lg ${amountMode === 'single' ? 'bg-card shadow text-foreground' : 'text-muted-foreground'}`}
                              onClick={() => setAmountMode("single")}
                            >
                              Single (+/-)
                            </button>
                            <button 
                              className={`flex-1 py-2 text-xs font-bold rounded-lg ${amountMode === 'dual' ? 'bg-card shadow text-foreground' : 'text-muted-foreground'}`}
                              onClick={() => setAmountMode("dual")}
                            >
                              Separate In/Out
                            </button>
                            <button 
                              className={`flex-1 py-2 text-xs font-bold rounded-lg ${amountMode === 'direction' ? 'bg-card shadow text-foreground' : 'text-muted-foreground'}`}
                              onClick={() => setAmountMode("direction")}
                            >
                              Amount + DR/CR
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h3 className="font-bold mb-4 text-xs uppercase tracking-wider text-muted-foreground">Column Mapping</h3>
                      <div className="space-y-3">
                        <div className="flex items-center gap-3">
                          <span className="w-24 text-sm font-bold text-right">Date *</span>
                          <select className="flex-1 px-4 py-2.5 bg-background border border-border rounded-xl text-sm"
                            value={mapping.date || ""} onChange={e => setMapping({...mapping, date: e.target.value})}
                          >
                            <option value="">-- Select --</option>
                            {importHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                          </select>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="w-24 text-sm font-bold text-right">Description *</span>
                          <select className="flex-1 px-4 py-2.5 bg-background border border-border rounded-xl text-sm"
                            value={mapping.description || ""} onChange={e => setMapping({...mapping, description: e.target.value})}
                          >
                            <option value="">-- Select --</option>
                            {importHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                          </select>
                        </div>
                        
                        {amountMode === "single" ? (
                          <div className="flex items-center gap-3">
                            <span className="w-24 text-sm font-bold text-right">Amount *</span>
                            <select className="flex-1 px-4 py-2.5 bg-background border border-border rounded-xl text-sm"
                              value={mapping.amount || ""} onChange={e => setMapping({...mapping, amount: e.target.value})}
                            >
                              <option value="">-- Select --</option>
                              {importHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                            </select>
                          </div>
                        ) : amountMode === "dual" ? (
                          <>
                            <div className="flex items-center gap-3">
                              <span className="w-24 text-sm font-bold text-right">Debit (Out) *</span>
                              <select className="flex-1 px-4 py-2.5 bg-background border border-border rounded-xl text-sm"
                                value={mapping.debit || ""} onChange={e => setMapping({...mapping, debit: e.target.value})}
                              >
                                <option value="">-- Select --</option>
                                {importHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                              </select>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="w-24 text-sm font-bold text-right">Credit (In) *</span>
                              <select className="flex-1 px-4 py-2.5 bg-background border border-border rounded-xl text-sm"
                                value={mapping.credit || ""} onChange={e => setMapping({...mapping, credit: e.target.value})}
                              >
                                <option value="">-- Select --</option>
                                {importHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                              </select>
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="flex items-center gap-3">
                              <span className="w-24 text-sm font-bold text-right">Amount *</span>
                              <select className="flex-1 px-4 py-2.5 bg-background border border-border rounded-xl text-sm"
                                value={mapping.amount || ""} onChange={e => setMapping({...mapping, amount: e.target.value})}
                              >
                                <option value="">-- Select --</option>
                                {importHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                              </select>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="w-24 text-sm font-bold text-right">Direction (DR/CR) *</span>
                              <select className="flex-1 px-4 py-2.5 bg-background border border-border rounded-xl text-sm"
                                value={mapping.direction || ""} onChange={e => setMapping({...mapping, direction: e.target.value})}
                              >
                                <option value="">-- Select --</option>
                                {importHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                              </select>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 2: Preview */}
              {importStep === "preview" && (
                <div className="space-y-4">
                  <div className="bg-primary/10 text-primary px-4 py-3 rounded-xl flex items-center gap-3 text-sm font-medium">
                    <Icons.Info className="w-5 h-5 shrink-0" />
                    Previewing first 10 rows. Check if amounts and dates are parsed correctly.
                  </div>
                  <div className="border border-border rounded-xl overflow-hidden shadow-sm">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-secondary/50 text-muted-foreground uppercase text-xs font-bold tracking-wider">
                        <tr>
                          <th className="px-6 py-4">Date</th>
                          <th className="px-6 py-4">Description</th>
                          <th className="px-6 py-4">Direction</th>
                          <th className="px-6 py-4 text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border bg-card">
                        {previewData.map((row, i) => (
                          <tr key={i} className={`hover:bg-secondary/20 transition-colors ${(row as any).isMalformed ? 'bg-destructive/5' : ''}`}>
                            <td className="px-6 py-3 font-medium">{row.date}</td>
                            <td className="px-6 py-3">
                              {row.description}
                              {(row as any).isMalformed && (
                                <span className="ml-2 text-[10px] bg-destructive text-destructive-foreground px-2 py-0.5 rounded-full uppercase font-bold tracking-wider">Error</span>
                              )}
                            </td>
                            <td className="px-6 py-3">
                              {(row as any).isMalformed ? (
                                <span className="text-muted-foreground">Unknown</span>
                              ) : row.type === 'income' ? (
                                <span className="text-green-500 font-medium flex items-center gap-1"><Icons.ArrowDownLeft className="w-3 h-3"/> In</span>
                              ) : (
                                <span className="text-foreground font-medium flex items-center gap-1"><Icons.ArrowUpRight className="w-3 h-3"/> Out</span>
                              )}
                            </td>
                            <td className={`px-6 py-3 text-right font-mono font-bold ${(row as any).isMalformed ? 'text-destructive' : row.amount > 0 ? 'text-green-500' : ''}`}>
                              {(row as any).isMalformed ? 'Invalid' : `${row.amount > 0 ? '+' : ''}${formatCurrency(row.amount)}`}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

            </div>

            <div className="mt-6 pt-6 border-t border-border flex justify-between items-center">
              {importStep === "mapping" ? (
                <>
                  <span className="text-sm text-muted-foreground font-medium">
                    {!isMappingValid && "Please map all required fields (*)"}
                  </span>
                  <div className="flex gap-3">
                    <button 
                      onClick={() => setIsImportWizardOpen(false)}
                      className="px-6 py-2.5 bg-secondary text-secondary-foreground rounded-xl hover:bg-secondary/80 transition-colors font-bold"
                    >
                      Cancel
                    </button>
                    <button 
                      onClick={() => setImportStep("preview")}
                      disabled={!isMappingValid}
                      className="px-6 py-2.5 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-colors font-bold disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-lg shadow-primary/20"
                    >
                      Preview Data <Icons.ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <button 
                    onClick={() => setImportStep("mapping")}
                    className="px-6 py-2.5 bg-secondary text-secondary-foreground rounded-xl hover:bg-secondary/80 transition-colors font-bold flex items-center gap-2"
                  >
                    <Icons.ArrowLeft className="w-4 h-4" /> Back to Mapping
                  </button>
                  <button 
                    onClick={handleFinalizeImport}
                    className="px-6 py-2.5 bg-green-500 text-white rounded-xl hover:bg-green-600 transition-colors font-bold shadow-lg shadow-green-500/20 flex items-center gap-2"
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