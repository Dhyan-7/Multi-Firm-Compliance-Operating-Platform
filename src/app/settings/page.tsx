'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/components/layout/AppLayout';

export default function SettingsPage() {
  const { token } = useAuth();
  const [org, setOrg] = useState<any>({ name: '', address: '', financial_year_start: 4 });
  const [reminderRules, setReminderRules] = useState<any[]>([]);
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
        body: JSON.stringify({ organization: org, reminderRules }),
      });
      if (res.ok) {
        setNotice('System settings saved successfully!');
      } else {
        alert('Failed to save settings');
      }
    } catch (err) {
      console.error('Save settings error:', err);
    } finally {
      setSaving(false);
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
    <div style={{ maxWidth: 840 }}>
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
        }}
      >
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: '#0F172A', margin: 0 }}>
            System Configuration & Automation
          </h2>
          <p style={{ fontSize: 13, color: '#64748B', margin: '4px 0 0' }}>
            Configure organization branding, default financial years, and automated reminder schedules.
          </p>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            background: '#3B82F6',
            color: '#FFF',
            padding: '9px 20px',
            borderRadius: 8,
            border: 'none',
            fontWeight: 700,
            fontSize: 13,
            cursor: saving ? 'not-allowed' : 'pointer',
          }}
        >
          {saving ? 'Saving...' : '💾 Save Settings'}
        </button>
      </div>

      {notice && (
        <div style={{ marginBottom: 16, padding: '10px 16px', background: '#ECFDF5', border: '1px solid #A7F3D0', color: '#065F46', borderRadius: 8, fontSize: 13 }}>
          ✓ {notice}
        </div>
      )}

      {loading ? (
        <div style={{ padding: 48, textAlign: 'center' }}>
          <div style={{ width: 32, height: 32, border: '3px solid #E2E8F0', borderTopColor: '#3B82F6', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
          <div style={{ color: '#64748B', fontSize: 13 }}>Loading settings...</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Organization Settings */}
          <div style={{ background: '#FFF', borderRadius: 12, border: '1px solid #E2E8F0', padding: 24 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0F172A', margin: '0 0 4px' }}>
              Master Organization Profile
            </h3>
            <p style={{ fontSize: 12, color: '#64748B', margin: '0 0 18px' }}>
              Parent group entity governing all subsidiary and client firms.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                  Organization Group Name
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

          {/* Automated Reminder Rules */}
          <div style={{ background: '#FFF', borderRadius: 12, border: '1px solid #E2E8F0', padding: 24 }}>
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
