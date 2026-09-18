'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/components/layout/AppLayout';

export default function SettingsPage() {
  const { token } = useAuth();
  const [org, setOrg] = useState<any>({ name: '', address: '', financial_year_start: 4 });
  const [reminderRules, setReminderRules] = useState<any[]>([]);
  const [notificationSettings, setNotificationSettings] = useState<any>({
    email_mode: 'production',
    smtp_host: '',
    smtp_port: 587,
    smtp_secure: 0,
    smtp_user: '',
    smtp_pass: '',
    from_name: 'CompliCal Alerts',
    from_email: 'alerts@balajigroups.com',
    daily_summary_enabled: 1,
    reminder_intervals: '7,3,1,0',
  });

  const [testEmailAddress, setTestEmailAddress] = useState('');
  const [testEmailSending, setTestEmailSending] = useState(false);
  const [testEmailNotice, setTestEmailNotice] = useState<{ success?: boolean; message?: string } | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');

  const fetchSettings = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch('/api/settings', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.organization) setOrg(data.organization);
        if (data.reminderRules) setReminderRules(data.reminderRules);
        if (data.notificationSettings) setNotificationSettings(data.notificationSettings);
      }
    } catch (err) {
      console.error('Fetch settings error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, [token]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setSaving(true);
    setNotice('');
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ organization: org, reminderRules, notificationSettings }),
      });
      if (res.ok) {
        setNotice('System & Email settings saved successfully!');
      } else {
        alert('Failed to save settings');
      }
    } catch (err) {
      console.error('Save settings error:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleSendTestEmail = async () => {
    if (!token) return;
    setTestEmailSending(true);
    setTestEmailNotice(null);
    try {
      // Auto-save active notification settings first
      await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          organization: org,
          reminderRules,
          notificationSettings: { ...notificationSettings, email_mode: 'production' },
        }),
      });

      const res = await fetch('/api/notifications/emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          action: 'test',
          recipientEmail: testEmailAddress.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (res.ok && data.result?.success) {
        setTestEmailNotice({ success: true, message: data.message });
      } else {
        setTestEmailNotice({ success: false, message: data.message || data.error || 'Test email delivery failed' });
      }
    } catch (err: any) {
      setTestEmailNotice({ success: false, message: err?.message || 'Network error sending test email' });
    } finally {
      setTestEmailSending(false);
    }
  };

  const toggleRuleActive = (index: number) => {
    setReminderRules(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], is_active: copy[index].is_active ? 0 : 1 };
      return copy;
    });
  };

  const changeRuleChannel = (index: number, channel: string) => {
    setReminderRules(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], channel };
      return copy;
    });
  };

  return (
    <div style={{ maxWidth: 880, margin: '0 auto', padding: '24px 16px' }}>
      {/* Top Banner */}
      <div
        style={{
          background: '#FFFFFF',
          borderRadius: 12,
          border: '1px solid #E2E8F0',
          padding: '18px 24px',
          marginBottom: 20,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        }}
      >
        <div>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#0F172A' }}>
            Platform Administration & Settings
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#64748B' }}>
            Manage BALAJI GROUPS corporate configuration, automated reminders, and the centralized Email Notification Engine.
          </p>
        </div>

        <button
          onClick={handleSave}
          disabled={saving || loading}
          style={{
            background: '#2563EB',
            color: '#FFFFFF',
            border: 'none',
            padding: '10px 20px',
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 700,
            cursor: saving || loading ? 'not-allowed' : 'pointer',
            boxShadow: '0 2px 4px rgba(37, 99, 235, 0.2)',
          }}
        >
          {saving ? 'Saving...' : 'Save All Settings'}
        </button>
      </div>

      {notice && (
        <div
          style={{
            background: '#F0FDF4',
            border: '1px solid #BBF7D0',
            color: '#15803D',
            padding: '12px 16px',
            borderRadius: 8,
            marginBottom: 20,
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          {notice}
        </div>
      )}

      {loading ? (
        <div style={{ padding: 48, textAlign: 'center' }}>
          <div style={{ width: 32, height: 32, border: '3px solid #E2E8F0', borderTopColor: '#3B82F6', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
          <div style={{ color: '#64748B', fontSize: 13 }}>Loading settings...</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Organization Details */}
          <div style={{ background: '#FFF', borderRadius: 12, border: '1px solid #E2E8F0', padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0F172A', margin: '0 0 4px' }}>
              Corporate Organization Details
            </h3>
            <p style={{ fontSize: 12, color: '#64748B', margin: '0 0 18px' }}>
              Core configuration for BALAJI GROUPS and default financial period structure.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                  Organization / Group Name
                </label>
                <input
                  type="text"
                  value={org.name || ''}
                  onChange={e => setOrg({ ...org, name: e.target.value })}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #CBD5E1', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                  Financial Year Start Month
                </label>
                <select
                  value={org.financial_year_start || 4}
                  onChange={e => setOrg({ ...org, financial_year_start: Number(e.target.value) })}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #CBD5E1', background: '#FFF' }}
                >
                  <option value={4}>April (Standard Indian Financial Year: Apr-Mar)</option>
                  <option value={1}>January (Calendar Year: Jan-Dec)</option>
                </select>
              </div>

              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                  Headquarters Registered Address
                </label>
                <input
                  type="text"
                  value={org.address || ''}
                  onChange={e => setOrg({ ...org, address: e.target.value })}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #CBD5E1', boxSizing: 'border-box' }}
                />
              </div>
            </div>
          </div>

          {/* Email Notification Infrastructure & SMTP */}
          <div style={{ background: '#FFF', borderRadius: 12, border: '1px solid #E2E8F0', padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0F172A', margin: 0 }}>
                  📧 Central Email Notification System & SMTP
                </h3>
                <p style={{ fontSize: 12, color: '#64748B', margin: '4px 0 0' }}>
                  Configure delivery mode, secure SMTP credentials, and sender information for BALAJI GROUPS.
                </p>
              </div>

              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                background: notificationSettings.smtp_host ? '#F0FDF4' : '#FFFBEB',
                border: `1px solid ${notificationSettings.smtp_host ? '#BBF7D0' : '#FDE68A'}`,
                padding: '4px 12px',
                borderRadius: 16,
              }}>
                <span style={{
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  background: notificationSettings.smtp_host ? '#16A34A' : '#D97706',
                }} />
                <span style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: notificationSettings.smtp_host ? '#15803D' : '#B45309',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                }}>
                  {notificationSettings.smtp_host ? 'Active Live SMTP Delivery' : 'SMTP Server Required'}
                </span>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 18 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                  Sender Display Name
                </label>
                <input
                  type="text"
                  value={notificationSettings.from_name || ''}
                  onChange={e => setNotificationSettings({ ...notificationSettings, from_name: e.target.value })}
                  placeholder="e.g. CompliCal Alerts"
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #CBD5E1', boxSizing: 'border-box' }}
                />
                <div style={{ fontSize: 11, color: '#64748B', marginTop: 4 }}>
                  Shown in recipient inbox From field.
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                  From Email Address
                </label>
                <input
                  type="email"
                  value={notificationSettings.from_email || ''}
                  onChange={e => setNotificationSettings({ ...notificationSettings, from_email: e.target.value })}
                  placeholder="alerts@balajigroups.com"
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #CBD5E1', boxSizing: 'border-box' }}
                />
                <div style={{ fontSize: 11, color: '#64748B', marginTop: 4 }}>
                  Authorized outbound sender email.
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                  SMTP Host Server
                </label>
                <input
                  type="text"
                  value={notificationSettings.smtp_host || ''}
                  onChange={e => setNotificationSettings({ ...notificationSettings, smtp_host: e.target.value })}
                  placeholder="smtp.gmail.com or mail.balajigroups.com"
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #CBD5E1', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                  SMTP Port & Security
                </label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    type="number"
                    value={notificationSettings.smtp_port || 587}
                    onChange={e => setNotificationSettings({ ...notificationSettings, smtp_port: Number(e.target.value) })}
                    placeholder="587"
                    style={{ width: 90, padding: '9px 12px', borderRadius: 8, border: '1px solid #CBD5E1', boxSizing: 'border-box' }}
                  />
                  <select
                    value={notificationSettings.smtp_secure ? 'ssl' : 'tls'}
                    onChange={e => setNotificationSettings({ ...notificationSettings, smtp_secure: e.target.value === 'ssl' ? 1 : 0 })}
                    style={{ flex: 1, padding: '9px 12px', borderRadius: 8, border: '1px solid #CBD5E1', background: '#FFF' }}
                  >
                    <option value="tls">STARTTLS / Port 587</option>
                    <option value="ssl">SSL / Port 465</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                  SMTP Username / Account
                </label>
                <input
                  type="text"
                  value={notificationSettings.smtp_user || ''}
                  onChange={e => setNotificationSettings({ ...notificationSettings, smtp_user: e.target.value })}
                  placeholder="smtp username or email"
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #CBD5E1', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                  SMTP Password / App Password
                </label>
                <input
                  type="password"
                  value={notificationSettings.smtp_pass || ''}
                  onChange={e => setNotificationSettings({ ...notificationSettings, smtp_pass: e.target.value })}
                  placeholder="••••••••••••"
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #CBD5E1', boxSizing: 'border-box' }}
                />
              </div>
            </div>

            {/* Test Email Section */}
            <div style={{ marginTop: 20, paddingTop: 18, borderTop: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
              <div>
                <strong style={{ fontSize: 13, color: '#0F172A' }}>Send Diagnostic Test Email</strong>
                <div style={{ fontSize: 11, color: '#64748B' }}>Sends a verified CompliCal sample alert using the active settings.</div>
              </div>

              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input
                  type="email"
                  value={testEmailAddress}
                  onChange={e => setTestEmailAddress(e.target.value)}
                  placeholder="Recipient (optional)"
                  style={{ padding: '7px 12px', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: 12, width: 200 }}
                />
                <button
                  type="button"
                  onClick={handleSendTestEmail}
                  disabled={testEmailSending}
                  style={{
                    padding: '7px 14px',
                    borderRadius: 6,
                    border: '1px solid #2563EB',
                    background: '#EFF6FF',
                    color: '#2563EB',
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: testEmailSending ? 'not-allowed' : 'pointer',
                  }}
                >
                  {testEmailSending ? 'Dispatching...' : 'Send Test Email 🚀'}
                </button>
              </div>
            </div>

            {testEmailNotice && (
              <div
                style={{
                  marginTop: 12,
                  padding: '8px 12px',
                  borderRadius: 6,
                  fontSize: 12,
                  fontWeight: 600,
                  background: testEmailNotice.success ? '#F0FDF4' : '#FEF2F2',
                  color: testEmailNotice.success ? '#15803D' : '#DC2626',
                  border: `1px solid ${testEmailNotice.success ? '#BBF7D0' : '#FECACA'}`,
                }}
              >
                {testEmailNotice.message}
              </div>
            )}
          </div>

          {/* Automated Reminder Rules */}
          <div style={{ background: '#FFF', borderRadius: 12, border: '1px solid #E2E8F0', padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0F172A', margin: '0 0 4px' }}>
              Automated Statutory Reminder Rules
            </h3>
            <p style={{ fontSize: 12, color: '#64748B', margin: '0 0 18px' }}>
              Statutory notifications automatically dispatched before filing deadlines.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {reminderRules.map((rule, idx) => (
                <div
                  key={rule.id || idx}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '12px 16px',
                    borderRadius: 8,
                    background: '#F8FAFC',
                    border: '1px solid #E2E8F0',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <input
                      type="checkbox"
                      checked={!!rule.is_active}
                      onChange={() => toggleRuleActive(idx)}
                      style={{ width: 16, height: 16, cursor: 'pointer' }}
                    />
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 13, color: '#0F172A' }}>
                        {rule.days_before === 0
                          ? 'Due Date Reminder (Day of Deadline)'
                          : `${rule.days_before} Days Before Due Date`}
                      </div>
                      <div style={{ fontSize: 11, color: '#64748B' }}>
                        Alerts assignees and compliance reviewers
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 12, color: '#64748B' }}>Channel:</span>
                    <select
                      value={rule.channel || 'both'}
                      onChange={e => changeRuleChannel(idx, e.target.value)}
                      style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: 12, background: '#FFF' }}
                    >
                      <option value="both">In-App + Email</option>
                      <option value="in_app">In-App Only</option>
                      <option value="email">Email Only</option>
                    </select>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
