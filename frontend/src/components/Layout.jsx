import React, { useState } from 'react';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import MobileBottomNav from './MobileBottomNav';

export default function Layout({ user, activeTab, setActiveTab, onLogout, children }) {
  const [collapsed, setCollapsedState] = useState(() => localStorage.getItem('sg_sidebar_collapsed') === 'true');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const setCollapsed = (val) => {
    setCollapsedState(prev => {
      const next = typeof val === 'function' ? val(prev) : val;
      localStorage.setItem('sg_sidebar_collapsed', String(next));
      return next;
    });
  };

  return (
    <div className="app-layout">
      {/* Mobile Drawer Backdrop */}
      {mobileMenuOpen && (
        <div 
          className="mobile-overlay" 
          onClick={() => setMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}
      
      <Sidebar
        user={user}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        collapsed={collapsed}
        setCollapsed={setCollapsed}
        mobileMenuOpen={mobileMenuOpen}
        setMobileMenuOpen={setMobileMenuOpen}
      />
      <div
        className={`main-content ${collapsed ? 'main-content-collapsed' : ''}`}
      >
        <Topbar 
          user={user} 
          activeTab={activeTab} 
          setActiveTab={setActiveTab} 
          onLogout={onLogout} 
          setMobileMenuOpen={setMobileMenuOpen}
        />
        <main className="page-body">
          {children}
        </main>
      </div>

      {/* Android Native Style Bottom Navigation Bar */}
      <MobileBottomNav
        user={user}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenDrawer={() => setMobileMenuOpen(true)}
      />
    </div>
  );
}
