# MoneyTrace UAE

A comprehensive personal finance and card tracking PWA for UAE users with a premium dark UI.

## Architecture

**Full-stack Express + React + PostgreSQL**

- **Frontend**: React + Vite + TailwindCSS (dark premium theme with gold/amber primary)
- **Backend**: Express.js with Passport.js authentication
- **Database**: PostgreSQL via Drizzle ORM
- **State Management**: Zustand with localStorage persistence + server sync

## Key Features

- CSV import wizard (single, dual, direction modes)
- Multi-select transaction workflow with bulk actions
- Auto-categorization with learning from user edits
- Full Rule Manager: view, edit, add, delete, enable/disable rules with search and filter
- Custom categories, tags, and categorization rules
- Internal transfer classification and matching
- Smart transfer suggestions (scored candidate pairs by amount + date proximity)
- Cash wallet tracking
- Credit card intelligence: outstanding balance, statement cycle spend, payments received, utilization, due date alerts
- Recurring transaction detection: weekly, monthly, quarterly, annual patterns with next estimate
- Monthly intelligence: MoM comparison in Reports (income/expense deltas per category) + MoM badges on Home
- Review workflow for imported transactions
- Actual Spend vs Full Money Flow dual-view in Ledger
- Mobile-friendly PWA with backup/restore
- **Login/Signup with cloud sync**

## Tech Stack

- `express` + `passport` + `passport-local` - Authentication
- `express-session` + `connect-pg-simple` - Session management (stored in PostgreSQL)
- `drizzle-orm` + `pg` - Database ORM
- `zustand` - Client-side state with API sync
- `wouter` - Client-side routing
- `tailwindcss` + `lucide-react` - UI

## Database Tables

- `users` - User accounts (username, password hash, displayName)
- `session` - Express sessions (managed by connect-pg-simple)
- `cards` - Bank accounts/credit cards/cash wallets
- `categories` - Transaction categories (default + custom)
- `transactions` - Financial transactions with transfer linking
- `budgets` - Monthly category budgets
- `categorization_rules` - Auto-categorization rules (default + learned + custom); has `is_enabled` boolean (added via raw SQL, not db:push due to interactive prompt)
- `user_tags` - Custom tags per user

## File Structure

```
server/
  index.ts       - Express app entry point
  routes.ts      - All API routes (/api/auth, /api/sync, /api/transactions, etc.)
  storage.ts     - DrizzleORM storage implementation
  defaults.ts    - Default categories and rules seeded on new user registration

shared/
  schema.ts      - Drizzle schema (all tables + insert/select types)

client/src/
  App.tsx          - Root component with auth gating
  hooks/useAuth.ts - Auth context + state
  store/financeStore.ts - Zustand store with API sync
  pages/
    AuthPage.tsx   - Login/Register page
    Home.tsx       - Dashboard
    Ledger.tsx     - Transaction ledger with import wizard
    Cards.tsx      - Account management
    Categories.tsx - Category management
    Rules.tsx      - Categorization rules
    Reports.tsx    - Analytics reports
    Transfers.tsx  - Transfer matching queue
    Budgets.tsx    - Budget management
    Export.tsx     - CSV/JSON export
    Settings.tsx   - Settings, backup/restore, account
```

## Auth Flow

1. User visits app → `/api/auth/me` checked
2. If not authenticated → AuthPage shown (login or register)
3. On register → default categories + rules seeded, session created
4. On login → session created, store loaded from `/api/sync`
5. All mutations optimistically update local Zustand store + persist to API

## UAE-Specific Features

- Banks: Emirates NBD, Mashreq, ADCB
- Categorization rules for UAE services (DEWA, SEWA, RTA, Careem, Talabat, etc.)
- Transfer presets for UAE banking patterns
- AED currency formatting
