import React, { useState, useEffect } from 'react';
import { NAV_ITEMS } from '../rbac';
import { useLanguage } from '../i18n';
import { api } from '../api';
import {
  Mountain, LayoutDashboard, Camera, Layers, Truck, History, ClipboardCheck,
  BarChart3, FileText, Users, Scale, IndianRupee, Settings, Brain, Menu, X,
  Mountain as MtnIcon, ChevronLeft, ChevronRight, Search, Shield, Flag, Scan,
  FileCheck, MapPin, Calculator, ClipboardList, Calendar, ShoppingBag, Sliders
} from 'lucide-react';

const ICON_MAP = {
  LayoutDashboard, Camera, Layers, Truck, History, ClipboardCheck,
  BarChart3, FileText, Users, Scale, IndianRupee, Settings, Brain,
  Mountain: MtnIcon, Shield, Flag, Scan, FileCheck, Search, MapPin,
  Calculator, ClipboardList, Calendar, ShoppingBag, Sliders
};


export default function Sidebar({ user, activeTab, setActiveTab, collapsed, setCollapsed, mobileMenuOpen, setMobileMenuOpen }) {
  const { t } = useLanguage();
  const role = user?.role || 'operator';
  const navItems = NAV_ITEMS[role] || [];
  const [livePendingCount, setLivePendingCount] = useState(null);

  useEffect(() => {
    if (role === 'dmgo') {
      api.getDashboardStats({ district: 'ALL' })
        .then(res => {
          if (res && res.pending_review !== undefined) {
            setLivePendingCount(res.pending_review);
          }
        })
        .catch(() => {});
    }
  }, [role, activeTab]);

  const pendingCount = { dmgo: livePendingCount ?? 0, weighbridge: 2 };

  return (
    <aside
      className={`sidebar ${collapsed ? 'sidebar-collapsed' : ''} ${mobileMenuOpen ? 'sidebar-mobile-open' : ''}`}
      style={{
        transition: 'all 0.22s ease',
      }}
    >
      {/* Logo Header with Top Collapse Toggle */}
      <div className="sidebar-logo" style={{ justifyContent: collapsed ? 'center' : 'flex-start', position: 'relative' }}>
        <div style={{
          width: 32, height: 32, borderRadius: 8,
          background: 'rgba(255,255,255,0.18)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <Mountain size={17} color="#fff" />
        </div>
        {!collapsed && (
          <div className="sidebar-logo-text" style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 900, fontSize: '0.88rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {t('Smart Granite')}
            </div>
            <div style={{ fontSize: '0.52rem', color: 'rgba(255,255,255,0.65)', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
              {t('AP Mines & Geology')}
            </div>
          </div>
        )}
        {/* Quick Header Collapse Button (desktop) */}
        <button
          onClick={() => setCollapsed(c => !c)}
          title={collapsed ? t('Expand') : t('Collapse')}
          style={{
            background: 'rgba(255,255,255,0.12)',
            border: 'none',
            borderRadius: 6,
            width: 24,
            height: 24,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            cursor: 'pointer',
            flexShrink: 0,
            transition: 'background 0.15s',
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.22)'}
          onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.12)'}
        >
          {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>

        <button 
          className="btn btn-ghost btn-icon mobile-close-btn" 
          onClick={() => setMobileMenuOpen && setMobileMenuOpen(false)}
        >
          <X size={20} color="#fff" />
        </button>
      </div>

      {/* Nav */}
      <nav className="sidebar-nav">
        {!collapsed && (
          <div className="sidebar-section-label">
            {t(`${role.toUpperCase()} PANEL`)}
          </div>
        )}
        {navItems.map(({ id, label, icon, highlight }) => {
          const Icon = ICON_MAP[icon] || LayoutDashboard;
          const isActive = activeTab === id;
          const hasBadge = (id === 'blocks' && role === 'dmgo' && pendingCount.dmgo) ||
                           (id === 'entry' && role === 'weighbridge' && pendingCount.weighbridge);
          return (
            <button
              key={id}
              className={`sidebar-item ${isActive ? 'active' : ''}`}
              onClick={() => { setActiveTab(id); setMobileMenuOpen && setMobileMenuOpen(false); }}
              title={collapsed ? label : undefined}
              style={{
                justifyContent: collapsed ? 'center' : 'flex-start',
                ...(highlight && !isActive ? {
                  border: '1px solid rgba(255,255,255,0.25)',
                  marginTop: 3,
                } : {}),
              }}
            >
              <Icon size={17} style={{ flexShrink: 0 }} />
              {!collapsed && <span>{t(label)}</span>}
              {!collapsed && hasBadge && (
                <span className="sidebar-badge">{hasBadge}</span>
              )}
            </button>
          );
        })}

        <div style={{ margin: '6px 0', borderTop: '1px solid rgba(255,255,255,0.1)' }} />
        <a
          href="/track"
          target="_blank"
          rel="noreferrer"
          className="sidebar-item"
          title={collapsed ? t("Public Track Status") : undefined}
          style={{
            justifyContent: collapsed ? 'center' : 'flex-start',
            color: '#FDE68A',
            textDecoration: 'none',
          }}
        >
          <Search size={17} color="#FDE68A" style={{ flexShrink: 0 }} />
          {!collapsed && <span>{t('Track Any Block')}</span>}
        </a>

        {/* Dynamic Statutory Status Card for Compact Roles */}
        {!collapsed && role === 'enforcement' && (
          <div style={{
            marginTop: 14,
            padding: '10px 12px',
            background: 'rgba(255,255,255,0.08)',
            borderRadius: 10,
            border: '1px solid rgba(255,255,255,0.14)',
            fontSize: '0.72rem',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#34D399', fontWeight: 800, marginBottom: 3 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10B981', boxShadow: '0 0 6px #10B981' }} />
              <span>CHECKPOST VIGILANCE</span>
            </div>
            <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.66rem', lineHeight: 1.3 }}>
              Sec 21 MMDR Statutory Roadside &amp; Transit Monitoring Active
            </div>
          </div>
        )}

        {!collapsed && role === 'citizen' && (
          <div style={{
            marginTop: 14,
            padding: '10px 12px',
            background: 'rgba(255,255,255,0.08)',
            borderRadius: 10,
            border: '1px solid rgba(255,255,255,0.14)',
            fontSize: '0.72rem',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#2DD4BF', fontWeight: 800, marginBottom: 3 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#14B8A6', boxShadow: '0 0 6px #14B8A6' }} />
              <span>CITIZEN QUOTA ACTIVE</span>
            </div>
            <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.66rem', lineHeight: 1.3 }}>
              AP Mines Verified Direct Procurement &amp; Monthly Supply
            </div>
          </div>
        )}
      </nav>


      {/* Collapse toggle at bottom */}
      <div style={{ padding: '8px 8px', borderTop: '1px solid rgba(255,255,255,0.12)' }}>
        <button
          onClick={() => setCollapsed(c => !c)}
          className="sidebar-item"
          style={{ justifyContent: collapsed ? 'center' : 'flex-start', padding: '6px 10px' }}
        >
          {collapsed ? <ChevronRight size={16} /> : <><ChevronLeft size={16} /><span>{t('Collapse')}</span></>}
        </button>
      </div>

      {/* User chip at bottom */}
      {!collapsed && (
        <div style={{
          padding: '10px 12px',
          borderTop: '1px solid rgba(255,255,255,0.12)',
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <div style={{
            width: 30, height: 30, borderRadius: '50%',
            background: 'rgba(255,255,255,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 800, color: '#fff', fontSize: '0.78rem', flexShrink: 0,
          }}>
            {(user?.full_name || user?.username || 'U')[0].toUpperCase()}
          </div>
          <div style={{ overflow: 'hidden', minWidth: 0 }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={user?.full_name || user?.username}>
              {user?.full_name || user?.username}
            </div>
            <div style={{ fontSize: '0.58rem', color: 'rgba(255,255,255,0.55)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              {t(role)}
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
