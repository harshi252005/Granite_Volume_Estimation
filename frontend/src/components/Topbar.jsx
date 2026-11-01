import React, { useState } from 'react';
import { Bell, Globe, LogOut, User, ChevronDown, Sparkles, Menu, Wifi, Settings } from 'lucide-react';
import { useLanguage } from '../i18n';
import ServerConfigModal from './ServerConfigModal';


const ROLE_COLORS = {
  operator: '#1A56DB',
  dmgo: '#10B981',
  weighbridge: '#E67E22',
  admin: '#7C3AED',
  enforcement: '#EF4444',
  citizen: '#0D9488',
};

const BREADCRUMBS = {
  dashboard: 'Dashboard',
  capture: 'Capture Block',
  blocks: 'Blocks',
  dispatch: 'Dispatch',
  history: 'Upload History',
  entry: 'Weight Entry',
  users: 'User Management',
  quarries: 'Quarry Management',
  seigniorage: 'Seigniorage',
  reports: 'Reports',
  audit: 'Audit Logs',
  settings: 'Threshold Settings & AI Vision Models',
  thresholds: 'Threshold Settings & AI Vision Models',
  ai: 'AI Command Center',
  ai_center: 'AI Assistant & Command Center',
  weighbridge: 'Weighbridge',
  enforcement: 'Enforcement',
  citizen_portal: 'Citizen Granite Portal',
  plans: 'Monthly Granite Plans',
  calculator: 'Royalty & Seigniorage Estimator',
  dispatch_quota: 'Citizen Dispatch Quota',
  public_track: 'Public Block QR Tracker',
};

export default function Topbar({ user, activeTab, setActiveTab, onLogout, setMobileMenuOpen }) {
  const { lang, setLang, t } = useLanguage();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showServerModal, setShowServerModal] = useState(false);
  const role = user?.role || 'operator';
  const color = ROLE_COLORS[role] || '#1A56DB';

  return (
    <header className="topbar">
      {/* Mobile Hamburger Drawer Trigger */}
      <button 
        type="button"
        className="btn btn-ghost btn-icon mobile-menu-toggle"
        onClick={() => setMobileMenuOpen && setMobileMenuOpen(true)}
        aria-label="Open navigation menu"
      >
        <Menu size={20} color="#1A56DB" />
      </button>

      {/* Breadcrumb / Mobile App Title */}
      <div className="topbar-breadcrumb-wrap" style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
        <span className="topbar-brand hidden-mobile" style={{ fontSize: '0.75rem', color: '#1E3A8A', fontWeight: 600 }}>
          {t('Smart Granite')}
        </span>
        <span className="hidden-mobile" style={{ color: '#BFDBFE', fontSize: '0.8rem' }}>›</span>
        <span className="topbar-active-title" style={{
          fontSize: '0.88rem',
          fontWeight: 800,
          color: 'var(--text-heading)',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis'
        }}>
          {t(BREADCRUMBS[activeTab] || activeTab)}
        </span>
      </div>

      {/* Right actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
        {/* Quick AI Assistant Button */}
        <button
          onClick={() => setActiveTab && setActiveTab('ai_center')}
          className="btn btn-sm"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            fontSize: '0.74rem',
            fontWeight: 700,
            padding: '5px 10px',
            borderRadius: 8,
            border: activeTab === 'ai_center' ? '1.5px solid #1A56DB' : '1px solid #DBEAFE',
            background: activeTab === 'ai_center' ? '#1A56DB' : '#EFF6FF',
            color: activeTab === 'ai_center' ? '#ffffff' : '#1A56DB',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
          title="Open AI Assistant & Help Desk"
        >
          <Sparkles size={14} />
          <span className="hidden-mobile">{t('AI Help')}</span>
        </button>

        {/* Server / Wi-Fi IP Config Button */}
        <button
          type="button"
          onClick={() => setShowServerModal(true)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            padding: '4px 8px',
            borderRadius: 8,
            border: '1px solid #DBEAFE',
            background: '#EFF6FF',
            color: '#1A56DB',
            cursor: 'pointer',
            fontSize: '0.72rem',
            fontWeight: 800,
          }}
          title="Server Connection / Wi-Fi Setup"
        >
          <Wifi size={13} color="#1A56DB" />
          <span className="hidden-mobile">Server</span>
        </button>

        {/* Compact Language Selector */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          background: '#EFF6FF',
          borderRadius: 8,
          padding: '2px',
          border: '1px solid #DBEAFE',
          gap: 2,
        }}>
          <button
            onClick={() => setLang(lang === 'en' ? 'te' : 'en')}
            style={{
              padding: '4px 8px',
              fontSize: '0.72rem',
              fontWeight: 800,
              background: '#1A56DB',
              color: '#ffffff',
              borderRadius: 6,
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 4
            }}
            title={lang === 'en' ? 'Switch to Telugu' : 'Switch to English'}
          >
            <Globe size={11} />
            <span>{lang === 'en' ? 'EN' : 'తె'}</span>
          </button>
        </div>


        {/* Notifications */}
        <button className="btn btn-ghost btn-icon" style={{ position: 'relative', width: 34, height: 34, padding: 0 }}>
          <Bell size={16} color="#1E3A8A" />
          <span style={{
            position: 'absolute', top: 5, right: 5,
            width: 7, height: 7, borderRadius: '50%',
            background: '#E67E22', border: '1.5px solid #fff',
          }} />
        </button>

        {/* User avatar chip */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setShowUserMenu(s => !s)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '4px 8px 4px 4px', borderRadius: 10, cursor: 'pointer',
              background: '#EFF6FF', border: `1.5px solid ${color}25`,
              transition: 'all 0.15s',
            }}
          >
            <div style={{
              width: 28, height: 28, borderRadius: '50%',
              background: `linear-gradient(135deg, ${color}, ${color}aa)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontWeight: 800, fontSize: '0.75rem',
            }}>
              {(user?.full_name || user?.username || 'U')[0].toUpperCase()}
            </div>
            <div className="hidden-mobile" style={{ textAlign: 'left' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#0F1729', lineHeight: 1 }}>
                {user?.full_name || user?.username}
              </div>
              <div style={{ fontSize: '0.58rem', fontWeight: 800, color, textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 1 }}>
                {t(role)}
              </div>
            </div>
            <ChevronDown size={12} color="#1E3A8A" />
          </button>

          {showUserMenu && (
            <div style={{
              position: 'absolute', top: 'calc(100% + 8px)', right: 0,
              background: '#fff', borderRadius: 12, boxShadow: '0 8px 30px rgba(26,86,219,0.2)',
              border: '1px solid #DBEAFE', padding: '8px', minWidth: 170, zIndex: 1000,
              animation: 'slideUp 0.15s ease',
            }}>
              <div style={{ padding: '6px 10px', borderBottom: '1px solid #EFF6FF', marginBottom: 4 }}>
                <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#0F1729' }}>
                  {user?.full_name || user?.username}
                </div>
                <div style={{ fontSize: '0.62rem', fontWeight: 700, color, textTransform: 'uppercase' }}>
                  {t(role)}
                </div>
              </div>
              <button
                className="sidebar-item"
                style={{ color: '#0F1729', background: 'transparent', padding: '8px 10px', borderRadius: 8, width: '100%', fontSize: '0.78rem' }}
                onClick={() => setShowUserMenu(false)}
              >
                <User size={14} /> {t('Profile')}
              </button>
              <button
                className="sidebar-item"
                style={{ color: '#1A56DB', background: 'transparent', padding: '8px 10px', borderRadius: 8, width: '100%', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700 }}
                onClick={() => { setShowUserMenu(false); setShowServerModal(true); }}
              >
                <Wifi size={14} color="#1A56DB" /> Server Setup
              </button>
              <div style={{ height: 1, background: '#DBEAFE', margin: '4px 0' }} />
              <button
                onClick={() => { setShowUserMenu(false); onLogout && onLogout(); }}
                className="sidebar-item"
                style={{ color: '#EF4444', background: 'transparent', padding: '8px 10px', borderRadius: 8, width: '100%', fontSize: '0.78rem' }}
              >
                <LogOut size={14} /> {t('Sign Out')}
              </button>
            </div>
          )}
        </div>
      </div>
      <ServerConfigModal isOpen={showServerModal} onClose={() => setShowServerModal(false)} />
    </header>
  );

}
