import { Link, useLocation } from "wouter";
import * as Icons from "lucide-react";
import { cn } from "@/lib/utils";

export function Sidebar() {
  const [location] = useLocation();

  const navItems = [
    { name: "Dashboard", href: "/", icon: Icons.LayoutDashboard },
    { name: "Ledger", href: "/ledger", icon: Icons.ListOrdered },
    { name: "Cards", href: "/cards", icon: Icons.CreditCard },
    { name: "Budgets", href: "/budgets", icon: Icons.PieChart },
  ];

  return (
    <aside className="w-64 border-r border-border bg-card hidden md:flex flex-col h-screen fixed left-0 top-0">
      <div className="p-6 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
          <Icons.Activity className="text-primary-foreground h-5 w-5" />
        </div>
        <span className="font-bold text-lg text-foreground tracking-tight">MoneyTrace</span>
      </div>

      <nav className="flex-1 px-4 py-6 space-y-2">
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

      <div className="p-6 border-t border-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center border border-border">
            <Icons.User className="w-5 h-5 text-muted-foreground" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-medium text-foreground">User</span>
            <span className="text-xs text-muted-foreground">UAE Resident</span>
          </div>
        </div>
      </div>
    </aside>
  );
}