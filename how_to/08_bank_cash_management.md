# Phase 4: Bank & Cash Management — How-To Guide

## Overview

Phase 4 provides complete **Bank & Cash Management** capabilities:
- Bank Account Master Data
- Payment Vouchers (Spend Money) & Receipt Vouchers (Receive Money)
- Internal Bank Transfers
- Petty Cash Fund Dashboard
- Bank Statement CSV Import
- Bank Reconciliation Workspace with Auto-Match Engine

---

## 1. Bank Accounts

### Creating a Bank Account
1. Go to **Cash & Bank → Bank Accounts** in the sidebar
2. Click **"Add Bank Account"**
3. Fill in: Account Name, Bank Name, Account Number, Currency
4. **Important**: Link the account to an **ASSET-type** Chart of Account (e.g., `1-1101 Kas Besar`)
5. Click **Save**

### Rules
- Account numbers must be unique per company
- Only active ASSET CoAs can be linked
- Accounts with existing transactions cannot be deleted

---

## 2. Payment & Receipt Vouchers

### Spend Money (Payment Voucher / PV)
1. Go to **Cash & Bank → Spend & Receive**
2. Click **"Spend Money"**
3. Select the **source bank account**
4. Add line items with the **expense/liability accounts** you're paying
5. Click **"Post Official Voucher"**

The system automatically creates:
- A **POSTED Journal Entry** (Credit: Bank CoA, Debit: Expense/Liability CoAs)
- A **MATCHED Bank Transaction** linked to the journal

### Receive Money (Receipt Voucher / RV)
Same flow but reversed accounting:
- Debit: Bank CoA
- Credit: Revenue/Asset CoAs

---

## 3. Internal Transfers

1. Go to **Cash & Bank → Internal Transfers**
2. Select **Source Account** and **Destination Account**
3. Enter the transfer amount
4. Click **"Execute Transfer"**

Creates:
- A journal entry type **IC** (Internal Cash)
- Two bank transactions: one CREDIT on source, one DEBIT on target

> **Note**: Cross-currency transfers are not yet supported.

---

## 4. Petty Cash

The Petty Cash page at **Cash & Bank → Petty Cash** shows all bank/cash accounts as fund cards. To use petty cash:

1. Create a Bank Account with bank name like "Kas Kecil" or "Petty Cash"
2. Top-up via **Receive Money** or **Internal Transfer**
3. Record expenses via **Spend Money**
4. Monitor balances on the Petty Cash dashboard

---

## 5. Bank Statement Import

Import bank statements to create `UNMATCHED` bank transactions:

**API**: `POST /api/bank-statement/import`

```json
{
  "bankAccountId": "uuid",
  "csvData": "date,description,debit,credit\n2026-03-01,Sales Payment,500000,",
  "columnMapping": {
    "date": "date",
    "description": "description",
    "debit": "debit",
    "credit": "credit"
  },
  "preview": false
}
```

Set `preview: true` to see parsed rows without importing.

---

## 6. Bank Reconciliation

### Creating a Reconciliation
1. Go to **Cash & Bank → Bank Reconciliation**
2. Click **"New Reconciliation"**
3. Select Bank Account, Period, and enter the Bank Statement Ending Balance
4. Click **Create** — redirects to the Workspace

### Workspace Features
- **Left Panel**: Bank Transactions (imported/voucher-generated)
- **Right Panel**: GL Transactions (journal lines for the bank's CoA)
- **Manual Match**: Click one item from each side → Click "Match"
- **Auto Match**: Click "Auto Match" to run the 3-rule engine:
  - Rule 1: Exact amount + date (±3 days) → 95% confidence
  - Rule 2: Reference number match → 80% confidence
  - Rule 3: Description keyword + amount match → 60% confidence
- **Unmatch**: Remove incorrect matches from the Matched Items table

### Finalizing
When `Difference = 0`, click **"Finalize"** to lock the reconciliation and mark all matched transactions as `RECONCILED`.

### Reconciliation Report
Click **"Report"** to view the classic bank reconciliation statement:
- **Section A**: Bank Statement → Adjusted Bank Balance
- **Section B**: GL Balance → Adjusted GL Balance
- Final verdict: RECONCILED or UNRECONCILED

---

## 7. Bounced Transactions

To mark a bank transaction as bounced:

**API**: `POST /api/bank-transaction/{id}/bounce`

```json
{ "reason": "Insufficient funds" }
```

This will:
1. Mark the transaction as `isBounced = true`
2. If it was linked to a journal, create a **Reversing Journal (RJ)**
3. Set the original journal status to `REVERSED`
