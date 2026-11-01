import React, { useState, useEffect } from 'react';
import { Wifi, Globe, CheckCircle2, AlertCircle, RefreshCw, X, Laptop, ShieldCheck, HelpCircle } from 'lucide-react';
import { getApiBaseUrl, setBackendServer, testServerConnection, DEFAULT_PC_WIFI_IP } from '../api';

export default function ServerConfigModal({ isOpen, onClose }) {
  const [currentUrl, setCurrentUrl] = useState('');
  const [inputVal, setInputVal] = useState('');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null); // { ok: bool, message: string }
  const [activeTab, setActiveTab] = useState('ip'); // 'ip' | 'tunnel'
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const active = getApiBaseUrl();
      setCurrentUrl(active);
      const savedRaw = localStorage.getItem('backend_url') || localStorage.getItem('backend_ip') || '';
      setInputVal(savedRaw || DEFAULT_PC_WIFI_IP);
      setTestResult(null);
      setSavedSuccess(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    const res = await testServerConnection(inputVal);
    setTesting(false);
    if (res.ok) {
      setTestResult({ ok: true, message: `Connected successfully! (${res.url})` });
    } else {
      setTestResult({ ok: false, message: res.error || 'Server unreachable at this address' });
    }
  };

  const handleSave = () => {
    const updated = setBackendServer(inputVal);
    setCurrentUrl(updated);
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      if (onClose) onClose();
    }, 1200);
  };

  const handleReset = () => {
    const def = setBackendServer('');
    setCurrentUrl(def);
    setInputVal('');
    setTestResult({ ok: true, message: `Reset to default (${def})` });
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(15, 23, 42, 0.75)',
      backdropFilter: 'blur(6px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 99999,
      padding: '16px',
    }}>
      <div style={{
        background: '#FFFFFF',
        borderRadius: '18px',
        width: '100%',
        maxWidth: '520px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        overflow: 'hidden',
        border: '1px solid #E2E8F0',
        display: 'flex',
        flexDirection: 'column',
        maxHeight: '90vh',
      }}>
        {/* Header */}
        <div style={{
          padding: '18px 22px',
          background: 'linear-gradient(135deg, #1E3A8A 0%, #2563EB 100%)',
          color: '#FFFFFF',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '36px', height: '36px', borderRadius: '10px',
              background: 'rgba(255, 255, 255, 0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <Wifi size={20} color="#FFFFFF" />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: '1rem', letterSpacing: '-0.01em' }}>
                Server &amp; Network Setup
              </div>
              <div style={{ fontSize: '0.72rem', color: '#BFDBFE', fontWeight: 600 }}>
                Connect APK to Laptop across any Wi-Fi
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.15)',
              border: 'none',
              borderRadius: '8px',
              width: '32px',
              height: '32px',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Content body */}
        <div style={{ padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* Current URL indicator */}
          <div style={{
            background: '#F8FAFC',
            border: '1px solid #E2E8F0',
            borderRadius: '12px',
            padding: '12px 14px',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px'
          }}>
            <div style={{ fontSize: '0.68rem', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Active Server Target
            </div>
            <div style={{ fontFamily: 'monospace', fontSize: '0.84rem', fontWeight: 700, color: '#0F172A', wordBreak: 'break-all' }}>
              {currentUrl}
            </div>
          </div>

          {/* Mode Switcher Tabs */}
          <div style={{ display: 'flex', background: '#F1F5F9', padding: '4px', borderRadius: '10px', gap: '4px' }}>
            <button
              type="button"
              onClick={() => { setActiveTab('ip'); if (!inputVal.startsWith('http')) setInputVal(DEFAULT_PC_WIFI_IP); }}
              style={{
                flex: 1, padding: '8px', borderRadius: '8px', border: 'none',
                fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer',
                background: activeTab === 'ip' ? '#FFFFFF' : 'transparent',
                color: activeTab === 'ip' ? '#1E3A8A' : '#64748B',
                boxShadow: activeTab === 'ip' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
              }}
            >
              <Laptop size={14} /> Same Wi-Fi (Local IP)
            </button>
            <button
              type="button"
              onClick={() => { setActiveTab('tunnel'); }}
              style={{
                flex: 1, padding: '8px', borderRadius: '8px', border: 'none',
                fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer',
                background: activeTab === 'tunnel' ? '#FFFFFF' : 'transparent',
                color: activeTab === 'tunnel' ? '#1E3A8A' : '#64748B',
                boxShadow: activeTab === 'tunnel' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
              }}
            >
              <Globe size={14} /> Different Wi-Fi (Tunnel / Internet)
            </button>
          </div>

          {/* Input field */}
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
              {activeTab === 'ip' ? 'Laptop Wi-Fi IPv4 Address or Hostname:' : 'Public HTTPS Tunnel URL (Cloudflare / Localtunnel):'}
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value)}
                placeholder={activeTab === 'ip' ? 'e.g. 192.168.1.49' : 'e.g. https://xxxx.loca.lt or cloudflare'}
                style={{
                  flex: 1,
                  padding: '10px 14px',
                  borderRadius: '10px',
                  border: '1.5px solid #CBD5E1',
                  fontSize: '0.9rem',
                  fontFamily: 'monospace',
                  outline: 'none',
                }}
              />
              <button
                type="button"
                onClick={handleTest}
                disabled={testing}
                style={{
                  padding: '0 16px',
                  borderRadius: '10px',
                  background: '#0F172A',
                  color: '#FFFFFF',
                  border: 'none',
                  fontWeight: 700,
                  fontSize: '0.78rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  opacity: testing ? 0.7 : 1,
                  whiteSpace: 'nowrap',
                }}
              >
                {testing ? <RefreshCw size={14} className="spin" /> : 'Ping / Test'}
              </button>
            </div>
          </div>

          {/* Test Status feedback */}
          {testResult && (
            <div style={{
              padding: '10px 14px',
              borderRadius: '10px',
              background: testResult.ok ? '#F0FDF4' : '#FEF2F2',
              border: `1px solid ${testResult.ok ? '#BBF7D0' : '#FECACA'}`,
              color: testResult.ok ? '#166534' : '#991B1B',
              fontSize: '0.8rem',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}>
              {testResult.ok ? <CheckCircle2 size={16} color="#16A34A" /> : <AlertCircle size={16} color="#DC2626" />}
              <span>{testResult.message}</span>
            </div>
          )}

          {/* Explanatory Help Card */}
          <div style={{
            background: '#F8FAFC',
            border: '1px dashed #CBD5E1',
            borderRadius: '12px',
            padding: '12px 14px',
            fontSize: '0.76rem',
            lineHeight: 1.55,
            color: '#475569'
          }}>
            {activeTab === 'ip' ? (
              <div>
                <strong style={{ color: '#0F172A' }}>💡 When Mobile &amp; Laptop are on the Same Wi-Fi:</strong>
                <ol style={{ margin: '6px 0 0 18px', padding: 0 }}>
                  <li>Open Command Prompt on your laptop, run <code style={{ background: '#E2E8F0', padding: '1px 4px', borderRadius: 4 }}>ipconfig</code>.</li>
                  <li>Find your <strong>Wireless LAN adapter Wi-Fi IPv4 Address</strong> (e.g. <code style={{ background: '#E2E8F0', padding: '1px 4px', borderRadius: 4 }}>192.168.1.49</code>).</li>
                  <li>Enter it above and tap <strong>Ping / Test</strong>, then <strong>Save &amp; Connect</strong>!</li>
                </ol>
              </div>
            ) : (
              <div>
                <strong style={{ color: '#0F172A' }}>🌐 When Mobile &amp; Laptop are on DIFFERENT Wi-Fi / 5G Data:</strong>

                {/* ── Localtunnel 511 warning ── */}
                <div style={{
                  margin: '8px 0',
                  padding: '8px 12px',
                  background: '#FEF9C3',
                  border: '1px solid #FDE047',
                  borderRadius: '8px',
                  color: '#854D0E',
                  fontWeight: 600,
                  fontSize: '0.74rem',
                }}>
                  ⚠️ <strong>IMPORTANT — Localtunnel browser activation (one-time step):</strong><br />
                  After starting the tunnel on your laptop, you MUST open the tunnel URL in <strong>your phone's browser</strong> (Chrome/Firefox), then tap <strong>"Click to Continue"</strong> on the page that appears. Only then will the APK be able to connect.
                </div>

                <ol style={{ margin: '4px 0 0 18px', padding: 0 }}>
                  <li>On your laptop terminal, run:
                    <br />
                    <code style={{ background: '#E2E8F0', padding: '2px 6px', borderRadius: 4, display: 'inline-block', marginTop: 4 }}>
                      npx localtunnel --port 8000
                    </code>
                  </li>
                  <li>Copy the HTTPS URL shown (e.g. <code style={{ background: '#E2E8F0', padding: '1px 4px', borderRadius: 4 }}>https://xyz.loca.lt</code>).</li>
                  <li style={{ fontWeight: 700, color: '#B45309' }}>Open that URL in your phone browser → tap <strong>"Click to Continue"</strong>.</li>
                  <li>Come back to this app → paste the URL above → <strong>Ping / Test</strong> → <strong>Save &amp; Connect</strong>!</li>
                </ol>
                <p style={{ marginTop: 6, color: '#64748B', fontSize: '0.72rem' }}>
                  Alternatively, use Cloudflare Tunnel (no browser visit needed):<br />
                  <code style={{ background: '#E2E8F0', padding: '1px 4px', borderRadius: 4 }}>npx cloudflared tunnel --url http://localhost:8000</code>
                </p>
              </div>
            )}
          </div>


        </div>

        {/* Footer actions */}
        <div style={{
          padding: '14px 20px',
          background: '#F8FAFC',
          borderTop: '1px solid #E2E8F0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '10px'
        }}>
          <button
            type="button"
            onClick={handleReset}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#64748B',
              fontSize: '0.78rem',
              fontWeight: 600,
              cursor: 'pointer',
              textDecoration: 'underline'
            }}
          >
            Reset Default
          </button>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                background: '#FFFFFF',
                border: '1px solid #CBD5E1',
                color: '#334155',
                fontSize: '0.8rem',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              style={{
                padding: '8px 20px',
                borderRadius: '8px',
                background: savedSuccess ? '#16A34A' : '#1E40AF',
                border: 'none',
                color: '#FFFFFF',
                fontSize: '0.82rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'background 0.2s'
              }}
            >
              {savedSuccess ? <CheckCircle2 size={16} /> : <ShieldCheck size={16} />}
              {savedSuccess ? 'Saved!' : 'Save & Connect'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
