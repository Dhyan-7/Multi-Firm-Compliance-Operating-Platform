# CompliCal — Multi-Firm Compliance Operating Platform

**Client**: BALAJI GROUPS  
**Product**: CompliCal  
**Architecture**: Local Server / On-Premises Intranet Deployment  

---

## Overview

CompliCal is an enterprise-grade statutory compliance operating platform built specifically for **BALAJI GROUPS**. It centralizes regulatory obligations (GST, Income Tax, ROC/MCA, PF, ESI, Professional Tax, Secretarial) across multiple operating entities, provides four-eye review workflows, automated SLA tracking, an immutable Document Vault, and audit logging.

CompliCal is engineered for **Local Server Deployment** without cloud vendor dependencies (Netlify, AWS, etc.).

---

## Core Modules & Capabilities

1. **Multi-Firm Management**: Entity registration (Private Limited, LLP, Proprietorship, etc.), GSTIN, PAN, TAN, and state-wise jurisdiction mapping.
2. **Master Statutory Compliance Library**: 50+ pre-configured statutory obligations with customizable frequency, filing day, grace periods, and regulatory references.
3. **Automated Compliance Calendar**: Real-time month and year views with color-coded status bubbles, SLA overdue alerts, and formal rescheduling with mandatory reason capture.
4. **Task Execution Workspace**: Mandatory statutory MIS filing fields (ARN, Challan number, Filing date, Tax amounts), discussions, screenshot/photo attachment uploads, and four-eye review approvals.
5. **Document Vault**: Encrypted on-server storage in `public/uploads` with MIME-type validation, size limits (up to 25MB), access controls, and inline preview.
6. **Notification Engine**: In-app real-time alerts and background SMTP notifications for task assignment, due-date warnings (7/3/1/0 days), overdue escalations, and daily briefings.
7. **Security & Granular RBAC**: Role-based access control separating Super Admin, Admin, and Staff, with complete cryptographic audit trails.

---

## Quick Start (Local Server)

### 1. Prerequisites
- **Node.js**: `v20.x` or `v24.x` LTS
- **npm**: `10.x` or `11.x`
- **C/C++ Build Tools**: `build-essential` (Linux) / `xcode-select` (macOS)

### 2. Setup Environment
```bash
cp .env.example .env
```

### 3. Install & Build
```bash
npm install
npm run build
```

### 4. Start Local Server
```bash
npm run start
```
Open your browser to [http://localhost:3000](http://localhost:3000) or `http://<SERVER_LAN_IP>:3000`.

### 5. Default Super Admin Credentials
- **Email**: `raghu.gr@balajitransports.in`
- **Password**: Configured in `.env` (`ADMIN_PASSWORD`, default `admin123`)

---

## Detailed Local Deployment Guide

For PM2 process management, local Docker containerization, backup automation, and system service configuration, see:
👉 [LOCAL_DEPLOYMENT.md](./LOCAL_DEPLOYMENT.md)
