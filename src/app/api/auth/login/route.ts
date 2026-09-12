import { NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { verifyPassword, generateToken, AuthUser, checkRateLimit, recordFailedLogin, clearRateLimit } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
                     request.headers.get('x-real-ip') ||
                     '127.0.0.1';

    const { email, password } = await request.json();
    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const rateLimitKey = `${clientIp}:${normalizedEmail}`;

    // 1. Check Rate Limit
    const rateCheck = checkRateLimit(rateLimitKey);
    if (!rateCheck.allowed) {
      const minutesLeft = Math.ceil(rateCheck.retryAfterSeconds / 60);
      return NextResponse.json(
        {
          error: `Too many failed login attempts. Account temporarily locked for security. Please try again in ${minutesLeft} minute(s).`,
          retryAfter: rateCheck.retryAfterSeconds,
        },
        {
          status: 429,
          headers: { 'Retry-After': String(rateCheck.retryAfterSeconds) },
        }
      );
    }

    const db = getDb();
    const user = db.prepare(`
      SELECT u.*, r.name as role_name, d.name as department_name
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.id
      LEFT JOIN departments d ON u.department_id = d.id
      WHERE LOWER(u.email) = ? AND u.status = 'active'
    `).get(normalizedEmail) as any;

    // 2. Validate Credentials
    if (!user || !verifyPassword(password, user.password_hash)) {
      const failStatus = recordFailedLogin(rateLimitKey);

      // Audit Log failed login attempt
      try {
        const orgId = user?.organization_id || 'org_001';
        db.prepare(`
          INSERT INTO audit_logs (organization_id, user_id, user_name, action, entity_type, entity_id, entity_name, new_data)
          VALUES (?, ?, ?, 'AUTH_LOGIN_FAILED', 'auth', ?, ?, ?)
        `).run(
          orgId,
          user?.id || 'anonymous',
          user?.name || normalizedEmail,
          user?.id || 'unknown',
          normalizedEmail,
          JSON.stringify({ ip: clientIp, email: normalizedEmail, reason: 'Invalid credentials', timestamp: new Date().toISOString() })
        );
      } catch (auditErr) {
        console.error('Failed to log auth failure audit:', auditErr);
      }

      if (failStatus.locked) {
        const minutesLeft = Math.ceil(failStatus.retryAfterSeconds / 60);
        return NextResponse.json(
          {
            error: `Maximum login attempts exceeded. Account temporarily locked for security. Please try again in ${minutesLeft} minute(s).`,
            retryAfter: failStatus.retryAfterSeconds,
          },
          { status: 429, headers: { 'Retry-After': String(failStatus.retryAfterSeconds) } }
        );
      }

      const attemptsRemaining = checkRateLimit(rateLimitKey).remainingAttempts;
      return NextResponse.json(
        {
          error: `Invalid email or password. (${attemptsRemaining} attempt${attemptsRemaining === 1 ? '' : 's'} remaining before temporary lockout)`,
        },
        { status: 401 }
      );
    }

    // 3. Successful Login - Clear Rate Limit Record
    clearRateLimit(rateLimitKey);

    db.prepare("UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?").run(user.id);
    db.prepare(`
      INSERT INTO audit_logs (organization_id, user_id, user_name, action, entity_type, entity_id, entity_name, new_data)
      VALUES (?, ?, ?, 'USER_LOGIN', 'user', ?, ?, ?)
    `).run(
      user.organization_id,
      user.id,
      user.name,
      user.id,
      user.name,
      JSON.stringify({ ip: clientIp, email: user.email, role: user.role_name, timestamp: new Date().toISOString() })
    );

    const authUser: AuthUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      role_id: user.role_id,
      role_name: user.role_name,
      department_id: user.department_id,
      organization_id: user.organization_id,
    };

    const token = generateToken(authUser);
    const response = NextResponse.json({ user: authUser, token });

    const isHttps = request.url.startsWith('https:') || request.headers.get('x-forwarded-proto') === 'https';
    response.cookies.set('auth_token', token, {
      httpOnly: true,
      secure: isHttps,
      sameSite: 'lax',
      maxAge: 86400,
      path: '/',
    });

    return response;
  } catch (error: any) {
    console.error('CRITICAL Login API error:', error?.message || error, error?.stack);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error?.message || 'Unexpected server error during authentication'
      }, 
      { status: 500 }
    );
  }
}
