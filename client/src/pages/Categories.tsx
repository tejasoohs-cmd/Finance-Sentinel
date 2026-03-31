import { useState } from "react";
import { useFinanceStore } from "@/store/financeStore";
import * as Icons from "lucide-react";
import { Category } from "@/types/finance";

export function Categories() {
  const { categories, addCategory, updateCategory, deleteCategory } = useFinanceStore();
  const [isAdding, setIsAdding] = useState(false);
  const [editingCat, setEditingCat] = useState<Category | null>(null);
  
  // Group categories
  const expenseCats = categories.filter(c => c.type === 'expense');
  const incomeCats = categories.filter(c => c.type === 'income');
  const transferCats = categories.filter(c => c.type === 'transfer');

  const handleSave = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const name = formData.get('name') as string;
    const type = formData.get('type') as 'expense' | 'income' | 'transfer';
    const color = formData.get('color') as string || '#3b82f6';
    const icon = formData.get('icon') as string || 'Tag';

    if (editingCat) {
      updateCategory(editingCat.id, { name, type, color, icon });
    } else {
      addCategory({ name, type, color, icon, isCustom: true } as any);
    }
    
    setIsAdding(false);
    setEditingCat(null);
  };

  const renderCategoryGroup = (title: string, list: Category[]) => (
    <div className="mb-8">
      <h2 className="text-lg font-bold mb-4 capitalize">{title}</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {list.map(c => {
          const Icon = (Icons as any)[c.icon] || Icons.Tag;
          return (
            <div key={c.id} className="p-4 rounded-2xl border border-border bg-card shadow-sm flex items-center justify-between group">
              <div className="flex items-center gap-3 truncate">
                <div 
                  className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{ backgroundColor: `${c.color}15`, color: c.color }}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <div className="truncate">
                  <p className="font-bold text-sm truncate">{c.name}</p>
                  {c.isCustom && <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Custom</p>}
                </div>
              </div>
              
              {c.isCustom && (
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={() => { setEditingCat(c); setIsAdding(true); }}
                    className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                  >
                    <Icons.Edit2 className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => {
                      if(confirm(`Delete category "${c.name}"? Transactions will become Uncategorized.`)) {
                        deleteCategory(c.id);
                      }
                    }}
                    className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                  >
                    <Icons.Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-24">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary">Categories</h1>
          <p className="text-muted-foreground">Manage your custom spending and income categories.</p>
        </div>
        <button 
          onClick={() => { setEditingCat(null); setIsAdding(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium shadow-lg shadow-primary/20"
        >
          <Icons.Plus className="h-4 w-4" />
          Add Category
        </button>
      </div>

      {renderCategoryGroup("Expenses", expenseCats)}
      {renderCategoryGroup("Income", incomeCats)}
      {renderCategoryGroup("Transfers", transferCats)}

      {isAdding && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-card border border-border p-6 rounded-3xl shadow-2xl max-w-md w-full animate-in zoom-in-95 duration-200">
            <h2 className="text-xl font-bold mb-6">{editingCat ? 'Edit Category' : 'New Category'}</h2>
            
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Name</label>
                <input 
                  type="text" 
                  name="name"
                  required
                  defaultValue={editingCat?.name || ''} 
                  placeholder="e.g. Coffee" 
                  className="w-full px-4 py-3 bg-secondary/30 border border-border rounded-xl focus:outline-none focus:ring-1 focus:ring-primary/50 text-sm" 
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Type</label>
                <div className="flex bg-secondary/30 p-1 rounded-xl border border-border">
                   {(['expense', 'income', 'transfer'] as const).map(t => (
                      <label key={t} className="flex-1 cursor-pointer">
                        <input type="radio" name="type" value={t} defaultChecked={editingCat ? editingCat.type === t : t === 'expense'} className="peer hidden" />
                        <div className="text-center py-2 text-sm font-bold text-muted-foreground peer-checked:bg-card peer-checked:text-foreground peer-checked:shadow rounded-lg transition-all capitalize">
                          {t}
                        </div>
                      </label>
                   ))}
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Color (Hex)</label>
                  <div className="flex items-center gap-2">
                    <input 
                      type="color" 
                      name="color"
                      defaultValue={editingCat?.color || '#3b82f6'} 
                      className="h-10 w-10 rounded cursor-pointer bg-transparent border-0 p-0" 
                    />
                    <input 
                      type="text" 
                      defaultValue={editingCat?.color || '#3b82f6'} 
                      className="flex-1 px-3 py-2 bg-secondary/30 border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary/50 text-sm font-mono" 
                      onChange={(e) => {
                        const colorInput = e.target.previousElementSibling as HTMLInputElement;
                        if(colorInput) colorInput.value = e.target.value;
                      }}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Icon</label>
                  <input 
                    type="text" 
                    name="icon"
                    defaultValue={editingCat?.icon || 'Tag'} 
                    placeholder="Lucide Icon name"
                    className="w-full px-3 py-2.5 bg-secondary/30 border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary/50 text-sm font-mono mt-1" 
                  />
                </div>
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
                  className="px-6 py-2.5 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-colors font-bold shadow-lg shadow-primary/20"
                >
                  Save Category
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}