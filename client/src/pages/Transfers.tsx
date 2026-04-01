import { useState, useMemo } from "react";
import { useFinanceStore } from "@/store/financeStore";
import { formatCurrency, formatDate } from "@/lib/utils";
import * as Icons from "lucide-react";
import { Transaction } from "@/types/finance";

// Compute a match score for two transactions: 100 = perfect
function matchScore(a: Transaction, b: Transaction): number {
  if (Math.sign(a.amount) === Math.sign(b.amount)) return 0;
  const absA = Math.abs(a.amount);
  const absB = Math.abs(b.amount);
  const amtDiff = Math.abs(absA - absB) / Math.max(absA, absB);
  if (amtDiff > 0.01) return 0; // must be within 1% to count
  const daysDiff = Math.abs(new Date(a.date).getTime() - new Date(b.date).getTime()) / (1000 * 60 * 60 * 24);
  if (daysDiff > 7) return 0;
  const timePenalty = daysDiff * 10;
  return Math.round(100 - timePenalty);
}

function guessTransferType(out: Transaction, inTx: Transaction, getCardName: (id: string | null) => string): string {
  const outCard = getCardName(out.cardId).toLowerCase();
  const inCard = getCardName(inTx.cardId).toLowerCase();
  if (inCard.includes('credit') || inCard.includes('cc') || outCard.includes('credit') || outCard.includes('cc')) return 'cc_payment';
  if (inCard.includes('cash') || outCard.includes('atm') || out.description.toLowerCase().includes('atm')) return 'cash_withdrawal';
  return 'internal';
}

export function Transfers() {
  const { transactions, cards, matchTransfers, linkTransactions, unlinkTransaction, splitTransaction, updateTransaction } = useFinanceStore();
  const [selectedTxForMatch, setSelectedTxForMatch] = useState<string | null>(null);
  const [splitTx, setSplitTx] = useState<Transaction | null>(null);
  const [splitAmount1, setSplitAmount1] = useState("");
  const [splitAmount2, setSplitAmount2] = useState("");
  const [showPresets, setShowPresets] = useState(false);
  const [dismissedSuggestions, setDismissedSuggestions] = useState<string[]>([]);

  const getCardName = (id: string | null) => {
    if (!id) return "Unknown";
    const card = cards.find(c => c.id === id);
    return card ? `${card.name} (${card.bank})` : "Unknown";
  };

  // All unmatched transactions
  const unmatched = useMemo(() =>
    transactions.filter(t => !t.isTransferMatched),
    [transactions]
  );

  // Suspected transfers = unmatched non-trivial amounts that look like transfers
  const suspectedTransfers = useMemo(() =>
    unmatched.filter(t =>
      (t.amount >= 500 || t.amount <= -500) &&
      (t.type === 'income' || t.type === 'expense' || t.type === 'transfer')
    ),
    [unmatched]
  );

  const matchedTransfers = useMemo(() =>
    transactions.filter(t => t.isTransferMatched),
    [transactions]
  );

  // Smart suggestions: find best-scoring pairs among unmatched
  const smartSuggestions = useMemo(() => {
    const outflows = unmatched.filter(t => t.amount < 0);
    const inflows = unmatched.filter(t => t.amount > 0);
    const seen = new Set<string>();
    const pairs: { out: Transaction; inTx: Transaction; score: number; type: string }[] = [];

    outflows.forEach(out => {
      let best: { inTx: Transaction; score: number } | null = null;
      inflows.forEach(inTx => {
        if (inTx.id === out.id) return;
        const score = matchScore(out, inTx);
        if (score > 0 && (!best || score > best.score)) {
          best = { inTx, score };
        }
      });
      if (best && best.score >= 70 && !seen.has(out.id) && !seen.has(best.inTx.id)) {
        seen.add(out.id);
        seen.add(best.inTx.id);
        pairs.push({ out, inTx: best.inTx, score: best.score, type: guessTransferType(out, best.inTx, getCardName) });
      }
    });

    return pairs.filter(p => !dismissedSuggestions.includes(`${p.out.id}|${p.inTx.id}`));
  }, [unmatched, dismissedSuggestions]);

  const applyTransferPreset = (presetName: string) => {
    const txs = [...transactions];
    let matchesMade = 0;

    if (presetName === 'enbd_to_mashreq') {
      const enbdOut = txs.filter(t => !t.isTransferMatched && t.amount < 0 && getCardName(t.cardId).toLowerCase().includes('enbd'));
      const mashreqIn = txs.filter(t => !t.isTransferMatched && t.amount > 0 && getCardName(t.cardId).toLowerCase().includes('mashreq'));
      enbdOut.forEach(out => {
        const match = mashreqIn.find(inc => Math.abs(inc.amount) === Math.abs(out.amount) && Math.abs(new Date(inc.date).getTime() - new Date(out.date).getTime()) <= 3 * 24 * 60 * 60 * 1000);
        if (match) { linkTransactions(out.id, match.id, 'internal'); matchesMade++; }
      });
    } else if (presetName === 'atm_to_cash') {
      const atmOut = txs.filter(t => !t.isTransferMatched && t.amount < 0 && (t.description.toLowerCase().includes('atm') || t.description.toLowerCase().includes('wd')));
      const cashIn = txs.filter(t => !t.isTransferMatched && t.amount > 0 && getCardName(t.cardId).toLowerCase().includes('cash'));
      atmOut.forEach(out => {
        const match = cashIn.find(inc => Math.abs(inc.amount) === Math.abs(out.amount) && Math.abs(new Date(inc.date).getTime() - new Date(out.date).getTime()) <= 1 * 24 * 60 * 60 * 1000);
        if (match) { linkTransactions(out.id, match.id, 'cash_withdrawal'); matchesMade++; }
      });
    } else if (presetName === 'cc_payment') {
      const debitOut = txs.filter(t => !t.isTransferMatched && t.amount < 0);
      const ccIn = txs.filter(t => !t.isTransferMatched && t.amount > 0 && (getCardName(t.cardId).toLowerCase().includes('cc') || getCardName(t.cardId).toLowerCase().includes('credit')));
      debitOut.forEach(out => {
        const match = ccIn.find(inc => Math.abs(inc.amount) === Math.abs(out.amount) && Math.abs(new Date(inc.date).getTime() - new Date(out.date).getTime()) <= 3 * 24 * 60 * 60 * 1000);
        if (match) { linkTransactions(out.id, match.id, 'cc_payment'); matchesMade++; }
      });
    }

    alert(`Applied preset. Found and linked ${matchesMade} pair${matchesMade !== 1 ? 's' : ''}.`);
  };

  const typeLabel: Record<string, { label: string; icon: any }> = {
    cc_payment: { label: 'CC Payment', icon: Icons.CreditCard },
    cash_withdrawal: { label: 'Cash Flow', icon: Icons.Banknote },
    internal: { label: 'Internal Transfer', icon: Icons.ArrowRightLeft },
    uncertain: { label: 'Internal Transfer', icon: Icons.ArrowRightLeft },
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
              data-testid="button-presets"
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
            data-testid="button-auto-match"
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium shadow-lg shadow-primary/20"
          >
            <Icons.Wand2 className="h-4 w-4" />
            Auto-Match All
          </button>
        </div>
      </div>

      {/* Smart Suggestions Panel */}
      {smartSuggestions.length > 0 && (
        <div className="bg-primary/5 border border-primary/20 rounded-2xl overflow-hidden">
          <div className="px-5 py-3 border-b border-primary/20 flex items-center gap-2">
            <Icons.Sparkles className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-bold text-primary">Smart Suggestions ({smartSuggestions.length})</h2>
            <span className="ml-auto text-xs text-muted-foreground">High-confidence matches detected</span>
          </div>
          <div className="p-4 space-y-3">
            {smartSuggestions.map(({ out, inTx, score, type }) => {
              const TypeIcon = typeLabel[type]?.icon || Icons.ArrowRightLeft;
              return (
                <div key={`${out.id}|${inTx.id}`} className="bg-card border border-border rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground font-bold uppercase tracking-wider">
                      <TypeIcon className="w-3.5 h-3.5" />
                      {typeLabel[type]?.label || 'Transfer'}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${score >= 90 ? 'bg-green-500/15 text-green-500' : 'bg-primary/10 text-primary'}`}>
                        {score}% match
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-[1fr_auto_1fr] gap-3 items-center">
                    <div className="bg-secondary/30 rounded-lg p-2.5 text-sm">
                      <div className="font-medium text-xs truncate">{out.description}</div>
                      <div className="text-xs text-muted-foreground">{getCardName(out.cardId)}</div>
                      <div className="font-mono font-bold text-xs mt-1">{formatCurrency(out.amount)}</div>
                      <div className="text-[10px] text-muted-foreground">{formatDate(out.date)}</div>
                    </div>
                    <Icons.ArrowRight className="w-4 h-4 text-primary shrink-0" />
                    <div className="bg-secondary/30 rounded-lg p-2.5 text-sm">
                      <div className="font-medium text-xs truncate">{inTx.description}</div>
                      <div className="text-xs text-muted-foreground">{getCardName(inTx.cardId)}</div>
                      <div className="font-mono font-bold text-xs mt-1 text-green-500">+{formatCurrency(inTx.amount)}</div>
                      <div className="text-[10px] text-muted-foreground">{formatDate(inTx.date)}</div>
                    </div>
                  </div>

                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => linkTransactions(out.id, inTx.id, type as any)}
                      data-testid={`button-link-suggested-${out.id}`}
                      className="flex-1 py-2 bg-primary text-primary-foreground rounded-lg text-xs font-bold hover:bg-primary/90 transition-colors flex items-center justify-center gap-1.5"
                    >
                      <Icons.Link2 className="w-3.5 h-3.5" /> Link as {typeLabel[type]?.label || 'Transfer'}
                    </button>
                    <button
                      onClick={() => setDismissedSuggestions(d => [...d, `${out.id}|${inTx.id}`])}
                      className="px-3 py-2 border border-border bg-background rounded-lg text-xs hover:bg-secondary/50 transition-colors text-muted-foreground"
                      title="Dismiss suggestion"
                    >
                      <Icons.X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Unmatched Suspected Transfers */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Icons.AlertCircle className="w-5 h-5 text-orange-500" />
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
                    <div className={`font-mono font-medium text-sm ${tx.amount > 0 ? 'text-green-500' : 'text-foreground'}`}>
                      {tx.amount > 0 ? '+' : ''}{formatCurrency(tx.amount)}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    {selectedTxForMatch === tx.id ? (
                      <div className="w-full bg-secondary/30 p-3 rounded-xl border border-border">
                        <p className="text-xs font-semibold mb-2">Select a transaction to link with:</p>
                        <div className="max-h-48 overflow-y-auto space-y-1 custom-scrollbar">
                          {transactions
                            .filter(t => t.id !== tx.id && !t.isTransferMatched && (Math.sign(t.amount) !== Math.sign(tx.amount)))
                            .map(candidate => {
                              const score = matchScore(tx, candidate);
                              return { candidate, score };
                            })
                            .sort((a, b) => b.score - a.score)
                            .slice(0, 12)
                            .map(({ candidate, score }) => (
                              <button
                                key={candidate.id}
                                onClick={() => {
                                  const type = guessTransferType(
                                    tx.amount < 0 ? tx : candidate,
                                    tx.amount < 0 ? candidate : tx,
                                    getCardName
                                  );
                                  linkTransactions(tx.id, candidate.id, type);
                                  setSelectedTxForMatch(null);
                                }}
                                className="w-full text-left p-2.5 bg-card border border-border rounded-lg hover:border-primary hover:bg-primary/5 transition-all text-xs"
                              >
                                <div className="flex justify-between items-start gap-2">
                                  <div className="flex-1 min-w-0">
                                    <div className="font-medium truncate">{candidate.description}</div>
                                    <div className="text-muted-foreground">{getCardName(candidate.cardId)} · {candidate.date}</div>
                                  </div>
                                  <div className="text-right shrink-0">
                                    <div className={`font-mono font-bold ${candidate.amount > 0 ? 'text-green-500' : ''}`}>{formatCurrency(candidate.amount)}</div>
                                    {score > 0 && <div className="text-[10px] text-primary font-bold">{score}% match</div>}
                                  </div>
                                </div>
                              </button>
                            ))}
                        </div>
                        <button onClick={() => setSelectedTxForMatch(null)} className="w-full mt-2 p-1.5 text-xs text-center text-muted-foreground hover:text-foreground">Cancel</button>
                      </div>
                    ) : (
                      <>
                        <button
                          onClick={() => setSelectedTxForMatch(tx.id)}
                          data-testid={`button-find-match-${tx.id}`}
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
                          data-testid={`button-split-${tx.id}`}
                          className="flex-1 py-1.5 border border-border bg-background rounded-lg text-xs font-medium hover:bg-secondary/50 flex items-center justify-center gap-1.5 transition-colors"
                        >
                          <Icons.Split className="w-3.5 h-3.5" /> Split
                        </button>
                        <button
                          onClick={() => updateTransaction(tx.id, { isTransferMatched: true, type: tx.amount < 0 ? 'expense' : 'income', categoryId: 'cat_other' })}
                          data-testid={`button-dismiss-${tx.id}`}
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
            <Icons.CheckCircle2 className="w-5 h-5 text-primary" />
            Matched Pairs ({Math.floor(matchedTransfers.length / 2)})
          </h2>
          <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm flex flex-col gap-3 p-3">
            {matchedTransfers.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <p>No transfers have been matched yet.</p>
              </div>
            ) : (
              Object.values(matchedTransfers.reduce((acc, tx) => {
                if (!acc[tx.id] && tx.transferMatchId && !acc[tx.transferMatchId]) {
                  const match = matchedTransfers.find(t => t.id === tx.transferMatchId);
                  if (match) acc[tx.id] = [tx, match];
                }
                return acc;
              }, {} as Record<string, Transaction[]>))
                .filter(pair => pair && pair.length === 2)
                .map((pair, i) => {
                  const [tx1, tx2] = pair[0].amount < 0 ? [pair[0], pair[1]] : [pair[1], pair[0]];
                  const tt = tx1.transferType || 'internal';
                  const TypeIcon = typeLabel[tt]?.icon || Icons.ArrowRightLeft;
                  return (
                    <div key={i} className="border border-border rounded-xl p-3 bg-background relative overflow-hidden group">
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary/50" />
                      <div className="flex justify-between items-center mb-2 px-2">
                        <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          <TypeIcon className="w-3.5 h-3.5" />
                          {typeLabel[tt]?.label || 'Transfer'}
                        </div>
                        <button
                          onClick={() => unlinkTransaction(tx1.id)}
                          data-testid={`button-unlink-${tx1.id}`}
                          className="text-[10px] text-destructive opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 hover:underline"
                        >
                          <Icons.Unlink className="w-3 h-3" /> Unlink
                        </button>
                      </div>
                      <div className="grid grid-cols-[1fr_auto_1fr] gap-2 items-center">
                        <div className="bg-secondary/20 p-2 rounded-lg text-sm">
                          <div className="font-medium truncate text-xs">{getCardName(tx1.cardId)}</div>
                          <div className="text-xs text-muted-foreground">{formatDate(tx1.date)}</div>
                          <div className="font-mono mt-1 text-xs">{formatCurrency(tx1.amount)}</div>
                        </div>
                        <Icons.ArrowRight className="w-4 h-4 text-primary shrink-0" />
                        <div className="bg-secondary/20 p-2 rounded-lg text-sm">
                          <div className="font-medium truncate text-xs">{getCardName(tx2.cardId)}</div>
                          <div className="text-xs text-muted-foreground">{formatDate(tx2.date)}</div>
                          <div className="font-mono mt-1 text-green-500 text-xs">+{formatCurrency(tx2.amount)}</div>
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
              <div className="absolute left-4 top-2 bottom-2 w-px bg-border" />
              <div className="relative pl-8">
                <div className="absolute left-0 top-3 w-3 h-3 rounded-full border-2 border-primary bg-background -translate-x-[5px]" />
                <label className="text-xs font-semibold text-muted-foreground">Part 1 (e.g. Credit Card Payment)</label>
                <input type="number" className="w-full mt-1 px-3 py-2 bg-secondary/30 border border-border rounded-xl text-sm font-mono" value={splitAmount1} onChange={e => setSplitAmount1(e.target.value)} />
              </div>
              <div className="relative pl-8">
                <div className="absolute left-0 top-3 w-3 h-3 rounded-full border-2 border-primary bg-background -translate-x-[5px]" />
                <label className="text-xs font-semibold text-muted-foreground">Part 2 (e.g. Real Expense)</label>
                <input type="number" className="w-full mt-1 px-3 py-2 bg-secondary/30 border border-border rounded-xl text-sm font-mono" value={splitAmount2} onChange={e => setSplitAmount2(e.target.value)} />
              </div>
            </div>

            <div className="mt-4 p-3 bg-secondary/20 rounded-xl text-xs flex justify-between items-center">
              <span className="text-muted-foreground">Total of splits:</span>
              <span className={`font-mono font-bold ${
                Math.abs((parseFloat(splitAmount1 || '0') + parseFloat(splitAmount2 || '0')) - Math.abs(splitTx.amount)) < 0.01
                  ? 'text-green-500'
                  : 'text-destructive'
              }`}>
                {formatCurrency((parseFloat(splitAmount1 || '0') + parseFloat(splitAmount2 || '0')) * Math.sign(splitTx.amount))}
              </span>
            </div>

            <div className="mt-8 flex justify-end gap-3">
              <button onClick={() => setSplitTx(null)} className="px-4 py-2.5 bg-secondary text-secondary-foreground rounded-xl hover:bg-secondary/80 font-medium transition-colors">Cancel</button>
              <button
                onClick={() => {
                  const s1 = parseFloat(splitAmount1 || '0') * Math.sign(splitTx.amount);
                  const s2 = parseFloat(splitAmount2 || '0') * Math.sign(splitTx.amount);
                  if (Math.abs(Math.abs(s1 + s2) - Math.abs(splitTx.amount)) > 0.01) {
                    alert("Splits must equal the original amount.");
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
