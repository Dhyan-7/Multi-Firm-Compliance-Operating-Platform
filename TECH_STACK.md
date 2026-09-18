# BALAJI GROUPS — CompliCal (Multi-Firm Compliance Operating Platform) — Technology Stack

Comprehensive architectural and technology stack documentation for **BALAJI GROUPS — CompliCal**.

---

## 1. High-Level Architecture

```mermaid
graph TD
    Client[Web Browser / Client Devices] -->|HTTPS / Next.js SSR & RSC| NextApp[Next.js 16.3.5 App Router]
    
    subgraph Frontend Layer
        NextApp --> ReactUI[React 19.2.8 UI Components]
        ReactUI --> DesignTokens[Enterprise Design System (globals.css)]
        ReactUI --> Charts[Chart.js 4.5.1 + react-chartjs-2]
        ReactUI --> ISTFormatter[IST Timezone Adapter (dateUtils.ts)]
    end

    subgraph Backend & API Layer
        NextApp --> RouteHandlers[Next.js API Route Handlers]
        RouteHandlers --> AuthModule[JWT 9.0.3 + bcryptjs 3.0.3]
        RouteHandlers --> RBAC[Granular RBAC Permission Matrix]
        RouteHandlers --> CronJobs[node-cron 4.6.0 SLA Engine]
        RouteHandlers --> Mailer[nodemailer 10.0.9 SMTP Engine]
        RouteHandlers --> ExportEngine[jspdf + xlsx Report Exporters]
    end

    subgraph Storage & Persistence Layer
        RouteHandlers --> DBSelector{Environment Check}
        DBSelector -->|Local / Docker / VM| SQLiteEngine[better-sqlite3 13.0.3 (WAL Mode)]
        DBSelector -->|Serverless / Lambda| InMemoryEngine[sql.js + In-Memory Seed Store]
        SQLiteEngine --> SQLiteDB[(compliance.db - 28 Tables)]
        RouteHandlers --> VaultFS[Physical File Storage (/public/uploads/)]
    end
```

---

## 2. Layer-by-Layer Tech Stack Breakdown

### A. Frontend & User Interface
| Component | Technology | Version | Purpose / Description |
|---|---|---|---|
| **Core Framework** | Next.js (App Router) | `16.3.5` | Hybrid Server-Side Rendering (SSR), React Server Components (RSC), and Turbopack compiler |
| **UI Library** | React & React DOM | `19.2.8` | Component lifecycle, responsive client hydration, and interactive UI states |
| **Language** | TypeScript | `5.x` | Strict type safety, compile-time validation, and interface modeling |
| **Styling & Theming** | Vanilla CSS Design System | Custom | 1,740+ lines of custom tokens, CSS variables, glassmorphism, responsive grids, and accessible color hierarchy |
| **Typography** | Inter (Google Fonts) | `300-700` | Modern, high-legibility enterprise sans-serif typography |
| **Data Visualization** | Chart.js & react-chartjs-2 | `4.5.1` / `5.3.1` | Real-time SLA doughnut graphs, category compliance breakdowns, and firm health radars |
| **Icons** | Custom Scalable Vector Graphics | SVG | Lightweight, crisp enterprise iconography tailored for compliance workflows |

---

### B. Backend & Business Logic
| Component | Technology | Version | Purpose / Description |
|---|---|---|---|
| **Runtime Environment** | Node.js | `v20.x` / `v24.x` | High-performance asynchronous JavaScript execution environment |
| **API Architecture** | Next.js Route Handlers | `v16.3.5` | RESTful API endpoints (`/api/*`) for statutory tasks, firms, compliances, and audit trails |
| **Password Security** | bcryptjs | `3.0.3` | Salted SHA-512 cryptographic hashing (10 rounds) for user credentials |
| **Session & Tokens** | jsonwebtoken (JWT) | `9.0.3` | Stateless authorization tokens stored in secure HTTP-only cookies with query fallback |
| **Access Control (RBAC)**| Custom Role Engine | Proprietary | Granular permission evaluation across modules (`firms`, `tasks`, `documents`, `audit`, etc.) |
| **Job Scheduling** | node-cron | `4.6.0` | Automated background jobs executing daily SLA calculations and deadline escalations |
| **Email Escalations** | nodemailer | `10.0.9` | Automated email triggers for overdue compliance tasks and statutory deadline warnings |

---

### C. Database & Data Persistence
| Component | Technology | Version | Purpose / Description |
|---|---|---|---|
| **Primary Engine** | better-sqlite3 | `13.0.3` | Synchronous C++ native SQLite driver delivering microsecond query execution |
| **Storage Architecture** | SQLite 3 (WAL Mode) | `3.x` | Write-Ahead Logging (`PRAGMA journal_mode=WAL`) enabling non-blocking concurrent reads & writes |
| **Serverless Engine** | sql.js | `1.14.2` | WebAssembly-based SQLite engine + in-memory store for serverless environments (Netlify / Lambda) |
| **Relational Data Model**| 28 Relational Tables | Schema v1.0 | Normalized schema covering multi-firm entities, statutory tasks, audit logs, and document versioning |
| **Integrity Assurance** | SQLite Foreign Keys | Built-in | `PRAGMA foreign_keys = ON` with cascading references and transaction checkpoints |

#### Core Database Schema Entities
* **Organizations & Entities**: `organizations`, `entity_types`, `departments`, `firms`, `firm_contacts`, `firm_registrations`
* **Compliance Master**: `compliance_categories`, `compliances`, `compliance_rules`, `firm_compliances`
* **Task & SLA Workflow**: `compliance_tasks`, `comments`, `approvals`, `mis_records`, `mis_templates`
* **Security & Auditing**: `users`, `roles`, `permissions`, `role_permissions`, `user_firm_access`, `audit_logs`
* **Notifications & Storage**: `notifications`, `reminder_rules`, `saved_filters`, `documents`, `document_versions`

---

### D. File Storage, Documents & Date Systems
| Component | Technology | Version | Purpose / Description |
|---|---|---|---|
| **PDF Generation** | jsPDF & jsPDF-AutoTable | `4.2.1` | Dynamic generation of statutory compliance certificates, task reports, and executive summaries |
| **Spreadsheet Exports** | SheetJS (xlsx) | `0.18.5` | Exporting Multi-Firm MIS data, master task lists, and audit logs to Excel (.xlsx) |
| **Document Vault** | Next.js FormData + Disk | Built-in | Secure file upload and retrieval system in `/public/uploads/` with UUID mapping and soft-delete |
| **Date & Time Engine** | date-fns & dateUtils | `4.4.0` / Custom | Standardized **Indian Standard Time (IST, Asia/Kolkata)** formatting with UTC parsing resilience |
| **Unique Identifiers** | uuid | `14.0.2` | RFC4122 version 4 UUID generation for all database primary keys and upload filenames |

---

## 3. Tooling & Development Ecosystem

| Tool | Purpose | Configuration |
|---|---|---|
| **Compiler & Bundler** | Next.js Turbopack | Enabled via `next dev --turbopack` for ultra-fast HMR (<250ms) |
| **Linter** | ESLint 9 | `eslint-config-next` configuring React and TypeScript lint rules |
| **Type Checker** | TypeScript Compiler | `tsc --noEmit` validating 100% strict type safety |
| **Process Management** | Node.js Daemon | Background long-running execution for local and server environments |
| **Deployment Engine** | Docker / AWS / Netlify | Multi-stage Docker containerization and Netlify Next.js plugin |

---

## 4. Deployment Environments

### Deployment Option 1: Docker / AWS ECS / EC2 (Recommended for Production)
* **Container Base**: Node.js 20 Alpine Linux.
* **Storage Mounts**: Persistent Docker volume mounted to `/app/data/` for `compliance.db` and `/app/public/uploads/` for documents.
* **Zero Cold Starts**: Always-on container process with instant response times and complete better-sqlite3 performance.

### Deployment Option 2: Serverless (Netlify / AWS Lambda / Vercel)
* **Adapter**: `@netlify/plugin-nextjs`.
* **State Management**: Zero-native-dependency in-memory store initialized via `src/lib/db/seed-data.json`.
* **Stateless Scaling**: Automatically scales to zero during idle periods.

---

## 5. Security & Governance Standards

* **Data Isolation**: Strict multi-entity separation via foreign key filtering on `firm_id` and `organization_id`.
* **Immutable Audit Trail**: Append-only `audit_logs` table capturing every create, update, delete, approval, and permission change.
* **Super Admin Guard**: Hardcoded role immutability for `role_01` preventing accidental privilege loss or role deletion.
* **SQL Injection Prevention**: Parameterized queries across 100% of database interactions via `better-sqlite3` prepared statements.
* **XSS & CSRF Protection**: Strict JSON content types, sanitized file downloads, and scoped HTTP-only cookies.
