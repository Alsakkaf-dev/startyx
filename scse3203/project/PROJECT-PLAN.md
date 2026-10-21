# PayoutHub: Etiqa eMoney Payout Platform
**SCSE3203 Group Project · Semester 1 2026/2027 · 15% (Progress 3% + Code 7% + Presentation 5%)**

> **Name rationale:** the brief asks for a unique name that reflects the system's main function. Every payout type (claims, surrender, surplus, cashback) lands in one eMoney wallet, and the customer then withdraws, reinvests or donates it. *PayoutHub* is that hub.

---

## 1. Brief compliance map

| Brief requirement | How we meet it |
|---|---|
| Unique project name | **PayoutHub** |
| PM tool with To Do / In Progress / Done | GitHub Projects board (template in §6) |
| ≥ 2 roles | **3 roles:** `CUSTOMER`, `FINANCE_OFFICER`, `COMPLIANCE_ADMIN` |
| Spring MVC (Boot allowed) | Spring Boot 4.1.1 + Spring Web MVC, the same stack as `week02-demo` |
| ≥ 8 modules, 2 per member | 8 modules × 4 members (§3) |
| Phase 1: front-end in JSP/Thymeleaf | Thymeleaf + Bootstrap 5, one shared layout fragment for a consistent UI |
| Phase 2: DAO/DB, Views, CRUD, session/filter auth, reporting | Every module has a row filled in the §4 grid |

---

## 2. Roles (from the case-study stakeholders)

| Role | Who in the case study | Can do |
|---|---|---|
| `CUSTOMER` | Policyholder / beneficiary | Register, complete eKYC, view wallet, withdraw, reinvest, donate, view history |
| `FINANCE_OFFICER` | Claims & Finance teams | Create payout batches, approve (maker-checker), credit wallets, reconcile |
| `COMPLIANCE_ADMIN` | Compliance & Risk / IT | Manage users and roles, verify eKYC, audit log, BNM/RMiT reports, unclaimed-fund monitoring |

*Maybank gateway and BNM are external actors. The gateway is simulated by a `PaymentGatewayService` stub, and BNM is represented by the report exports.*

---

## 3. Modules and ownership

| # | Module | Owner | Core screens | Main tables |
|---|---|---|---|---|
| M1 | **User Management & Authentication** | A | Register, Login, Logout, Manage Users (admin), Change Role | `users`, `roles` |
| M2 | **Customer Profile & eKYC** | A | My Profile, Bank Account Setup, eKYC Upload, eKYC Review (admin) | `customer_profile`, `bank_account`, `kyc_record` |
| M3 | **Payout Management** (claims, surrender, surplus, cashback) | B | Create Payout, Payout List, Payout Detail, Edit/Cancel | `payout`, `policy` |
| M4 | **Approval & Disbursement** (maker-checker → wallet credit) | B | Pending Approvals, Approve/Reject, Disbursement Log, Failed Credit Retry | `payout_approval`, `disbursement` |
| M5 | **eWallet & Transaction History** | C | Wallet Dashboard (balance), Transaction History (filter/sort), Transaction Detail/Receipt | `wallet`, `wallet_txn` |
| M6 | **Withdrawal to Bank** | C | Request Withdrawal, Withdrawal Status, Officer Withdrawal Queue | `withdrawal_request` |
| M7 | **Reinvest & Donate** | D | Product Catalogue, Reinvest (pay premium / buy plan), Donate to Charity, My Reinvestments | `product`, `reinvestment`, `donation`, `charity` |
| M8 | **Reporting, Reconciliation & Compliance** | D | Admin Dashboard KPIs, Reconciliation Report, Unclaimed Funds, Audit Log, BNM report export (CSV/PDF) | `audit_log`, report queries |

**Cross-cutting (shared ownership):** a common Thymeleaf layout (`fragments/layout.html`) maintained by A, notification banners (in-app "funds available" alerts), and an `AuthFilter`/Spring Security config owned by A and used by everyone.

> **Team of 3?** The brief still requires ≥ 8 modules. Merge M1 + M2 into one member and give the remaining two members three modules each. Confirm this with the lecturer first.

### End-to-end data flow (the story the demo should tell)
```
FINANCE_OFFICER creates payout (M3) ──► second officer approves (M4) ──► wallet credited (M4→M5)
      ──► CUSTOMER sees balance + notification (M5)
           ├─► withdraws to bank (M6)
           ├─► reinvests into a policy / donates (M7)
           └─► every movement is written to wallet_txn + audit_log ──► COMPLIANCE_ADMIN reports (M8)
```

---

## 4. Phase 2 technical grid (copy into the demo slide)

| Member | Module | Model: DAO / DB | View: Thymeleaf + CSS + Bootstrap | Controller: CRUD | Personalisation & Authorisation | Reporting |
|---|---|---|---|---|---|---|
| A | M1 User Mgmt | `UserRepository`, `users`, `roles` | login, register, user list/form | C/R/U/D users | Session login, BCrypt, role-based menu | Login history |
| A | M2 Profile & eKYC | `KycRepository`, `bank_account` | profile, kyc upload/review | CRUD bank accounts, KYC | Owner-only edit; admin review | KYC status report |
| B | M3 Payout | `PayoutRepository`, `payout` | payout list/form/detail | CRUD payouts | Officer-only | Payout by type/status |
| B | M4 Approval | `ApprovalRepository`, `disbursement` | approval queue, log | Approve/Reject (U), log (R) | Maker ≠ checker rule | Disbursement log |
| C | M5 Wallet | `WalletRepository`, `wallet_txn` | dashboard, history | R wallet, R/filter txns | Customer sees own wallet only | Transaction history + statement |
| C | M6 Withdrawal | `WithdrawalRepository` | request form, status, queue | C/R/U(cancel) withdrawals | Balance check, daily limit | Withdrawal report |
| D | M7 Reinvest/Donate | `ProductRepository`, `reinvestment`, `donation` | catalogue, checkout, history | CRUD products (admin), C reinvest/donate | Customer-only actions | Reinvestment/donation summary |
| D | M8 Reports | `AuditLogRepository`, aggregate queries | dashboard, report pages | R + export | `COMPLIANCE_ADMIN` only | Reconciliation, unclaimed funds, BNM export |

---

## 5. Architecture & conventions (agree these in Week 3)

- **Stack:** Java 21 · Spring Boot 4.1.1 · Spring Web MVC · Thymeleaf · Bootstrap 5 · MySQL 8. Later weeks add JDBC (Wk 10), then JPA/Hibernate (Wk 11), REST + Fetch for live balance (Wk 12) and Spring Security with BCrypt (Wk 13).
- **Package by module, layered inside each:**
  ```
  my.utm.scse3203.payouthub
   ├── user/        controller · service · repository · model    (M1)
   ├── kyc/                                                        (M2)
   ├── payout/                                                     (M3)
   ├── disbursement/                                               (M4)
   ├── wallet/                                                     (M5)
   ├── withdrawal/                                                 (M6)
   ├── reinvest/                                                   (M7)
   ├── report/                                                     (M8)
   └── common/      layout, AuthFilter, exceptions, audit
  templates/<module>/*.html   ·   templates/fragments/layout.html
  ```
  Each member owns their packages and template folders, which keeps merge conflicts close to zero.
- **Git:** `main` is protected. Use one branch per module (`feature/m5-wallet`), open a pull request, and require one teammate review before merging. Never commit `target/` or DB passwords; use `application-local.properties` and add it to `.gitignore`.
- **Money:** store amounts as `BigDecimal` / `DECIMAL(15,2)`, never `double`. Every balance change writes a `wallet_txn` row and an `audit_log` row (RMiT traceability).

---

## 6. Board seed (GitHub Projects: To Do / In Progress / Done)

| Week | Task | Owner |
|---|---|---|
| 3 | Create team repo from `week02-demo`, rename to `payouthub`, add all members | A |
| 3 | Set up the GitHub Projects board with three columns and import this table | A |
| 3–4 | User stories + use-case diagram per module (links to Lab Exercise 1) | All |
| 5 | Class diagram + ERD (all tables in §3) (Lab Exercise 2) | All, merged by D |
| 5 | Shared `layout.html` + Bootstrap navbar with role-based menu | A |
| 6–7 | Static Thymeleaf screens for own 2 modules, using mock data in controllers | Each |
| 7 | Forms + validation for own module (Week 7 content) | Each |
| **9** | **Phase 1 demo: all screens navigable, consistent UI (7–13 Dec)** | All |
| 9–10 | Service + repository layers, MySQL schema, JDBC DAO | Each |
| 11 | Migrate DAOs to JPA entities | Each |
| 12 | REST endpoint + Fetch for live wallet balance / approval queue | C, B |
| 13 | Spring Security: BCrypt, RBAC, CSRF; MockMvc tests per module | A + each |
| 14 | Executable JAR, profiles (`dev`/`prod`), README | D |
| **15** | **Final demo + presentation + AI-use declaration (18–24 Jan)** | All |

---

## 7. Key dates

| What | When |
|---|---|
| Quiz 1 | Week 7 (23–29 Nov) |
| **Phase 1 Progress Demo** (front-end, 3%) | **Week 9, 7–13 Dec 2026** |
| Test (20%) | **Thu 10 Dec 2026, 8 pm** (same week as Phase 1) |
| Assignment (code + video) | Week 10 |
| Quiz 2 | Week 14 |
| **Final Demo** (code 7% + presentation 5%) | **Week 15, 18–24 Jan 2027** |

> Absence from either demo means zero marks for that member. Each member demos their own two modules.

**Requirements recording (from the briefing):** https://utm.webex.com/utm/ldr.php?RCID=263e0ed0a42f42b3969a6d581a017244 (password in the briefing slides)
