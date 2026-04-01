import { useState, useMemo } from "react";
import { useFinanceStore } from "@/store/financeStore";
import * as Icons from "lucide-react";
import { CategorizationRule } from "@/utils/categorization";

type RuleFormData = {
  keyword: string;
  categoryId: string;
  tag: string;
  type: string;
  isExactMatch: boolean;
};

const emptyForm = (): RuleFormData => ({
  keyword: "",
  categoryId: "cat_uncategorized",
  tag: "none",
  type: "",
  isExactMatch: false,
});

export function Rules() {
  const { categorizationRules, addCategorizationRule, updateCategorizationRule, deleteCategorizationRule, categories } = useFinanceStore();

  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState("all");
  const [filterStatus, setFilterStatus] = useState<"all" | "enabled" | "disabled">("all");
  const [editingRule, setEditingRule] = useState<CategorizationRule | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [form, setForm] = useState<RuleFormData>(emptyForm());

  const getCategoryName = (id: string) => categories.find(c => c.id === id)?.name || "Unknown";

  const filtered = useMemo(() => {
    return categorizationRules.filter(r => {
      const matchSearch = !search || r.keyword.toLowerCase().includes(search.toLowerCase()) || getCategoryName(r.categoryId).toLowerCase().includes(search.toLowerCase());
      const matchCat = filterCat === "all" || r.categoryId === filterCat;
      const enabled = r.isEnabled !== false;
      const matchStatus = filterStatus === "all" || (filterStatus === "enabled" && enabled) || (filterStatus === "disabled" && !enabled);
      return matchSearch && matchCat && matchStatus;
    });
  }, [categorizationRules, search, filterCat, filterStatus, categories]);

  const openAdd = () => {
    setEditingRule(null);
    setForm(emptyForm());
    setIsAdding(true);
  };

  const openEdit = (rule: CategorizationRule) => {
    setEditingRule(rule);
    setForm({
      keyword: rule.keyword,
      categoryId: rule.categoryId,
      tag: rule.tag || "none",
      type: rule.type || "",
      isExactMatch: rule.isExactMatch || false,
    });
    setIsAdding(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.keyword.trim()) return;

    const payload: Partial<CategorizationRule> = {
      keyword: form.keyword.trim().toLowerCase(),
      categoryId: form.categoryId,
      tag: form.tag,
      type: form.type as any || undefined,
      isExactMatch: form.isExactMatch,
    };

    if (editingRule) {
      updateCategorizationRule(editingRule.id, payload);
    } else {
      addCategorizationRule({ ...payload, isEnabled: true } as any);
    }

    setIsAdding(false);
    setEditingRule(null);
    setForm(emptyForm());
  };

  const toggleEnabled = (rule: CategorizationRule) => {
    updateCategorizationRule(rule.id, { isEnabled: rule.isEnabled === false ? true : false });
  };

  const isLearned = (id: string) => id.startsWith('rule_learned');
  const isDefault = (id: string) => id.startsWith('rule_') && !id.startsWith('rule_custom') && !id.startsWith('rule_learned');

  const ruleTypeLabel: Record<string, string> = {
    expense: 'Expense',
    income: 'Income',
    transfer: 'Transfer',
    '': 'Any',
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-24">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary">Categorization Rules</h1>
          <p className="text-muted-foreground">Manage rules that automatically categorize your transactions.</p>
        </div>
        <button
          onClick={openAdd}
          data-testid="button-add-rule"
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium shadow-lg shadow-primary/20"
        >
          <Icons.Plus className="h-4 w-4" />
          Add Rule
        </button>
      </div>

      {/* How it works */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-border bg-secondary/20 flex items-start gap-3">
          <Icons.Brain className="w-5 h-5 text-primary mt-0.5 shrink-0" />
          <p className="text-xs text-muted-foreground leading-relaxed">When you import or add a transaction, its description is matched against these rules (most specific first). Rules marked <span className="text-primary font-bold">Learned</span> were created automatically when you corrected a category. You can edit, disable, or delete any rule.</p>
        </div>

        {/* Filters */}
        <div className="p-4 border-b border-border flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[160px]">
            <Icons.Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search keyword or category…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              data-testid="input-rules-search"
              className="w-full pl-9 pr-4 py-2 bg-secondary/30 border border-border rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-primary/50"
            />
          </div>
          <select
            value={filterCat}
            onChange={e => setFilterCat(e.target.value)}
            data-testid="select-rules-category"
            className="px-3 py-2 bg-secondary/30 border border-border rounded-xl text-sm focus:outline-none"
          >
            <option value="all">All Categories</option>
            {categories.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value as any)}
            data-testid="select-rules-status"
            className="px-3 py-2 bg-secondary/30 border border-border rounded-xl text-sm focus:outline-none"
          >
            <option value="all">All</option>
            <option value="enabled">Enabled</option>
            <option value="disabled">Disabled</option>
          </select>
        </div>

        {filtered.length === 0 ? (
          <div className="p-16 text-center text-muted-foreground">
            <Icons.BookOpen className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No rules match your filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground uppercase tracking-wider bg-secondary/30 border-b border-border">
                <tr>
                  <th className="px-4 py-3 font-semibold">On/Off</th>
                  <th className="px-4 py-3 font-semibold">Keyword Pattern</th>
                  <th className="px-4 py-3 font-semibold">Category</th>
                  <th className="px-4 py-3 font-semibold hidden md:table-cell">Tag</th>
                  <th className="px-4 py-3 font-semibold hidden md:table-cell">Type</th>
                  <th className="px-4 py-3 font-semibold w-20"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((rule) => {
                  const enabled = rule.isEnabled !== false;
                  return (
                    <tr
                      key={rule.id}
                      data-testid={`row-rule-${rule.id}`}
                      className={`hover:bg-secondary/10 transition-colors group ${!enabled ? 'opacity-50' : ''}`}
                    >
                      <td className="px-4 py-3">
                        <button
                          onClick={() => toggleEnabled(rule)}
                          data-testid={`toggle-rule-${rule.id}`}
                          title={enabled ? "Disable rule" : "Enable rule"}
                          className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${enabled ? 'bg-primary' : 'bg-secondary'}`}
                        >
                          <span className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-lg ring-0 transition-transform duration-200 ${enabled ? 'translate-x-4' : 'translate-x-0'}`} />
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`font-mono font-medium bg-secondary/50 inline-block px-2 py-0.5 rounded text-xs ${rule.isExactMatch ? 'ring-1 ring-primary/40' : ''}`}>
                            {rule.isExactMatch ? `"${rule.keyword}"` : rule.keyword}
                          </span>
                          {isLearned(rule.id) && (
                            <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded uppercase font-bold tracking-wider">Learned</span>
                          )}
                          {isDefault(rule.id) && (
                            <span className="text-[10px] bg-secondary text-muted-foreground px-1.5 py-0.5 rounded uppercase font-bold tracking-wider">Default</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 font-medium text-sm">{getCategoryName(rule.categoryId)}</td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <span className="capitalize bg-secondary px-2 py-0.5 rounded-full text-xs">{rule.tag || 'none'}</span>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <span className="text-xs text-muted-foreground">{ruleTypeLabel[rule.type || '']}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity justify-end">
                          <button
                            onClick={() => openEdit(rule)}
                            data-testid={`button-edit-rule-${rule.id}`}
                            className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                            title="Edit rule"
                          >
                            <Icons.Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => deleteCategorizationRule(rule.id)}
                            data-testid={`button-delete-rule-${rule.id}`}
                            className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                            title="Delete rule"
                          >
                            <Icons.Trash2 className="w-3.5 h-3.5" />
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
        <div className="px-4 py-3 border-t border-border text-xs text-muted-foreground">
          {filtered.length} of {categorizationRules.length} rules shown · {categorizationRules.filter(r => r.isEnabled !== false).length} active
        </div>
      </div>

      {/* Add / Edit Modal */}
      {isAdding && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-card border border-border p-6 rounded-3xl shadow-2xl max-w-md w-full animate-in zoom-in-95 duration-200">
            <h2 className="text-xl font-bold mb-6">{editingRule ? 'Edit Rule' : 'New Categorization Rule'}</h2>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">If description contains:</label>
                <input
                  type="text"
                  required
                  value={form.keyword}
                  onChange={e => setForm(f => ({ ...f, keyword: e.target.value }))}
                  placeholder="e.g. starbucks, dewa, uber"
                  data-testid="input-rule-keyword"
                  className="w-full px-4 py-3 bg-secondary/30 border border-border rounded-xl focus:outline-none focus:ring-1 focus:ring-primary/50 text-sm font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Assign Category:</label>
                <select
                  value={form.categoryId}
                  onChange={e => setForm(f => ({ ...f, categoryId: e.target.value }))}
                  data-testid="select-rule-category"
                  className="w-full px-4 py-3 bg-secondary/30 border border-border rounded-xl focus:outline-none focus:ring-1 focus:ring-primary/50 text-sm"
                >
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Assign Tag:</label>
                  <select
                    value={form.tag}
                    onChange={e => setForm(f => ({ ...f, tag: e.target.value }))}
                    data-testid="select-rule-tag"
                    className="w-full px-4 py-3 bg-secondary/30 border border-border rounded-xl focus:outline-none focus:ring-1 focus:ring-primary/50 text-sm"
                  >
                    <option value="none">None</option>
                    <option value="personal">Personal</option>
                    <option value="business">Business</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Match Type:</label>
                  <select
                    value={form.type}
                    onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                    data-testid="select-rule-type"
                    className="w-full px-4 py-3 bg-secondary/30 border border-border rounded-xl focus:outline-none focus:ring-1 focus:ring-primary/50 text-sm"
                  >
                    <option value="">Any</option>
                    <option value="expense">Expense</option>
                    <option value="income">Income</option>
                    <option value="transfer">Transfer</option>
                  </select>
                </div>
              </div>

              <label className="flex items-center gap-3 cursor-pointer p-3 rounded-xl border border-border hover:bg-secondary/30 transition-colors">
                <input
                  type="checkbox"
                  checked={form.isExactMatch}
                  onChange={e => setForm(f => ({ ...f, isExactMatch: e.target.checked }))}
                  data-testid="checkbox-rule-exact"
                  className="w-4 h-4 accent-primary rounded"
                />
                <div>
                  <p className="text-sm font-medium">Exact word match</p>
                  <p className="text-xs text-muted-foreground">If checked, the keyword must appear as a complete word, not just a substring</p>
                </div>
              </label>

              <div className="mt-8 flex justify-end gap-3 pt-4 border-t border-border">
                <button
                  type="button"
                  onClick={() => { setIsAdding(false); setEditingRule(null); }}
                  className="px-6 py-2.5 bg-secondary text-secondary-foreground rounded-xl hover:bg-secondary/80 transition-colors font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!form.keyword.trim()}
                  className="px-6 py-2.5 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-colors font-bold shadow-lg shadow-primary/20 disabled:opacity-50"
                >
                  {editingRule ? 'Save Changes' : 'Create Rule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
