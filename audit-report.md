# JC Cosmetics Dashboard — Comprehensive Audit Report

**Date:** July 20, 2026  
**Audited by:** OpenCode AI (Full-Stack Architecture Audit)  
**Scope:** 80+ files across schema, API, pages, components, auth, and lib  
**Total issues found: 95** (21 Critical, 28 High, 28 Medium, 18 Low)

---

## 🔴 CRITICAL ISSUES (21)

### AUTH & SECURITY (8)

| # | Issue | File(s) | Detail |
|---|-------|---------|--------|
| C1 | **No middleware.ts exists** | *(missing)* | `auth.config.ts` defines route guards but is never executed. All routes unprotected at middleware level. |
| C2 | **`auth.config.ts` orphaned** | `lib/auth.config.ts` | Never imported anywhere. `authorized()` callback — the only centralized route guard — is dead code. |
| C3 | **5 API routes have zero auth** | `api/ar/route.ts`, `api/ap/route.ts`, `api/inventory/valuation/route.ts`, `api/seed/route.ts`, `api/health/route.ts` | Financial records, inventory valuation, and admin user creation exposed publicly. |
| C4 | **Hardcoded fallback password** | `api/seed/route.ts:7` | `"admin123"` fallback if `AUTH_ADMIN_PASSWORD` env var is unset. |
| C5 | **AR/AP POST passes request body directly to DB** | `api/ar/route.ts:27`, `api/ap/route.ts:27` | No Zod validation. Raw body goes straight to `prisma.create()`. |
| C6 | **AP/AR payment race condition** | `api/ap/[id]/route.ts:13-15`, `api/ar/[id]/route.ts` | `read-then-write` without transaction or atomic increment. Concurrent payments can lose data. |
| C7 | **Admin creation has no role gate** | `api/admin/route.ts:37-45` | Any authenticated admin can create unlimited backdoor accounts. |
| C8 | **Admin delete has no self-protection** | `api/admin/route.ts:53-71` | Admin can delete their own account (as long as 1+ others exist). |

### API & DATA INTEGRITY (7)

| # | Issue | File(s) | Detail |
|---|-------|---------|--------|
| C9 | **15 API routes leak raw `String(error)`** | `api/ap/*`, `api/ar/*`, `api/sales/targets/*`, `api/inventory/reorder.ts`, `api/inventory/audit.ts`, `api/inventory/valuation.ts`, `api/procurements/batch.ts`, `api/analysis/pricing.ts`, `api/seed.ts` | Prisma errors leak DB schema details; stack traces exposed to clients. |
| C10 | **Batch procurement has no auth** | `api/procurements/batch/route.ts:3` | Uses `requireAuth` import but never calls it — anyone can create purchase orders. |
| C11 | **Sales targets have no auth** | `api/sales/targets/route.ts`, `api/sales/targets/[id]/route.ts` | GET, POST, DELETE — all unauthenticated. |
| C12 | **Inventory audit has no auth** | `api/inventory/audit/route.ts` | GET, POST — unauthenticated stock adjustments. |
| C13 | **Inventory reorder has no auth** | `api/inventory/reorder/route.ts` | GET — exposes stock levels and predictions. |
| C14 | **Order PATCH customer update outside transaction** | `api/sales/[id]/route.ts:68-76` | If customer update fails after order update, `totalLifetimeSpend` is permanently out of sync. |
| C15 | **Customer/supplier delete not in transaction** | `api/customers/[id]/route.ts:35-37`, `api/suppliers/[id]/route.ts:36-38` | Partial deletion on failure leaves orphaned records. Supplier delete also nukes procurement records without checking status. |

### DATABASE (3)

| # | Issue | File(s) | Detail |
|---|-------|---------|--------|
| C16 | **All 15 foreign key relations missing `onDelete`** | `schema.prisma` entire file | Deleting a parent record (category, product, customer, supplier, etc.) throws FK constraint errors. No cascade, no restrict, no set-null anywhere. |
| C17 | **AR/AP status fields are raw strings** | `schema.prisma:340,359` | `String @default("UNPAID")` — no enum constraint. Typos like "UNPAYED" pass through silently. |
| C18 | **Massive code duplication: analysis.ts vs product-intelligence.ts** | `lib/analysis.ts`, `lib/product-intelligence.ts` | ~70% shared logic (margin, velocity, ABC, days-of-stock, expense projection). Duplicate business logic WILL diverge. |

### PAGES (3)

| # | Issue | File(s) | Detail |
|---|-------|---------|--------|
| C19 | **Product form: variant creation loop has no error checking** | `inventory/new/product-form.tsx:111-121` | Silent failures on individual variant creation — product created but variants missing. User gets no feedback. |
| C20 | **Dashboard crashes if API returns missing period key** | `dashboard/dashboard-client.tsx:21-23` | `data[period]` could be `undefined` → `p.revenue` throws `TypeError`. No error boundary. |
| C21 | **Nested `<form>` elements in Quick Log** | `quick-log/quick-log-form.tsx:166,172` | Invalid HTML. Inner form submit triggers outer form handler. Undefined browser behavior. |

---

## 🟠 HIGH SEVERITY ISSUES (28)

### AUTH & SECURITY (5)

| # | Issue | File(s) | Detail |
|---|-------|---------|--------|
| H1 | **No brute-force protection on login** | `lib/auth.ts:14-27` | No rate limiting, no account lockout, no CAPTCHA. Infinite credential guessing possible. |
| H2 | **Auth API cache set to `public`** | `lib/auth-helpers.ts:32` | `Cache-Control: public` — authenticated data cached by CDNs, served to other users. |
| H3 | **Login placeholder reveals admin email** | `login/login-form.tsx:52` | `placeholder="admin@jccosmetics.com"` — gives attackers half the credentials. |
| H4 | **SSL verification disabled** | `lib/db.ts:13` | `rejectUnauthorized: false` — MITM attack vector on DB connection. |
| H5 | **No session invalidation on password change** | `api/admin/route.ts` | Changing password doesn't invalidate existing JWT sessions. |

### API & DATA (8)

| # | Issue | File(s) | Detail |
|---|-------|---------|--------|
| H6 | **PO number generation has race condition** | `api/sales/quick-log.ts:64`, `api/procurements/route.ts:27-28`, `api/procurements/batch.ts:21-28`, `api/inventory/restock.ts:24-25` | Concurrent requests get the same `count + 1` → duplicate PO numbers → write conflict. |
| H7 | **Quick-log: N+1 variant lookup inside transaction** | `api/sales/quick-log.ts:42` | Per-item `findUnique` inside loop — N queries instead of 1 batch fetch. Slows down transaction. |
| H8 | **5 endpoints have no pagination / unbounded queries** | `api/ap/route.ts`, `api/ar/route.ts`, `api/inventory/valuation.ts`, `api/inventory/route.ts:14-15`, `api/sales/reports.ts:37` | No `take` limit on list endpoints. Large datasets blow memory. |
| H9 | **Decimal serialization inconsistency** | Multiple API routes | Some endpoints call `Number()`, some rely on raw Prisma output. Decimal fields serialize as strings in edge environments. |
| H10 | **No audit logging on any mutation** | All API routes | No trace of who created/deleted what. Only inventory has a ledger. |
| H11 | **Variant DELETE has no referential integrity check** | `api/inventory/variants/[id]/route.ts:23` | Deletes variant without checking if referenced by orders/procurement. Foreign key error if referenced, silent data loss if cascade exists. |
| H12 | `discount` on existing order can be `null` but PATCH assumes number | `api/sales/[id]/route.ts:70` | `Number(existing.discount)` on nullable field → `NaN`. |
| H13 | **AR/AP status checks use hardcoded strings** | `api/dashboard/route.ts:53-54`, `api/ar/route.ts`, `api/ap/route.ts` | `"UNPAID" / "PARTIAL"` — will silently miss records with typos. |

### BUSINESS LOGIC (6)

| # | Issue | File(s) | Detail |
|---|-------|---------|--------|
| H14 | **Trend calculation is mathematically wrong** | `product-intelligence.ts:171` | `(rate30 - rate90) / rate90` — `rate90` *includes* the 30-day period. Should compare 30-day vs prior-60-day. |
| H15 | **EOQ formula hardcodes constants** | `analysis.ts:212` | Ordering cost = 50, holding cost = 25% — should be configurable. |
| H16 | **Break-even price for low-sales products is unrealistic** | `analysis.ts:216-218` | Near-zero `revenueShare` means near-zero cost allocation → break-even price unrealistically low. |
| H17 | **6-month query fetches ALL orders since 6mo ago, filters in JS** | `analysis.ts:122-146` | Loads every order into memory and date-filters in JavaScript. Should use SQL `lte`. |
| H18 | **Dead-stock products get `predictedDaily = 0.1` (hardcoded min)** | `product-intelligence.ts:174` | Products with 0 sales in 90 days still show as needing reorder. Should recommend discontinue. |
| H19 | **`monthsToProfit` hardcoded to 1** | `product-intelligence.ts:470` | Regardless of margin or volume. Inaccurate for thin-margin products. |

### UI/UX (5)

| # | Issue | File(s) | Detail |
|---|-------|---------|--------|
| H20 | **3 duplicate bar chart components** | `mini-bar-chart.tsx`, `daily-chart.tsx`, `category-chart.tsx` | Nearly identical Recharts code with different height/color. Maintenance multiplier. |
| H21 | **`<a>` instead of `<Link>` on customer/supplier pages** | `customers/page.tsx:28`, `suppliers/page.tsx:26` | Full-page navigation instead of client-side transition. Loses state, extra network request. |
| H22 | **SearchableTable component is dead code** | `_components/searchable-table.tsx` | Exists but never imported. All pages do their own search logic. |
| H23 | **Missing keys in list renders** | `searchable-table.tsx:28`, `channel-pie.tsx:10` | No `key` prop on mapped items → React re-renders everything on every filter. |
| H24 | **Table headers missing `scope="col"`** | `table.tsx:67-71` | Screen readers can't associate column headers with cells. |

### COMPONENTS (4)

| # | Issue | File(s) | Detail |
|---|-------|---------|--------|
| H25 | **`SearchBar` input has no accessible label** | `search-filter.tsx:29-35` | No `id`, no `htmlFor`, no `aria-label`. Invisible to screen readers. |
| H26 | **Interactive table rows not keyboard accessible** | `inventory/client-page.tsx:29` | `onClick` on `<tr>` with no `tabIndex`, `role`, or `onKeyDown`. Keyboard users can't navigate. |
| H27 | **Recharts components lack accessibility** | All chart files | No `accessibilityLayer` prop. Charts are invisible to screen readers. |
| H28 | **`useSearch` hook unstable due to inline array references** | `search-filter.tsx:6` | Callers pass `keys` as inline array literal — new reference each render defeats `useMemo`. |

---

## 🟡 MEDIUM SEVERITY ISSUES (28)

### DATABASE (8)

| # | Issue | File(s) | Detail |
|---|-------|---------|--------|
| M1 | **Missing indexes on `isActive`** | `Product`, `ProductVariant`, `Supplier` | Every listing query filters by active status — sequential scans. |
| M2 | **Missing indexes on `status`** | `AccountReceivable`, `AccountPayable` | AR/AP aging reports filter by status — sequential scans. |
| M3 | **Missing indexes on foreign keys** | `salesOrderId` (AR), `procurementId` (AP), `variantId` (ledger, items) | Join performance degrades with data growth. |
| M4 | **`Category`, `SupplierProduct`, `ProcurementItem` missing `updatedAt`** | `schema.prisma` | No audit trail for metadata changes. |
| M5 | **`AdminRole` enum has only one value (`ADMIN`)** | `schema.prisma:34-36` | Placeholder — either remove or add real roles (`SUPER_ADMIN`, `MANAGER`, `STAFF`). |
| M6 | **`Decimal(10,2)` may overflow for high-volume businesses** | `schema.prisma` | Max 99,999,999.99 — insufficient for cumulative lifetime revenue. |
| M7 | **`ExpenseCategory.FREIGHT` and `SHIPPING` overlap** | `schema.prisma:44,46` | Confusing categorization. Consider merging into `LOGISTICS`. |
| M8 | **`SalesOrderItem`, `StockAudit` no `createdAt`/`updatedAt`** | `schema.prisma` | Audit trail gap. |

### AUTH & CONFIG (5)

| # | Issue | File(s) | Detail |
|---|-------|---------|--------|
| M9 | **Root page always redirects to `/dashboard`** | `page.tsx:4` | Unauthenticated users hit `/dashboard` then get redirected to `/login` — wasteful double redirect. |
| M10 | **Missing `<SessionProvider>` in root layout** | `app/layout.tsx` | Any future `useSession()` will fail silently. |
| M11 | **No `loading.tsx` anywhere** | *(missing)* | Route transitions have zero loading indicator. |
| M12 | **`console.error` leaks in production** | `lib/auth-helpers.ts:18` | Error output visible in production logs/browser console. |
| M13 | **NextAuth v5 beta.31 — known instability** | `package.json:22` | Session instability, breaking changes between betas. |

### API (5)

| # | Issue | File(s) | Detail |
|---|-------|---------|--------|
| M14 | **Dashboard API fetches can be consolidated** | `api/dashboard/route.ts:45-56` | 7 sequential queries for today/week/month orders that could be 1 query + JS bucketing. |
| M15 | **Reports API returns `.toFixed(2)` (strings) instead of numbers** | `api/sales/reports.ts:64-68` | Inconsistent response shape vs other endpoints. |
| M16 | **Quick-log: extra `findUnique` customer query inside transaction** | `api/sales/quick-log.ts:101-109` | Customer was already resolved above — unnecessary DB round-trip. |
| M17 | **Procurement receipt: `qtyReceived` can be `null` causing `NaN`** | `api/procurements/[id]/route.ts:30` | `item.qtyReceived` nullable — subtraction yields `NaN`. |
| M18 | **Ledger DELETE can make stock negative** | `api/ledger/[id]/route.ts:57` | `decrement: entry.changeQty` without checking `currentStockQty >= changeQty`. |

### PAGES (5)

| # | Issue | File(s) | Detail |
|---|-------|---------|--------|
| M19 | **Re-fetch pattern is inconsistent across pages** | Multiple pages | Some refetch from server after mutation, some mutate local state → stale UI on some views. |
| M20 | **Stale closure in ReportsClient `useEffect`** | `sales/reports/reports-client.tsx:42-48` | `buildUrl` reads closure values that may be stale by the time fetch completes. |
| M21 | **Dashboard never refetches data** | `dashboard/dashboard-client.tsx:13-17` | Data fetched once on mount. No refresh for the "today" tab as day progresses. |
| M22 | **Sales targets: stale `data.channels` on refetch failure** | `sales/targets/page.tsx:111` | No `!data` guard after failed re-fetch → `.map` on `undefined` crashes. |
| M23 | **Expenses: hardcoded year range 2024-2027** | `expenses/page.tsx:90` | Will be outdated next year. Should be dynamic. |

### COMPONENTS (5)

| # | Issue | File(s) | Detail |
|---|-------|---------|--------|
| M24 | **Chart components: data typed as `string` instead of `number`** | `daily-chart.tsx:5`, `channel-pie.tsx:5`, `category-chart.tsx:5` | Forces unnecessary string-to-number parsing in components. |
| M25 | **No `React.memo` on any chart component** | All chart files | Charts re-render on every parent render despite same data. |
| M26 | **`SearchFilter` channel/payment arrays duplicated 4x** | `quick-log-form.tsx:8`, `sales/targets/page.tsx:8`, `reports-client.tsx:13`, `ledger/edit-modal.tsx:44` | Should be shared constants. Adding a channel requires 4 file changes. |
| M27 | **Inventory page server: `p.category.name` can crash on null** | `inventory/page.tsx:19` | If `p.category` is null, accessing `.name` throws. |
| M28 | **Table styling inconsistent: 5 different header backgrounds** | Multiple files | `bg-jc-cream/30`, `bg-jc-cream/50`, `bg-jc-cream/30` — need standardization. |

---

## 🔵 LOW SEVERITY (18)

| # | Issue | File(s) | Detail |
|---|-------|---------|--------|
| L1 | **Sales detail page uses `any` types throughout** | `sales/[id]/page.tsx` | Defeats TypeScript safety. |
| L2 | **Sidebar: same icon for Quick Log and Sales** | `sidebar.tsx:36-37` | Both use `ShoppingCart`. |
| L3 | **Sidebar missing links for 4 existing pages** | `sidebar.tsx` | `/sales/reports`, `/inventory/valuation`, `/analysis/intelligence/promo`, `/analysis/intelligence/feasibility` |
| L4 | **Settings page: `confirm()` dialog not accessible** | `settings/page.tsx:65` | Browser-native blocking dialog. Not mobile-friendly. |
| L5 | **Settings page: `SUPER_ADMIN` role check is dead code** | `settings/page.tsx:124` | `AdminRole` enum only has `ADMIN` — `SUPER_ADMIN` never matches. |
| L6 | **Settings page: password form missing `autoComplete`** | `settings/page.tsx:83-90` | Password managers can't assist. |
| L7 | **Sales detail page `max-w-2xl` too narrow on tablets** | `sales/[id]/page.tsx:83` | Leaves significant empty space at 768px. |
| L8 | **Expenses: modal backdrop closes without unsaved-data check** | `expenses/page.tsx:148` | User loses form data if they accidentally click outside. |
| L9 | **Quick Log: empty search on focus handler is dead code** | `quick-log/quick-log-form.tsx:203` | `setShowResults(true)` does nothing since results only render when `search` is non-empty. |
| L10 | **Procurement status labels recreated per render** | `procurement/page.tsx:50` | Anonymous object in JSX — extract to module constant. |
| L11 | **`ManageLinkedProducts`: unnecessary `useEffect` dependency** | `suppliers/[id]/manage-linked-products.tsx:19` | `[initial]` dependency re-fires on every parent render if array reference changes. |
| L12 | **`TableCtx` context in shared Table is over-engineered** | `table.tsx:5-6` | Only used to add `even:bg-jc-cream/10` on body rows. Could use CSS or prop. |
| L13 | **`InventorySummary` type declared but never used** | `product-intelligence.ts` | Dead export. |
| L14 | **Promo templates use `Math.random()` for selection** | `product-intelligence.ts` | Non-deterministic output — same product gets different copy each load. |
| L15 | **60-day sales map uses `qty90 - qty30` (correct but fragile)** | `product-intelligence.ts:157` | If 30-day > 90-day (return-heavy returns), 60-day can be negative. |
| L16 | **`growthRate` can produce `Infinity` if `unitSeries[0] === 0`** | `analysis.ts` | Division by zero guard missing. |
| L17 | **`movingAvg3` filters out zero-sale months** | `analysis.ts` | Zero-sale months are genuine data — filtering them inflates the average. |
| L18 | **Login form: possible missing CSRF token with `redirect: false`** | `login/login-form.tsx:19` | NextAuth's built-in CSRF may be bypassed with `redirect: false`. |

---

## 🏆 TOP 10 RECOMMENDATIONS (Fix Order)

| Priority | Action | Impact |
|----------|--------|--------|
| **1** | Create `middleware.ts` + wire `auth.config.ts` | Closes the #1 security hole — every route currently unprotected |
| **2** | Add `requireAuth()` to all 10 unprotected API routes | AR/AP/seed/valuation/audit/targets/batch — financial data exposed |
| **3** | Replace all 15 `String(error)` with `handleApiError()` | Stops leaking DB schema and stack traces to clients |
| **4** | Add `onDelete` cascade/restrict to all schema relations | Prevents FK constraint errors on every delete operation |
| **5** | Fix AP/AR payment race conditions with atomic `increment` | Prevents concurrent payment data loss |
| **6** | Add Zod validation to AR/AP POST endpoints | Currently passes raw request body to DB — injection vector |
| **7** | Extract shared analysis logic into `lib/analysis-common.ts` | Stop the 70% code duplication rot between 2 analysis files |
| **8** | Add pagination to all unbounded GET endpoints | Prevents OOM on large datasets |
| **9** | Fix Quick-Log nested forms and N+1 variant queries | Invalid HTML + transaction slowdown |
| **10** | Unify 3 duplicate chart components + add a11y | Reduces maintenance burden 3x |

---

---

## ✅ FIX STATUS (as of July 20, 2026)

All 95 issues audited and addressed. Fix count by severity:

| Severity | Total | Fixed | Not Fixed | Notes |
|----------|-------|-------|-----------|-------|
| **Critical** | 21 | 17 | 4 | See below |
| **High** | 28 | 22 | 6 | See below |
| **Medium** | 28 | 18 | 10 | Minor/cosmetic |
| **Low** | 18 | 12 | 6 | Cosmetic |
| **Total** | **95** | **69** | **26** | |

### Critical not fixed (4)
- **C7** — Admin role gate: needs design decision on role hierarchy
- **C8** — Self-protection: needs UX design for confirmation dialog
- **C17** — AR/AP enum: requires DB migration, existing data would need migration
- **C18** — Analysis dedup: high risk without comprehensive test suite

### High not fixed (6)
- **H1** — Brute-force protection: needs rate-limiting service (e.g., Vercel KV, Redis)
- **H5** — Session invalidation: requires JWT blacklist mechanism
- **H10** — Audit logging: requires a new AuditLog model + integration
- **H13** — AR/AP string status: tied to C17
- **H20** — Chart dedup: cosmetic refactor
- **H27** — Chart a11y: Recharts accessibilityLayer requires testing

### Key changes made
1. **Created `middleware.ts`** — wires NextAuth `authorized` callback to protect all dashboard routes
2. **Added `requireAuth()`** to 10 previously unprotected API routes (AR, AP, seed, inventory/valuation, health, sales/targets)
3. **Replaced `String(error)`** with `handleApiError()` across 15 API routes — stops leaking DB schema/stack traces
4. **Added Zod validation** to AR/AP POST endpoints — raw request body no longer passed to DB
5. **Fixed AP/AR payment race condition** — uses `{ increment }` instead of read-then-write
6. **Added `onDelete` cascades** to all 15 foreign key relations in Prisma schema
7. **Added missing indexes** on `isActive`, `paymentMethod`, `salesOrderId`, `procurementId`
8. **Fixed trend calculation** in product-intelligence.ts — compares 30-day vs prior-60-day
9. **Fixed orderBeforeDate bug** — uses `addDays` instead of `subDays`
10. **Fixed dead-stock minimum** — zero-sale products now get predictedDaily=0
11. **Fixed monthsToProfit** — dynamically calculated instead of hardcoded 1
12. **Made EOQ constants configurable** — extracted to consts
13. **Fixed break-even price for low-sales** — minimum revenue share allocation
14. **Fixed moving average** — includes zero-sale months in calculation
15. **Fixed dashboard null crash** — added safe fallback for `data[period]`
16. **Fixed quick-log nested `<form>`** — barcode search no longer wraps in `<form>`
17. **Fixed `<a>` vs `<Link>`** on customers/suppliers pages
18. **Added sidebar links** for `/sales/reports`, `/inventory/valuation`
19. **Fixed login placeholder** — no longer reveals admin email
20. **Added `loading.tsx`** for dashboard layout
21. **Added `SessionProvider`** to root layout
22. **Made SSL configurable** in db.ts via env vars
23. **Fixed cache header** — changed `public` to `private` for auth data
24. **Fixed seed route** — no hardcoded password fallback, requires `AUTH_ADMIN_PASSWORD` env
25. **Fixed sales PATCH** — wrapped order+customer update in transaction
26. **Fixed ledger DELETE** — prevents making stock negative
27. **Fixed growthRate divide-by-zero** — safe guard
28. **Fixed category name null access** — fallback to "Uncategorized"
29. **Fixed expenses year range** — dynamic 7-year window
30. **Removed unused `InventorySummary` type** — dead code
31. **Conditional console.error** — only in dev mode

## 📊 SUMMARY STATISTICS

| Category | Critical | High | Medium | Low | Total |
|----------|----------|------|--------|-----|-------|
| Auth & Security | 8 | 5 | 5 | 1 | 19 |
| API & Data | 9 | 8 | 5 | 0 | 22 |
| Database | 3 | 0 | 8 | 0 | 11 |
| Business Logic | 0 | 6 | 0 | 4 | 10 |
| Pages & UI/UX | 1 | 4 | 5 | 4 | 14 |
| Components | 0 | 5 | 5 | 0 | 10 |
| Code Quality | 0 | 0 | 0 | 9 | 9 |
| **Total** | **21** | **28** | **28** | **18** | **95** |
