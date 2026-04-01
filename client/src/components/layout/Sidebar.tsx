import { Link, useLocation } from "wouter";
import * as Icons from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";

export function Sidebar() {
  const [location] = useLocation();
  const { user } = useAuth();

  const navItems = [
    { name: "Dashboard", href: "/", icon: Icons.LayoutDashboard },
    { name: "Ledger", href: "/ledger", icon: Icons.ListOrdered },
    { name: "Accounts", href: "/cards", icon: Icons.CreditCard },
    { name: "Categories", href: "/categories", icon: Icons.Tags },
    { name: "Rules", href: "/rules", icon: Icons.Brain },
    { name: "Reports", href: "/reports", icon: Icons.PieChart },
    { name: "Transfers", href: "/transfers", icon: Icons.ArrowRightLeft },
    { name: "Export", href: "/export", icon: Icons.FileSpreadsheet },
    { name: "Settings", href: "/settings", icon: Icons.Settings },
  ];

  const mobileNavItems = [
    { name: "Home", href: "/", icon: Icons.LayoutDashboard },
    { name: "Ledger", href: "/ledger", icon: Icons.ListOrdered },
    { name: "Cards", href: "/cards", icon: Icons.CreditCard },
    { name: "Reports", href: "/reports", icon: Icons.PieChart },
    { name: "Account", href: "/account", icon: Icons.UserCircle },
  ];

  const isAccountActive = location === "/account";

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="w-64 border-r border-border bg-card hidden md:flex flex-col h-screen fixed left-0 top-0 z-50">
        <div className="p-6 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <Icons.Activity className="text-primary-foreground h-5 w-5" />
          </div>
          <span className="font-bold text-lg text-foreground tracking-tight">MoneyTrace</span>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = location === item.href;
            return (
              <Link key={item.name} href={item.href}>
                <span
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 cursor-pointer font-medium text-sm",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                  )}
                >
                  <item.icon className={cn("w-5 h-5", isActive ? "text-primary" : "text-muted-foreground")} />
                  {item.name}
                </span>
              </Link>
            );
          })}
        </nav>

        {/* User area — links to /account */}
        <Link href="/account">
          <div
            className={cn(
              "p-4 mx-4 mb-4 rounded-xl border cursor-pointer transition-all duration-200",
              isAccountActive
                ? "border-primary/30 bg-primary/5"
                : "border-border bg-secondary/20 hover:bg-secondary/40 hover:border-border"
            )}
            data-testid="link-account"
          >
            <div className="flex items-center gap-3">
              <div className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center border text-sm font-bold flex-shrink-0",
                isAccountActive
                  ? "bg-primary/10 border-primary/30 text-primary"
                  : "bg-secondary border-border text-muted-foreground"
              )}>
                {(user?.displayName || user?.username || "U").charAt(0).toUpperCase()}
              </div>
              <div className="flex flex-col min-w-0 flex-1">
                <span className="text-sm font-medium text-foreground truncate">{user?.displayName || user?.username || 'User'}</span>
                <span className="text-xs text-muted-foreground truncate">@{user?.username || 'guest'}</span>
              </div>
              <Icons.ChevronRight className={cn("w-4 h-4 flex-shrink-0", isAccountActive ? "text-primary" : "text-muted-foreground")} />
            </div>
          </div>
        </Link>
      </aside>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 border-t border-border bg-card/90 backdrop-blur-lg z-50 flex justify-around items-center p-2 pb-safe">
        {mobileNavItems.map((item) => {
          const isActive = location === item.href;
          return (
            <Link key={item.name} href={item.href}>
              <span
                className={cn(
                  "flex flex-col items-center gap-1 p-2 rounded-lg transition-all duration-200 cursor-pointer",
                  isActive ? "text-primary" : "text-muted-foreground"
                )}
              >
                <item.icon className="w-5 h-5" />
                <span className="text-[10px] font-medium">{item.name}</span>
              </span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
