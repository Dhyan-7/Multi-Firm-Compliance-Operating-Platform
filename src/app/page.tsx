'use client';
import { useState } from 'react';
import Link from 'next/link';

export default function CorporateHomePage() {
  const [activeStage, setActiveStage] = useState(0);

  const stages = [
    {
      id: 'sched',
      title: '1. Automated FY Scheduling',
      subtitle: 'Dynamic Statutory Engine',
      desc: 'Generates financial year compliance tasks based on entity registrations and statutory schedules with automated multi-day reminder intervals.',
      badge: 'Auto-Triggered',
      details: [
        'Automatic calculation of statutory due dates (GSTR-1, GSTR-3B, 24Q, PF ECR, AOC-4)',
        'Holiday and weekend rollover intelligence to preserve deadline accuracy',
        'Pre-allocation to designated operational departments and compliance executives',
      ],
      metrics: '50+ Master Compliances Mapped',
    },
    {
      id: 'mis',
      title: '2. MIS & Challan Record Filing',
      subtitle: 'Operational Data Entry',
      desc: 'Executors upload statutory challans, ARN acknowledgment numbers, tax payments, and filing proofs into the immutable document vault.',
      badge: 'Operational Filing',
      details: [
        'Mandatory ARN / Challan verification fields for GST, Income Tax, and PF payments',
        '25MB encrypted document vault storage linked directly to the task ID',
        'Time-stamped filing date verification preventing backdated modifications',
      ],
      metrics: '100% Document Verification',
    },
    {
      id: 'review',
      title: '3. Four-Eye Review & Verification',
      subtitle: 'Managerial Oversight',
      desc: 'Department heads and compliance managers verify filing challans and MIS data against statutory portal records before authorization.',
      badge: 'Quality Control',
      details: [
        'Dual-confirmation review workflow preventing single-point filing omissions',
        'Formal rejection loop with mandatory reason capture and executive feedback',
        'Segregation of duties separating executors from approving authorities',
      ],
      metrics: 'Zero-Tolerance Audit Policy',
    },
    {
      id: 'approve',
      title: '4. Super Admin Sign-off & Audit',
      subtitle: 'Executive Authority Approval',
      desc: 'Root Super Admin or System Admin validates compliance closure, triggering cryptographic audit logging and updating group-wide risk heatmaps.',
      badge: 'Executive Sign-off',
      details: [
        'Instant tamper-evident audit log record created with actor, timestamp, and metadata',
        'Real-time update of group-level on-time compliance scorecards',
        'Export-ready MIS generation for board review and statutory audits',
      ],
      metrics: 'Cryptographic Audit Trail',
    },
  ];

  return (
    <div style={{ minHeight: '100vh', background: '#0B1120', color: '#F8FAFC', fontFamily: 'var(--font-family)' }}>
      {/* ── Top Executive Navigation Bar ── */}
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 100,
          background: 'rgba(11, 17, 32, 0.85)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          padding: '0 32px',
        }}
      >
        <div
          style={{
            maxWidth: 1280,
            margin: '0 auto',
            height: 72,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          {/* Brand Logo */}
          <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: 10,
                background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
                boxShadow: '0 0 20px rgba(37, 99, 235, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 800,
                fontSize: 20,
                color: '#FFF',
              }}
            >
              ⚖️
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 18, fontWeight: 800, letterSpacing: '-0.02em', color: '#FFF' }}>
                  CompliCal
                </span>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    padding: '2px 6px',
                    borderRadius: 4,
                    background: 'rgba(37, 99, 235, 0.2)',
                    color: '#60A5FA',
                    border: '1px solid rgba(59, 130, 246, 0.3)',
                    letterSpacing: '0.05em',
                  }}
                >
                  ENTERPRISE
                </span>
              </div>
              <div style={{ fontSize: 11, color: '#94A3B8', letterSpacing: '0.02em', fontWeight: 600 }}>BALAJI GROUPS</div>
            </div>
          </Link>

          {/* Navigation Links */}
          <nav style={{ display: 'flex', alignItems: 'center', gap: 28 }} className="hidden md:flex">
            <a href="#architecture" style={{ color: '#94A3B8', fontSize: 13, fontWeight: 500, textDecoration: 'none', transition: 'color 0.15s' }}>
              Architecture
            </a>
            <a href="#features" style={{ color: '#94A3B8', fontSize: 13, fontWeight: 500, textDecoration: 'none', transition: 'color 0.15s' }}>
              Core Features
            </a>
            <a href="#workflow" style={{ color: '#94A3B8', fontSize: 13, fontWeight: 500, textDecoration: 'none', transition: 'color 0.15s' }}>
              Lifecycle Workflow
            </a>
            <a href="#authorities" style={{ color: '#94A3B8', fontSize: 13, fontWeight: 500, textDecoration: 'none', transition: 'color 0.15s' }}>
              Regulatory Coverage
            </a>
            <a href="#governance" style={{ color: '#94A3B8', fontSize: 13, fontWeight: 500, textDecoration: 'none', transition: 'color 0.15s' }}>
              Governance & RBAC
            </a>
          </nav>

          {/* User Auth CTA */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Link
              href="/login"
              style={{
                textDecoration: 'none',
                background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
                color: '#FFF',
                padding: '9px 20px',
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 600,
                boxShadow: '0 4px 14px rgba(37, 99, 235, 0.35)',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <span>Portal Sign In</span>
              <span>→</span>
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero Section ── */}
      <section
        style={{
          position: 'relative',
          padding: '80px 32px 100px',
          overflow: 'hidden',
          background: 'radial-gradient(circle at 50% 15%, rgba(37, 99, 235, 0.15) 0%, transparent 60%)',
        }}
      >
        <div style={{ maxWidth: 1200, margin: '0 auto', textAlign: 'center', position: 'relative', zIndex: 2 }}>
          {/* Status Badge */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '6px 16px',
              borderRadius: 30,
              background: 'rgba(37, 99, 235, 0.1)',
              border: '1px solid rgba(59, 130, 246, 0.3)',
              color: '#60A5FA',
              fontSize: 12,
              fontWeight: 600,
              marginBottom: 24,
            }}
          >
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10B981', boxShadow: '0 0 10px #10B981' }} />
            Operational Platform Active • Statutory Year 2026–2027
          </div>

          {/* Main Title */}
          <h1
            style={{
              fontSize: 'clamp(2.5rem, 5vw, 4rem)',
              fontWeight: 800,
              letterSpacing: '-0.03em',
              lineHeight: 1.15,
              margin: '0 auto 24px',
              maxWidth: 960,
              background: 'linear-gradient(180deg, #FFFFFF 0%, #CBD5E1 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            Centralized Multi-Firm Compliance Operating Platform
          </h1>

          {/* Subtitle */}
          <p
            style={{
              fontSize: 'clamp(1rem, 2vw, 1.25rem)',
              color: '#94A3B8',
              maxWidth: 760,
              margin: '0 auto 36px',
              lineHeight: 1.6,
            }}
          >
            Enterprise statutory calendar automation, multi-entity holding orchestration, four-eye verification workflows, and immutable audit trails engineered for zero-default governance.
          </p>

          {/* Hero CTAs */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: 16, flexWrap: 'wrap', marginBottom: 60 }}>
            <Link
              href="/login"
              style={{
                textDecoration: 'none',
                background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
                color: '#FFF',
                padding: '14px 32px',
                borderRadius: 10,
                fontSize: 15,
                fontWeight: 700,
                boxShadow: '0 10px 25px -5px rgba(37, 99, 235, 0.5)',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
              }}
            >
              <span>Access Compliance Portal</span>
              <span>→</span>
            </Link>

            <a
              href="#architecture"
              style={{
                textDecoration: 'none',
                background: 'rgba(255, 255, 255, 0.05)',
                color: '#E2E8F0',
                padding: '14px 28px',
                borderRadius: 10,
                fontSize: 15,
                fontWeight: 600,
                border: '1px solid rgba(255, 255, 255, 0.12)',
              }}
            >
              Explore Architecture ↓
            </a>
          </div>

          {/* Hero Glassmorphic Interface Graphic */}
          <div
            style={{
              maxWidth: 1060,
              margin: '0 auto',
              background: 'rgba(15, 23, 42, 0.75)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              borderRadius: 20,
              border: '1px solid rgba(255, 255, 255, 0.12)',
              padding: 24,
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
              textAlign: 'left',
            }}
          >
            {/* Window Top Controls */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 16, borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#EF4444' }} />
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#F59E0B' }} />
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#10B981' }} />
                <span style={{ marginLeft: 10, fontSize: 12, color: '#64748B', fontWeight: 600 }}>CompliCal Executive Overview • BALAJI GROUPS Edition</span>
              </div>
              <span style={{ fontSize: 11, background: 'rgba(16, 185, 129, 0.1)', color: '#34D399', padding: '3px 10px', borderRadius: 20, fontWeight: 700 }}>
                ● 100% REGULATORY SYNCHRONIZED
              </span>
            </div>

            {/* Dashboard Simulated Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, margin: '20px 0' }}>
              <div style={{ background: 'rgba(255, 255, 255, 0.03)', borderRadius: 12, padding: 18, border: '1px solid rgba(255, 255, 255, 0.06)' }}>
                <div style={{ fontSize: 12, color: '#94A3B8', marginBottom: 6 }}>Group Filing Health</div>
                <div style={{ fontSize: 26, fontWeight: 800, color: '#10B981' }}>99.8%</div>
                <div style={{ fontSize: 11, color: '#64748B', marginTop: 4 }}>Zero Statutory Defaults</div>
              </div>

              <div style={{ background: 'rgba(255, 255, 255, 0.03)', borderRadius: 12, padding: 18, border: '1px solid rgba(255, 255, 255, 0.06)' }}>
                <div style={{ fontSize: 12, color: '#94A3B8', marginBottom: 6 }}>Scheduled Tasks</div>
                <div style={{ fontSize: 26, fontWeight: 800, color: '#38BDF8' }}>50+ Active</div>
                <div style={{ fontSize: 11, color: '#64748B', marginTop: 4 }}>FY 2026–2027 Calendar</div>
              </div>

              <div style={{ background: 'rgba(255, 255, 255, 0.03)', borderRadius: 12, padding: 18, border: '1px solid rgba(255, 255, 255, 0.06)' }}>
                <div style={{ fontSize: 12, color: '#94A3B8', marginBottom: 6 }}>Governance & RBAC</div>
                <div style={{ fontSize: 26, fontWeight: 800, color: '#A78BFA' }}>110 Controls</div>
                <div style={{ fontSize: 11, color: '#64748B', marginTop: 4 }}>1 Super Admin + Role Delegation</div>
              </div>

              <div style={{ background: 'rgba(255, 255, 255, 0.03)', borderRadius: 12, padding: 18, border: '1px solid rgba(255, 255, 255, 0.06)' }}>
                <div style={{ fontSize: 12, color: '#94A3B8', marginBottom: 6 }}>Audit Integrity</div>
                <div style={{ fontSize: 26, fontWeight: 800, color: '#FBBF24' }}>Cryptographic</div>
                <div style={{ fontSize: 11, color: '#64748B', marginTop: 4 }}>Tamper-Evident History</div>
              </div>
            </div>

            {/* Simulated Live Task Queue */}
            <div style={{ background: 'rgba(0, 0, 0, 0.3)', borderRadius: 12, padding: 16, border: '1px solid rgba(255, 255, 255, 0.04)' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#CBD5E1', marginBottom: 12, display: 'flex', justifyContent: 'space-between' }}>
                <span>Statutory Compliance Queue (Live Simulation)</span>
                <span style={{ color: '#60A5FA', fontSize: 11 }}>Auto-Refreshed</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[
                  { id: 'GSTR-1', cat: 'GST', name: 'GSTR-1 Monthly Return', due: '11th of every month', status: 'Approved', badge: '#10B981' },
                  { id: 'GSTR-3B', cat: 'GST', name: 'GSTR-3B Summary Return & Challan', due: '20th of every month', status: 'Submitted', badge: '#3B82F6' },
                  { id: 'TDS-26Q', cat: 'TDS', name: 'Quarterly TDS Return (Non-Salary)', due: '31st of quarter end', status: 'In Progress', badge: '#F59E0B' },
                  { id: 'PF-ECR', cat: 'Labour', name: 'PF Monthly Electronic Challan', due: '15th of every month', status: 'Ready', badge: '#8B5CF6' },
                ].map(t => (
                  <div
                    key={t.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 14px',
                      borderRadius: 8,
                      background: 'rgba(255, 255, 255, 0.02)',
                      border: '1px solid rgba(255, 255, 255, 0.04)',
                      fontSize: 12,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span style={{ fontWeight: 700, color: '#60A5FA', minWidth: 60 }}>{t.id}</span>
                      <span style={{ color: '#E2E8F0', fontWeight: 500 }}>{t.name}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                      <span style={{ color: '#94A3B8', fontSize: 11 }}>{t.due}</span>
                      <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 4, background: `${t.badge}20`, color: t.badge }}>
                        {t.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Enterprise Impact Strip ── */}
      <section
        style={{
          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          background: 'rgba(15, 23, 42, 0.6)',
          padding: '40px 32px',
        }}
      >
        <div
          style={{
            maxWidth: 1200,
            margin: '0 auto',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: 32,
            textAlign: 'center',
          }}
        >
          <div>
            <div style={{ fontSize: 36, fontWeight: 800, color: '#FFF' }}>100%</div>
            <div style={{ fontSize: 13, color: '#94A3B8', marginTop: 4 }}>Centralized Multi-Firm Isolation</div>
          </div>
          <div>
            <div style={{ fontSize: 36, fontWeight: 800, color: '#38BDF8' }}>110</div>
            <div style={{ fontSize: 13, color: '#94A3B8', marginTop: 4 }}>Granular RBAC Permissions</div>
          </div>
          <div>
            <div style={{ fontSize: 36, fontWeight: 800, color: '#A78BFA' }}>16</div>
            <div style={{ fontSize: 13, color: '#94A3B8', marginTop: 4 }}>Statutory Compliance Categories</div>
          </div>
          <div>
            <div style={{ fontSize: 36, fontWeight: 800, color: '#10B981' }}>0%</div>
            <div style={{ fontSize: 13, color: '#94A3B8', marginTop: 4 }}>Statutory Delay Tolerance</div>
          </div>
        </div>
      </section>

      {/* ── Core Platform Architecture ── */}
      <section id="architecture" style={{ padding: '100px 32px', maxWidth: 1240, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 64 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#60A5FA', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>
            Enterprise Capabilities
          </div>
          <h2 style={{ fontSize: 'clamp(2rem, 3.5vw, 2.75rem)', fontWeight: 800, color: '#FFF', margin: '0 0 16px' }}>
            Built for High-Stakes Corporate Operations
          </h2>
          <p style={{ fontSize: 15, color: '#94A3B8', maxWidth: 680, margin: '0 auto' }}>
            Every module is tightly integrated to eliminate filing oversights, guarantee document integrity, and enforce strict administrative accountability.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 24 }}>
          {[
            {
              icon: '🏢',
              title: 'Multi-Entity Holding Hierarchy',
              desc: 'Consolidate multiple companies, private limiteds, LLPs, and partnership firms under unified governance while restricting operational user access to specific entities.',
              tag: 'Firm Access Isolation',
            },
            {
              icon: '📅',
              title: 'Dynamic FY Calendar Generation',
              desc: 'Generate complete 12-month compliance calendars in one click based on applicability rules and statutory entity registrations.',
              tag: 'Rule-Based Automation',
            },
            {
              icon: '👁️',
              title: 'Strict Four-Eye Review Workflow',
              desc: 'Enforce quality control with mandatory review stages. Preparers record filing data and upload documents, while supervisors and Super Admin verify and approve.',
              tag: 'Segregation of Duties',
            },
            {
              icon: '👑',
              title: 'Single Root Super Admin & RBAC',
              desc: 'Guaranteed single root authority (Raghu G R) with full rights to delegate administrative access, configure custom roles, and fine-tune modular permissions.',
              tag: 'Hierarchical Governance',
            },
            {
              icon: '📊',
              title: 'Executive MIS & Heatmap Analytics',
              desc: 'Track ARN acknowledgements, tax amounts, challan references, and export structured CSV/Excel reports for executive audits and tax reviews.',
              tag: 'Real-Time Visibility',
            },
            {
              icon: '🔒',
              title: 'Statutory Document & Proof Vault',
              desc: 'Secure document management supporting up to 25MB statutory attachments with firm-level segregation and complete time-stamped versioning.',
              tag: '25MB Encrypted Vault',
            },
          ].map((feat, idx) => (
            <div
              key={idx}
              style={{
                background: 'rgba(15, 23, 42, 0.6)',
                borderRadius: 16,
                border: '1px solid rgba(255, 255, 255, 0.08)',
                padding: 28,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                transition: 'transform 0.2s ease, border-color 0.2s ease',
              }}
            >
              <div>
                <div style={{ fontSize: 32, marginBottom: 16 }}>{feat.icon}</div>
                <h3 style={{ fontSize: 18, fontWeight: 700, color: '#FFF', margin: '0 0 10px' }}>{feat.title}</h3>
                <p style={{ fontSize: 14, color: '#94A3B8', lineHeight: 1.6, margin: '0 0 20px' }}>{feat.desc}</p>
              </div>
              <div>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    padding: '3px 10px',
                    borderRadius: 20,
                    background: 'rgba(37, 99, 235, 0.15)',
                    color: '#60A5FA',
                    border: '1px solid rgba(59, 130, 246, 0.25)',
                  }}
                >
                  {feat.tag}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Interactive 4-Stage Compliance Lifecycle Simulator ── */}
      <section id="workflow" style={{ background: 'rgba(15, 23, 42, 0.4)', borderTop: '1px solid rgba(255, 255, 255, 0.08)', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', padding: '100px 32px' }}>
        <div style={{ maxWidth: 1140, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 50 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#60A5FA', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>
              Standard Operating Procedure
            </div>
            <h2 style={{ fontSize: 'clamp(2rem, 3.5vw, 2.75rem)', fontWeight: 800, color: '#FFF', margin: '0 0 16px' }}>
              The 4-Stage Compliance Verification Lifecycle
            </h2>
            <p style={{ fontSize: 15, color: '#94A3B8', maxWidth: 640, margin: '0 auto' }}>
              Explore how CompliCal systematically moves statutory obligations from automated scheduling through to Super Admin sign-off.
            </p>
          </div>

          {/* Step Selector Tabs */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 28 }} className="hidden sm:grid">
            {stages.map((st, idx) => {
              const isActive = activeStage === idx;
              return (
                <button
                  key={st.id}
                  onClick={() => setActiveStage(idx)}
                  style={{
                    background: isActive ? 'linear-gradient(135deg, rgba(37, 99, 235, 0.2) 0%, rgba(29, 78, 216, 0.2) 100%)' : 'rgba(255, 255, 255, 0.03)',
                    border: isActive ? '1px solid #3B82F6' : '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: 12,
                    padding: '16px 18px',
                    textAlign: 'left',
                    cursor: 'pointer',
                    color: isActive ? '#FFF' : '#94A3B8',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div style={{ fontSize: 11, fontWeight: 700, color: isActive ? '#60A5FA' : '#64748B', textTransform: 'uppercase', marginBottom: 4 }}>
                    STAGE {idx + 1}
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: isActive ? '#FFF' : '#CBD5E1' }}>{st.title.split('. ')[1]}</div>
                </button>
              );
            })}
          </div>

          {/* Active Stage Detail Card */}
          <div
            style={{
              background: 'rgba(15, 23, 42, 0.85)',
              borderRadius: 18,
              border: '1px solid rgba(255, 255, 255, 0.12)',
              padding: '36px 40px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16, marginBottom: 24 }}>
              <div>
                <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: 'rgba(16, 185, 129, 0.15)', color: '#34D399' }}>
                  {stages[activeStage].badge}
                </span>
                <h3 style={{ fontSize: 24, fontWeight: 800, color: '#FFF', margin: '12px 0 6px' }}>{stages[activeStage].title}</h3>
                <div style={{ fontSize: 14, color: '#60A5FA', fontWeight: 600 }}>{stages[activeStage].subtitle}</div>
              </div>
              <div style={{ background: 'rgba(255, 255, 255, 0.05)', padding: '8px 16px', borderRadius: 8, border: '1px solid rgba(255, 255, 255, 0.08)', fontSize: 13, color: '#CBD5E1' }}>
                🛡️ {stages[activeStage].metrics}
              </div>
            </div>

            <p style={{ fontSize: 16, color: '#CBD5E1', lineHeight: 1.6, marginBottom: 28 }}>{stages[activeStage].desc}</p>

            <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: 24 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', marginBottom: 16 }}>Key Enterprise Controls:</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {stages[activeStage].details.map((d, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 14, color: '#E2E8F0' }}>
                    <span style={{ color: '#10B981', fontWeight: 800 }}>✓</span>
                    <span>{d}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Regulatory Coverage Authorities Matrix ── */}
      <section id="authorities" style={{ padding: '100px 32px', maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 56 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#60A5FA', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>
            Compliance Coverage
          </div>
          <h2 style={{ fontSize: 'clamp(2rem, 3.5vw, 2.75rem)', fontWeight: 800, color: '#FFF', margin: '0 0 16px' }}>
            Comprehensive Statutory Authority Support
          </h2>
          <p style={{ fontSize: 15, color: '#94A3B8', maxWidth: 600, margin: '0 auto' }}>
            Fully configured master libraries mapped against Indian statutory and legal bodies.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 20 }}>
          {[
            { code: 'GST', name: 'Goods & Services Tax', body: 'CBIC / GSTN', color: '#10B981', items: 'GSTR-1, GSTR-3B, GSTR-9, ITC' },
            { code: 'IT', name: 'Direct Income Tax', body: 'Income Tax Department', color: '#3B82F6', items: 'Advance Tax, ITR, 29B Audit' },
            { code: 'TDS', name: 'Tax Deducted at Source', body: 'TRACES / ITD', color: '#8B5CF6', items: '24Q, 26Q, 27Q, Form 16/16A' },
            { code: 'MCA', name: 'Corporate Affairs & ROC', body: 'Ministry of Corporate Affairs', color: '#F59E0B', items: 'AOC-4, MGT-7, DIR-3 KYC' },
            { code: 'PF', name: 'Employees Provident Fund', body: 'EPFO Portal', color: '#EF4444', items: 'ECR Challan, Annual Returns' },
            { code: 'ESI', name: 'Employee State Insurance', body: 'ESIC Portal', color: '#EC4899', items: 'Monthly Contribution, Biannual' },
            { code: 'PT', name: 'Professional Tax', body: 'State PT Authorities', color: '#14B8A6', items: 'Monthly Payment, Annual PT Return' },
            { code: 'LABOUR', name: 'Labour & Shop Act', body: 'State Labour Commissions', color: '#F97316', items: 'Factory Act, Minimum Wages' },
          ].map(c => (
            <div
              key={c.code}
              style={{
                background: 'rgba(15, 23, 42, 0.5)',
                borderRadius: 14,
                border: '1px solid rgba(255, 255, 255, 0.08)',
                padding: 22,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <span style={{ fontSize: 14, fontWeight: 800, color: c.color, background: `${c.color}15`, padding: '3px 8px', borderRadius: 6 }}>
                    {c.code}
                  </span>
                  <span style={{ fontSize: 11, color: '#64748B' }}>{c.body}</span>
                </div>
                <h4 style={{ fontSize: 15, fontWeight: 700, color: '#FFF', margin: '0 0 6px' }}>{c.name}</h4>
                <p style={{ fontSize: 12, color: '#94A3B8', margin: 0 }}>{c.items}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Security & Governance Architecture ── */}
      <section id="governance" style={{ background: 'rgba(15, 23, 42, 0.6)', borderTop: '1px solid rgba(255, 255, 255, 0.08)', padding: '90px 32px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', textAlign: 'center' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#A78BFA', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>
            Security & Governance
          </div>
          <h2 style={{ fontSize: 'clamp(2rem, 3.5vw, 2.5rem)', fontWeight: 800, color: '#FFF', margin: '0 0 20px' }}>
            Cryptographically Grounded Enterprise Protection
          </h2>
          <p style={{ fontSize: 15, color: '#94A3B8', maxWidth: 700, margin: '0 auto 48px' }}>
            Designed strictly to avoid multi-admin conflicts, unauthorized role escalation, and unverified filings.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24, textAlign: 'left' }}>
            <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: 24, borderRadius: 14, border: '1px solid rgba(255, 255, 255, 0.06)' }}>
              <div style={{ fontSize: 24, marginBottom: 12 }}>👑</div>
              <h4 style={{ fontSize: 16, fontWeight: 700, color: '#FFF', margin: '0 0 8px' }}>Single Super Admin Guard</h4>
              <p style={{ fontSize: 13, color: '#94A3B8', margin: 0, lineHeight: 1.6 }}>
                Strict root authority (Raghu G R) protected by immutable system code. No second Super Admin can be created or promoted.
              </p>
            </div>

            <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: 24, borderRadius: 14, border: '1px solid rgba(255, 255, 255, 0.06)' }}>
              <div style={{ fontSize: 24, marginBottom: 12 }}>🛡️</div>
              <h4 style={{ fontSize: 16, fontWeight: 700, color: '#FFF', margin: '0 0 8px' }}>Delegated Admin & User Control</h4>
              <p style={{ fontSize: 13, color: '#94A3B8', margin: 0, lineHeight: 1.6 }}>
                Granular capability delegation allowing Admins to oversee staff and firms without risking root system configuration changes.
              </p>
            </div>

            <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: 24, borderRadius: 14, border: '1px solid rgba(255, 255, 255, 0.06)' }}>
              <div style={{ fontSize: 24, marginBottom: 12 }}>📜</div>
              <h4 style={{ fontSize: 16, fontWeight: 700, color: '#FFF', margin: '0 0 8px' }}>Immutable Audit Logging</h4>
              <p style={{ fontSize: 13, color: '#94A3B8', margin: 0, lineHeight: 1.6 }}>
                Every password update, task state transition, and document modification writes an immutable audit record with actor IP and timestamps.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── High-Impact CTA Banner ── */}
      <section style={{ padding: '80px 32px 100px', textAlign: 'center' }}>
        <div
          style={{
            maxWidth: 960,
            margin: '0 auto',
            background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.2) 0%, rgba(79, 70, 229, 0.2) 100%)',
            borderRadius: 24,
            border: '1px solid rgba(59, 130, 246, 0.3)',
            padding: '60px 40px',
            boxShadow: '0 25px 50px -12px rgba(37, 99, 235, 0.25)',
          }}
        >
          <h2 style={{ fontSize: 'clamp(1.75rem, 3vw, 2.5rem)', fontWeight: 800, color: '#FFF', margin: '0 0 16px' }}>
            Ready to Secure Your Organization&apos;s Compliances?
          </h2>
          <p style={{ fontSize: 15, color: '#CBD5E1', maxWidth: 600, margin: '0 auto 36px', lineHeight: 1.6 }}>
            Sign in as Super Admin Raghu G R or authorized staff to access your centralized multi-firm statutory workspace.
          </p>
          <Link
            href="/login"
            style={{
              textDecoration: 'none',
              background: '#2563EB',
              color: '#FFF',
              padding: '16px 36px',
              borderRadius: 10,
              fontSize: 16,
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 10,
              boxShadow: '0 10px 20px -5px rgba(37, 99, 235, 0.6)',
            }}
          >
            <span>Sign In to CompliCal</span>
            <span>→</span>
          </Link>
        </div>
      </section>

      {/* ── Corporate Footer ── */}
      <footer
        style={{
          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          background: '#070B14',
          padding: '48px 32px 36px',
          color: '#64748B',
          fontSize: 13,
        }}
      >
        <div
          style={{
            maxWidth: 1200,
            margin: '0 auto',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 20,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 18 }}>⚖️</span>
            <div>
              <span style={{ color: '#FFF', fontWeight: 700 }}>BALAJI GROUPS — CompliCal</span>
              <span style={{ margin: '0 8px' }}>•</span>
              <span>Enterprise Compliance Operating Standard</span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 24 }}>
            <Link href="/login" style={{ color: '#94A3B8', textDecoration: 'none' }}>
              Portal Sign In
            </Link>
            <Link href="/login" style={{ color: '#94A3B8', textDecoration: 'none' }}>
              Executive Dashboard
            </Link>
            <a href="#governance" style={{ color: '#94A3B8', textDecoration: 'none' }}>
              Governance Protocol
            </a>
          </div>

          <div>All Rights Reserved © 2026 BALAJI GROUPS</div>
        </div>
      </footer>
    </div>
  );
}
