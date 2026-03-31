import { useState } from "react";
import { useFinanceStore } from "@/store/financeStore";
import * as Icons from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import { Card } from "@/types/finance";

export function Cards() {
  const { cards, addCard, deleteCard, transactions, updateCard } = useFinanceStore();
  const [isAdding, setIsAdding] = useState(false);
  const [newCardType, setNewCardType] = useState<'credit' | 'debit' | 'cash'>('debit');
  const [editingCard, setEditingCard] = useState<Card | null>(null);

  const handleOpenAdd = () => {
    setNewCardType('debit');
    setIsAdding(true);
    setEditingCard(null);
  };

  const handleOpenEdit = (card: Card) => {
    setNewCardType(card.type as any);
    setEditingCard(card);
    setIsAdding(true);
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-24">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary">Accounts & Wallets</h1>
          <p className="text-muted-foreground">Manage your banks, cards, and physical cash.</p>
        </div>
        <button 
          onClick={handleOpenAdd}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium shadow-lg shadow-primary/20"
        >
          <Icons.Plus className="h-4 w-4" />
          Add Account
        </button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => {
          const impliedBalance = transactions.filter(t => t.cardId === card.id).reduce((acc, tx) => acc + tx.amount, 0);
          const isCredit = card.type === 'credit';
          const outstanding = Math.abs(impliedBalance);
          const utilization = isCredit && card.creditLimit ? Math.min((outstanding / card.creditLimit) * 100, 100) : 0;

          return (
            <div 
              key={card.id} 
              onClick={() => handleOpenEdit(card)}
              className={`relative p-6 rounded-3xl border shadow-xl overflow-hidden group aspect-[1.58] flex flex-col justify-between cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all ${
                card.type === 'cash' 
                  ? 'bg-gradient-to-br from-green-900/40 to-green-950/40 border-green-500/30' 
                  : 'border-border'
              }`}
              style={card.type !== 'cash' ? {
                background: `linear-gradient(135deg, hsl(var(--card)) 0%, hsl(var(--secondary)) 100%)`
              } : {}}
            >
              {card.type !== 'cash' && (
                <div className="absolute top-6 left-6 w-12 h-9 bg-yellow-600/20 border border-yellow-600/40 rounded flex items-center justify-center overflow-hidden">
                  <div className="w-8 h-6 border border-yellow-600/30 rounded-sm"></div>
                </div>
              )}

              {card.type === 'cash' && (
                <div className="absolute top-6 left-6">
                   <Icons.Banknote className="w-8 h-8 text-green-500/50" />
                </div>
              )}
              
              <button 
                onClick={(e) => { e.stopPropagation(); deleteCard(card.id); }}
                className="absolute top-4 right-4 p-2 bg-destructive/10 text-destructive rounded-full opacity-0 group-hover:opacity-100 transition-all hover:bg-destructive hover:text-destructive-foreground z-10"
              >
                <Icons.Trash2 className="w-4 h-4" />
              </button>

              <div className="text-right mt-2 flex justify-end items-center gap-2 relative z-10">
                {card.type === 'credit' && <span className="text-[10px] font-bold px-2 py-0.5 bg-secondary/80 rounded-md text-muted-foreground uppercase tracking-wider backdrop-blur-sm">Credit</span>}
                {card.type === 'debit' && <span className="text-[10px] font-bold px-2 py-0.5 bg-secondary/80 rounded-md text-muted-foreground uppercase tracking-wider backdrop-blur-sm">Debit</span>}
                <span className="text-sm font-medium tracking-wider text-muted-foreground uppercase">
                  {card.bank}
                </span>
              </div>

              <div className="mt-auto space-y-4 relative z-10">
                <div>
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1 flex justify-between">
                    <span>{card.type === 'credit' ? 'Outstanding Balance' : 'Current Balance'}</span>
                    {isCredit && card.creditLimit && <span>Limit: {formatCurrency(card.creditLimit)}</span>}
                  </div>
                  <div className={`font-mono text-2xl tracking-tight font-bold ${card.type === 'credit' && impliedBalance < 0 ? 'text-orange-400' : 'text-foreground/90'}`}>
                    {card.type === 'credit' 
                      ? formatCurrency(outstanding) 
                      : formatCurrency(impliedBalance)}
                  </div>
                  {isCredit && card.creditLimit && (
                    <div className="w-full bg-background/50 h-1.5 rounded-full mt-2 overflow-hidden">
                      <div 
                        className={`h-full rounded-full ${utilization > 80 ? 'bg-red-500' : utilization > 50 ? 'bg-orange-500' : 'bg-primary'}`} 
                        style={{ width: `${utilization}%` }}
                      />
                    </div>
                  )}
                </div>
                
                <div className="flex justify-between items-end">
                  <div>
                    <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Account Name</div>
                    <div className="font-medium truncate max-w-[150px]">{card.name}</div>
                    {isCredit && (card.statementDate || card.dueDate) && (
                      <div className="text-[10px] text-muted-foreground mt-1">
                        {card.statementDate && `Stmt: ${card.statementDate} `}
                        {card.dueDate && `Due: ${card.dueDate}`}
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">{card.type !== 'cash' ? 'Last 4' : 'Type'}</div>
                    <div className="font-medium font-mono tracking-widest">{card.type !== 'cash' ? `•••• ${card.last4}` : 'CASH'}</div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {cards.length === 0 && !isAdding && (
          <div 
            onClick={handleOpenAdd}
            className="border-2 border-dashed border-border rounded-3xl aspect-[1.58] flex flex-col items-center justify-center text-muted-foreground hover:bg-secondary/30 hover:border-primary/50 hover:text-primary transition-all cursor-pointer"
          >
            <Icons.CreditCard className="w-8 h-8 mb-2 opacity-50" />
            <span className="font-medium">Add your first account</span>
          </div>
        )}
      </div>

      {isAdding && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-card border border-border p-6 rounded-3xl shadow-2xl max-w-md w-full animate-in zoom-in-95 duration-200 overflow-y-auto max-h-[90vh] custom-scrollbar">
            <h2 className="text-xl font-bold mb-6">{editingCard ? 'Edit Account' : 'Add New Account'}</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Account Type</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['credit', 'debit', 'cash'] as const).map(type => (
                    <button 
                      key={type} 
                      type="button"
                      onClick={() => setNewCardType(type)}
                      className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all ${
                        newCardType === type 
                          ? 'border-primary bg-primary/10 text-primary ring-1 ring-primary/20' 
                          : 'border-border bg-background text-foreground hover:bg-secondary/50'
                      }`}
                    >
                      {type === 'cash' ? <Icons.Banknote className="w-5 h-5 mb-1"/> : <Icons.CreditCard className="w-5 h-5 mb-1"/>}
                      <span className="text-xs font-medium capitalize">{type}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Institution / Bank Name</label>
                <input type="text" defaultValue={editingCard?.bank || ''} placeholder={newCardType === 'cash' ? "e.g. Wallet, Safe" : "e.g. Emirates NBD, Mashreq"} className="w-full px-4 py-3 bg-secondary/30 border border-border rounded-xl focus:outline-none focus:ring-1 focus:ring-primary/50 text-sm" id="new-card-bank"/>
              </div>
              
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Display Name</label>
                <input type="text" defaultValue={editingCard?.name || ''} placeholder={newCardType === 'cash' ? "e.g. Daily Cash" : "e.g. Skywards Infinite"} className="w-full px-4 py-3 bg-secondary/30 border border-border rounded-xl focus:outline-none focus:ring-1 focus:ring-primary/50 text-sm" id="new-card-name"/>
              </div>
              
              {newCardType !== 'cash' && (
                <div className="animate-in slide-in-from-top-2 duration-200 fade-in">
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Last 4 Digits (Optional)</label>
                  <input type="text" defaultValue={editingCard?.last4 !== 'CASH' ? editingCard?.last4 : ''} maxLength={4} placeholder="1234" className="w-full px-4 py-3 bg-secondary/30 border border-border rounded-xl font-mono focus:outline-none focus:ring-1 focus:ring-primary/50 text-sm" id="new-card-last4"/>
                </div>
              )}

              {newCardType === 'credit' && (
                <div className="grid grid-cols-2 gap-4 animate-in slide-in-from-top-2 duration-200 fade-in border-t border-border pt-4 mt-2">
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Statement Date</label>
                    <input type="number" min="1" max="31" defaultValue={editingCard?.statementDate || ''} placeholder="1-31" className="w-full px-4 py-3 bg-secondary/30 border border-border rounded-xl focus:outline-none focus:ring-1 focus:ring-primary/50 text-sm" id="new-card-statement"/>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Due Date</label>
                    <input type="number" min="1" max="31" defaultValue={editingCard?.dueDate || ''} placeholder="1-31" className="w-full px-4 py-3 bg-secondary/30 border border-border rounded-xl focus:outline-none focus:ring-1 focus:ring-primary/50 text-sm" id="new-card-due"/>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Credit Limit</label>
                    <input type="number" defaultValue={editingCard?.creditLimit || ''} placeholder="AED" className="w-full px-4 py-3 bg-secondary/30 border border-border rounded-xl focus:outline-none focus:ring-1 focus:ring-primary/50 text-sm font-mono" id="new-card-limit"/>
                  </div>
                </div>
              )}
            </div>
            
            <div className="mt-8 flex justify-end gap-3 pt-4 border-t border-border">
              <button 
                onClick={() => setIsAdding(false)}
                className="px-6 py-2.5 bg-secondary text-secondary-foreground rounded-xl hover:bg-secondary/80 transition-colors font-medium"
              >
                Cancel
              </button>
              <button 
                onClick={() => {
                  const nameVal = (document.getElementById('new-card-name') as HTMLInputElement).value || (newCardType === 'cash' ? 'My Cash' : 'My Account');
                  const bankVal = (document.getElementById('new-card-bank') as HTMLInputElement).value || (newCardType === 'cash' ? 'Wallet' : 'Bank');
                  const last4Val = newCardType === 'cash' ? 'CASH' : ((document.getElementById('new-card-last4') as HTMLInputElement)?.value || '0000');
                  
                  const updateData: Partial<Card> = {
                    name: nameVal,
                    bank: bankVal,
                    last4: last4Val,
                    type: newCardType,
                  };

                  if (newCardType === 'credit') {
                    const sd = (document.getElementById('new-card-statement') as HTMLInputElement)?.value;
                    const dd = (document.getElementById('new-card-due') as HTMLInputElement)?.value;
                    const cl = (document.getElementById('new-card-limit') as HTMLInputElement)?.value;
                    if (sd) updateData.statementDate = parseInt(sd);
                    if (dd) updateData.dueDate = parseInt(dd);
                    if (cl) updateData.creditLimit = parseFloat(cl);
                  }

                  if (editingCard) {
                    updateCard(editingCard.id, updateData);
                  } else {
                    addCard(updateData as Omit<Card, 'id'>);
                  }
                  
                  setIsAdding(false);
                  setEditingCard(null);
                }}
                className="px-6 py-2.5 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-colors font-medium shadow-lg shadow-primary/20"
              >
                {editingCard ? 'Save Changes' : 'Save Account'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}