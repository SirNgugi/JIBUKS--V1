# Professional Accounting System Implementation Plan
## JIBUKS - QuickBooks-Style Family Accounting

### Overview
Transform JIBUKS into a professional double-entry accounting system supporting:
- **Purchases** (Bills Payable)
- **Sales** (Invoices/Income)
- **Inventory/Stock Management**
- **Bank Transactions** (Deposits, Cheques, Transfers)
- **Fixed Assets** (Depreciation tracking)
- **Liabilities** (Loans, Credit Cards)
- **Complete CRUD operations** for all transaction types

---

## 1. DATABASE SCHEMA ENHANCEMENTS

### New Models to Add:

#### A. **Purchase/Bill Model**
```prisma
model Purchase {
  id              Int             @id @default(autoincrement())
  tenantId        Int
  vendorId        Int?            // Optional vendor
  billNumber      String?         // Bill/Invoice number from vendor
  purchaseDate    DateTime        @default(now())
  dueDate         DateTime?
  status          PurchaseStatus  @default(UNPAID)
  subtotal        Decimal
  tax             Decimal         @default(0)
  total           Decimal
  amountPaid      Decimal         @default(0)
  notes           String?
  journalId       Int?            // Link to journal entry
  createdById     Int
  createdAt       DateTime        @default(now())
  updatedAt       DateTime        @updatedAt
  
  items           PurchaseItem[]
  payments        PurchasePayment[]
}

model PurchaseItem {
  id              Int      @id @default(autoincrement())
  purchaseId      Int
  description     String
  quantity        Decimal
  unitPrice       Decimal
  amount          Decimal
  accountId       Int?     // Expense account
}
```

#### B. **Vendor/Supplier Model**
```prisma
model Vendor {
  id              Int      @id @default(autoincrement())
  tenantId        Int
  name            String
  email           String?
  phone           String?
  address         String?
  taxId           String?
  paymentTerms    String?  // "Net 30", "Due on Receipt"
  balance         Decimal  @default(0)
  isActive        Boolean  @default(true)
  purchases       Purchase[]
}
```

#### C. **Inventory/Stock Model**
```prisma
model InventoryItem {
  id              Int      @id @default(autoincrement())
  tenantId        Int
  sku             String
  name            String
  description     String?
  category        String?
  unit            String   // "pcs", "kg", "liters"
  costPrice       Decimal
  sellingPrice    Decimal
  quantity        Decimal  @default(0)
  reorderLevel    Decimal?
  assetAccountId  Int      // Inventory Asset account
  cogsAccountId   Int      // Cost of Goods Sold account
  isActive        Boolean  @default(true)
  movements       StockMovement[]
}

model StockMovement {
  id              Int      @id @default(autoincrement())
  tenantId        Int
  itemId          Int
  type            MovementType  // IN, OUT, ADJUSTMENT
  quantity        Decimal
  unitCost        Decimal?
  reference       String?  // Purchase ID, Sale ID, etc.
  date            DateTime @default(now())
  notes           String?
  journalId       Int?
}
```

#### D. **Bank Transaction Model**
```prisma
model BankTransaction {
  id              Int      @id @default(autoincrement())
  tenantId        Int
  bankAccountId   Int      // Account from Chart of Accounts
  type            BankTransactionType
  amount          Decimal
  date            DateTime @default(now())
  chequeNumber    String?
  reference       String?
  payee           String?
  description     String
  status          BankStatus @default(CLEARED)
  journalId       Int?
  reconciled      Boolean  @default(false)
}

enum BankTransactionType {
  DEPOSIT
  WITHDRAWAL
  CHEQUE
  TRANSFER
  FEE
}
```

#### E. **Fixed Asset Model**
```prisma
model FixedAsset {
  id                  Int      @id @default(autoincrement())
  tenantId            Int
  name                String
  description         String?
  purchaseDate        DateTime
  purchasePrice       Decimal
  salvageValue        Decimal  @default(0)
  usefulLife          Int      // in months
  depreciationMethod  String   @default("STRAIGHT_LINE")
  assetAccountId      Int
  depreciationAccountId Int
  accumulatedDepreciation Decimal @default(0)
  currentValue        Decimal
  isActive            Boolean  @default(true)
  depreciationEntries DepreciationEntry[]
}
```

---

## 2. BACKEND API ENDPOINTS

### Purchase Management
- `POST /api/purchases` - Create new purchase/bill
- `GET /api/purchases` - List all purchases
- `GET /api/purchases/:id` - Get purchase details
- `PUT /api/purchases/:id` - Update purchase
- `DELETE /api/purchases/:id` - Delete purchase
- `POST /api/purchases/:id/payment` - Record payment against purchase

### Inventory Management
- `POST /api/inventory` - Add new inventory item
- `GET /api/inventory` - List all inventory items
- `GET /api/inventory/:id` - Get item details
- `PUT /api/inventory/:id` - Update item
- `POST /api/inventory/adjustment` - Stock adjustment
- `GET /api/inventory/movements` - Stock movement history
- `GET /api/inventory/valuation` - Current inventory valuation

### Bank Transactions
- `POST /api/bank/deposit` - Record deposit
- `POST /api/bank/cheque` - Write cheque
- `POST /api/bank/transfer` - Bank transfer
- `GET /api/bank/transactions` - List bank transactions
- `PUT /api/bank/reconcile/:id` - Mark as reconciled

### Vendors
- `POST /api/vendors` - Create vendor
- `GET /api/vendors` - List vendors
- `GET /api/vendors/:id` - Get vendor details
- `PUT /api/vendors/:id` - Update vendor
- `GET /api/vendors/:id/purchases` - Vendor purchase history

### Fixed Assets
- `POST /api/assets` - Add fixed asset
- `GET /api/assets` - List assets
- `POST /api/assets/depreciation` - Calculate monthly depreciation
- `GET /api/assets/:id/schedule` - Depreciation schedule

---

## 3. ACCOUNTING LOGIC

### Purchase Transaction Flow:
```
When recording a purchase:
1. Debit: Expense Account (or Inventory Asset)
2. Credit: Accounts Payable (if on credit) OR Bank Account (if cash)

When paying a bill:
1. Debit: Accounts Payable
2. Credit: Bank Account
```

### Inventory Transaction Flow:
```
Purchase Inventory:
1. Debit: Inventory Asset
2. Credit: Accounts Payable/Cash

Sell Inventory:
1. Debit: Cash/Accounts Receivable
2. Credit: Sales Revenue
AND
1. Debit: Cost of Goods Sold
2. Credit: Inventory Asset
```

### Bank Deposit:
```
1. Debit: Bank Account
2. Credit: Source Account (Cash, Income, etc.)
```

### Cheque Payment:
```
1. Debit: Expense/Payable Account
2. Credit: Bank Account
```

---

## 4. FRONTEND SCREENS

### Main Navigation Addition:
- **Purchases** - Manage bills and purchases
- **Inventory** - Stock management
- **Banking** - Deposits, cheques, transfers
- **Vendors** - Supplier management
- **Assets** - Fixed asset tracking

### Screen Designs:
1. **Purchase List Screen** - Table view with filters
2. **New Purchase Screen** - Form with line items
3. **Purchase Detail Screen** - View/Edit with payment history
4. **Inventory Dashboard** - Stock levels, low stock alerts
5. **Bank Transactions Screen** - Deposit/Cheque forms
6. **Vendor Management Screen** - CRUD operations

---

## 5. IMPLEMENTATION PHASES

### Phase 1: Database & Core Logic ✓
- Extend Prisma schema
- Run migrations
- Create seed data for accounts

### Phase 2: Backend APIs
- Purchase routes & controllers
- Inventory routes & controllers
- Bank transaction routes
- Vendor management routes

### Phase 3: Frontend UI
- Purchase management screens
- Inventory management screens
- Bank transaction screens
- Integration with existing dashboard

### Phase 4: Reports & Analytics
- Purchase reports
- Inventory valuation reports
- Bank reconciliation
- Fixed asset schedules

---

## 6. KEY FEATURES

✅ **Double-Entry Bookkeeping** - Every transaction balanced
✅ **Multi-Currency Support** - KES, USD, EUR, etc.
✅ **Audit Trail** - Complete transaction history
✅ **Reconciliation** - Bank statement matching
✅ **Depreciation** - Automatic fixed asset depreciation
✅ **Stock Valuation** - FIFO, LIFO, Average cost
✅ **Vendor Management** - Track payables
✅ **Payment Tracking** - Partial payments supported
✅ **Financial Reports** - P&L, Balance Sheet, Cash Flow

---

## Next Steps:
1. Update Prisma schema with new models
2. Run database migration
3. Create backend routes and controllers
4. Build frontend screens
5. Test complete transaction flows
