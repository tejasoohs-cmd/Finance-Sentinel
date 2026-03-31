import { useState } from "react";
import { useFinanceStore } from "@/store/financeStore";
import * as Icons from "lucide-react";
import { CategorizationRule } from "@/utils/categorization";

export function Rules() {
  const { categorizationRules, addCategorizationRule, deleteCategorizationRule, categories } = useFinanceStore();
  const [isAdding, setIsAdding] = useState(false);
  const [newKeyword, setNewKeyword] = useState("");
  const [newCategory, setNewCategory] = useState("cat_uncategorized");
  const [newTag, setNewTag] = useState("none");

  const getCategoryName = (id: string) => {
    return categories.find(c => c.id === id)?.name || "Unknown";
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyword.trim()) return;

    addCategorizationRule({
      keyword: newKeyword.trim().toLowerCase(),
      categoryId: newCategory,
      tag: newTag,
      isExactMatch: false
    });
    
    setIsAdding(false);
    setNewKeyword("");
    setNewCategory("cat_uncategorized");
    setNewTag("none");
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-24">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary">Categorization Rules</h1>
          <p className="text-muted-foreground">Manage rules that automatically categorize your transactions.</p>
        </div>
        <button 
          onClick={() => setIsAdding(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium shadow-lg shadow-primary/20"
        >
          <Icons.Plus className="h-4 w-4" />
          Add Rule
        </button>
      </div>

      <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-border bg-secondary/20 flex items-start gap-3">
            <Icons.Brain className="w-5 h-5 text-primary mt-0.5" />
            <div>
                <p className="text-sm font-bold">How it works</p>
                <p className="text-xs text-muted-foreground mt-1">When you import or add a transaction, its description is checked against these rules. If a match is found, it's automatically categorized. The app also learns automatically when you manually edit a transaction's category.</p>
            </div>
        </div>
        
        {categorizationRules.length === 0 ? (
          <div className="p-16 text-center text-muted-foreground">
            <Icons.BookOpen className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No rules found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground uppercase tracking-wider bg-secondary/30 border-b border-border">
                <tr>
                  <th className="px-6 py-4 font-semibold">Keyword Pattern</th>
                  <th className="px-6 py-4 font-semibold">Assigns Category</th>
                  <th className="px-6 py-4 font-semibold">Assigns Tag</th>
                  <th className="px-6 py-4 font-semibold w-16"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {categorizationRules.map((rule) => (
                  <tr key={rule.id} className="hover:bg-secondary/10 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="font-mono font-medium bg-secondary/50 inline-block px-2 py-1 rounded">
                         {rule.keyword}
                      </div>
                      {rule.id.startsWith('rule_learned') && (
                         <span className="ml-2 text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded uppercase font-bold tracking-wider">Learned</span>
                      )}
                    </td>
                    <td className="px-6 py-4 font-medium">{getCategoryName(rule.categoryId)}</td>
                    <td className="px-6 py-4">
                      <span className="capitalize bg-secondary px-2 py-1 rounded-full text-xs">{rule.tag}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {!rule.id.startsWith('rule_') || rule.id.startsWith('rule_custom') || rule.id.startsWith('rule_learned') ? (
                          <button 
                            onClick={() => deleteCategorizationRule(rule.id)}
                            className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                            title="Delete rule"
                          >
                            <Icons.Trash2 className="w-4 h-4" />
                          </button>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {isAdding && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-card border border-border p-6 rounded-3xl shadow-2xl max-w-md w-full animate-in zoom-in-95 duration-200">
            <h2 className="text-xl font-bold mb-6">New Categorization Rule</h2>
            
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">If description contains:</label>
                <input 
                  type="text" 
                  required
                  value={newKeyword}
                  onChange={e => setNewKeyword(e.target.value)}
                  placeholder="e.g. starbucks, dewa, uber" 
                  className="w-full px-4 py-3 bg-secondary/30 border border-border rounded-xl focus:outline-none focus:ring-1 focus:ring-primary/50 text-sm font-mono" 
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Assign Category:</label>
                <select
                  value={newCategory}
                  onChange={e => setNewCategory(e.target.value)}
                  className="w-full px-4 py-3 bg-secondary/30 border border-border rounded-xl focus:outline-none focus:ring-1 focus:ring-primary/50 text-sm"
                >
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Assign Tag:</label>
                <select
                  value={newTag}
                  onChange={e => setNewTag(e.target.value)}
                  className="w-full px-4 py-3 bg-secondary/30 border border-border rounded-xl focus:outline-none focus:ring-1 focus:ring-primary/50 text-sm"
                >
                  <option value="none">None</option>
                  <option value="personal">Personal</option>
                  <option value="business">Business</option>
                </select>
              </div>

              <div className="mt-8 flex justify-end gap-3 pt-4 border-t border-border">
                <button 
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="px-6 py-2.5 bg-secondary text-secondary-foreground rounded-xl hover:bg-secondary/80 transition-colors font-bold"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={!newKeyword.trim()}
                  className="px-6 py-2.5 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-colors font-bold shadow-lg shadow-primary/20 disabled:opacity-50"
                >
                  Create Rule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}