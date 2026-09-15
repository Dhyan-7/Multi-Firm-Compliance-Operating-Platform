import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import getDb from '@/lib/db';

const JWT_SECRET = process.env.JWT_SECRET || 'compliance-platform-secret-key-2026';
const JWT_EXPIRY = '24h';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role_id: string;
  role_name: string;
  department_id: string;
  organization_id: string;
}

// In-Memory Rate Limiting for Login Attempts
interface AttemptRecord {
  count: number;
  lockedUntil: number;
  firstAttempt: number;
}
const loginAttempts = new Map<string, AttemptRecord>();
const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes window

export function checkRateLimit(key: string): { allowed: boolean; remainingAttempts: number; retryAfterSeconds: number } {
  const now = Date.now();
  const record = loginAttempts.get(key);

  if (!record) {
    return { allowed: true, remainingAttempts: MAX_ATTEMPTS, retryAfterSeconds: 0 };
  }

  // Check if currently locked out
  if (record.lockedUntil > now) {
    const retryAfterSeconds = Math.ceil((record.lockedUntil - now) / 1000);
    return { allowed: false, remainingAttempts: 0, retryAfterSeconds };
  }

  // Window expired, reset
  if (now - record.firstAttempt > WINDOW_MS) {
    loginAttempts.delete(key);
    return { allowed: true, remainingAttempts: MAX_ATTEMPTS, retryAfterSeconds: 0 };
  }

  const remainingAttempts = Math.max(0, MAX_ATTEMPTS - record.count);
  return { allowed: remainingAttempts > 0, remainingAttempts, retryAfterSeconds: 0 };
}

export function recordFailedLogin(key: string): { locked: boolean; retryAfterSeconds: number } {
  const now = Date.now();
  const record = loginAttempts.get(key);

  if (!record || (now - record.firstAttempt > WINDOW_MS && record.lockedUntil <= now)) {
    loginAttempts.set(key, { count: 1, lockedUntil: 0, firstAttempt: now });
    return { locked: false, retryAfterSeconds: 0 };
  }

  record.count += 1;
  if (record.count >= MAX_ATTEMPTS) {
    record.lockedUntil = now + LOCKOUT_DURATION_MS;
    const retryAfterSeconds = Math.ceil(LOCKOUT_DURATION_MS / 1000);
    return { locked: true, retryAfterSeconds };
  }

  return { locked: false, retryAfterSeconds: 0 };
}

export function clearRateLimit(key: string): void {
  loginAttempts.delete(key);
}

export function validatePasswordPolicy(password: string): { valid: boolean; message?: string } {
  if (!password || password.length < 8) {
    return { valid: false, message: 'Password must be at least 8 characters long.' };
  }
  if (!/[a-zA-Z]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one letter.' };
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one numeric digit.' };
  }
  return { valid: true };
}

export function hashPassword(password: string): string {
  return bcrypt.hashSync(password, 10);
}

export function verifyPassword(password: string, hash: string): boolean {
  return bcrypt.compareSync(password, hash);
}

export function generateToken(user: AuthUser): string {
  return jwt.sign(user, JWT_SECRET, { expiresIn: JWT_EXPIRY });
}

export function verifyToken(token: string): AuthUser | null {
  try {
    return jwt.verify(token, JWT_SECRET) as AuthUser;
  } catch {
    return null;
  }
}

export function getUserFromRequest(request: Request): AuthUser | null {
  let token: string | null = null;
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  } else {
    // Try cookie
    const cookieHeader = request.headers.get('cookie');
    if (cookieHeader) {
      const tokenMatch = cookieHeader.match(/auth_token=([^;]+)/);
      if (tokenMatch) {
        token = tokenMatch[1];
      }
    }
  }

  // Fallback for direct browser downloads / exports
  if (!token) {
    try {
      const url = new URL(request.url);
      const queryToken = url.searchParams.get('token');
      if (queryToken) token = queryToken;
    } catch {}
  }

  if (!token) return null;
  const decoded = verifyToken(token);
  if (!decoded || !decoded.id) return null;

  // Active account check: verify user still exists and is active in DB
  try {
    const db = getDb();
    const user = db.prepare("SELECT id, status FROM users WHERE id = ?").get(decoded.id) as { id: string; status: string } | undefined;
    if (!user || user.status !== 'active') {
      return null;
    }
  } catch {
    // If DB check fails, fallback to decoded
  }

  return decoded;
}

export function checkPermission(db: import('better-sqlite3').Database, userId: string, module: string, action: string): boolean {
  const result = db.prepare(`
    SELECT COUNT(*) as count FROM role_permissions rp
    JOIN permissions p ON rp.permission_id = p.id
    JOIN users u ON u.role_id = rp.role_id
    WHERE u.id = ? AND p.module = ? AND p.action = ?
  `).get(userId, module, action) as { count: number };
  return result.count > 0;
}

export function isSuperAdmin(user: AuthUser | null): boolean {
  if (!user) return false;
  return user.role_id === 'role_01' || user.id === 'user_01';
}

export function isAdminOrSuperAdmin(user: AuthUser | null): boolean {
  if (!user) return false;
  return user.role_id === 'role_01' || user.role_id === 'role_02' || user.id === 'user_01';
}

export function checkFirmAccess(db: import('better-sqlite3').Database, userId: string, firmId: string): boolean {
  const user = db.prepare("SELECT role_id FROM users WHERE id = ?").get(userId) as { role_id: string } | undefined;
  if (!user) return false;
  // Super Admin and Admin can access all firms
  if (user.role_id === 'role_01' || user.role_id === 'role_02') return true;
  const access = db.prepare("SELECT COUNT(*) as count FROM user_firm_access WHERE user_id = ? AND firm_id = ?").get(userId, firmId) as { count: number };
  return access.count > 0;
}


