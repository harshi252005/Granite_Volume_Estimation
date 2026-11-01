import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { LanguageProvider } from './i18n';
import { api } from './api';
import './index.css';

import LandingPage from './components/LandingPage';
import Login from './components/Login';
import Layout from './components/Layout';
import BlockTracker from './components/BlockTracker';
import FloatingChatbot from './components/FloatingChatbot';

// Role panels
import OperatorPanel from './components/OperatorPanel';
import DMGOPanel from './components/DMGOPanel';
import WeighbridgePanel from './components/WeighbridgePanel';
import Dashboard from './components/Dashboard';
import EnforcementPanel from './components/EnforcementPanel';
import AICommandCenter from './components/AICommandCenter';
import CitizenPanel from './components/CitizenPanel';
import SeigniorageCalculator from './components/SeigniorageCalculator';
import ThresholdSettings from './components/ThresholdSettings';


function AppContent() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const navigate = useNavigate();

  useEffect(() => {
    const handleUnauthorized = () => {
      setUser(null);
      localStorage.removeItem('token');
      navigate('/login', { replace: true });
    };
    window.addEventListener('auth:unauthorized', handleUnauthorized);

    const token = localStorage.getItem('token');
    if (token && token !== 'undefined' && token !== 'null' && token.trim() !== '') {
      api.getMe()
        .then(u => {
          setUser(u);
          if (window.location.pathname === '/login' || window.location.pathname === '/') {
            navigate('/app', { replace: true });
          }
        })
        .catch(() => {
          localStorage.removeItem('token');
          setUser(null);
        })
        .finally(() => setLoading(false));
    } else {
      localStorage.removeItem('token');
      setLoading(false);
    }

    return () => {
      window.removeEventListener('auth:unauthorized', handleUnauthorized);
    };
  }, [navigate]);

  const handleLogin = (u) => {
    setUser(u);
    setActiveTab('dashboard');
    navigate('/app', { replace: true });
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setUser(null);
    setActiveTab('dashboard');
    navigate('/login', { replace: true });
  };

  if (loading) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: '100vh', background: '#F0F6FF', flexDirection: 'column', gap: 16,
      }}>
        <div style={{
          width: 48, height: 48, borderRadius: 12,
          background: 'linear-gradient(135deg, #1A56DB, #3B82F6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <span style={{ color: '#fff', fontWeight: 900, fontSize: '1.2rem' }}>G</span>
        </div>
        <div style={{ fontSize: '0.85rem', color: '#1E3A8A', fontWeight: 600 }}>Loading Smart Granite…</div>
      </div>
    );
  }

  // Authenticated — render role panel inside Layout
  if (user) {
    const RolePanel = () => {
      // Global AI Help accessible to all roles
      if (activeTab === 'ai_center') return <AICommandCenter user={user} />;
      // Royalty Calculator: operators/admins see SeigniorageCalculator directly (no CitizenPanel wrapper)
      if (activeTab === 'calculator' && user.role !== 'citizen') {
        return <SeigniorageCalculator />;
      }
      // Threshold Settings & AI Vision Models accessible across roles
      if (activeTab === 'settings' || activeTab === 'thresholds') {
        return <ThresholdSettings user={user} />;
      }
      if (activeTab === 'citizen_portal' || activeTab === 'plans' || activeTab === 'calculator' || activeTab === 'dispatch_quota' || activeTab === 'public_track') {
        return <CitizenPanel user={user} activeTab={activeTab} setActiveTab={setActiveTab} />;
      }


      // Allow admin to switch between panels via activeTab
      if (user.role === 'admin') {
        if (activeTab === 'enforcement') return <EnforcementPanel user={user} />;
        return <Dashboard user={user} activeTab={activeTab} setActiveTab={setActiveTab} />;
      }
      switch (user.role) {
        case 'operator':    return <OperatorPanel user={user} activeTab={activeTab} setActiveTab={setActiveTab} />;
        case 'dmgo':        return <DMGOPanel user={user} activeTab={activeTab} setActiveTab={setActiveTab} />;
        case 'weighbridge': return <WeighbridgePanel user={user} activeTab={activeTab} setActiveTab={setActiveTab} />;
        case 'enforcement': return <EnforcementPanel user={user} activeTab={activeTab} setActiveTab={setActiveTab} />;
        case 'citizen':     return <CitizenPanel user={user} activeTab={activeTab} setActiveTab={setActiveTab} />;
        default:            return <OperatorPanel user={user} activeTab={activeTab} setActiveTab={setActiveTab} />;
      }

    };
    return (
      <Routes>
        <Route
          path="/app"
          element={
            <Layout user={user} activeTab={activeTab} setActiveTab={setActiveTab} onLogout={handleLogout}>
              <RolePanel />
            </Layout>
          }
        />
        <Route path="/track" element={<BlockTracker />} />
        <Route path="/track/:blockId" element={<BlockTracker />} />
        <Route path="*" element={<Navigate to="/app" replace />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<Login onLogin={handleLogin} />} />
      <Route path="/track" element={<BlockTracker />} />
      <Route path="/track/:blockId" element={<BlockTracker />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <LanguageProvider>
        <AppContent />
        <FloatingChatbot />
      </LanguageProvider>
    </BrowserRouter>
  );
}


