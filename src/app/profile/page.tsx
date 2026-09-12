'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/components/layout/AppLayout';

export default function ProfileSettingsPage() {
  const { token, user: authUser } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [activity, setActivity] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Profile Edit State
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [designation, setDesignation] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileNotice, setProfileNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Security / Password State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordNotice, setPasswordNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchProfile = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch('/api/profile', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setProfile(data.profile);
        setActivity(data.activity || []);
        setName(data.profile.name || '');
        setPhone(data.profile.phone || '');
        setDesignation(data.profile.designation || '');
      }
    } catch (err) {
      console.error('Fetch profile error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [token]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setSavingProfile(true);
    setProfileNotice(null);

    if (!name.trim() || name.trim().length < 2) {
      setProfileNotice({ type: 'error', text: 'Full Name is mandatory (minimum 2 characters)' });
      setSavingProfile(false);
      return;
    }

    try {
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim(),
          designation: designation.trim(),
        }),
      });

      const resData = await res.json();
      if (res.ok) {
        setProfileNotice({ type: 'success', text: 'Personal details updated successfully!' });
        fetchProfile();
      } else {
        setProfileNotice({ type: 'error', text: resData.error || 'Failed to update profile' });
      }
    } catch (err: any) {
      setProfileNotice({ type: 'error', text: err?.message || 'Error updating profile' });
    } finally {
      setSavingProfile(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setPasswordNotice(null);

    if (!currentPassword) {
      setPasswordNotice({ type: 'error', text: 'Please enter your current password' });
      return;
    }

    if (!newPassword || newPassword.length < 6) {
      setPasswordNotice({ type: 'error', text: 'New password must be at least 6 characters long' });
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordNotice({ type: 'error', text: 'New password and confirmation do not match' });
      return;
    }

    setSavingPassword(true);
    try {
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword,
        }),
      });

      const resData = await res.json();
      if (res.ok) {
        setPasswordNotice({ type: 'success', text: 'Password successfully changed! Use your new password on next login.' });
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setPasswordNotice({ type: 'error', text: resData.error || 'Failed to update password' });
      }
    } catch (err: any) {
      setPasswordNotice({ type: 'error', text: err?.message || 'Error changing password' });
    } finally {
      setSavingPassword(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', height: '60vh', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 36, height: 36, border: '3px solid #E2E8F0', borderTopColor: '#3B82F6', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1020, margin: '0 auto' }}>
      {/* Top Banner */}
      <div
        style={{
          background: '#FFFFFF',
          borderRadius: 14,
          border: '1px solid #E2E8F0',
          padding: '24px 28px',
          marginBottom: 24,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 16,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          <div
            style={{
              width: 60,
              height: 60,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 24,
              fontWeight: 800,
              boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)',
            }}
          >
            {profile?.name ? profile.name.charAt(0).toUpperCase() : 'D'}
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <h2 style={{ fontSize: 22, fontWeight: 700, color: '#0F172A', margin: 0 }}>
                {profile?.name}
              </h2>
              <span
                style={{
                  padding: '3px 10px',
                  borderRadius: 12,
                  background: '#EFF6FF',
                  color: '#2563EB',
                  fontSize: 12,
                  fontWeight: 700,
                  border: '1px solid #BFDBFE',
                }}
              >
                {profile?.role_name || 'Super Admin'}
              </span>
            </div>
            <div style={{ fontSize: 13, color: '#64748B', marginTop: 4 }}>
              {profile?.email} • {profile?.department_name || 'Management'} • {profile?.organization_name || 'Enterprise Group'}
            </div>
          </div>
        </div>

        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 11, color: '#64748B', fontWeight: 600, textTransform: 'uppercase' }}>Account Security</div>
          <div style={{ fontSize: 13, color: '#10B981', fontWeight: 700, marginTop: 4, display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'flex-end' }}>
            <span>🔒</span> Active & Verified
          </div>
        </div>
      </div>

      {/* Grid: Personal Details & Password */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 24, marginBottom: 24 }}>
        {/* Card 1: Personal Details */}
        <div style={{ background: '#FFFFFF', borderRadius: 12, border: '1px solid #E2E8F0', padding: 24 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0F172A', margin: '0 0 6px' }}>
            👤 Personal & Profile Information
          </h3>
          <p style={{ fontSize: 13, color: '#64748B', margin: '0 0 20px' }}>
            Update your identity and contact details across the compliance system.
          </p>

          {profileNotice && (
            <div
              style={{
                padding: '10px 14px',
                borderRadius: 8,
                marginBottom: 18,
                fontSize: 13,
                background: profileNotice.type === 'success' ? '#ECFDF5' : '#FEF2F2',
                color: profileNotice.type === 'success' ? '#065F46' : '#991B1B',
                border: profileNotice.type === 'success' ? '1px solid #A7F3D0' : '1px solid #FECACA',
              }}
            >
              {profileNotice.type === 'success' ? '✓ ' : '⚠️ '}
              {profileNotice.text}
            </div>
          )}

          <form onSubmit={handleUpdateProfile}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Dhyan"
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #CBD5E1', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                  Official Email (Login Identifier)
                </label>
                <input
                  type="email"
                  disabled
                  value={profile?.email || ''}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #E2E8F0', background: '#F8FAFC', color: '#64748B', boxSizing: 'border-box', cursor: 'not-allowed' }}
                />
                <span style={{ fontSize: 11, color: '#94A3B8', marginTop: 4, display: 'block' }}>
                  Managed by system security. Primary credential for authentication.
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                    Designation
                  </label>
                  <input
                    type="text"
                    value={designation}
                    onChange={(e) => setDesignation(e.target.value)}
                    placeholder="e.g. Super Admin"
                    style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #CBD5E1', boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                    Contact Phone
                  </label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #CBD5E1', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                  Role & Capabilities
                </label>
                <div style={{ padding: '10px 14px', borderRadius: 8, background: '#F8FAFC', border: '1px solid #E2E8F0', fontSize: 13, color: '#334155', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>{profile?.role_name} (Unrestricted Root Access)</span>
                  <a href="/users/roles" style={{ fontSize: 12, color: '#2563EB', fontWeight: 600, textDecoration: 'none' }}>View Permissions →</a>
                </div>
              </div>
            </div>

            <div style={{ marginTop: 24, display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="submit"
                disabled={savingProfile}
                style={{
                  background: '#2563EB',
                  color: '#FFFFFF',
                  padding: '10px 22px',
                  borderRadius: 8,
                  border: 'none',
                  fontWeight: 600,
                  fontSize: 13,
                  cursor: 'pointer',
                }}
              >
                {savingProfile ? 'Saving Changes...' : 'Save Profile Changes'}
              </button>
            </div>
          </form>
        </div>

        {/* Card 2: Security & Password */}
        <div style={{ background: '#FFFFFF', borderRadius: 12, border: '1px solid #E2E8F0', padding: 24 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0F172A', margin: '0 0 6px' }}>
            🔐 Security & Password Management
          </h3>
          <p style={{ fontSize: 13, color: '#64748B', margin: '0 0 20px' }}>
            Update your authentication password to maintain system security.
          </p>

          {passwordNotice && (
            <div
              style={{
                padding: '10px 14px',
                borderRadius: 8,
                marginBottom: 18,
                fontSize: 13,
                background: passwordNotice.type === 'success' ? '#ECFDF5' : '#FEF2F2',
                color: passwordNotice.type === 'success' ? '#065F46' : '#991B1B',
                border: passwordNotice.type === 'success' ? '1px solid #A7F3D0' : '1px solid #FECACA',
              }}
            >
              {passwordNotice.type === 'success' ? '✓ ' : '⚠️ '}
              {passwordNotice.text}
            </div>
          )}

          <form onSubmit={handleUpdatePassword}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                  Current Password *
                </label>
                <input
                  type="password"
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="••••••••"
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #CBD5E1', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                  New Password (min. 6 characters) *
                </label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #CBD5E1', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                  Confirm New Password *
                </label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #CBD5E1', boxSizing: 'border-box' }}
                />
                {newPassword && confirmPassword && (
                  <span
                    style={{
                      fontSize: 11,
                      marginTop: 4,
                      display: 'block',
                      color: newPassword === confirmPassword ? '#10B981' : '#EF4444',
                      fontWeight: 600,
                    }}
                  >
                    {newPassword === confirmPassword ? '✓ Passwords match' : '⚠️ Passwords do not match'}
                  </span>
                )}
              </div>
            </div>

            <div style={{ marginTop: 24, display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="submit"
                disabled={savingPassword}
                style={{
                  background: '#0F172A',
                  color: '#FFFFFF',
                  padding: '10px 22px',
                  borderRadius: 8,
                  border: 'none',
                  fontWeight: 600,
                  fontSize: 13,
                  cursor: 'pointer',
                }}
              >
                {savingPassword ? 'Updating Password...' : 'Update Password'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Card 3: Recent Activity Log */}
      <div style={{ background: '#FFFFFF', borderRadius: 12, border: '1px solid #E2E8F0', padding: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0F172A', margin: 0 }}>
              🛡️ Recent Access & Security Log
            </h3>
            <p style={{ fontSize: 13, color: '#64748B', margin: '4px 0 0' }}>
              Audit trail of authenticated actions recorded under your account credentials.
            </p>
          </div>
          <a
            href="/audit"
            style={{
              fontSize: 12,
              color: '#2563EB',
              fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            Full Audit Trail →
          </a>
        </div>

        {activity.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px 0', color: '#94A3B8', fontSize: 13 }}>
            No recent activity recorded yet.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {activity.map((a: any) => (
              <div
                key={a.id}
                style={{
                  padding: '12px 16px',
                  borderRadius: 8,
                  background: '#F8FAFC',
                  border: '1px solid #F1F5F9',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span
                    style={{
                      padding: '2px 8px',
                      borderRadius: 6,
                      fontSize: 11,
                      fontWeight: 700,
                      background: a.action.includes('LOGIN') ? '#EFF6FF' : a.action.includes('SECURITY') || a.action.includes('PASSWORD') ? '#FEF2F2' : '#F1F5F9',
                      color: a.action.includes('LOGIN') ? '#2563EB' : a.action.includes('SECURITY') || a.action.includes('PASSWORD') ? '#991B1B' : '#475569',
                    }}
                  >
                    {a.action}
                  </span>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#0F172A' }}>
                      {a.entity_name || a.entity_type}
                    </div>
                    {a.new_data && (
                      <div style={{ fontSize: 11, color: '#64748B' }}>
                        {typeof a.new_data === 'string' ? a.new_data : JSON.stringify(a.new_data)}
                      </div>
                    )}
                  </div>
                </div>
                <div style={{ fontSize: 11, color: '#94A3B8' }}>
                  {a.created_at}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
