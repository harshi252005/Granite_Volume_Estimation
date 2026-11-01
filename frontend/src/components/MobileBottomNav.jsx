import React from 'react';
import { useLanguage } from '../i18n';
import {
  LayoutDashboard, Camera, Layers, Truck, ClipboardCheck,
  Scale, FileCheck, MapPin, Menu, Search, ShoppingBag,
  Calculator, History, Shield, Brain
} from 'lucide-react';

const ROLE_BOTTOM_TABS = {
  operator: [
    { id: 'dashboard',  label: 'Dashboard',  icon: LayoutDashboard },
    { id: 'capture',    label: 'Capture',    icon: Camera, primaryAction: true },
    { id: 'blocks',     label: 'Blocks',     icon: Layers },
    { id: 'dispatch',   label: 'Dispatch',   icon: Truck },
  ],
  dmgo: [
    { id: 'dashboard',  label: 'Dashboard',  icon: LayoutDashboard },
    { id: 'blocks',     label: 'Queue',      icon: ClipboardCheck },
    { id: 'gis_map',    label: 'Map',        icon: MapPin },
    { id: 'permits',    label: 'e-Permits',  icon: FileCheck },
  ],
  weighbridge: [
    { id: 'dashboard',  label: 'Dashboard',  icon: LayoutDashboard },
    { id: 'entry',      label: 'Weight',     icon: Scale, primaryAction: true },
    { id: 'omeps',      label: 'OMEPS',      icon: FileCheck },
    { id: 'history',    label: 'History',    icon: History },
  ],
  admin: [
    { id: 'dashboard',  label: 'Overview',   icon: LayoutDashboard },
    { id: 'blocks',     label: 'Blocks',     icon: Layers },
    { id: 'gis_map',    label: 'Map',        icon: MapPin },
    { id: 'weighbridge',label: 'Weighbridge',icon: Scale },
  ],
  citizen: [
    { id: 'citizen_portal', label: 'Portal',     icon: LayoutDashboard },
    { id: 'plans',          label: 'Plans',      icon: ShoppingBag },
    { id: 'calculator',     label: 'Calculator', icon: Calculator },
    { id: 'public_track',   label: 'Track',      icon: Search },
  ],
  enforcement: [
    { id: 'dashboard',      label: 'Dashboard',  icon: LayoutDashboard },
    { id: 'vigilance',      label: 'Checkposts', icon: Shield },
    { id: 'inspections',    label: 'Audits',     icon: Search },
    { id: 'ai_center',      label: 'AI Help',    icon: Brain },
  ],
};

export default function MobileBottomNav({ user, activeTab, setActiveTab, onOpenDrawer }) {
  const { t } = useLanguage();
  const role = user?.role || 'operator';
  const tabs = ROLE_BOTTOM_TABS[role] || ROLE_BOTTOM_TABS.operator;

  return (
    <nav className="mobile-bottom-nav" aria-label="Mobile Navigation">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        const isPrimary = tab.primaryAction;

        return (
          <button
            key={tab.id}
            type="button"
            className={`mobile-nav-item ${isActive ? 'active' : ''} ${isPrimary ? 'mobile-nav-primary' : ''}`}
            onClick={() => setActiveTab(tab.id)}
            aria-current={isActive ? 'page' : undefined}
          >
            <div className="mobile-nav-icon-wrap">
              <Icon size={isPrimary ? 22 : 20} strokeWidth={isActive || isPrimary ? 2.4 : 1.9} />
            </div>
            <span className="mobile-nav-label">{t(tab.label)}</span>
          </button>
        );
      })}

      {/* More / Menu Drawer trigger */}
      <button
        type="button"
        className="mobile-nav-item mobile-nav-menu-btn"
        onClick={onOpenDrawer}
        aria-label="Open full menu"
      >
        <div className="mobile-nav-icon-wrap">
          <Menu size={20} strokeWidth={2} />
        </div>
        <span className="mobile-nav-label">{t('More')}</span>
      </button>
    </nav>
  );
}
