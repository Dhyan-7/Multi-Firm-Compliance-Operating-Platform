'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLocked, setIsLocked] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    localStorage.removeItem('compliance_token');
    document.cookie = 'auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; max-age=0';
  }, []);

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError('');
    setIsLocked(false);
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      const data = await res.json().catch(() => ({}));
      if (res.ok && data.token) {
        localStorage.setItem('compliance_token', data.token);
        router.push('/dashboard');
      } else {
        if (res.status === 429) {
          setIsLocked(true);
        }
        setError(data.error || data.message || `Authentication failed (HTTP ${res.status}). Please verify your credentials.`);
      }
    } catch {
      setError('An error occurred during login. Please check connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 50%, #0F172A 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        position: 'relative',
      }}
    >
      {/* Top Left Return to Front Page Home Button */}
      <Link
        href="/"
        style={{
          position: 'fixed',
          top: 20,
          left: 20,
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          fontSize: 13,
          fontWeight: 600,
          color: '#E2E8F0',
          textDecoration: 'none',
          padding: '8px 16px',
          borderRadius: 8,
          background: 'rgba(255, 255, 255, 0.08)',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          zIndex: 50,
          transition: 'background 0.2s',
        }}
      >
        <span>←</span>
        <span>🏠 Home</span>
      </Link>

      <div
        style={{
          width: '100%',
          maxWidth: 480,
          background: '#FFFFFF',
          borderRadius: 16,
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
          padding: '36px 36px 40px',
        }}
      >
        {/* Card Header Nav with Home Button */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <Link
            href="/"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 12,
              fontWeight: 600,
              color: '#2563EB',
              textDecoration: 'none',
              padding: '6px 12px',
              borderRadius: 6,
              background: '#EFF6FF',
              border: '1px solid #BFDBFE',
            }}
          >
            <span>🏠</span> Back to Home
          </Link>
          <span style={{ fontSize: 11, color: '#94A3B8', fontWeight: 600, letterSpacing: '0.05em' }}>
            SECURE PORTAL
          </span>
        </div>

        {/* Logo & Header */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: 12,
              background: 'linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)',
              color: '#FFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 24,
              fontWeight: 800,
              margin: '0 auto 16px',
              boxShadow: '0 4px 12px rgba(59, 130, 246, 0.4)',
            }}
          >
            C
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#0F172A', margin: 0 }}>
            CompliCal
          </h1>
          <p style={{ fontSize: 13, color: '#2563EB', fontWeight: 600, marginTop: 4, margin: '4px 0 0' }}>
            BALAJI GROUPS
          </p>
          <p style={{ fontSize: 12, color: '#64748B', margin: '4px 0 0' }}>
            Multi-Firm Statutory Compliance Operating Platform
          </p>
        </div>

        {error && (
          <div
            style={{
              background: isLocked ? '#FEF2F2' : '#FFF1F2',
              color: isLocked ? '#991B1B' : '#E11D48',
              padding: '12px 16px',
              borderRadius: 8,
              fontSize: 13,
              marginBottom: 20,
              border: isLocked ? '1px solid #FCA5A5' : '1px solid #FFE4E6',
              display: 'flex',
              alignItems: 'flex-start',
              gap: 10,
            }}
          >
            <span style={{ fontSize: 16 }}>{isLocked ? '🔒' : '⚠️'}</span>
            <div style={{ flex: 1, lineHeight: 1.4 }}>{error}</div>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: 18 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
              Work Email Address
            </label>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@company.com"
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: 8,
                border: '1px solid #CBD5E1',
                fontSize: 14,
                color: '#0F172A',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: '#334155' }}>
                Password
              </label>
            </div>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter account password"
                style={{
                  width: '100%',
                  padding: '10px 42px 10px 14px',
                  borderRadius: 8,
                  border: '1px solid #CBD5E1',
                  fontSize: 14,
                  color: '#0F172A',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: 12,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: 14,
                  color: '#64748B',
                  padding: 4,
                }}
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? '👁️' : '👁️‍🗨️'}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || isLocked}
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: 8,
              background: isLocked ? '#94A3B8' : '#3B82F6',
              color: '#FFFFFF',
              fontWeight: 600,
              fontSize: 15,
              border: 'none',
              cursor: loading || isLocked ? 'not-allowed' : 'pointer',
              boxShadow: '0 4px 6px -1px rgba(59, 130, 246, 0.4)',
              transition: 'background 0.15s',
            }}
          >
            {loading ? 'Authenticating...' : isLocked ? 'Account Temporarily Locked' : 'Sign In to Workspace'}
          </button>
        </form>

        {/* Footer info & Copyright */}
        <div style={{ marginTop: 32, paddingTop: 20, borderTop: '1px solid #F1F5F9', textAlign: 'center' }}>
          <div style={{ fontSize: 12, color: '#64748B', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <span>🔒</span>
            <span>Enterprise Multi-Factor & Brute-Force Protected</span>
          </div>
          <div style={{ marginTop: 14, fontSize: 11, color: '#94A3B8' }}>
            BALAJI GROUPS — CompliCal • All Rights Reserved © 2026
          </div>
        </div>
      </div>
    </div>
  );
}
