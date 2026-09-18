# CompliCal — Local Server Deployment & Operations Manual

**Product**: CompliCal  
**Client**: BALAJI GROUPS  
**Target Environment**: Local Server (On-Premises Bare-Metal / Local Virtual Machine / Local Docker / Intranet)  
**Strict Policy**: Self-contained on local infrastructure; no Netlify or AWS application hosting.

---

## 1. Architecture Overview

CompliCal is engineered to run entirely within BALAJI GROUPS' local intranet network:

```
                      BALAJI GROUPS Local Users
              (Browser: http://localhost:3000 or http://<SERVER_IP>:3000)
                                    │
                                    ▼
       ┌──────────────────────────────────────────────────────────┐
       │                CompliCal Local Server                    │
       │                                                          │
       │  ┌────────────────────────────────────────────────────┐  │
       │  │ Next.js 16 (App Router + Turbopack + SSR)          │  │
       │  │ - Port: 3000 (0.0.0.0 for LAN availability)        │  │
       │  │ - React 19 Client Hydration & Enterprise UI        │  │
       │  └─────────────────────────┬──────────────────────────┘  │
       │                            │                             │
       │  ┌─────────────────────────┴──────────────────────────┐  │
       │  │ RESTful API Layer & Granular RBAC Permission Engine │  │
       │  └───────┬─────────────────────┬───────────────────┬──┘  │
       │          │                     │                   │     │
       │          ▼                     ▼                   ▼     │
       │  ┌───────────────┐     ┌──────────────┐     ┌─────────┐  │
       │  │ SQLite 3 WAL  │     │ Document     │     │ SLA &   │  │
       │  │ (better-      │     │ Vault Storage│     │ Email   │  │
       │  │  sqlite3)     │     │ (Local Disk: │     │ Engine  │  │
       │  │ compliance.db │     │  /uploads/)  │     │ (Cron)  │  │
       │  └───────────────┘     └──────────────┘     └────┬────┘  │
       └──────────────────────────────────────────────────┼───────┘
                                                          │
                                                          ▼
                                            Outbound SMTP Mail Server
                                            (e.g., mail.balajitransports.in
                                             or standard SMTP provider)
```

---

## 2. System Prerequisites

The local host server (Linux Ubuntu/Debian/RHEL, macOS, or Windows Server with WSL2) requires:

1. **Node.js**: Version `v20.x` or `v24.x` LTS.
2. **npm**: Version `10.x` or `11.x`.
3. **C/C++ Build Essentials & Python 3**: Required for native compilation of `better-sqlite3`:
   - Ubuntu/Debian: `sudo apt-get install -y build-essential python3`
   - RedHat/CentOS: `sudo dnf groupinstall -y "Development Tools"`
   - macOS: `xcode-select --install`
   - Alpine Linux (Docker): `apk add --no-cache libc6-compat python3 make g++`

---

## 3. Environment Configuration (`.env`)

Create a `.env` file in the root directory by copying `.env.example`:

```bash
cp .env.example .env
```

Configure the following environment variables:

```ini
# ==============================================================================
# CompliCal — BALAJI GROUPS Local Server Environment Configuration
# ==============================================================================

# Server Network Binding
NODE_ENV=production
PORT=3000
HOSTNAME=0.0.0.0
APP_BASE_URL=http://localhost:3000

# Security & Authentication (MANDATORY: Minimum 32-character random string)
JWT_SECRET=replace-with-a-secure-random-jwt-secret-key-minimum-32-characters
ADMIN_PASSWORD=replace-with-a-secure-admin-password

# Application Settings
NEXT_TELEMETRY_DISABLED=1

# Email Notifications (SMTP configuration for statutory deadline reminders)
SMTP_HOST=mail.yourcompany.com
SMTP_PORT=587
SMTP_USER=alerts@yourcompany.com
SMTP_PASS=your-smtp-password
EMAIL_FROM="CompliCal Alerts <alerts@yourcompany.com>"
SMTP_SECURE=false

# Database Path (defaults to ./data/compliance.db)
DATABASE_PATH=./data/compliance.db
```

---

## 4. Installation & Database Setup

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Database Initialization**:
   - The database file is located at `./data/compliance.db`.
   - SQLite operates with **WAL Mode** (`PRAGMA journal_mode = WAL`) and **Foreign Keys enabled** (`PRAGMA foreign_keys = ON`).
   - On server start, `src/lib/db/index.ts` automatically verifies and applies schema migrations and ensures the default Super Admin account exists.

3. **Super Admin Credentials**:
   - **User**: `Raghu G R`
   - **Email**: `raghu.gr@balajitransports.in`
   - **Role**: `Super Admin`
   - **Initial Password**: Configured via `ADMIN_PASSWORD` in `.env` (or default `admin123`).

---

## 5. Building & Starting the Application

### Production Build & Run (Recommended)

1. **Build the optimized application**:
   ```bash
   npm run build
   ```

2. **Start the local server**:
   ```bash
   npm run start
   ```

   The server binds to `0.0.0.0:3000`. You can access it:
   - Locally: `http://localhost:3000`
   - From any workstation on the BALAJI GROUPS LAN: `http://<SERVER_LAN_IP>:3000`

---

## 6. Process Management & Background Services

### Option A: Running with PM2 (Recommended for 24/7 Uptime)

Install PM2 globally if not present:
```bash
npm install -g pm2
```

Start CompliCal under PM2 supervision:
```bash
pm2 start npm --name "complical" -- run start
pm2 save
pm2 startup
```

To view live server logs:
```bash
pm2 logs complical
```

### Option B: Running via Docker on Local Server

1. **Build Docker Image**:
   ```bash
   docker build -t complical:latest .
   ```

2. **Run Container with Persistent Volumes**:
   ```bash
   docker run -d \
     --name complical-app \
     -p 3000:3000 \
     -v $(pwd)/data:/app/data \
     -v $(pwd)/public/uploads:/app/public/uploads \
     --env-file .env \
     --restart unless-stopped \
     complical:latest
   ```

---

## 7. Background Compliance Scheduler & Worker

CompliCal features an integrated statutory scheduling and notification engine:
- **Overdue Detector**: Runs every hour to transition past-due tasks to `overdue` and alert assignees.
- **Statutory Reminders**: Runs daily at 06:00 AM IST (7, 3, 1, and 0-day SLA reminders).
- **Daily Briefing**: Dispatches summary statistics at 08:00 AM IST.

The scheduler automatically initializes via Next.js instrumentation when the application boots up.

To run the background scheduler as a dedicated separate process:
```bash
npm run worker
```

---

## 8. Document Vault Storage & Backup Strategy

1. **Storage Location**: Uploaded document attachments and statutory filing receipts are stored at `./public/uploads/`.
2. **Permissions**: Ensure the process user has write permissions:
   ```bash
   chmod 755 public/uploads
   chmod 755 data
   ```
3. **Automated Local Backup Script**:
   Create a cron job on the host machine to back up the database and uploads directory daily:
   ```bash
   #!/bin/bash
   BACKUP_DIR="/var/backups/complical/$(date +%Y-%m-%d)"
   mkdir -p "$BACKUP_DIR"
   # Safe SQLite backup using SQLite CLI
   sqlite3 ./data/compliance.db ".backup '$BACKUP_DIR/compliance.db'"
   # Archive documents
   tar -czf "$BACKUP_DIR/uploads.tar.gz" -C ./public uploads
   # Retain backups for 30 days
   find /var/backups/complical -type d -mtime +30 -exec rm -rf {} +
   ```

---

## 9. Verification & Health Check

After starting the server, run the automated verification suite:
```bash
npx tsx scripts/verify-local-server.ts
```

This tests:
- Database schema and foreign key integrity.
- Authentication, session JWTs, and rate limiting.
- RBAC permissions blocking unauthorized operations.
- Dashboard KPI calculation matching actual records.
- Task search and universal search.
- Document upload and validation.
