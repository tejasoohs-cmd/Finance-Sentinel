import { useMemo, useState } from "react";
import { useFinanceStore } from "@/store/financeStore";
import { formatCurrency } from "@/lib/utils";
import * as Icons from "lucide-react";
import { useLocation } from "wouter";
import { detectRecurring } from "@/utils/categorization";

export function Reports() {
  const { transactions, categories, cards } = useFinanceStore();
  const [, setLocation] = useLocation();
  const [selectedMonth, setSelectedMonth] = useState<string>("current");
  const [activeTab, setActiveTab] = useState<"overview" | "monthly" | "cc" | "recurring">("overview");

  const navigateToLedger = (params: Record<string, string>) => {
    const query = new URLSearchParams({ view: 'all', ...params }).toString();
    setLocation(`/ledger?${query}`);
  };

  const getCategoryColor = (id: string) => categories.find(c => c.id === id)?.color || '#94a3b8';
  const getCategoryName = (id: string) => categories.find(c => c.id === id)?.name || 'Unknown';
  const getCardName = (id: string) => cards.find(c => c.id === id)?.name || 'Unknown';

  const months = useMemo(() => {
    return Array.from(new Set(transactions.map(t => t.date.substring(0, 7)))).sort().reverse();
  }, [transactions]);

  const currentMonth = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }, []);

  const prevMonth = useMemo(() => {
    const now = new Date();
    now.setMonth(now.getMonth() - 1);
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }, []);

  const effectiveMonth = selectedMonth === "current" ? currentMonth : selectedMonth;

  const computeStats = (monthFilter: string | null) => {
    let actualTxs = transactions.filter(t => !t.isTransferMatched);
    if (monthFilter) actualTxs = actualTxs.filter(t => t.date.startsWith(monthFilter));

    let income = 0, expense = 0, personalSpend = 0, businessSpend = 0, cashSpend = 0;
    const byCategory: Record<string, number> = {};
    const byAccount: Record<string, number> = {};

    actualTxs.forEach(tx => {
      if (tx.type === 'income') {
        income += tx.amount;
      } else if (tx.type === 'expense') {
        const abs = Math.abs(tx.amount);
        expense += abs;
        if (tx.tag === 'personal') personalSpend += abs;
        if (tx.tag === 'business') businessSpend += abs;
        byCategory[tx.categoryId] = (byCategory[tx.categoryId] || 0) + abs;
        if (tx.cardId) {
          byAccount[tx.cardId] = (byAccount[tx.cardId] || 0) + abs;
          const card = cards.find(c => c.id === tx.cardId);
          if (card?.type === 'cash') cashSpend += abs;
        }
      }
    });

    return {
      income, expense, personalSpend, businessSpend, cashSpend,
      net: income - expense,
      byCategory: Object.entries(byCategory).sort((a, b) => b[1] - a[1]),
      byAccount: Object.entries(byAccount).sort((a, b) => b[1] - a[1]),
    };
  };

  const stats = useMemo(() => computeStats(effectiveMonth === "all" ? null : effectiveMonth), [transactions, cards, effectiveMonth]);
  const prevStats = useMemo(() => computeStats(prevMonth), [transactions, cards, prevMonth]);

  // Monthly comparison — all months combined for trend view
  const monthlyTotals = useMemo(() => {
    return months.slice(0, 6).reverse().map(m => {
      const s = computeStats(m);
      return { month: m, income: s.income, expense: s.expense, net: s.net };
    });
  }, [transactions, cards, months]);

  // Category MoM deltas
  const categoryDeltas = useMemo(() => {
    const cur = Object.fromEntries(stats.byCategory);
    const prev = Object.fromEntries(prevStats.byCategory);
    const allCats = new Set([...Object.keys(cur), ...Object.keys(prev)]);
    return Array.from(allCats).map(id => {
      const c = cur[id] || 0;
      const p = prev[id] || 0;
      const delta = p > 0 ? ((c - p) / p) * 100 : c > 0 ? 100 : 0;
      return { id, current: c, prev: p, delta };
    }).filter(x => x.current > 0 || x.prev > 0).sort((a, b) => b.current - a.current);
  }, [stats, prevStats]);

  // CC intelligence
  const ccCards = useMemo(() => cards.filter(c => c.type === 'credit'), [cards]);

  const ccStats = useMemo(() => {
    return ccCards.map(card => {
      const cardTxs = transactions.filter(t => t.cardId === card.id);
      
      // All matched transfers to this card = payments received
      const paymentsIn = cardTxs.filter(t => t.isTransferMatched && t.amount > 0);
      const totalPayments = paymentsIn.reduce((acc, t) => acc + t.amount, 0);

      // Real spending = non-transfer expenses on this card
      const realSpend = cardTxs
        .filter(t => !t.isTransferMatched && t.type === 'expense')
        .reduce((acc, t) => acc + Math.abs(t.amount), 0);

      // This month's spend (non-transfer expenses)
      const thisMonthSpend = cardTxs
        .filter(t => !t.isTransferMatched && t.type === 'expense' && t.date.startsWith(currentMonth))
        .reduce((acc, t) => acc + Math.abs(t.amount), 0);

      // Statement cycle spend: if statementDate is set, calculate current cycle
      let cycleSpend = thisMonthSpend;
      let cycleStart = '';
      let cycleEnd = '';
      if (card.statementDate) {
        const now = new Date();
        const stmtDay = card.statementDate;
        let cycleStartDate = new Date(now.getFullYear(), now.getMonth(), stmtDay);
        if (now.getDate() < stmtDay) {
          cycleStartDate.setMonth(cycleStartDate.getMonth() - 1);
        }
        const cycleEndDate = new Date(cycleStartDate);
        cycleEndDate.setMonth(cycleEndDate.getMonth() + 1);
        cycleEndDate.setDate(cycleEndDate.getDate() - 1);
        
        cycleStart = cycleStartDate.toISOString().split('T')[0];
        cycleEnd = cycleEndDate.toISOString().split('T')[0];

        cycleSpend = cardTxs
          .filter(t => !t.isTransferMatched && t.type === 'expense' && t.date >= cycleStart && t.date <= cycleEnd)
          .reduce((acc, t) => acc + Math.abs(t.amount), 0);
      }

      // Outstanding = sum of all transactions (positive = payment in, negative = spend)
      const outstanding = Math.abs(cardTxs.reduce((acc, t) => acc + t.amount, 0));
      const utilization = card.creditLimit ? Math.min((outstanding / card.creditLimit) * 100, 100) : 0;

      // Due date alert
      const today = new Date();
      let daysToDue: number | null = null;
      if (card.dueDate) {
        const dueDay = card.dueDate;
        let dueDate = new Date(today.getFullYear(), today.getMonth(), dueDay);
        if (today.getDate() > dueDay) dueDate.setMonth(dueDate.getMonth() + 1);
        daysToDue = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      }

      return { card, outstanding, utilization, realSpend, totalPayments, thisMonthSpend, cycleSpend, cycleStart, cycleEnd, daysToDue };
    });
  }, [ccCards, transactions, currentMonth]);

  // Recurring patterns
  const recurringPatterns = useMemo(() => detectRecurring(transactions), [transactions]);

  const freqLabel: Record<string, string> = {
    weekly: 'Weekly',
    monthly: 'Monthly',
    quarterly: 'Quarterly',
    annual: 'Annual',
  };
  const freqColor: Record<string, string> = {
    weekly: 'text-blue-400',
    monthly: 'text-primary',
    quarterly: 'text-purple-400',
    annual: 'text-orange-400',
  };

  const TABS = [
    { id: 'overview', label: 'Overview', icon: Icons.LayoutDashboard },
    { id: 'monthly', label: 'Monthly', icon: Icons.BarChart2 },
    { id: 'cc', label: 'Credit Cards', icon: Icons.CreditCard },
    { id: 'recurring', label: 'Recurring', icon: Icons.RefreshCcw },
  ] as const;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-24">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary">Reports</h1>
          <p className="text-muted-foreground">Detailed breakdown of your financial activity.</p>
        </div>
        {activeTab === 'overview' && (
          <div className="flex items-center gap-2">
            <Icons.Calendar className="w-5 h-5 text-muted-foreground" />
            <select
              value={selectedMonth}
              onChange={e => setSelectedMonth(e.target.value)}
              data-testid="select-report-month"
              className="px-4 py-2.5 bg-secondary/30 border border-border rounded-xl text-sm font-bold focus:outline-none"
            >
              <option value="current">This Month</option>
              <option value="all">All Time</option>
              {months.map(m => (
                <option key={m} value={m}>{new Date(`${m}-01`).toLocaleDateString('default', { month: 'long', year: 'numeric' })}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-secondary/50 p-1 rounded-xl border border-border overflow-x-auto custom-scrollbar">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            data-testid={`tab-reports-${tab.id}`}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold whitespace-nowrap transition-all flex-1 justify-center ${
              activeTab === tab.id ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div onClick={() => navigateToLedger({ type: 'income' })} className="bg-card border border-border p-4 rounded-2xl shadow-sm cursor-pointer hover:border-green-500/50 transition-colors group">
              <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1 flex items-center gap-1"><Icons.TrendingUp className="w-3 h-3 text-green-500" /> Income</div>
              <div className="text-xl font-mono font-bold text-green-500 group-hover:scale-105 transition-transform origin-left">{formatCurrency(stats.income)}</div>
            </div>
            <div onClick={() => navigateToLedger({ type: 'expense' })} className="bg-card border border-border p-4 rounded-2xl shadow-sm cursor-pointer hover:border-red-500/50 transition-colors group">
              <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1 flex items-center gap-1"><Icons.TrendingDown className="w-3 h-3 text-red-500" /> Expense</div>
              <div className="text-xl font-mono font-bold text-foreground group-hover:scale-105 transition-transform origin-left">{formatCurrency(stats.expense)}</div>
            </div>
            <div className="bg-card border border-border p-4 rounded-2xl shadow-sm">
              <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1 flex items-center gap-1"><Icons.Scale className="w-3 h-3 text-primary" /> Net Flow</div>
              <div className={`text-xl font-mono font-bold ${stats.net >= 0 ? 'text-green-500' : 'text-orange-500'}`}>
                {stats.net > 0 ? '+' : ''}{formatCurrency(stats.net)}
              </div>
            </div>
            <div onClick={() => navigateToLedger({ type: 'expense', tag: 'personal' })} className="bg-card border border-border p-4 rounded-2xl shadow-sm cursor-pointer hover:border-blue-500/50 transition-colors group">
              <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1 flex items-center gap-1"><Icons.User className="w-3 h-3 text-blue-500" /> Personal</div>
              <div className="text-xl font-mono font-bold text-foreground group-hover:scale-105 transition-transform origin-left">{formatCurrency(stats.personalSpend)}</div>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Category Breakdown */}
            <div className="bg-card border border-border rounded-3xl p-6 shadow-sm">
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                <Icons.PieChart className="w-5 h-5 text-primary" />
                Spending by Category
              </h2>
              <div className="space-y-4">
                {stats.byCategory.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">No categorized expenses yet.</p>
                ) : (
                  stats.byCategory.map(([categoryId, amount]) => {
                    const percent = stats.expense > 0 ? (amount / stats.expense) * 100 : 0;
                    return (
                      <div key={categoryId} onClick={() => navigateToLedger({ type: 'expense', category: categoryId })} className="group cursor-pointer">
                        <div className="flex justify-between text-sm mb-1">
                          <span className="font-medium group-hover:text-primary transition-colors flex items-center gap-2">
                            {getCategoryName(categoryId)}
                            {percent > 20 && <span className="bg-orange-500/20 text-orange-500 px-1.5 rounded text-[10px] uppercase font-bold tracking-wider">Top</span>}
                          </span>
                          <div className="text-right">
                            <span className="font-mono font-bold">{formatCurrency(amount)}</span>
                            <span className="text-xs text-muted-foreground ml-2">({percent.toFixed(1)}%)</span>
                          </div>
                        </div>
                        <div className="w-full bg-secondary rounded-full h-2 overflow-hidden">
                          <div className="h-full rounded-full transition-all" style={{ width: `${percent}%`, backgroundColor: getCategoryColor(categoryId) }} />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <div className="space-y-6">
              {/* Account Breakdown */}
              <div className="bg-card border border-border rounded-3xl p-6 shadow-sm">
                <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <Icons.CreditCard className="w-5 h-5 text-primary" />
                  Spending by Account
                </h2>
                <div className="space-y-3">
                  {stats.byAccount.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4 text-center">No account spending yet.</p>
                  ) : (
                    stats.byAccount.map(([cardId, amount]) => (
                      <div key={cardId} onClick={() => navigateToLedger({ type: 'expense', card: cardId })} className="flex justify-between items-center p-3 rounded-xl border border-transparent hover:border-border hover:bg-secondary/30 cursor-pointer transition-all">
                        <span className="font-medium text-sm">{getCardName(cardId)}</span>
                        <span className="font-mono font-bold text-sm">{formatCurrency(amount)}</span>
                      </div>
                    ))
                  )}
                </div>
                {stats.cashSpend > 0 && (
                  <div className="mt-4 pt-4 border-t border-border flex justify-between items-center text-sm">
                    <span className="font-bold flex items-center gap-2"><Icons.Banknote className="w-4 h-4 text-green-500" /> Cash Spent</span>
                    <span className="font-mono font-bold">{formatCurrency(stats.cashSpend)}</span>
                  </div>
                )}
              </div>

              {/* Ownership Split */}
              <div className="bg-card border border-border rounded-3xl p-6 shadow-sm">
                <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <Icons.Briefcase className="w-5 h-5 text-primary" />
                  Ownership Split
                </h2>
                <div className="flex h-4 rounded-full overflow-hidden mb-3 bg-secondary">
                  <div className="bg-blue-500 h-full transition-all" style={{ width: `${stats.expense > 0 ? (stats.personalSpend / stats.expense) * 100 : 0}%` }} />
                  <div className="bg-purple-500 h-full transition-all" style={{ width: `${stats.expense > 0 ? (stats.businessSpend / stats.expense) * 100 : 0}%` }} />
                </div>
                <div className="flex justify-between text-sm">
                  <div onClick={() => navigateToLedger({ type: 'expense', tag: 'personal' })} className="flex items-center gap-2 cursor-pointer hover:opacity-70 transition-opacity">
                    <div className="w-3 h-3 rounded-full bg-blue-500" />
                    <span className="font-medium">Personal ({stats.expense > 0 ? Math.round((stats.personalSpend / stats.expense) * 100) : 0}%)</span>
                  </div>
                  <div onClick={() => navigateToLedger({ type: 'expense', tag: 'business' })} className="flex items-center gap-2 cursor-pointer hover:opacity-70 transition-opacity">
                    <div className="w-3 h-3 rounded-full bg-purple-500" />
                    <span className="font-medium">Business ({stats.expense > 0 ? Math.round((stats.businessSpend / stats.expense) * 100) : 0}%)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Monthly Comparison Tab */}
      {activeTab === 'monthly' && (
        <div className="space-y-6">
          {/* MoM bar chart (last 6 months) */}
          <div className="bg-card border border-border rounded-3xl p-6 shadow-sm">
            <h2 className="text-lg font-bold mb-6 flex items-center gap-2">
              <Icons.BarChart2 className="w-5 h-5 text-primary" />
              Last {monthlyTotals.length} Months
            </h2>
            {monthlyTotals.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No data yet.</p>
            ) : (
              <div className="space-y-4">
                {/* Income vs Expense bars */}
                <div className="flex items-end gap-2 h-32">
                  {monthlyTotals.map(m => {
                    const maxVal = Math.max(...monthlyTotals.map(x => Math.max(x.income, x.expense)), 1);
                    const incH = (m.income / maxVal) * 100;
                    const expH = (m.expense / maxVal) * 100;
                    return (
                      <div key={m.month} className="flex-1 flex flex-col items-center gap-1">
                        <div className="w-full flex items-end gap-0.5 h-24">
                          <div className="flex-1 bg-green-500/70 rounded-t transition-all" style={{ height: `${incH}%` }} title={`Income: ${formatCurrency(m.income)}`} />
                          <div className="flex-1 bg-red-500/70 rounded-t transition-all" style={{ height: `${expH}%` }} title={`Expense: ${formatCurrency(m.expense)}`} />
                        </div>
                        <span className="text-[10px] text-muted-foreground text-center">{new Date(`${m.month}-01`).toLocaleDateString('default', { month: 'short' })}</span>
                      </div>
                    );
                  })}
                </div>
                <div className="flex gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-green-500/70 inline-block" /> Income</span>
                  <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-red-500/70 inline-block" /> Expense</span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-4">
                  {monthlyTotals.slice().reverse().map(m => (
                    <div key={m.month} className="p-3 rounded-xl border border-border bg-secondary/20">
                      <div className="text-xs text-muted-foreground font-bold mb-1">{new Date(`${m.month}-01`).toLocaleDateString('default', { month: 'long', year: 'numeric' })}</div>
                      <div className="text-xs text-green-500 font-mono">+{formatCurrency(m.income)}</div>
                      <div className="text-xs text-foreground font-mono">-{formatCurrency(m.expense)}</div>
                      <div className={`text-xs font-mono font-bold ${m.net >= 0 ? 'text-green-500' : 'text-orange-500'}`}>{m.net >= 0 ? '+' : ''}{formatCurrency(m.net)}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Category MoM comparison */}
          <div className="bg-card border border-border rounded-3xl p-6 shadow-sm">
            <h2 className="text-lg font-bold mb-2 flex items-center gap-2">
              <Icons.ArrowRightLeft className="w-5 h-5 text-primary" />
              Category Comparison
            </h2>
            <p className="text-xs text-muted-foreground mb-5">
              {new Date(`${currentMonth}-01`).toLocaleDateString('default', { month: 'long' })} vs {new Date(`${prevMonth}-01`).toLocaleDateString('default', { month: 'long' })}
            </p>
            {categoryDeltas.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Not enough data for comparison.</p>
            ) : (
              <div className="space-y-3">
                {categoryDeltas.map(({ id, current, prev, delta }) => {
                  const isUp = delta > 5;
                  const isDown = delta < -5;
                  return (
                    <div key={id} className="flex items-center gap-3 p-3 rounded-xl border border-transparent hover:border-border hover:bg-secondary/20 transition-all cursor-pointer" onClick={() => navigateToLedger({ type: 'expense', category: id })}>
                      <div className="w-2 h-2 rounded-full shrink-0" style={{ background: getCategoryColor(id) }} />
                      <span className="flex-1 font-medium text-sm">{getCategoryName(id)}</span>
                      <div className="text-right">
                        <div className="font-mono font-bold text-sm">{formatCurrency(current)}</div>
                        {prev > 0 && <div className="text-xs text-muted-foreground font-mono">{formatCurrency(prev)} prev</div>}
                      </div>
                      {prev > 0 && (
                        <div className={`flex items-center gap-0.5 text-xs font-bold min-w-[52px] justify-end ${isUp ? 'text-red-400' : isDown ? 'text-green-400' : 'text-muted-foreground'}`}>
                          {isUp ? <Icons.TrendingUp className="w-3 h-3" /> : isDown ? <Icons.TrendingDown className="w-3 h-3" /> : <Icons.Minus className="w-3 h-3" />}
                          {Math.abs(delta).toFixed(0)}%
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Credit Cards Tab */}
      {activeTab === 'cc' && (
        <div className="space-y-6">
          {ccStats.length === 0 ? (
            <div className="bg-card border border-border rounded-3xl p-12 text-center text-muted-foreground">
              <Icons.CreditCard className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>No credit cards added yet.</p>
              <p className="text-xs mt-1">Go to Accounts &amp; Wallets to add a credit card.</p>
            </div>
          ) : (
            ccStats.map(({ card, outstanding, utilization, realSpend, totalPayments, cycleSpend, cycleStart, cycleEnd, daysToDue }) => (
              <div key={card.id} className="bg-card border border-border rounded-3xl p-6 shadow-sm">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h2 className="text-lg font-bold">{card.name}</h2>
                    <p className="text-sm text-muted-foreground">{card.bank} · •••• {card.last4}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-muted-foreground uppercase tracking-wider mb-0.5">Outstanding</div>
                    <div className={`text-2xl font-mono font-bold ${outstanding > 0 ? 'text-orange-400' : 'text-green-500'}`}>{formatCurrency(outstanding)}</div>
                    {card.creditLimit && (
                      <div className="text-xs text-muted-foreground">of {formatCurrency(card.creditLimit)} limit</div>
                    )}
                  </div>
                </div>

                {/* Utilization bar */}
                {card.creditLimit && (
                  <div className="mb-5">
                    <div className="w-full bg-secondary rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${utilization > 80 ? 'bg-red-500' : utilization > 50 ? 'bg-orange-500' : 'bg-primary'}`}
                        style={{ width: `${utilization}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground mt-1">
                      <span>{utilization.toFixed(1)}% utilized</span>
                      <span>{formatCurrency(card.creditLimit - outstanding)} available</span>
                    </div>
                  </div>
                )}

                {/* Stats grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                  <div className="bg-secondary/30 rounded-xl p-3">
                    <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">This Month Spend</div>
                    <div className="font-mono font-bold text-sm">{formatCurrency(cycleSpend)}</div>
                    {cycleStart && <div className="text-[10px] text-muted-foreground mt-0.5">{cycleStart.substring(5)} → {cycleEnd.substring(5)}</div>}
                  </div>
                  <div className="bg-secondary/30 rounded-xl p-3">
                    <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Total Spend</div>
                    <div className="font-mono font-bold text-sm">{formatCurrency(realSpend)}</div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">all time</div>
                  </div>
                  <div className="bg-green-500/10 rounded-xl p-3">
                    <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Payments Made</div>
                    <div className="font-mono font-bold text-sm text-green-500">{formatCurrency(totalPayments)}</div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">all time</div>
                  </div>
                  <div className={`rounded-xl p-3 ${daysToDue !== null && daysToDue <= 5 ? 'bg-red-500/15' : 'bg-secondary/30'}`}>
                    <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Due Date</div>
                    <div className={`font-mono font-bold text-sm ${daysToDue !== null && daysToDue <= 5 ? 'text-red-400' : ''}`}>
                      {card.dueDate ? `Day ${card.dueDate}` : 'Not set'}
                    </div>
                    {daysToDue !== null && (
                      <div className={`text-[10px] mt-0.5 font-bold ${daysToDue <= 5 ? 'text-red-400' : 'text-muted-foreground'}`}>
                        {daysToDue === 0 ? 'Due today!' : daysToDue < 0 ? 'Overdue' : `in ${daysToDue}d`}
                      </div>
                    )}
                  </div>
                </div>

                {/* CC payments note */}
                <div className="text-xs text-muted-foreground flex items-center gap-2 bg-secondary/20 p-2 rounded-lg">
                  <Icons.Info className="w-3.5 h-3.5 shrink-0" />
                  <span>CC payments (transfers from your debit accounts) are excluded from real expense calculations — only purchases and fees count as spending.</span>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Recurring Tab */}
      {activeTab === 'recurring' && (
        <div className="space-y-4">
          <div className="bg-secondary/20 border border-border rounded-2xl p-4 flex items-start gap-3 text-sm">
            <Icons.Info className="w-4 h-4 text-primary mt-0.5 shrink-0" />
            <p className="text-muted-foreground">Recurring patterns are detected automatically by looking for expense merchants that appear 2+ times with a consistent time gap. Amounts may vary slightly (e.g. utility bills).</p>
          </div>

          {recurringPatterns.length === 0 ? (
            <div className="bg-card border border-border rounded-3xl p-12 text-center text-muted-foreground">
              <Icons.RefreshCcw className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>No recurring patterns detected yet.</p>
              <p className="text-xs mt-1">Import more transaction history to see subscriptions, bills, and EMIs here.</p>
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {recurringPatterns.map(p => (
                <div key={p.key} className="bg-card border border-border rounded-2xl p-4 hover:border-primary/40 transition-colors">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{p.description}</p>
                      <p className="text-xs text-muted-foreground">{getCategoryName(p.categoryId)} · {p.count}x seen</p>
                    </div>
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-secondary ${freqColor[p.frequency]}`}>
                      {freqLabel[p.frequency]}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-mono font-bold">{formatCurrency(p.avgAmount)}<span className="text-xs text-muted-foreground font-normal ml-1">avg</span></div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-muted-foreground">Last: {p.lastDate}</div>
                      {p.nextEstimate && (
                        <div className="text-xs text-primary font-medium">Next ~{p.nextEstimate}</div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
