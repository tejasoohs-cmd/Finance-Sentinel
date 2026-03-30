import { useState } from "react";
import { useFinanceStore } from "@/store/financeStore";
import * as Icons from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import { Card } from "@/types/finance";

export function Cards() {
  const { cards, addCard, deleteCard } = useFinanceStore();
  const [isAdding, setIsAdding] = useState(false);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary">Cards & Accounts</h1>
          <p className="text-muted-foreground">Manage your payment methods.</p>
        </div>
        <button 
          onClick={() => setIsAdding(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium"
        >
          <Icons.Plus className="h-4 w-4" />
          Add Card
        </button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <div 
            key={card.id} 
            className="relative p-6 rounded-2xl border border-border shadow-lg overflow-hidden group aspect-[1.58] flex flex-col justify-between"
            style={{
              background: `linear-gradient(135deg, hsl(var(--card)) 0%, hsl(var(--secondary)) 100%)`
            }}
          >
            {/* Card Chip decoration */}
            <div className="absolute top-6 left-6 w-12 h-9 bg-yellow-600/20 border border-yellow-600/40 rounded flex items-center justify-center overflow-hidden">
              <div className="w-8 h-6 border border-yellow-600/30 rounded-sm"></div>
            </div>
            
            {/* Delete button (shows on hover) */}
            <button 
              onClick={() => deleteCard(card.id)}
              className="absolute top-4 right-4 p-2 bg-destructive/10 text-destructive rounded-full opacity-0 group-hover:opacity-100 transition-all hover:bg-destructive hover:text-destructive-foreground z-10"
            >
              <Icons.Trash2 className="w-4 h-4" />
            </button>

            <div className="text-right mt-2">
              <span className="text-sm font-medium tracking-wider text-muted-foreground uppercase">
                {card.bank}
              </span>
            </div>

            <div className="mt-8 space-y-4">
              <div className="font-mono text-xl tracking-widest flex items-center gap-4 text-foreground/80">
                <span>••••</span>
                <span>••••</span>
                <span>••••</span>
                <span className="text-foreground">{card.last4}</span>
              </div>
              
              <div className="flex justify-between items-end">
                <div>
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Card Name</div>
                  <div className="font-medium truncate max-w-[150px]">{card.name}</div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Type</div>
                  <div className="font-medium capitalize">{card.type}</div>
                </div>
              </div>
            </div>
          </div>
        ))}

        {cards.length === 0 && !isAdding && (
          <div 
            onClick={() => setIsAdding(true)}
            className="border-2 border-dashed border-border rounded-2xl aspect-[1.58] flex flex-col items-center justify-center text-muted-foreground hover:bg-secondary/30 hover:border-primary/50 hover:text-primary transition-all cursor-pointer cursor-pointer"
          >
            <Icons.CreditCard className="w-8 h-8 mb-2 opacity-50" />
            <span className="font-medium">Add your first card</span>
          </div>
        )}
      </div>

      {/* Basic form mockup for adding a card */}
      {isAdding && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border p-6 rounded-xl shadow-2xl max-w-md w-full animate-in zoom-in-95 duration-200">
            <h2 className="text-xl font-bold mb-4">Add New Card</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">Bank Name</label>
                <input type="text" placeholder="e.g. ENBD" className="w-full px-3 py-2 bg-background border border-border rounded-lg" id="new-card-bank"/>
              </div>
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">Card Name</label>
                <input type="text" placeholder="e.g. Skywards Infinite" className="w-full px-3 py-2 bg-background border border-border rounded-lg" id="new-card-name"/>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">Last 4 Digits</label>
                  <input type="text" maxLength={4} placeholder="1234" className="w-full px-3 py-2 bg-background border border-border rounded-lg font-mono" id="new-card-last4"/>
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">Type</label>
                  <select className="w-full px-3 py-2 bg-background border border-border rounded-lg" id="new-card-type">
                    <option value="credit">Credit</option>
                    <option value="debit">Debit</option>
                    <option value="prepaid">Prepaid</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button 
                onClick={() => setIsAdding(false)}
                className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg"
              >
                Cancel
              </button>
              <button 
                onClick={() => {
                  addCard({
                    name: (document.getElementById('new-card-name') as HTMLInputElement).value || 'My Card',
                    bank: (document.getElementById('new-card-bank') as HTMLInputElement).value || 'Bank',
                    last4: (document.getElementById('new-card-last4') as HTMLInputElement).value || '0000',
                    type: (document.getElementById('new-card-type') as HTMLSelectElement).value as any,
                  });
                  setIsAdding(false);
                }}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg"
              >
                Save Card
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}