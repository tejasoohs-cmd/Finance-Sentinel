import { useState } from "react";
import { useFinanceStore } from "@/store/financeStore";
import { formatCurrency, formatDate } from "@/lib/utils";
import * as Icons from "lucide-react";
import { Transaction } from "@/types/finance";

export function Transfers() {
  const { transactions, cards, matchTransfers, linkTransactions, unlinkTransaction, splitTransaction } = useFinanceStore();
  const [selectedTxForMatch, setSelectedTxForMatch] = useState<string | null>(null);
  const [splitTx, setSplitTx] = useState<Transaction | null>(null);
  
  // Split state
  const [splitAmount1, setSplitAmount1] = useState("");
  const [splitAmount2, setSplitAmount2] = useState("");
  
  // Presets state
  const [showPresets, setShowPresets] = useState(false);

  const suspectedTransfers = transactions.filter(t => 
    !t.isTransferMatched && 
    (t.amount >= 1000 || t.amount <= -1000) && // Typically larger amounts are transfers
    (t.type === 'income' || t.type === 'expense')
  );

  const matchedTransfers = transactions.filter(t => t.isTransferMatched);

  const getCardName = (id: string | null) => {
    if (!id) return "Unknown";
    const card = cards.find(c => c.id === id);
    return card ? `${card.name} (${card.bank})` : "Unknown";
  };

  const applyTransferPreset = (presetName: string) => {
    // Basic heuristics for common UAE banking patterns
    const txs = [...transactions];
    let matchesMade = 0;
    
    if (presetName === 'enbd_to_mashreq') {
      // Find unlinked ENBD outflows and Mashreq inflows around same date/amount
      const enbdOut = txs.filter(t => !t.isTransferMatched && t.amount < 0 && getCardName(t.cardId).includes('ENBD'));
      const mashreqIn = txs.filter(t => !t.isTransferMatched && t.amount > 0 && getCardName(t.cardId).includes('Mashreq'));
      
      enbdOut.forEach(out => {
        const match = mashreqIn.find(inc => Math.abs(inc.amount) === Math.abs(out.amount) && Math.abs(new Date(inc.date).getTime() - new Date(out.date).getTime()) <= 3 * 24 * 60 * 60 * 1000);
        if (match) {
          linkTransactions(out.id, match.id, 'internal');
          matchesMade++;
        }
      });
    } else if (presetName === 'atm_to_cash') {
      // Outflows marked ATM or from Debit cards, matching inflows to Cash wallet
      const atmOut = txs.filter(t => !t.isTransferMatched && t.amount < 0 && (t.description.toLowerCase().includes('atm') || t.description.toLowerCase().includes('wd')));
      const cashIn = txs.filter(t => !t.isTransferMatched && t.amount > 0 && getCardName(t.cardId).includes('Cash'));
      
      atmOut.forEach(out => {
        const match = cashIn.find(inc => Math.abs(inc.amount) === Math.abs(out.amount) && Math.abs(new Date(inc.date).getTime() - new Date(out.date).getTime()) <= 1 * 24 * 60 * 60 * 1000);
        if (match) {
          linkTransactions(out.id, match.id, 'cash_withdrawal');
          matchesMade++;
        }
      });
    } else if (presetName === 'cc_payment') {
      // Outflows from debit to CC inflows
      const debitOut = txs.filter(t => !t.isTransferMatched && t.amount < 0 && !getCardName(t.cardId).includes('CC') && !getCardName(t.cardId).includes('Credit'));
      const ccIn = txs.filter(t => !t.isTransferMatched && t.amount > 0 && (getCardName(t.cardId).includes('CC') || getCardName(t.cardId).includes('Credit')));
      
      debitOut.forEach(out => {
        const match = ccIn.find(inc => Math.abs(inc.amount) === Math.abs(out.amount) && Math.abs(new Date(inc.date).getTime() - new Date(out.date).getTime()) <= 3 * 24 * 60 * 60 * 1000);
        if (match) {
          linkTransactions(out.id, match.id, 'cc_payment');
          matchesMade++;
        }
      });
    }
    
    alert(`Applied preset. Found and linked ${matchesMade} pairs.`);
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-24">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary">Transfer Queue</h1>
          <p className="text-muted-foreground">Review internal movements, CC payments, and cash flows.</p>
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <button 
              onClick={() => setShowPresets(!showPresets)}
              className="flex items-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 transition-colors text-sm font-medium"
            >
              <Icons.Zap className="h-4 w-4" />
              Presets
            </button>
            {showPresets && (
              <div className="absolute right-0 mt-2 w-64 bg-card border border-border rounded-xl shadow-xl z-50 overflow-hidden">
                <div className="p-3 border-b border-border bg-secondary/20">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">UAE Bank Patterns</h3>
                </div>
                <div className="p-2 flex flex-col gap-1">
                  <button onClick={() => { applyTransferPreset('enbd_to_mashreq'); setShowPresets(false); }} className="text-left px-3 py-2 text-sm hover:bg-secondary rounded-lg transition-colors">
                    Link ENBD → Mashreq
                  </button>
                  <button onClick={() => { applyTransferPreset('cc_payment'); setShowPresets(false); }} className="text-left px-3 py-2 text-sm hover:bg-secondary rounded-lg transition-colors">
                    Link Debit → Credit Card
                  </button>
                  <button onClick={() => { applyTransferPreset('atm_to_cash'); setShowPresets(false); }} className="text-left px-3 py-2 text-sm hover:bg-secondary rounded-lg transition-colors">
                    Link ATM → Cash Wallet
                  </button>
                </div>
              </div>
            )}
          </div>
          
          <button 
            onClick={matchTransfers}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium shadow-lg shadow-primary/20"
          >
            <Icons.Wand2 className="h-4 w-4" />
            Auto-Match All
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Unmatched Suspected Transfers */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Icons.AlertCircle className="w-5 h-5 text-orange-500"/>
            Action Required ({suspectedTransfers.length})
          </h2>
          <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm flex flex-col gap-px bg-border">
            {suspectedTransfers.length === 0 ? (
               <div className="p-8 text-center text-muted-foreground bg-card">
                 <Icons.CheckCircle2 className="w-12 h-12 mx-auto mb-3 opacity-30 text-green-500" />
                 <p>No large unmatched transactions found.</p>
               </div>
            ) : (
              suspectedTransfers.map(tx => (
                <div key={tx.id} className="bg-card p-4 hover:bg-secondary/20 transition-colors flex flex-col gap-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="text-sm font-bold">{tx.description}</div>
                      <div className="text-xs text-muted-foreground flex items-center gap-2 mt-1">
                        <span>{formatDate(tx.date)}</span>
                        <span>•</span>
                        <span className="bg-secondary px-2 py-0.5 rounded-full">{getCardName(tx.cardId)}</span>
                      </div>
                    </div>
                    <div className={`font-mono font-medium ${tx.amount > 0 ? 'text-green-500' : 'text-foreground'}`}>
                      {tx.amount > 0 ? '+' : ''}{formatCurrency(tx.amount)}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    {selectedTxForMatch === tx.id ? (
                      <div className="w-full bg-secondary/30 p-3 rounded-xl border border-border mt-2">
                        <p className="text-xs font-semibold mb-2">Select a transaction to link with:</p>
                        <div className="max-h-40 overflow-y-auto space-y-1 custom-scrollbar">
                          {transactions
                            .filter(t => t.id !== tx.id && !t.isTransferMatched && (Math.sign(t.amount) !== Math.sign(tx.amount)))
                            .slice(0, 10) // show top 10 candidates
                            .map(candidate => (
                              <button 
                                key={candidate.id}
                                onClick={() => {
                                  linkTransactions(tx.id, candidate.id, 'internal');
                                  setSelectedTxForMatch(null);
                                }}
                                className="w-full text-left p-2 bg-card border border-border rounded-lg hover:border-primary transition-all text-xs flex justify-between items-center"
                              >
                                <span>{candidate.description} ({getCardName(candidate.cardId)})</span>
                                <span className={candidate.amount > 0 ? 'text-green-500 font-mono' : 'font-mono'}>{formatCurrency(candidate.amount)}</span>
                              </button>
                            ))
                          }
                        </div>
                        <button onClick={() => setSelectedTxForMatch(null)} className="w-full mt-2 p-1.5 text-xs text-center text-muted-foreground hover:text-foreground">Cancel Link</button>
                      </div>
                    ) : (
                      <>
                        <button 
                          onClick={() => setSelectedTxForMatch(tx.id)}
                          className="flex-1 py-1.5 bg-secondary text-secondary-foreground rounded-lg text-xs font-medium hover:bg-secondary/80 flex items-center justify-center gap-1.5 transition-colors"
                        >
                          <Icons.Link2 className="w-3.5 h-3.5" /> Find Match
                        </button>
                        <button 
                          onClick={() => {
                            setSplitTx(tx);
                            setSplitAmount1(Math.abs(tx.amount * 0.5).toString());
                            setSplitAmount2(Math.abs(tx.amount * 0.5).toString());
                          }}
                          className="flex-1 py-1.5 border border-border bg-background rounded-lg text-xs font-medium hover:bg-secondary/50 flex items-center justify-center gap-1.5 transition-colors"
                        >
                          <Icons.Split className="w-3.5 h-3.5" /> Split Row
                        </button>
                        <button 
                          onClick={() => updateTransaction(tx.id, { isTransferMatched: true, type: tx.amount < 0 ? 'expense' : 'income', categoryId: 'cat_other' })}
                          className="px-3 py-1.5 bg-background border border-border rounded-lg text-xs hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 transition-colors"
                          title="Dismiss / Not a transfer"
                        >
                          <Icons.X className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Matched Transfers */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Icons.CheckCircle2 className="w-5 h-5 text-primary"/>
            Matched Pairs
          </h2>
          <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm flex flex-col gap-3 p-3">
            {matchedTransfers.length === 0 ? (
               <div className="p-8 text-center text-muted-foreground">
                 <p>No transfers have been matched yet.</p>
               </div>
            ) : (
              // Group by pair to display them together
              Object.values(matchedTransfers.reduce((acc, tx) => {
                if (!acc[tx.id] && tx.transferMatchId && !acc[tx.transferMatchId]) {
                  acc[tx.id] = [tx, matchedTransfers.find(t => t.id === tx.transferMatchId)!];
                }
                return acc;
              }, {} as Record<string, Transaction[]>)).map((pair: Transaction[], i) => {
                if (pair.length < 2 || !pair[0] || !pair[1]) return null;
                
                const [tx1, tx2] = pair[0].amount < 0 ? [pair[0], pair[1]] : [pair[1], pair[0]]; // tx1 is Out (negative), tx2 is In (positive)
                
                return (
                  <div key={i} className="border border-border rounded-xl p-3 bg-background relative overflow-hidden group">
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary/50"></div>
                    
                    <div className="flex justify-between items-center mb-2 px-2">
                      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        {tx1.transferType === 'cc_payment' ? <><Icons.CreditCard className="w-3.5 h-3.5"/> CC Payment</> :
                         tx1.transferType === 'cash_withdrawal' ? <><Icons.Banknote className="w-3.5 h-3.5"/> Cash Flow</> :
                         <><Icons.ArrowRightLeft className="w-3.5 h-3.5"/> Internal Transfer</>}
                      </div>
                      <button 
                        onClick={() => unlinkTransaction(tx1.id)}
                        className="text-[10px] text-destructive opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 hover:underline"
                      >
                        <Icons.Unlink className="w-3 h-3" /> Unlink
                      </button>
                    </div>

                    <div className="grid grid-cols-[1fr_auto_1fr] gap-2 items-center">
                      <div className="bg-secondary/20 p-2 rounded-lg text-sm">
                        <div className="font-medium truncate">{getCardName(tx1.cardId)}</div>
                        <div className="text-xs text-muted-foreground">{formatDate(tx1.date)}</div>
                        <div className="font-mono mt-1 text-foreground">{formatCurrency(tx1.amount)}</div>
                      </div>
                      
                      <div className="flex flex-col items-center justify-center text-muted-foreground">
                        <Icons.ArrowRight className="w-4 h-4 text-primary" />
                      </div>
                      
                      <div className="bg-secondary/20 p-2 rounded-lg text-sm">
                        <div className="font-medium truncate">{getCardName(tx2.cardId)}</div>
                        <div className="text-xs text-muted-foreground">{formatDate(tx2.date)}</div>
                        <div className="font-mono mt-1 text-green-500">+{formatCurrency(tx2.amount)}</div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>

      {/* Split Modal */}
      {splitTx && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-card border border-border p-6 rounded-3xl shadow-2xl max-w-md w-full animate-in zoom-in-95 duration-200">
            <h2 className="text-xl font-bold mb-1">Split Transaction</h2>
            <p className="text-sm text-muted-foreground mb-6">Original Amount: {formatCurrency(splitTx.amount)}</p>

            <div className="space-y-4 relative">
               <div className="absolute left-4 top-2 bottom-2 w-px bg-border"></div>
               
               <div className="relative pl-8">
                 <div className="absolute left-0 top-3 w-3 h-3 rounded-full border-2 border-primary bg-background -translate-x-[5px]"></div>
                 <label className="text-xs font-semibold text-muted-foreground">Part 1 (e.g. Credit Card Payment)</label>
                 <div className="flex gap-2 mt-1">
                   <input 
                     type="number" 
                     className="w-full px-3 py-2 bg-secondary/30 border border-border rounded-xl text-sm font-mono"
                     value={splitAmount1}
                     onChange={(e) => setSplitAmount1(e.target.value)}
                   />
                 </div>
               </div>

               <div className="relative pl-8">
                 <div className="absolute left-0 top-3 w-3 h-3 rounded-full border-2 border-primary bg-background -translate-x-[5px]"></div>
                 <label className="text-xs font-semibold text-muted-foreground">Part 2 (e.g. Real Expense / Cash)</label>
                 <div className="flex gap-2 mt-1">
                   <input 
                     type="number" 
                     className="w-full px-3 py-2 bg-secondary/30 border border-border rounded-xl text-sm font-mono"
                     value={splitAmount2}
                     onChange={(e) => setSplitAmount2(e.target.value)}
                   />
                 </div>
               </div>
            </div>

            <div className="mt-4 p-3 bg-secondary/20 rounded-xl text-xs flex justify-between items-center">
              <span className="text-muted-foreground">Total of splits:</span>
              <span className={`font-mono font-bold ${
                (parseFloat(splitAmount1 || '0') + parseFloat(splitAmount2 || '0')) !== Math.abs(splitTx.amount) 
                ? 'text-destructive' 
                : 'text-green-500'
              }`}>
                {formatCurrency((parseFloat(splitAmount1 || '0') + parseFloat(splitAmount2 || '0')) * Math.sign(splitTx.amount))}
              </span>
            </div>

            <div className="mt-8 flex justify-end gap-3">
              <button 
                onClick={() => setSplitTx(null)}
                className="px-4 py-2.5 bg-secondary text-secondary-foreground rounded-xl hover:bg-secondary/80 font-medium transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={() => {
                  const s1 = parseFloat(splitAmount1 || '0') * Math.sign(splitTx.amount);
                  const s2 = parseFloat(splitAmount2 || '0') * Math.sign(splitTx.amount);
                  
                  if (Math.abs(s1 + s2) !== Math.abs(splitTx.amount)) {
                    alert("Splits must equal original amount.");
                    return;
                  }

                  splitTransaction(splitTx.id, [
                    { amount: s1, categoryId: 'cat_transfer', type: 'transfer', description: `${splitTx.description} (Split 1)` },
                    { amount: s2, categoryId: 'cat_uncategorized', type: splitTx.amount >= 0 ? 'income' : 'expense', description: `${splitTx.description} (Split 2)` },
                  ]);
                  setSplitTx(null);
                }}
                className="px-4 py-2.5 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 font-medium transition-colors"
              >
                Confirm Split
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}