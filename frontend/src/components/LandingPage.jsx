import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import GraniteBlock3D from './GraniteBlock3D';
import LiveBadge from './LiveBadge';
import {
  Mountain, Cpu, Shield, BarChart3, CheckCircle, ArrowRight,
  Camera, Scale, FileText, Truck, Layers, Globe, Award, Zap, Search, ShieldCheck
} from 'lucide-react';

const FEATURES = [
  {
    icon: Camera, color: 'var(--primary)', bg: 'var(--bg-blue)',
    title: 'AI-Powered Measurement',
    desc: 'Photograph granite blocks from multiple angles — our AI instantly calculates exact length, breadth, and height using computer vision.',
  },
  {
    icon: Shield, color: 'var(--success)', bg: 'var(--bg-mint)',
    title: 'Automated Seigniorage',
    desc: 'Instantly classify blocks into Above/Below Gangsaw tiers and compute exact government fees — eliminating manual assessment errors.',
  },
  {
    icon: FileText, color: 'var(--accent)', bg: 'var(--bg-warm)',
    title: 'Digital Audit Trail',
    desc: 'Every block gets a unique ID with GPS tags, timestamps, and immutable records from quarry to dispatch.',
  },
  {
    icon: Scale, color: 'var(--violet)', bg: 'var(--bg-violet)',
    title: 'Weighbridge Validation',
    desc: 'Cross-validate AI-computed weights with physical weighbridge readings — automatic mismatch alerts prevent revenue leakage.',
  },
  {
    icon: Truck, color: 'var(--info)', bg: '#E0F2FE',
    title: 'OMEPS Integration',
    desc: 'Seamless e-permit generation and dispatch management integrated with the existing OMEPS 2.0 mining portal.',
  },
  {
    icon: BarChart3, color: '#7C3AED', bg: 'var(--bg-violet)',
    title: 'Live Analytics',
    desc: 'Real-time dashboards for DMGO officers — block status, seigniorage collection, quarry performance, all in one view.',
  },
];

const STEPS = [
  { n: '01', title: 'Capture Photos', desc: 'Quarry operator takes 4 standardised photos of the block using mobile app' },
  { n: '02', title: 'AI Measures', desc: 'System calculates L, B, H from photos and classifies block grade automatically' },
  { n: '03', title: 'DMGO Reviews', desc: 'District officer verifies measurements digitally — no field visit required' },
  { n: '04', title: 'e-Permit Issued', desc: 'Digital permit generated instantly; block dispatched with weighbridge cross-check' },
];

const STATS = [
  { value: '26', label: 'Mining Districts Monitored', icon: Globe },
  { value: '14,414+', label: 'Blocks Tracked Digitally', icon: Layers },
  { value: '₹34.2 Cr', label: 'Revenue Protected', icon: Award },
  { value: '99.2%', label: 'AI Measurement Precision', icon: Cpu },
];

const ROLES = [
  { role: 'operator', label: 'Quarry Operator', color: 'var(--primary)', desc: 'Register & photograph granite blocks with AI 3D volume' },
  { role: 'dmgo', label: 'DMGO Officer', color: 'var(--success)', desc: 'Approve measurements, audit seigniorage & issue permits' },
  { role: 'weighbridge', label: 'Weighbridge Operator', color: 'var(--accent)', desc: 'Validate physical weights with ±5% auto tolerance' },
  { role: 'vigilance', label: 'Vigilance & Enforcement', color: '#EF4444', desc: 'Mobile QR checkpost scan, vehicle audits & Form G seizure' },
  { role: 'admin', label: 'Administrator', color: 'var(--violet)', desc: 'Statewide telemetry, OMEPS 2.0 sync & RBAC access' },
];

export default function LandingPage() {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [trackInput, setTrackInput] = useState('');

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div style={{ minHeight: '100vh', background: '#F0F6FF', fontFamily: "'Inter', sans-serif" }}>

      {/* ── Sticky Navbar ────────────────────────────────────────────────── */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 200,
        background: scrolled ? '#fff' : 'transparent',
        boxShadow: scrolled ? '0 2px 16px rgba(26,86,219,0.1)' : 'none',
        transition: 'all 0.3s ease',
        padding: '0 5%', height: 68,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 38, height: 38, borderRadius: 10,
              background: 'linear-gradient(135deg, #1A56DB, #3B82F6)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(26,86,219,0.3)',
            }}>
              <Mountain size={20} color="#fff" />
            </div>
            <div>
              <div style={{ fontWeight: 900, fontSize: '1rem', color: '#0F1729', letterSpacing: '-0.02em' }}>
                Smart Granite
              </div>
              <div style={{ fontSize: '0.6rem', color: '#1A56DB', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                AP Mines & Geology
              </div>
            </div>
          </div>
          <LiveBadge label="AP MINES LIVE" />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            onClick={() => navigate('/track')}
            className="btn btn-outline btn-sm"
            style={{ borderRadius: 20, display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700 }}
          >
            <Search size={14} color="#1A56DB" /> Track Block
          </button>
          <button
            onClick={() => navigate('/login')}
            className="btn btn-primary btn-sm"
            style={{ borderRadius: 20, padding: '8px 18px' }}
          >
            Login <ArrowRight size={14} />
          </button>
        </div>
      </nav>

      {/* ── Hero Section ──────────────────────────────────────────────────── */}
      <section style={{
        minHeight: '100vh',
        display: 'flex', alignItems: 'center',
        padding: '100px 5% 60px',
        background: 'linear-gradient(135deg, #EEF4FF 0%, #F0F9FF 50%, #FFF8F0 100%)',
        position: 'relative', overflow: 'hidden',
      }}>
        {/* Background decorations */}
        <div style={{
          position: 'absolute', top: -80, right: -80, width: 400, height: 400,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(26,86,219,0.08) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', bottom: -40, left: -40, width: 300, height: 300,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(230,126,34,0.07) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        <div style={{ maxWidth: 1200, margin: '0 auto', width: '100%', display: 'flex', alignItems: 'center', gap: 60, flexWrap: 'wrap' }}>

          {/* Left copy */}
          <div style={{ flex: '1 1 400px' }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              background: '#DBEAFE', color: '#1A56DB', padding: '6px 14px',
              borderRadius: 20, fontSize: '0.75rem', fontWeight: 700,
              marginBottom: 20, border: '1px solid #BFDBFE',
            }}>
              <Cpu size={13} /> AI-Powered Mining Technology
            </div>

            <h1 style={{
              fontSize: 'clamp(2rem, 4vw, 3.2rem)',
              fontWeight: 900, color: '#0F1729', lineHeight: 1.15,
              marginBottom: 20, letterSpacing: '-0.03em',
            }}>
              Automate Granite Block{' '}
              <span style={{
                background: 'linear-gradient(135deg, #1A56DB, #0EA5E9)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              }}>
                Measurement
              </span>{' '}
              &amp; Seigniorage
            </h1>

            <p style={{ fontSize: '1.05rem', color: '#1E3A8A', lineHeight: 1.7, marginBottom: 32, maxWidth: 500 }}>
              The AP Department of Mines &amp; Geology's AI solution for accurate granite block
              volume estimation, automated fee classification, and end-to-end digital traceability
              from quarry to dispatch.
            </p>

            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <button
                onClick={() => navigate('/login')}
                className="btn btn-primary"
                style={{ fontSize: '0.95rem', padding: '12px 28px', borderRadius: 12 }}
              >
                Access Portal <ArrowRight size={17} />
              </button>
              <button
                onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })}
                className="btn btn-outline"
                style={{ fontSize: '0.95rem', padding: '12px 28px', borderRadius: 12 }}
              >
                How it Works
              </button>
            </div>

            {/* Public Block Verification / Tracking Bar */}
            <div style={{
              marginTop: 28, background: '#fff', padding: '16px 20px',
              borderRadius: 14, border: '1px solid #BFDBFE',
              boxShadow: '0 6px 24px rgba(26,86,219,0.08)',
              maxWidth: 520,
            }}>
              <div style={{
                fontSize: '0.72rem', fontWeight: 800, color: '#1A56DB',
                textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10,
                display: 'flex', alignItems: 'center', gap: 6,
              }}>
                <ShieldCheck size={14} color="#10B981" /> Public Block Verification &amp; Tracking
              </div>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (trackInput.trim()) {
                    navigate(`/track/${encodeURIComponent(trackInput.trim())}`);
                  }
                }}
                style={{ display: 'flex', gap: 8 }}
              >
                <div style={{ position: 'relative', flex: 1 }}>
                  <input
                    placeholder="Enter Block ID (e.g. BLK-Q0186-0001)..."
                    value={trackInput}
                    onChange={(e) => setTrackInput(e.target.value)}
                    style={{
                      width: '100%', padding: '10px 14px', borderRadius: 8,
                      border: '1px solid #BFDBFE', outline: 'none', background: '#F8FAFC',
                      fontSize: '0.88rem', fontFamily: "'JetBrains Mono', monospace", fontWeight: 700,
                      color: '#0F1729',
                    }}
                  />
                </div>
                <button
                  type="submit"
                  className="btn btn-accent"
                  style={{ padding: '0 18px', borderRadius: 8, fontWeight: 800, flexShrink: 0 }}
                >
                  Track <ArrowRight size={14} />
                </button>
              </form>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.68rem', color: '#64748B', fontWeight: 600 }}>Try:</span>
                {['BLK-Q0186-0001', 'BLK-Q0001-0001'].map(chip => (
                  <button
                    key={chip}
                    type="button"
                    onClick={() => navigate(`/track/${chip}`)}
                    style={{
                      background: '#EFF6FF', border: '1px solid #DBEAFE', color: '#1A56DB',
                      borderRadius: 12, padding: '2px 8px', fontSize: '0.68rem',
                      fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, cursor: 'pointer',
                    }}
                  >
                    {chip}
                  </button>
                ))}
              </div>
            </div>

            {/* Trust indicators */}
            <div style={{ display: 'flex', gap: 20, marginTop: 40, flexWrap: 'wrap' }}>
              {['✅ RTGS Hackathon Solution', '✅ OMEPS 2.0 Compatible', '✅ AP Mines Dept.'].map(tag => (
                <span key={tag} style={{ fontSize: '0.78rem', color: '#1A56DB', fontWeight: 600 }}>{tag}</span>
              ))}
            </div>
          </div>

          {/* Right — 3D granite block + stats */}
          <div style={{ flex: '1 1 360px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 32 }}>
            <div style={{
              background: '#fff', borderRadius: 24, padding: '40px',
              boxShadow: '0 20px 60px rgba(26,86,219,0.15)',
              border: '1px solid #DBEAFE',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20,
              width: '100%', maxWidth: 380,
            }}>
              {/* Spinning granite block */}
              <GraniteBlock3D size="lg" />

              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#1A56DB', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                  AI Scan Complete
                </div>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0F1729', marginTop: 4 }}>
                  Black Galaxy Granite
                </div>
              </div>

              {/* Fake measurement readout */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, width: '100%' }}>
                {[['LENGTH', '287.4 cm'], ['BREADTH', '162.8 cm'], ['HEIGHT', '141.3 cm']].map(([label, val]) => (
                  <div key={label} style={{ background: '#EFF6FF', borderRadius: 10, padding: '10px 8px', textAlign: 'center', border: '1px solid #BFDBFE' }}>
                    <div style={{ fontSize: '0.55rem', fontWeight: 800, color: '#1A56DB', letterSpacing: '0.08em' }}>{label}</div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#0F1729', fontFamily: "'JetBrains Mono', monospace", marginTop: 3 }}>{val}</div>
                  </div>
                ))}
              </div>

              <div style={{
                width: '100%', padding: '12px 16px', borderRadius: 10,
                background: 'linear-gradient(135deg, #ECFDF5, #D1FAE5)',
                border: '1px solid #6EE7B7',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}>
                <div>
                  <div style={{ fontSize: '0.6rem', fontWeight: 800, color: '#065F46', letterSpacing: '0.08em' }}>SEIGNIORAGE PAYABLE</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#059669', fontFamily: "'JetBrains Mono', monospace" }}>₹ 44,620</div>
                </div>
                <span style={{
                  background: '#D1FAE5', color: '#065F46', padding: '4px 10px',
                  borderRadius: 20, fontSize: '0.6rem', fontWeight: 800,
                  border: '1px solid #6EE7B7', letterSpacing: '0.06em',
                }}>
                  ▲ ABOVE GANGSAW
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats Bar ─────────────────────────────────────────────────────── */}
      <section style={{
        background: 'linear-gradient(135deg, #1A56DB, #1D4ED8)',
        padding: '40px 40px',
      }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 32, textAlign: 'center' }}>
          {STATS.map(({ value, label, icon: Icon }) => (
            <div key={label}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 10 }}>
                <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon size={22} color="#fff" />
                </div>
              </div>
              <div style={{ fontSize: '2rem', fontWeight: 900, color: '#fff', fontFamily: "'JetBrains Mono', monospace" }}>{value}</div>
              <div style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.7)', fontWeight: 600, marginTop: 4 }}>{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features Grid ─────────────────────────────────────────────────── */}
      <section style={{ padding: '80px 40px', background: '#fff' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#1A56DB', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 12 }}>
              Platform Features
            </div>
            <h2 style={{ fontSize: 'clamp(1.6rem, 3vw, 2.4rem)', fontWeight: 900, color: '#0F1729' }}>
              Everything the Department Needs
            </h2>
            <p style={{ color: '#1E3A8A', fontSize: '1rem', marginTop: 12, maxWidth: 560, margin: '12px auto 0' }}>
              A complete digital pipeline from granite block registration to seigniorage collection.
            </p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>
            {FEATURES.map(({ icon: Icon, color, bg, title, desc }) => (
              <div key={title} style={{
                background: '#fff', borderRadius: 16, padding: '24px',
                border: '1px solid #DBEAFE', boxShadow: '0 2px 12px rgba(26,86,219,0.06)',
                transition: 'all 0.2s', cursor: 'default',
              }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(26,86,219,0.12)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 2px 12px rgba(26,86,219,0.06)'; }}
              >
                <div style={{ width: 48, height: 48, borderRadius: 12, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                  <Icon size={22} color={color} />
                </div>
                <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#0F1729', marginBottom: 8 }}>{title}</h3>
                <p style={{ fontSize: '0.85rem', color: '#1E3A8A', lineHeight: 1.65 }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works ──────────────────────────────────────────────────── */}
      <section id="how-it-works" style={{ padding: '80px 40px', background: '#F0F6FF' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#1A56DB', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 12 }}>
              Process Flow
            </div>
            <h2 style={{ fontSize: 'clamp(1.6rem, 3vw, 2.4rem)', fontWeight: 900, color: '#0F1729' }}>
              How Smart Granite Works
            </h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 20 }}>
            {STEPS.map(({ n, title, desc }) => (
              <div key={n} style={{
                background: '#fff', borderRadius: 16, padding: '28px 20px',
                border: '1px solid #DBEAFE', boxShadow: '0 2px 12px rgba(26,86,219,0.06)',
                textAlign: 'center', position: 'relative',
              }}>
                <div style={{
                  width: 48, height: 48, borderRadius: 12,
                  background: 'linear-gradient(135deg, #1A56DB, #3B82F6)',
                  color: '#fff', fontWeight: 900, fontSize: '1rem',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '0 auto 16px', boxShadow: '0 4px 12px rgba(26,86,219,0.3)',
                }}>
                  {n}
                </div>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0F1729', marginBottom: 10 }}>{title}</h4>
                <p style={{ fontSize: '0.82rem', color: '#1E3A8A', lineHeight: 1.6 }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Roles Section ─────────────────────────────────────────────────── */}
      <section style={{ padding: '80px 40px', background: '#fff' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto', textAlign: 'center' }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#1A56DB', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 12 }}>
            Role-Based Access
          </div>
          <h2 style={{ fontSize: 'clamp(1.5rem, 3vw, 2.2rem)', fontWeight: 900, color: '#0F1729', marginBottom: 40 }}>
            Built for Every Stakeholder
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
            {ROLES.map(({ role, label, color, desc }) => (
              <div
                key={role}
                onClick={() => navigate('/login')}
                style={{
                  padding: '24px 16px', borderRadius: 14, cursor: 'pointer',
                  border: `2px solid ${color}30`,
                  background: '#FAFCFF',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = color; e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = `0 8px 20px ${color}20`; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = `${color}30`; e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; }}
              >
                <div style={{ width: 12, height: 12, borderRadius: '50%', background: color, margin: '0 auto 14px' }} />
                <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0F1729', marginBottom: 6 }}>{label}</div>
                <div style={{ fontSize: '0.78rem', color: '#1E3A8A' }}>{desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA Footer ────────────────────────────────────────────────────── */}
      <section style={{
        padding: '80px 40px', textAlign: 'center',
        background: 'linear-gradient(135deg, #1A56DB 0%, #1E40AF 100%)',
      }}>
        <h2 style={{ fontSize: 'clamp(1.5rem, 3vw, 2.2rem)', fontWeight: 900, color: '#fff', marginBottom: 16 }}>
          Ready to Transform Mining Administration?
        </h2>
        <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: '1rem', marginBottom: 32 }}>
          Log in with your assigned credentials to access the Smart Granite Portal.
        </p>
        <button
          onClick={() => navigate('/login')}
          style={{
            background: '#E67E22', color: '#fff', border: 'none',
            padding: '14px 36px', borderRadius: 12, fontSize: '1rem', fontWeight: 800,
            cursor: 'pointer', boxShadow: '0 6px 20px rgba(230,126,34,0.4)',
            display: 'inline-flex', alignItems: 'center', gap: 10,
            transition: 'all 0.2s',
          }}
          onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 10px 30px rgba(230,126,34,0.5)'; }}
          onMouseLeave={e => { e.currentTarget.style.transform = ''; }}
        >
          Access Portal Now <ArrowRight size={18} />
        </button>
        <div style={{ marginTop: 48, paddingTop: 32, borderTop: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem' }}>
          © 2025 Smart Granite — AP Department of Mines &amp; Geology · RTGS AI Hackathon
        </div>
      </section>
    </div>
  );
}
