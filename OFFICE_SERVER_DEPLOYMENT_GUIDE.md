# CompliCal — Office Local Server Deployment Guide
**Client**: BALAJI GROUPS  
**Target Machine**: Dedicated Office Computer (Windows / Linux / macOS)  
**Purpose**: Run CompliCal 24/7 so all staff in the office can access it over the local network (LAN) without internet dependency.

---

## Overview: How It Works
```
                  ┌─────────────────────────────────────────┐
                  │       OFFICE ROUTER / Wi-Fi             │
                  │         (192.168.1.1)                   │
                  └───────┬─────────────────────┬───────────┘
                          │                     │
           (LAN Cable or Wi-Fi)                 │ (Office Wi-Fi)
                          │                     │
        ┌─────────────────▼──────────────┐      │
        │      OFFICE SERVER PC          │      │
        │   IP: 192.168.1.100:3000       │      │
        │  ┌──────────────────────────┐  │      │
        │  │ CompliCal (Next.js)      │  │      │
        │  │ SQLite Database (WAL)    │  │      │
        │  │ Background Worker (PM2)  │  │      │
        │  └──────────────────────────┘  │      │
        └────────────────────────────────┘      │
                                                │
                 ┌──────────────────────────────┴──────────────────────────┐
                 │                                                         │
       ┌─────────▼────────┐                                      ┌─────────▼────────┐
       │   Staff PC #1    │                                      │   Staff PC #2    │
       │ Browser opens:   │                                      │ Browser opens:   │
       │ http://192.168.1.100:3000                               │ http://192.168.1.100:3000
       └──────────────────┘                                      └──────────────────┘
```

---

## Phase 1: Preparing the Files on Your Development Laptop

Before going to the office server computer, prepare the project:

### Option A: Transfer via USB Pen Drive (Simplest if server has no Git)
1. On your laptop, open the project directory:
   `/Users/dhyan/Documents/GitHub/Multi-Firm-Compliance-Operating-Platform`
2. Copy the entire project folder to a USB drive, **EXCEPT** the `.next` and `node_modules` folders (to keep it small and avoid architecture conflicts).
3. Ensure the `data/compliance.db` file is included in your copy!

### Option B: Push to Git and Pull on Server
If you use GitHub / GitLab:
```bash
git push origin main
```
(On the office computer, you will simply do `git clone <repo_url>`).

---

## Phase 2: Setup on the Office Computer

### Step 1: Install Node.js (LTS Version)
The office computer must have **Node.js (version 20 or 22 LTS)**:

- **If Windows**:
  1. Download the Windows Installer (`.msi`) from: **https://nodejs.org/** (select LTS).
  2. Run the installer and check the box that says "Automatically install the necessary tools".
  3. Open **Command Prompt** (`cmd`) and verify:
     ```cmd
     node -v
     npm -v
     ```
- **If Ubuntu / Linux**:
  ```bash
  curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
  sudo apt-get install -y nodejs build-essential
  ```
- **If macOS**:
  Download the macOS installer from **https://nodejs.org/** or use `brew install node`.

---

### Step 2: Place the Project Files
Create a permanent folder on the office computer (e.g., `C:\CompliCal` on Windows or `/opt/complical` on Linux).
Paste the files there or run:
```bash
git clone <your-repo-url> CompliCal
cd CompliCal
```

---

### Step 3: Install Dependencies
Open Terminal / Command Prompt in the `CompliCal` folder and run:
```bash
npm install
```
*(This will compile the native SQLite engine for the office computer's specific operating system).*

---

### Step 4: Configure the `.env` File
Create a `.env` file in the project root by copying `.env.example`:

**On Windows (Command Prompt):**
```cmd
copy .env.example .env
```
**On Linux / Mac:**
```bash
cp .env.example .env
```

Open `.env` in Notepad / text editor and configure:
```env
# Server Network Settings
NODE_ENV=production
PORT=3000
HOSTNAME=0.0.0.0
APP_BASE_URL=http://<OFFICE_SERVER_IP>:3000

# Security (Change these to your own secure secrets!)
JWT_SECRET=complical-balaji-groups-production-jwt-key-2026-secure
ADMIN_PASSWORD=BalajiAdmin@2026!

# Telemetry
NEXT_TELEMETRY_DISABLED=1

# Database Location
DATABASE_PATH=./data/compliance.db

# Office Email Notifications (Optional - SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=alerts@balajitransports.in
SMTP_PASS=your-app-password
EMAIL_FROM="CompliCal Alerts <alerts@balajitransports.in>"
SMTP_SECURE=false
```
> [!IMPORTANT]
> Keep `HOSTNAME=0.0.0.0`. This is what allows other computers on the office Wi-Fi/LAN to access CompliCal.

---

### Step 5: Build the Production Bundle
Run:
```bash
npm run build
```
Wait until it says: `✓ Compiled successfully`.

---

### Step 6: Verify Database & System Health
Run the built-in 19-point verification suite:
```bash
npx tsx scripts/verify-local-server.ts
```
Expected output:
```
================================================================
  VERIFICATION RESULTS: 19 PASSED, 0 FAILED
================================================================
```

---

## Phase 3: Making CompliCal Accessible to All Office Staff

### Step 1: Find the Office Computer's Local IP Address
1. **On Windows**: Open Command Prompt, type `ipconfig` and press Enter. Look for `IPv4 Address` under your active Wi-Fi or Ethernet connection (e.g. `192.168.1.100` or `192.168.29.194`).
2. **On Linux / Mac**: Run `ifconfig` or `ip a` (e.g. `192.168.1.100`).

> [!TIP]
> **Assign a Static IP in the Router**:
> To ensure the IP address never changes when the router restarts:
> 1. Log in to the office Wi-Fi router (usually `192.168.1.1`).
> 2. Go to **DHCP Reservation** / **Static Lease**.
> 3. Bind the office computer's MAC address to a fixed IP (e.g., `192.168.1.100`).

---

### Step 2: Open Port 3000 in the Firewall

Other computers cannot connect if the office computer's firewall blocks port 3000.

#### On Windows:
1. Open **PowerShell as Administrator**.
2. Run this command to open port 3000:
   ```powershell
   New-NetFirewallRule -DisplayName "CompliCal Web Server" -Direction Inbound -LocalPort 3000 -Protocol TCP -Action Allow
   ```

#### On Linux (Ubuntu / Debian):
```bash
sudo ufw allow 3000/tcp
sudo ufw status
```

#### On macOS:
System Settings > Network > Firewall > Options > Ensure incoming connections for Node.js are allowed.

---

## Phase 4: Configure 24/7 Autostart (Survive Reboots & Logouts)

You want CompliCal to stay running even if someone logs out or restarts the computer. We use **PM2** (Production Process Manager):

### 1. Install PM2 Globally
```bash
npm install -g pm2
```

### 2. Start CompliCal with PM2
Inside the `CompliCal` folder:
```bash
# Start the web app
pm2 start npm --name "complical-web" -- start

# Start the background notification & reminder engine
pm2 start npm --name "complical-worker" -- run worker
```

### 3. Save the Process List
```bash
pm2 save
```

### 4. Enable Autostart on Computer Boot
- **On Linux / Mac**:
  ```bash
  pm2 startup
  ```
  *(Copy and run the command that PM2 outputs).*
  
- **On Windows**:
  Install the Windows PM2 service helper:
  ```cmd
  npm install -g pm2-windows-startup
  pm2-startup install
  pm2 save
  ```

Now, whenever the office computer is powered on, CompliCal starts automatically in the background!

---

## Phase 5: Testing from Another Office Computer

1. Go to any other laptop or desktop in the office connected to the same Wi-Fi / LAN.
2. Open Google Chrome, Firefox, or Edge.
3. In the address bar, type:
   ```
   http://192.168.1.100:3000
   ```
   *(Replace `192.168.1.100` with the actual office server IP).*
4. You should see the **CompliCal** login screen with **BALAJI GROUPS** branding!
5. Log in using the Admin credentials:
   - **Email**: `raghu.gr@balajitransports.in`
   - **Password**: *(The password you configured in `.env`)*

---

## Phase 6: Automated Daily Database Backup

All compliance tasks, firms, and uploaded documents reside in `data/compliance.db` and `public/uploads`.
Set up an automated daily backup:

### On Windows (Create a daily batch script `backup.bat`):
```cmd
@echo off
set BACKUP_DIR=D:\CompliCal_Backups
set TIMESTAMP=%date:~-4,4%%date:~-7,2%%date:~-10,2%_%time:~0,2%%time:~3,2%
if not exist "%BACKUP_DIR%" mkdir "%BACKUP_DIR%"

copy "C:\CompliCal\data\compliance.db" "%BACKUP_DIR%\compliance_%TIMESTAMP%.db"
echo Backup completed to %BACKUP_DIR%
```
Schedule this script in **Windows Task Scheduler** to run every night at 11:00 PM.

### On Linux (Crontab):
```bash
crontab -e
```
Add:
```bash
0 23 * * * cp /opt/complical/data/compliance.db /backups/compliance_$(date +\%F).db
```

---

## Troubleshooting Checklist

| Issue | Cause | Fix |
| :--- | :--- | :--- |
| Other computers see "Site cannot be reached" | Firewall blocking port 3000 | Run the Windows Firewall rule in Phase 3, Step 2. |
| Other computers see "Site cannot be reached" | Server IP changed after router reboot | Assign a Static IP in the router (Phase 3, Step 1). |
| Other computers see "Site cannot be reached" | Staff PC is connected to Guest Wi-Fi | Ensure all computers are on the main office Wi-Fi, not an isolated Guest network. |
| Server stopped working after user logged off | App was started in a normal terminal window | Use PM2 with `pm2-startup` so it runs as a background service (Phase 4). |
| Port 3000 is already in use | Another service is using port 3000 | Change `PORT=3005` in `.env` and restart PM2. |
