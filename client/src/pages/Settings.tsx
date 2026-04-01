import { useFinanceStore } from "@/store/financeStore";
import * as Icons from "lucide-react";
import { useRef } from "react";
import { useAuth } from "@/hooks/useAuth";

export function Settings() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { user, logout } = useAuth();
  
  // Create a backup file
  const handleExport = () => {
    const state = useFinanceStore.getState();
    const backupData = {
      version: 1,
      exportDate: new Date().toISOString(),
      data: {
        transactions: state.transactions,
        cards: state.cards,
        categories: state.categories,
        tags: state.tags,
        budgets: state.budgets
      }
    };
    
    const dataStr = JSON.stringify(backupData, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', url);
    linkElement.setAttribute('download', `moneytrace_backup_${new Date().toISOString().split('T')[0]}.json`);
    linkElement.click();
    URL.revokeObjectURL(url);
  };

  // Restore from backup
  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const parsed = JSON.parse(content);
        
        if (parsed && parsed.data && Array.isArray(parsed.data.transactions)) {
          if (confirm(`Warning: This will overwrite your current data with the backup from ${new Date(parsed.exportDate).toLocaleDateString()}. Proceed?`)) {
            useFinanceStore.setState({
              transactions: parsed.data.transactions || [],
              cards: parsed.data.cards || [],
              categories: parsed.data.categories || [],
              tags: parsed.data.tags || [],
              budgets: parsed.data.budgets || []
            });
            alert("Backup restored successfully!");
          }
        } else {
          alert("Invalid backup file format.");
        }
      } catch (err) {
        alert("Error reading backup file. Is it a valid JSON?");
      }
      
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    };
    reader.readAsText(file);
  };

  const pwaInstallable = 'serviceWorker' in navigator && (window as any).matchMedia;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-4xl pb-24">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-primary">Settings & Backup</h1>
        <p className="text-muted-foreground">Manage your app data, backups, and preferences.</p>
      </div>

      {/* Account Panel */}
      <div className="p-6 bg-card border border-border rounded-2xl shadow-lg">
        <div className="flex items-center gap-3 border-b border-border pb-4 mb-4">
          <div className="p-2.5 bg-primary/10 text-primary rounded-xl">
            <Icons.User className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold">Account</h2>
            <p className="text-xs text-muted-foreground">Your MoneyTrace profile</p>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <p className="font-semibold">{user?.displayName || user?.username}</p>
            <p className="text-sm text-muted-foreground font-mono">@{user?.username}</p>
          </div>
          <button
            onClick={logout}
            className="flex items-center gap-2 px-4 py-2 bg-secondary hover:bg-secondary/80 text-secondary-foreground rounded-xl text-sm font-medium transition-colors"
            data-testid="button-logout"
          >
            <Icons.LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Backup & Restore Panel */}
        <div className="p-6 bg-card border border-border rounded-2xl shadow-lg space-y-6">
          <div className="flex items-center gap-3 border-b border-border pb-4">
            <div className="p-2.5 bg-primary/10 text-primary rounded-xl">
              <Icons.Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Local Data Backup</h2>
              <p className="text-xs text-muted-foreground">Your data lives entirely on your device.</p>
            </div>
          </div>
          
          <div className="space-y-4">
            <p className="text-sm text-foreground/80 leading-relaxed">
              Because this app stores your financial data securely on your local device (no cloud snooping), 
              <strong> you are responsible for your own backups.</strong> Export a backup file regularly to ensure you don't lose your ledger.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-3">
              <button 
                onClick={handleExport}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-colors text-sm font-bold shadow-lg shadow-primary/20"
              >
                <Icons.Download className="w-4 h-4" />
                Download Backup
              </button>
              
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-secondary text-secondary-foreground rounded-xl hover:bg-secondary/80 transition-colors text-sm font-bold"
              >
                <Icons.Upload className="w-4 h-4" />
                Restore Backup
              </button>
              <input 
                type="file" 
                accept=".json" 
                ref={fileInputRef} 
                onChange={handleImport} 
                className="hidden" 
              />
            </div>
          </div>
        </div>

        {/* App Status Panel */}
        <div className="p-6 bg-card border border-border rounded-2xl shadow-lg space-y-6">
          <div className="flex items-center gap-3 border-b border-border pb-4">
            <div className="p-2.5 bg-blue-500/10 text-blue-500 rounded-xl">
              <Icons.Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold">App Status</h2>
              <p className="text-xs text-muted-foreground">Installation and version info</p>
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-secondary/30 rounded-xl border border-border">
              <div className="flex items-center gap-3">
                <Icons.Wifi className="w-4 h-4 text-green-500" />
                <span className="text-sm font-medium">Offline Ready</span>
              </div>
              <span className="text-xs text-muted-foreground">Supported</span>
            </div>

            <div className="flex items-center justify-between p-3 bg-secondary/30 rounded-xl border border-border">
              <div className="flex items-center gap-3">
                <Icons.Laptop className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium">Installable App (PWA)</span>
              </div>
              <span className="text-xs text-muted-foreground">{pwaInstallable ? 'Enabled' : 'Check Browser'}</span>
            </div>
            
            <p className="text-xs text-muted-foreground">
              To install this app on your phone, open it in Safari (iOS) or Chrome (Android), tap the Share icon, and select <strong>"Add to Home Screen"</strong>. It will function as a standalone app.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}