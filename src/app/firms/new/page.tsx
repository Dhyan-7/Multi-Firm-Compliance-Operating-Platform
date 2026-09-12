'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/layout/AppLayout';

export default function NewFirmWizard() {
  const router = useRouter();
  const { token } = useAuth();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Form State
  const [identity, setIdentity] = useState({
    display_name: '',
    legal_name: '',
    entity_type_id: 'et_01', // Default Private Limited
    cin_llpin: '',
    incorporation_date: '',
  });

  const [tax, setTax] = useState({
    pan: '',
    gstin: '',
    tan: '',
    has_pf: false,
    has_esi: false,
    has_pt: false,
  });

  const [address, setAddress] = useState({
    address_line1: '',
    city: '',
    state: 'Maharashtra',
    pincode: '',
  });

  const [business, setBusiness] = useState({
    industry: 'Logistics & Transport',
    employee_count: 25,
    turnover_band: '5-25 Cr',
    financial_year: '2026-2027',
  });

  const [contacts, setContacts] = useState({
    name: '',
    designation: 'Director / Compliance Officer',
    email: '',
    phone: '',
  });

  // Recommended & Master compliances state
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [masterCompliances, setMasterCompliances] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedCompliances, setSelectedCompliances] = useState<Record<string, boolean>>({});
  const [subTab, setSubTab] = useState<'recommended' | 'master'>('recommended');
  const [librarySearch, setLibrarySearch] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('ALL');

  const calculateApplicability = async () => {
    try {
      // 1. Fetch full Master Compliance Catalog & Categories
      let allItems: any[] = [];
      const res = await fetch('/api/compliances', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const data = await res.json();
        allItems = data.compliances || [];
        setMasterCompliances(allItems);
        setCategories(data.categories || []);
      }

      // 2. Evaluate statutory applicability based on firm's profile
      const entityCode = identity.entity_type_id === 'et_02' ? 'llp' : identity.entity_type_id === 'et_03' ? 'prop' : 'pvt_ltd';
      const isCompany = entityCode.includes('pvt') || entityCode.includes('pub');
      const isLLP = entityCode.includes('llp');
      const empCount = Number(business.employee_count) || 0;

      const recommendedList: any[] = [];
      const initialSelected: Record<string, boolean> = { ...selectedCompliances };

      // Helper to check and recommend
      const checkRule = (comp: any): { applicable: boolean; reason: string } => {
        const code = (comp.code || '').toUpperCase();
        const cat = (comp.category_name || '').toUpperCase();

        if (cat.includes('GST') || code.includes('GSTR') || code.includes('GST')) {
          if (tax.gstin) return { applicable: true, reason: 'Active GSTIN registered' };
        }
        if (cat.includes('TDS') || code.includes('TDS') || code.includes('24Q') || code.includes('26Q')) {
          if (code.includes('24Q')) {
            if (empCount > 0) return { applicable: true, reason: 'Salaried personnel payroll withholding' };
          } else if (code.includes('26Q') || code.includes('TDS_PAY')) {
            if (tax.tan || isCompany || empCount > 5) return { applicable: true, reason: 'Vendor withholding statutory obligation' };
          }
        }
        if (cat.includes('INCOME TAX') || code.includes('ITR') || code.includes('ADV_')) {
          return { applicable: true, reason: 'Mandatory corporate direct tax compliance' };
        }
        if (cat.includes('ROC') || cat.includes('MCA') || code.includes('AOC') || code.includes('MGT') || code.includes('DIR')) {
          if (isCompany) return { applicable: true, reason: 'Statutory MCA filing under Companies Act 2013' };
          if (isLLP && (code.includes('DIR') || code.includes('LLP'))) return { applicable: true, reason: 'Annual MCA filing for Limited Liability Partnerships' };
        }
        if (cat.includes('PF') || code.includes('PF')) {
          if (tax.has_pf || empCount >= 20) return { applicable: true, reason: empCount >= 20 ? 'Statutory PF threshold (20+ employees)' : 'PF registered entity' };
        }
        if (cat.includes('ESI') || code.includes('ESI')) {
          if (tax.has_esi || empCount >= 10) return { applicable: true, reason: empCount >= 10 ? 'Statutory ESI threshold (10+ employees)' : 'ESI registered entity' };
        }
        if (cat.includes('PROFESSIONAL TAX') || code.includes('PT')) {
          if (tax.has_pt || empCount > 0) return { applicable: true, reason: 'State employer PT deduction & remittance' };
        }
        if (code.includes('BOOK_CLOSE') || code.includes('BANK_RECON')) {
          return { applicable: true, reason: 'Core statutory accounting governance' };
        }
        if (code.includes('BOARD_MTG') || code.includes('AGM')) {
          if (isCompany) return { applicable: true, reason: 'Mandatory governance under Companies Act 2013' };
        }
        return { applicable: false, reason: '' };
      };

      allItems.forEach(comp => {
        const { applicable, reason } = checkRule(comp);
        if (applicable) {
          recommendedList.push({
            ...comp,
            reason,
            cat: comp.category_name || 'General',
            freq: comp.frequency ? comp.frequency.charAt(0).toUpperCase() + comp.frequency.slice(1) : 'Monthly',
          });
          // Auto-select recommended items
          initialSelected[comp.id] = true;
        }
      });

      // Fallback if API returned empty
      if (recommendedList.length === 0) {
        const fallback = [
          { id: 'comp_01', name: 'GSTR-1 Monthly Outward Supplies', cat: 'GST', freq: 'Monthly', reason: 'Active GSTIN registered' },
          { id: 'comp_02', name: 'GSTR-3B Summary Return & Tax Payment', cat: 'GST', freq: 'Monthly', reason: 'Mandatory for GST registered entities' },
          { id: 'comp_07', name: 'TDS Return 24Q (Salary)', cat: 'TDS', freq: 'Quarterly', reason: 'Salaried personnel payroll reporting' },
          { id: 'comp_08', name: 'TDS Return 26Q (Non-Salary)', cat: 'TDS', freq: 'Quarterly', reason: 'Vendor withholding tax reporting' },
          { id: 'comp_17', name: 'Income Tax Return (ITR)', cat: 'Income Tax', freq: 'Annual', reason: 'Mandatory annual corporate tax filing' },
        ];
        fallback.forEach(f => {
          recommendedList.push(f);
          initialSelected[f.id] = true;
        });
      }

      setRecommendations(recommendedList);
      setSelectedCompliances(initialSelected);
    } catch (err) {
      console.error('Error fetching master compliances:', err);
    }
  };

  // When reaching review step, compute statutory applicability and fetch master catalog
  useEffect(() => {
    if (step === 6) {
      calculateApplicability();
    }
  }, [step]);

  const toggleCompliance = (id: string) => {
    setSelectedCompliances(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const selectAllRecommended = () => {
    const updated = { ...selectedCompliances };
    recommendations.forEach(r => { updated[r.id] = true; });
    setSelectedCompliances(updated);
  };

  const clearAllSelected = () => {
    setSelectedCompliances({});
  };

  const handleFinalSubmit = async () => {
    if (!token) return;
    setLoading(true);
    setError('');

    try {
      // 1. Create Firm
      const firmPayload = {
        display_name: identity.display_name,
        legal_name: identity.legal_name || identity.display_name,
        entity_type_id: identity.entity_type_id,
        pan: tax.pan,
        gstin: tax.gstin,
        cin_llpin: identity.cin_llpin,
        tan: tax.tan,
        address_line1: address.address_line1,
        city: address.city,
        state: address.state,
        pincode: address.pincode,
        industry: business.industry,
        employee_count: Number(business.employee_count),
        turnover_band: business.turnover_band,
        contacts: contacts.name ? [contacts] : [],
      };

      const res = await fetch('/api/firms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(firmPayload),
      });

      const resData = await res.json();
      if (!res.ok) {
        throw new Error(resData.error || 'Failed to register firm');
      }

      const firmId = resData.id;

      // 2. Configure selected compliances for firm
      const selectedIds = Object.keys(selectedCompliances).filter(k => selectedCompliances[k]);
      for (const compId of selectedIds) {
        await fetch(`/api/firms/${firmId}/compliances`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ compliance_id: compId, status: 'active' }),
        });
      }

      // 3. Automatically generate calendar tasks for the financial year!
      await fetch(`/api/firms/${firmId}/generate-calendar`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ financial_year: business.financial_year }),
      });

      // Redirect to firm details
      router.push(`/firms/${firmId}`);
    } catch (err: any) {
      setError(err?.message || 'Failed to complete registration');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 860, margin: '0 auto' }}>
      {/* Step Indicator Bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          background: '#FFFFFF',
          padding: '16px 24px',
          borderRadius: 12,
          border: '1px solid #E2E8F0',
          marginBottom: 24,
        }}
      >
        {[
          { num: 1, label: 'Identity' },
          { num: 2, label: 'Tax & Reg' },
          { num: 3, label: 'Location' },
          { num: 4, label: 'Business' },
          { num: 5, label: 'Contacts' },
          { num: 6, label: 'Applicability' },
        ].map((s) => {
          const isDone = step > s.num;
          const isCurrent = step === s.num;
          return (
            <div
              key={s.num}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                cursor: isDone ? 'pointer' : 'default',
              }}
              onClick={() => isDone && setStep(s.num)}
            >
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  background: isCurrent ? '#3B82F6' : isDone ? '#10B981' : '#E2E8F0',
                  color: isCurrent || isDone ? '#FFF' : '#64748B',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 12,
                  fontWeight: 700,
                }}
              >
                {isDone ? '✓' : s.num}
              </div>
              <span style={{ fontSize: 13, fontWeight: isCurrent ? 700 : 500, color: isCurrent ? '#0F172A' : '#64748B' }}>
                {s.label}
              </span>
            </div>
          );
        })}
      </div>

      {error && (
        <div style={{ padding: '12px 16px', background: '#FEE2E2', border: '1px solid #FCA5A5', color: '#991B1B', borderRadius: 8, marginBottom: 20, fontSize: 13 }}>
          {error}
        </div>
      )}

      {/* Step 1: Identity */}
      {step === 1 && (
        <div style={{ background: '#FFF', padding: 28, borderRadius: 12, border: '1px solid #E2E8F0' }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#0F172A', margin: '0 0 6px' }}>Step 1: Entity Identity</h2>
          <p style={{ fontSize: 13, color: '#64748B', margin: '0 0 20px' }}>Enter basic organization legal identifiers.</p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>Display Name *</label>
              <input
                type="text"
                required
                value={identity.display_name}
                onChange={e => setIdentity({ ...identity, display_name: e.target.value })}
                placeholder="e.g. Apex Logistics"
                style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #CBD5E1', boxSizing: 'border-box' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>Full Legal Name *</label>
              <input
                type="text"
                required
                value={identity.legal_name}
                onChange={e => setIdentity({ ...identity, legal_name: e.target.value })}
                placeholder="e.g. Apex Logistics Private Limited"
                style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #CBD5E1', boxSizing: 'border-box' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>Entity Type *</label>
              <select
                value={identity.entity_type_id}
                onChange={e => setIdentity({ ...identity, entity_type_id: e.target.value })}
                style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #CBD5E1', boxSizing: 'border-box', background: '#FFF' }}
              >
                <option value="et_01">Private Limited Company</option>
                <option value="et_02">Limited Liability Partnership (LLP)</option>
                <option value="et_03">Sole Proprietorship</option>
                <option value="et_04">Public Limited Company</option>
                <option value="et_05">Partnership Firm</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>CIN / LLPIN</label>
              <input
                type="text"
                value={identity.cin_llpin}
                onChange={e => setIdentity({ ...identity, cin_llpin: e.target.value })}
                placeholder="e.g. U60200MH2021PTC123456"
                style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #CBD5E1', boxSizing: 'border-box' }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 24 }}>
            <button
              onClick={() => {
                if (!identity.display_name.trim() || identity.display_name.trim().length < 2) {
                  setError('Display Name is mandatory (minimum 2 characters)');
                  return;
                }
                if (!identity.legal_name.trim() || identity.legal_name.trim().length < 2) {
                  setError('Full Legal Name is mandatory (minimum 2 characters)');
                  return;
                }
                if (!identity.entity_type_id) {
                  setError('Entity Type is mandatory');
                  return;
                }
                setError('');
                setStep(2);
              }}
              style={{ background: '#3B82F6', color: '#FFF', padding: '10px 22px', borderRadius: 8, border: 'none', fontWeight: 600, cursor: 'pointer' }}
            >
              Continue to Tax & Registrations →
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Tax & Registrations */}
      {step === 2 && (
        <div style={{ background: '#FFF', padding: 28, borderRadius: 12, border: '1px solid #E2E8F0' }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#0F172A', margin: '0 0 6px' }}>Step 2: Statutory Tax Registrations</h2>
          <p style={{ fontSize: 13, color: '#64748B', margin: '0 0 20px' }}>These registration numbers drive the statutory applicability rules.</p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>Permanent Account Number (PAN) *</label>
              <input
                type="text"
                value={tax.pan}
                onChange={e => setTax({ ...tax, pan: e.target.value.toUpperCase() })}
                placeholder="e.g. AABCB1234F"
                style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #CBD5E1', boxSizing: 'border-box' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>Goods & Services Tax (GSTIN)</label>
              <input
                type="text"
                value={tax.gstin}
                onChange={e => setTax({ ...tax, gstin: e.target.value.toUpperCase() })}
                placeholder="e.g. 27AABCB1234F1Z5"
                style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #CBD5E1', boxSizing: 'border-box' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>Tax Deduction Account Number (TAN)</label>
              <input
                type="text"
                value={tax.tan}
                onChange={e => setTax({ ...tax, tan: e.target.value.toUpperCase() })}
                placeholder="e.g. MUMB12345D"
                style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #CBD5E1', boxSizing: 'border-box' }}
              />
            </div>
          </div>

          <div style={{ borderTop: '1px solid #F1F5F9', paddingTop: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 10 }}>Additional Registrations</div>
            <div style={{ display: 'flex', gap: 24 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
                <input type="checkbox" checked={tax.has_pf} onChange={e => setTax({ ...tax, has_pf: e.target.checked })} />
                <span>PF Registered</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
                <input type="checkbox" checked={tax.has_esi} onChange={e => setTax({ ...tax, has_esi: e.target.checked })} />
                <span>ESI Registered</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
                <input type="checkbox" checked={tax.has_pt} onChange={e => setTax({ ...tax, has_pt: e.target.checked })} />
                <span>Professional Tax (PT) Registered</span>
              </label>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 28 }}>
            <button onClick={() => setStep(1)} style={{ background: '#F1F5F9', color: '#475569', padding: '10px 20px', borderRadius: 8, border: 'none', fontWeight: 600, cursor: 'pointer' }}>
              ← Back
            </button>
            <button
              onClick={() => {
                const panTrimmed = (tax.pan || '').trim().toUpperCase();
                if (!panTrimmed) {
                  setError('Permanent Account Number (PAN) is mandatory');
                  return;
                }
                const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
                if (!panRegex.test(panTrimmed)) {
                  setError('Invalid PAN format. Standard Indian PAN: 5 uppercase letters, 4 digits, 1 uppercase letter (e.g. AABCB1234F)');
                  return;
                }
                const gstinTrimmed = (tax.gstin || '').trim().toUpperCase();
                if (gstinTrimmed) {
                  const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
                  if (!gstinRegex.test(gstinTrimmed)) {
                    setError('Invalid GSTIN format. Standard GSTIN is 15 characters (e.g. 27AABCB1234F1Z5)');
                    return;
                  }
                }
                setError('');
                setStep(3);
              }}
              style={{ background: '#3B82F6', color: '#FFF', padding: '10px 22px', borderRadius: 8, border: 'none', fontWeight: 600, cursor: 'pointer' }}
            >
              Continue to Location →
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Address */}
      {step === 3 && (
        <div style={{ background: '#FFF', padding: 28, borderRadius: 12, border: '1px solid #E2E8F0' }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#0F172A', margin: '0 0 6px' }}>Step 3: Registered Address</h2>
          <p style={{ fontSize: 13, color: '#64748B', margin: '0 0 20px' }}>Principal place of business.</p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>Address Line 1 *</label>
              <input
                type="text"
                value={address.address_line1}
                onChange={e => setAddress({ ...address, address_line1: e.target.value })}
                placeholder="Premises, Street, Industrial Estate"
                style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #CBD5E1', boxSizing: 'border-box' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>City *</label>
                <input
                  type="text"
                  value={address.city}
                  onChange={e => setAddress({ ...address, city: e.target.value })}
                  placeholder="e.g. Mumbai"
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #CBD5E1', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>State *</label>
                <input
                  type="text"
                  value={address.state}
                  onChange={e => setAddress({ ...address, state: e.target.value })}
                  placeholder="e.g. Maharashtra"
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #CBD5E1', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>PIN Code *</label>
                <input
                  type="text"
                  value={address.pincode}
                  onChange={e => setAddress({ ...address, pincode: e.target.value })}
                  placeholder="400001"
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #CBD5E1', boxSizing: 'border-box' }}
                />
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 28 }}>
            <button onClick={() => setStep(2)} style={{ background: '#F1F5F9', color: '#475569', padding: '10px 20px', borderRadius: 8, border: 'none', fontWeight: 600, cursor: 'pointer' }}>
              ← Back
            </button>
            <button
              onClick={() => {
                if (!address.address_line1.trim()) {
                  setError('Address Line 1 is mandatory');
                  return;
                }
                if (!address.city.trim()) {
                  setError('City is mandatory');
                  return;
                }
                if (!address.state.trim()) {
                  setError('State is mandatory');
                  return;
                }
                const pin = (address.pincode || '').trim();
                if (pin && !/^[1-9][0-9]{5}$/.test(pin)) {
                  setError('Invalid PIN code. Must be a 6-digit Indian postal code');
                  return;
                }
                setError('');
                setStep(4);
              }}
              style={{ background: '#3B82F6', color: '#FFF', padding: '10px 22px', borderRadius: 8, border: 'none', fontWeight: 600, cursor: 'pointer' }}
            >
              Continue to Business Profile →
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Business Profile */}
      {step === 4 && (
        <div style={{ background: '#FFF', padding: 28, borderRadius: 12, border: '1px solid #E2E8F0' }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#0F172A', margin: '0 0 6px' }}>Step 4: Business Scale & Scope</h2>
          <p style={{ fontSize: 13, color: '#64748B', margin: '0 0 20px' }}>Employee headcount and turnover thresholds trigger statutory obligations.</p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>Industry</label>
              <input
                type="text"
                value={business.industry}
                onChange={e => setBusiness({ ...business, industry: e.target.value })}
                placeholder="e.g. Transport & Logistics"
                style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #CBD5E1', boxSizing: 'border-box' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>Employee Count</label>
              <input
                type="number"
                value={business.employee_count}
                onChange={e => setBusiness({ ...business, employee_count: Number(e.target.value) })}
                style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #CBD5E1', boxSizing: 'border-box' }}
              />
              <span style={{ fontSize: 11, color: '#64748B' }}>PF applies at 20+, ESI applies at 10+ employees.</span>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>Turnover Band</label>
              <select
                value={business.turnover_band}
                onChange={e => setBusiness({ ...business, turnover_band: e.target.value })}
                style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #CBD5E1', boxSizing: 'border-box', background: '#FFF' }}
              >
                <option value="Under 40 Lakhs">Under 40 Lakhs</option>
                <option value="40 Lakhs - 1.5 Cr">40 Lakhs - 1.5 Cr</option>
                <option value="1.5 - 5 Cr">1.5 - 5 Cr</option>
                <option value="5 - 25 Cr">5 - 25 Cr</option>
                <option value="Above 25 Cr">Above 25 Cr</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>Initial Financial Year</label>
              <select
                value={business.financial_year}
                onChange={e => setBusiness({ ...business, financial_year: e.target.value })}
                style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #CBD5E1', boxSizing: 'border-box', background: '#FFF' }}
              >
                <option value="2026-2027">FY 2026-2027 (Current)</option>
                <option value="2027-2028">FY 2027-2028</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 28 }}>
            <button onClick={() => setStep(3)} style={{ background: '#F1F5F9', color: '#475569', padding: '10px 20px', borderRadius: 8, border: 'none', fontWeight: 600, cursor: 'pointer' }}>
              ← Back
            </button>
            <button onClick={() => setStep(5)} style={{ background: '#3B82F6', color: '#FFF', padding: '10px 22px', borderRadius: 8, border: 'none', fontWeight: 600, cursor: 'pointer' }}>
              Continue to Contacts →
            </button>
          </div>
        </div>
      )}

      {/* Step 5: Contacts */}
      {step === 5 && (
        <div style={{ background: '#FFF', padding: 28, borderRadius: 12, border: '1px solid #E2E8F0' }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#0F172A', margin: '0 0 6px' }}>Step 5: Key Authorized Contact</h2>
          <p style={{ fontSize: 13, color: '#64748B', margin: '0 0 20px' }}>Primary liaison for compliance notices and filings.</p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>Contact Person Name</label>
              <input
                type="text"
                value={contacts.name}
                onChange={e => setContacts({ ...contacts, name: e.target.value })}
                placeholder="e.g. Ramesh Kumar"
                style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #CBD5E1', boxSizing: 'border-box' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>Designation</label>
              <input
                type="text"
                value={contacts.designation}
                onChange={e => setContacts({ ...contacts, designation: e.target.value })}
                style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #CBD5E1', boxSizing: 'border-box' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>Official Email</label>
              <input
                type="email"
                value={contacts.email}
                onChange={e => setContacts({ ...contacts, email: e.target.value })}
                placeholder="ramesh@company.com"
                style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #CBD5E1', boxSizing: 'border-box' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>Phone Number</label>
              <input
                type="text"
                value={contacts.phone}
                onChange={e => setContacts({ ...contacts, phone: e.target.value })}
                placeholder="+91 98765 43210"
                style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #CBD5E1', boxSizing: 'border-box' }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 28 }}>
            <button onClick={() => setStep(4)} style={{ background: '#F1F5F9', color: '#475569', padding: '10px 20px', borderRadius: 8, border: 'none', fontWeight: 600, cursor: 'pointer' }}>
              ← Back
            </button>
            <button
              onClick={() => {
                if (contacts.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contacts.email.trim())) {
                  setError('Please enter a valid contact email address');
                  return;
                }
                setError('');
                setStep(6);
              }}
              style={{ background: '#3B82F6', color: '#FFF', padding: '10px 22px', borderRadius: 8, border: 'none', fontWeight: 600, cursor: 'pointer' }}
            >
              Evaluate Compliance Applicability →
            </button>
          </div>
        </div>
      )}

      {/* Step 6: Applicability Review & Master Compliance Library Selection */}
      {step === 6 && (
        <div style={{ background: '#FFF', padding: 28, borderRadius: 12, border: '1px solid #E2E8F0' }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: '#0F172A', margin: '0 0 6px' }}>
                Step 6: Compliance Applicability & Master Library Setup
              </h2>
              <p style={{ fontSize: 13, color: '#64748B', margin: 0 }}>
                Review automatically recommended statutory regulations based on firm profile, and optionally browse &amp; add any additional regulations from the Master Compliance Library.
              </p>
            </div>
          </div>

          {/* Metrics & Control Bar */}
          {(() => {
            const selectedIds = Object.keys(selectedCompliances).filter(k => selectedCompliances[k]);
            const recIds = new Set(recommendations.map(r => r.id));
            const defaultSelectedCount = selectedIds.filter(id => recIds.has(id)).length;
            const customSelectedCount = selectedIds.filter(id => !recIds.has(id)).length;

            return (
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 12,
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: '#F8FAFC',
                  padding: '12px 16px',
                  borderRadius: 10,
                  border: '1px solid #E2E8F0',
                  marginBottom: 20,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>
                    Total Selected: <span style={{ color: '#2563EB', fontSize: 15 }}>{selectedIds.length}</span>
                  </div>
                  <span style={{ color: '#CBD5E1' }}>|</span>
                  <span style={{ fontSize: 12, color: '#059669', background: '#ECFDF5', padding: '3px 8px', borderRadius: 6, fontWeight: 600 }}>
                    ⭐ {defaultSelectedCount} Statutory Defaults
                  </span>
                  {customSelectedCount > 0 && (
                    <span style={{ fontSize: 12, color: '#7C3AED', background: '#F5F3FF', padding: '3px 8px', borderRadius: 6, fontWeight: 600 }}>
                      ✨ {customSelectedCount} Custom from Master
                    </span>
                  )}
                </div>

                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    type="button"
                    onClick={selectAllRecommended}
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: '#2563EB',
                      background: '#EFF6FF',
                      border: '1px solid #BFDBFE',
                      padding: '4px 10px',
                      borderRadius: 6,
                      cursor: 'pointer',
                    }}
                  >
                    Select All Defaults
                  </button>
                  <button
                    type="button"
                    onClick={clearAllSelected}
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: '#64748B',
                      background: '#FFFFFF',
                      border: '1px solid #CBD5E1',
                      padding: '4px 10px',
                      borderRadius: 6,
                      cursor: 'pointer',
                    }}
                  >
                    Clear All
                  </button>
                </div>
              </div>
            );
          })()}

          {/* Subtabs: Recommended vs Master Library */}
          <div style={{ display: 'flex', gap: 8, borderBottom: '2px solid #F1F5F9', marginBottom: 20 }}>
            <button
              type="button"
              onClick={() => setSubTab('recommended')}
              style={{
                padding: '10px 18px',
                fontSize: 13,
                fontWeight: 600,
                border: 'none',
                background: 'transparent',
                color: subTab === 'recommended' ? '#2563EB' : '#64748B',
                borderBottom: subTab === 'recommended' ? '2px solid #2563EB' : '2px solid transparent',
                marginBottom: -2,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <span>⭐ Default Statutory Recommendations</span>
              <span style={{ background: subTab === 'recommended' ? '#DBEAFE' : '#F1F5F9', color: subTab === 'recommended' ? '#1D4ED8' : '#64748B', fontSize: 11, padding: '2px 6px', borderRadius: 10 }}>
                {recommendations.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setSubTab('master')}
              style={{
                padding: '10px 18px',
                fontSize: 13,
                fontWeight: 600,
                border: 'none',
                background: 'transparent',
                color: subTab === 'master' ? '#2563EB' : '#64748B',
                borderBottom: subTab === 'master' ? '2px solid #2563EB' : '2px solid transparent',
                marginBottom: -2,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <span>📚 Master Compliance Library (Browse &amp; Add)</span>
              <span style={{ background: subTab === 'master' ? '#DBEAFE' : '#F1F5F9', color: subTab === 'master' ? '#1D4ED8' : '#64748B', fontSize: 11, padding: '2px 6px', borderRadius: 10 }}>
                {masterCompliances.length || 50}
              </span>
            </button>
          </div>

          {/* Subtab 1: Recommended Defaults */}
          {subTab === 'recommended' && (
            <div>
              <div style={{ maxHeight: 380, overflowY: 'auto', border: '1px solid #E2E8F0', borderRadius: 8, marginBottom: 16 }}>
                {recommendations.map((item) => {
                  const isChecked = !!selectedCompliances[item.id];
                  return (
                    <div
                      key={item.id}
                      onClick={() => toggleCompliance(item.id)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        padding: '12px 16px',
                        borderBottom: '1px solid #F1F5F9',
                        background: isChecked ? '#FFFFFF' : '#F8FAFC',
                        cursor: 'pointer',
                        transition: 'background 0.1s',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {}}
                        style={{ width: 16, height: 16, cursor: 'pointer' }}
                      />
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontWeight: 600, fontSize: 13, color: isChecked ? '#0F172A' : '#64748B' }}>
                            {item.name}
                          </span>
                          <span style={{ fontSize: 11, padding: '1px 6px', borderRadius: 4, background: '#F1F5F9', color: '#475569', fontWeight: 500 }}>
                            {item.cat || item.category_name} • {item.freq || item.frequency}
                          </span>
                          {item.authority && (
                            <span style={{ fontSize: 10, color: '#94A3B8', fontWeight: 600 }}>
                              {item.authority}
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: 11, color: '#10B981', marginTop: 2 }}>
                          ✓ {item.reason || 'Mandatory statutory applicability for operational firm profile'}
                        </div>
                      </div>
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 600,
                          padding: '3px 8px',
                          borderRadius: 6,
                          background: isChecked ? '#ECFDF5' : '#F1F5F9',
                          color: isChecked ? '#059669' : '#94A3B8',
                        }}
                      >
                        {isChecked ? 'Included' : 'Excluded'}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Callout to Master Catalog */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  background: '#F0FDF4',
                  border: '1px solid #BBF7D0',
                  padding: '10px 16px',
                  borderRadius: 8,
                  marginBottom: 20,
                  fontSize: 12,
                  color: '#166534',
                }}
              >
                <span>Want to attach extra ROC forms, state licenses, labour filings, or internal MIS items?</span>
                <button
                  type="button"
                  onClick={() => setSubTab('master')}
                  style={{
                    background: '#16A34A',
                    color: '#FFF',
                    border: 'none',
                    padding: '6px 14px',
                    borderRadius: 6,
                    fontWeight: 600,
                    fontSize: 12,
                    cursor: 'pointer',
                  }}
                >
                  Browse Master Library ({masterCompliances.length || 50}+ items) →
                </button>
              </div>
            </div>
          )}

          {/* Subtab 2: Master Compliance Library Browser */}
          {subTab === 'master' && (
            <div>
              {/* Search & Category Filter Controls */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 14 }}>
                <div style={{ flex: '1 1 260px' }}>
                  <input
                    type="text"
                    value={librarySearch}
                    onChange={(e) => setLibrarySearch(e.target.value)}
                    placeholder="Search 50+ compliances by title, code, authority..."
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: 6,
                      border: '1px solid #CBD5E1',
                      fontSize: 13,
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
                <div style={{ flex: '0 0 200px' }}>
                  <select
                    value={selectedCategoryFilter}
                    onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: 6,
                      border: '1px solid #CBD5E1',
                      fontSize: 13,
                      boxSizing: 'border-box',
                      background: '#FFF',
                    }}
                  >
                    <option value="ALL">All Categories ({masterCompliances.length})</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Master Items List */}
              {(() => {
                const recIds = new Set(recommendations.map(r => r.id));
                const filtered = masterCompliances.filter((item) => {
                  const matchSearch =
                    !librarySearch.trim() ||
                    item.name?.toLowerCase().includes(librarySearch.toLowerCase()) ||
                    item.code?.toLowerCase().includes(librarySearch.toLowerCase()) ||
                    item.authority?.toLowerCase().includes(librarySearch.toLowerCase()) ||
                    item.category_name?.toLowerCase().includes(librarySearch.toLowerCase());

                  const matchCat =
                    selectedCategoryFilter === 'ALL' ||
                    item.category_name?.toLowerCase() === selectedCategoryFilter.toLowerCase();

                  return matchSearch && matchCat;
                });

                if (filtered.length === 0) {
                  return (
                    <div style={{ padding: '36px', textAlign: 'center', color: '#64748B', border: '1px dashed #CBD5E1', borderRadius: 8, marginBottom: 16 }}>
                      No master compliances match &quot;{librarySearch}&quot;. Try adjusting your search query.
                    </div>
                  );
                }

                return (
                  <div style={{ maxHeight: 380, overflowY: 'auto', border: '1px solid #E2E8F0', borderRadius: 8, marginBottom: 16 }}>
                    {filtered.map((item) => {
                      const isChecked = !!selectedCompliances[item.id];
                      const isDefaultRec = recIds.has(item.id);

                      return (
                        <div
                          key={item.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '10px 16px',
                            borderBottom: '1px solid #F1F5F9',
                            background: isChecked ? '#F0FDF4' : '#FFFFFF',
                            gap: 12,
                          }}
                        >
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span style={{ fontWeight: 600, fontSize: 13, color: '#0F172A' }}>
                                {item.name}
                              </span>
                              <span
                                style={{
                                  fontSize: 11,
                                  padding: '2px 6px',
                                  borderRadius: 4,
                                  background: item.category_color ? `${item.category_color}18` : '#F1F5F9',
                                  color: item.category_color || '#475569',
                                  fontWeight: 600,
                                }}
                              >
                                {item.category_name || 'General'}
                              </span>
                              <span style={{ fontSize: 11, color: '#64748B' }}>
                                • {item.frequency ? item.frequency.toUpperCase() : 'MONTHLY'}
                              </span>
                              {item.authority && (
                                <span style={{ fontSize: 10, color: '#94A3B8', fontWeight: 600 }}>
                                  ({item.authority})
                                </span>
                              )}
                            </div>
                            <div style={{ fontSize: 11, color: '#64748B', marginTop: 2, display: 'flex', gap: 10 }}>
                              <span>Code: <code>{item.code}</code></span>
                              {item.description && <span>• {item.description}</span>}
                              {isDefaultRec && (
                                <span style={{ color: '#059669', fontWeight: 600 }}>⭐ Recommended Default</span>
                              )}
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => toggleCompliance(item.id)}
                            style={{
                              padding: '6px 14px',
                              borderRadius: 6,
                              fontSize: 12,
                              fontWeight: 600,
                              cursor: 'pointer',
                              border: isChecked ? '1px solid #10B981' : '1px solid #3B82F6',
                              background: isChecked ? '#10B981' : '#FFFFFF',
                              color: isChecked ? '#FFFFFF' : '#3B82F6',
                              whiteSpace: 'nowrap',
                              transition: 'all 0.15s',
                            }}
                          >
                            {isChecked ? '✓ Added to Firm' : '+ Add to Firm'}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          )}

          {/* Calendar Generation Callout */}
          <div
            style={{
              padding: '14px 18px',
              borderRadius: 8,
              background: '#F0F9FF',
              border: '1px solid #BAE6FD',
              marginBottom: 24,
              fontSize: 13,
              color: '#0369A1',
            }}
          >
            <strong>Automatic Calendar Task Generation:</strong> Clicking &quot;Register Firm &amp; Generate Calendar&quot; will create the enterprise firm record, bind all {Object.keys(selectedCompliances).filter(k => selectedCompliances[k]).length} chosen statutory &amp; master compliances, and immediately calculate and generate all recurring statutory tasks with official due dates for Financial Year {business.financial_year}.
          </div>

          {/* Navigation Buttons */}
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <button
              type="button"
              onClick={() => setStep(5)}
              style={{ background: '#F1F5F9', color: '#475569', padding: '10px 20px', borderRadius: 8, border: 'none', fontWeight: 600, cursor: 'pointer' }}
            >
              ← Back
            </button>
            <button
              type="button"
              onClick={handleFinalSubmit}
              disabled={loading}
              style={{
                background: '#10B981',
                color: '#FFF',
                padding: '12px 28px',
                borderRadius: 8,
                border: 'none',
                fontWeight: 700,
                fontSize: 14,
                cursor: loading ? 'not-allowed' : 'pointer',
                boxShadow: '0 4px 6px rgba(16, 185, 129, 0.3)',
              }}
            >
              {loading ? 'Generating Organization & Calendar...' : '🚀 Register Firm & Generate Full FY Calendar'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
