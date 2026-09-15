# AWS Deployment Guide — ComplianceOS

This guide outlines the production deployment of the Multi-Firm Compliance Operating Platform to Amazon Web Services (AWS).

---

## 1. Architecture Overview

```
                        ┌────────────────────────┐
                        │    AWS Route 53        │
                        │    (Custom Domain)     │
                        └───────────┬────────────┘
                                    │
                        ┌───────────▼────────────┐
                        │ AWS Application        │
                        │ Load Balancer (ALB)    │
                        │ (HTTPS SSL Termination)│
                        └───────────┬────────────┘
                                    │
                ┌───────────────────┴───────────────────┐
                │                                       │
     ┌──────────▼──────────┐                 ┌──────────▼──────────┐
     │  AWS ECS (Fargate)  │                 │  AWS App Runner     │
     │  Container Task     │       OR        │  Fully Managed      │
     │  (Port 3000)        │                 │  Container Service  │
     └──────────┬──────────┘                 └──────────┬──────────┘
                │                                       │
                └───────────────────┬───────────────────┘
                                    │
                        ┌───────────▼────────────┐
                        │   Amazon EFS Volume    │
                        │   Persistent Storage   │
                        │  /app/data             │
                        │  /app/public/uploads   │
                        └────────────────────────┘
```

---

## 2. Recommended Deployment: AWS App Runner or AWS ECS (Fargate)

### Step A: Build & Push Docker Image to Amazon ECR

1. **Create an ECR Repository**:
   ```bash
   aws ecr create-repository --repository-name compliance-os --region ap-south-1
   ```

2. **Authenticate Docker with ECR**:
   ```bash
   aws ecr get-login-password --region ap-south-1 | docker login --username AWS --password-stdin <YOUR_ACCOUNT_ID>.dkr.ecr.ap-south-1.amazonaws.com
   ```

3. **Build the Container Image**:
   ```bash
   docker build -t compliance-os:latest .
   ```

4. **Tag and Push**:
   ```bash
   docker tag compliance-os:latest <YOUR_ACCOUNT_ID>.dkr.ecr.ap-south-1.amazonaws.com/compliance-os:latest
   docker push <YOUR_ACCOUNT_ID>.dkr.ecr.ap-south-1.amazonaws.com/compliance-os:latest
   ```

---

### Step B: Configure Persistent Storage (Amazon EFS)

Because SQLite and uploaded documents require durable persistence across container restarts:

1. **Create an EFS File System** in the same VPC as your ECS cluster.
2. **Create Mount Targets** in each VPC availability zone.
3. In your ECS Task Definition, add an EFS Volume:
   - Volume Name: `compliance-storage`
   - Filesystem ID: `fs-xxxxxxxx`
   - Root Directory: `/`
4. In the Container Definition, configure Mount Points:
   - Container Path: `/app/data` -> Mounts to EFS `/data`
   - Container Path: `/app/public/uploads` -> Mounts to EFS `/uploads`

---

### Step C: Configure Environment Variables

Set the following in AWS ECS / App Runner configuration:

| Variable | Recommended Production Setting | Description |
|---|---|---|
| `NODE_ENV` | `production` | Enables production optimizations in Next.js |
| `PORT` | `3000` | Container HTTP port |
| `HOSTNAME` | `0.0.0.0` | Binds to all network interfaces |
| `JWT_SECRET` | *(64-char random string via AWS Secrets Manager)* | Secret for signing user session tokens |
| `ADMIN_PASSWORD` | *(Secure password via AWS Secrets Manager)* | Password for primary Super Admin account |
| `NEXT_TELEMETRY_DISABLED` | `1` | Disables telemetry data |
| `SMTP_HOST` | `email-smtp.<region>.amazonaws.com` | Amazon SES SMTP Endpoint (for statutory notifications) |
| `SMTP_PORT` | `587` | SES TLS Port |
| `SMTP_USER` | *(Amazon SES SMTP Username)* | SES SMTP credentials |
| `SMTP_PASS` | *(Amazon SES SMTP Password)* | SES SMTP credentials |

---

## 3. Health Checks & Monitoring

- **Health Check Endpoint**: `/login` (Returns HTTP 200 OK)
- **Container Port**: `3000`
- **CPU / Memory Allocation**: Minimum 1 vCPU, 2 GB RAM (Recommended 2 vCPU, 4 GB RAM)
- **Grace Period**: 30 seconds for Next.js startup
