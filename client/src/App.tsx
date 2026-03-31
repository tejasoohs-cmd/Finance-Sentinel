import { Switch, Route } from "wouter";
import { Dashboard } from "./pages/Home";
import { Ledger } from "./pages/Ledger";
import { Cards } from "./pages/Cards";
import { Budgets } from "./pages/Budgets";
import { Transfers } from "./pages/Transfers";
import { ExportCenter } from "./pages/Export";
import { Settings } from "./pages/Settings";
import { Sidebar } from "./components/layout/Sidebar";
import { Toaster } from "@/components/ui/toaster";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/ledger" component={Ledger} />
      <Route path="/cards" component={Cards} />
      <Route path="/transfers" component={Transfers} />
      <Route path="/budgets" component={Budgets} />
      <Route path="/export" component={ExportCenter} />
      <Route path="/settings" component={Settings} />
      <Route>
        <div className="flex flex-col items-center justify-center h-[50vh]">
          <h1 className="text-4xl font-bold text-primary mb-4">404</h1>
          <p className="text-muted-foreground">Page not found</p>
        </div>
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col md:flex-row pb-16 md:pb-0">
      <Sidebar />
      <main className="flex-1 md:ml-64 p-4 md:p-6 lg:p-8 overflow-y-auto">
        <Router />
      </main>
      <Toaster />
    </div>
  );
}

export default App;