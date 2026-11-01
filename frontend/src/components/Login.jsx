import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, getApiBaseUrl } from '../api';
import GraniteBlock3D from './GraniteBlock3D';
import ServerConfigModal from './ServerConfigModal';
import { Mountain, Eye, EyeOff, LogIn, AlertCircle, CheckCircle, Wifi, Settings } from 'lucide-react';


const DEMO_CREDS = [
  { role: 'citizen',     username: 'citizen',     password: 'citizen123',     color: '#0D9488', label: 'Citizen / Buyer Portal' },
  { role: 'operator',    username: 'leaseholder', password: 'leaseholder123', color: '#1A56DB', label: 'Quarry Lessee / Operator' },
  { role: 'dmgo',        username: 'dmgo',        password: 'dmgo123',        color: '#10B981', label: 'DMGO Field Officer' },
  { role: 'weighbridge', username: 'weighbridge', password: 'weighbridge123', color: '#E67E22', label: 'Weighbridge Operator' },
  { role: 'enforcement', username: 'vigilance',   password: 'vigilance123',   color: '#EF4444', label: 'Vigilance Squad (Road)' },
  { role: 'admin',       username: 'admin',       password: 'admin123',       color: '#7C3AED', label: 'Mines Administrator' },
];


export default function Login({ onLogin }) {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showServerModal, setShowServerModal] = useState(false);


  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const data = await api.login(username, password);
      if (data.access_token) {
        localStorage.setItem('token', data.access_token);
        const user = await api.getMe();
        if (onLogin) onLogin(user);
      } else {
        setError(data.detail || 'Login failed. Check your credentials.');
      }
    } catch (err) {
      setError(err.message || 'Login failed.');
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = (cred) => {
    setUsername(cred.username);
    setPassword(cred.password || 'password123');
    setError('');
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexWrap: 'wrap',
      background: 'linear-gradient(135deg, #EEF4FF 0%, #F0F9FF 60%, #FFF8F0 100%)',
    }}>

      {/* ── Left Panel — 3D Hero ─────────────────────────────────────────── */}
      <div style={{
        flex: '1 1 350px', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', padding: '40px',
        background: 'linear-gradient(135deg, #1A56DB 0%, #1E40AF 100%)',
        position: 'relative', overflow: 'hidden',
      }}>
        {/* Background circles */}
        <div style={{ position: 'absolute', top: -60, right: -60, width: 300, height: 300, borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />
        <div style={{ position: 'absolute', bottom: -80, left: -80, width: 400, height: 400, borderRadius: '50%', background: 'rgba(255,255,255,0.04)' }} />

        <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', maxWidth: 420 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 32 }}>
            <div style={{
              width: 44, height: 44, borderRadius: 12,
              background: 'rgba(255,255,255,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Mountain size={24} color="#fff" />
            </div>
            <div>
              <div style={{ fontWeight: 900, fontSize: '1.1rem', color: '#fff' }}>Smart Granite</div>
              <div style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.6)', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>AP Mines & Geology</div>
            </div>
          </div>

          {/* 3D Block */}
          <div style={{ margin: '20px 0', display: 'flex', justifyContent: 'center' }}>
            <GraniteBlock3D size="lg" />
          </div>

          <h2 style={{ fontSize: '1.5rem', fontWeight: 900, color: '#fff', marginBottom: 12, lineHeight: 1.3 }}>
            AI-Powered Granite Block<br />Measurement System
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.88rem', lineHeight: 1.7 }}>
            Automated volume estimation, seigniorage classification, and digital traceability
            for the AP Department of Mines &amp; Geology.
          </p>

          {/* Feature pills */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center', marginTop: 24 }}>
            {['AI Measurement', 'e-Permit', 'OMEPS 2.0', 'Audit Trail'].map(f => (
              <span key={f} style={{
                background: 'rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.9)',
                padding: '4px 12px', borderRadius: 20, fontSize: '0.72rem', fontWeight: 600,
                border: '1px solid rgba(255,255,255,0.2)',
              }}>
                <CheckCircle size={10} style={{ marginRight: 4, verticalAlign: 'middle' }} />
                {f}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ── Right Panel — Login Form ──────────────────────────────────────── */}
      <div style={{
        flex: '1 1 350px', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', padding: '20px',
      }}>
        <div style={{ width: '100%', maxWidth: 420 }}>
          <button
            onClick={() => navigate('/')}
            style={{ background: 'none', border: 'none', color: '#1A56DB', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 6 }}
          >
            ← Back to Home
          </button>

          <h2 style={{ fontSize: '1.6rem', fontWeight: 900, color: '#0F1729', marginBottom: 6 }}>
            Welcome Back
          </h2>
          <p style={{ color: '#1E3A8A', fontSize: '0.88rem', marginBottom: 32 }}>
            Sign in to the Smart Granite Portal
          </p>

          {/* Error */}
          {error && (
            <div className="alert alert-rose" style={{ marginBottom: 20 }}>
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div className="form-group">
              <label className="form-label">Username</label>
              <input
                type="text"
                className="form-control"
                placeholder="Enter your username"
                value={username}
                onChange={e => setUsername(e.target.value)}
                required
                autoFocus
              />
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPass ? 'text' : 'password'}
                  className="form-control"
                  placeholder="Enter your password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  style={{ paddingRight: 44 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(p => !p)}
                  style={{
                    position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer', color: '#1A56DB',
                  }}
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary"
              style={{ width: '100%', justifyContent: 'center', padding: '13px', fontSize: '0.95rem', borderRadius: 12, marginTop: 4 }}
            >
              {loading ? 'Signing In…' : <><LogIn size={17} /> Sign In</>}
            </button>
          </form>

          {/* Demo credentials */}
          <div style={{ marginTop: 32, padding: '16px', background: '#EFF6FF', borderRadius: 14, border: '1px solid #BFDBFE' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#1A56DB', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                ⚡ Quick Demo Login (Click to Fill)
              </div>
              {username && (
                <span style={{ fontSize: '0.68rem', color: '#059669', fontWeight: 700, background: '#DCFCE7', padding: '2px 8px', borderRadius: 10 }}>
                  ✓ {username} active
                </span>
              )}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {DEMO_CREDS.map(cred => {
                const isCurrent = username === cred.username;
                return (
                  <button
                    key={cred.role}
                    type="button"
                    onClick={() => fillDemo(cred)}
                    style={{
                      padding: '8px 10px', borderRadius: 10, cursor: 'pointer',
                      background: isCurrent ? `${cred.color}15` : '#fff',
                      border: `1.5px solid ${isCurrent ? cred.color : `${cred.color}35`}`,
                      display: 'flex', alignItems: 'center', gap: 6,
                      transition: 'all 0.15s', fontSize: '0.75rem', fontWeight: isCurrent ? 800 : 600,
                      color: isCurrent ? cred.color : '#0F1729',
                      boxShadow: isCurrent ? `0 2px 8px ${cred.color}25` : 'none',
                    }}
                    onMouseEnter={e => { if (!isCurrent) { e.currentTarget.style.borderColor = cred.color; e.currentTarget.style.background = `${cred.color}08`; } }}
                    onMouseLeave={e => { if (!isCurrent) { e.currentTarget.style.borderColor = `${cred.color}35`; e.currentTarget.style.background = '#fff'; } }}
                  >
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: cred.color, flexShrink: 0 }} />
                    {cred.label}
                  </button>
                );
              })}
            </div>

            {/* Selected Role Capabilities Preview */}
            {username && (
              <div style={{ marginTop: 12, padding: '8px 12px', background: '#fff', borderRadius: 8, border: '1px solid #DBEAFE', fontSize: '0.72rem', color: '#1E40AF', display: 'flex', alignItems: 'center', gap: 8, animation: 'slideInUp 0.2s ease-out' }}>
                <CheckCircle size={14} color="#1A56DB" />
                <span>
                  {username === 'leaseholder' && 'Quarry Lessee: AI 3D volume, GPS photo logging, transit dispatch requests'}
                  {username === 'dmgo' && 'DMGO Officer: Statutory check measurement review, seigniorage assessment, approval sign-off'}
                  {username === 'weighbridge' && 'Weighbridge: IoT scale integration, ±5% tolerance cross-validation, automated mismatch flags'}
                  {username === 'vigilance' && 'Vigilance: Mobile QR checkpoint verification, vehicle audit, Form G seizure'}
                  {username === 'admin' && 'Administrator: Statewide telemetry, OMEPS sync, leaseholder RBAC & audit'}
                </span>
              </div>
            )}
          </div>

          {/* Server Connection Config Button */}
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: 14 }}>
            <button
              type="button"
              onClick={() => setShowServerModal(true)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 14px',
                borderRadius: '10px',
                background: '#FFFFFF',
                border: '1.5px solid #CBD5E1',
                color: '#1E40AF',
                fontSize: '0.74rem',
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                transition: 'all 0.15s'
              }}
            >
              <Wifi size={14} color="#2563EB" />
              <span>Server Connection / Wi-Fi IP</span>
              <Settings size={12} color="#64748B" />
            </button>
          </div>

          <p style={{ textAlign: 'center', fontSize: '0.75rem', color: '#1E3A8A', marginTop: 12, opacity: 0.7 }}>
            © 2025 AP Mines &amp; Geology · Smart Granite Portal
          </p>
        </div>
      </div>

      <ServerConfigModal isOpen={showServerModal} onClose={() => setShowServerModal(false)} />
    </div>
  );

}
