import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { useLanguage } from '../i18n';
import TransitTracker from './TransitTracker';
import {
  Layers, ShoppingBag, Truck, Calendar, Calculator, CheckCircle2,
  AlertCircle, ChevronRight, FileText, Download, ShieldCheck,
  Sparkles, RefreshCw, ArrowUpRight, Clock, Award, Building2,
  Percent, IndianRupee, MapPin, Search, Check, AlertTriangle, Eye,
  LayoutDashboard, ArrowRight, BookOpen, ExternalLink, Shield,
  CreditCard, QrCode, Lock, CheckCircle, Printer, X
} from 'lucide-react';

const AP_DISTRICTS = [
  'Prakasam', 'Chittoor', 'Tirupati', 'Visakhapatnam', 'Anakapalli',
  'Guntur', 'Palnadu', 'Bapatla', 'Krishna', 'NTR', 'Eluru',
  'East Godavari', 'Kakinada', 'West Godavari', 'Nellore',
  'Anantapuramu', 'Sri Sathya Sai', 'Kurnool', 'Nandyal', 'YSR Kadapa', 'Srikakulam'
];

const WEIGHT_PRESETS = [
  { mt: 5, label: '5 MT', desc: 'Pooja / Countertops' },
  { mt: 10, label: '10 MT', desc: 'Duplex Villa' },
  { mt: 25, label: '25 MT', desc: 'Commercial Floor' },
  { mt: 50, label: '50 MT', desc: 'Apartment Project' },
  { mt: 100, label: '100 MT', desc: 'Infrastructure Hub' },
];

export default function CitizenPanel({ user, activeTab, setActiveTab }) {
  const { t } = useLanguage();

  // Internal sub-view state: 'overview' | 'plans' | 'calculator' | 'dispatch_quota' | 'public_track'
  const [currentView, setCurrentView] = useState('overview');

  // Granite Types & Plan Configuration (for calculator)
  const [graniteTypes, setGraniteTypes] = useState([]);
  const [selectedType, setSelectedType] = useState(null);
  const [tonnage, setTonnage] = useState(20);
  const [durationMonths, setDurationMonths] = useState(3);
  const [billingCycle, setBillingCycle] = useState('quarterly');
  const [deliveryDistrict, setDeliveryDistrict] = useState(user?.district || 'Prakasam');

  // Live Financial Calculation
  const [calculation, setCalculation] = useState(null);
  const [calcLoading, setCalcLoading] = useState(false);
  const [subscribing, setSubscribing] = useState(false);
  const [subscribeSuccess, setSubscribeSuccess] = useState(null);

  // AP CFMS Cyber Treasury Payment Gateway State (Option 2)
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentStep, setPaymentStep] = useState('select'); // 'select' | 'processing' | 'success'
  const [paymentMethod, setPaymentMethod] = useState('upi'); // 'upi' | 'netbanking' | 'challan'
  const [selectedBank, setSelectedBank] = useState('SBI');
  const [upiId, setUpiId] = useState('citizen@oksbi');
  const [paymentTxnData, setPaymentTxnData] = useState(null);
  const [processingStage, setProcessingStage] = useState(1);
  const [receiptPlan, setReceiptPlan] = useState(null);

  // Subscribed Plans
  const [userPlans, setUserPlans] = useState([]);
  const [plansLoading, setPlansLoading] = useState(true);

  // Dispatch Quota Modal / Form
  const [selectedPlanForDispatch, setSelectedPlanForDispatch] = useState(null);
  const [dispatchTonnage, setDispatchTonnage] = useState(5);
  const [dispatchAddress, setDispatchAddress] = useState('');
  const [dispatchVehicle, setDispatchVehicle] = useState('');
  const [dispatchLoading, setDispatchLoading] = useState(false);
  const [dispatchSuccess, setDispatchSuccess] = useState(null);

  // Certificate Modal
  const [viewCertificatePlan, setViewCertificatePlan] = useState(null);

  // Public QR Tracking
  const [trackBlockId, setTrackBlockId] = useState('');
  const [trackResult, setTrackResult] = useState(null);
  const [trackLoading, setTrackLoading] = useState(false);
  const [trackError, setTrackError] = useState('');

  // Delivery confirmation & transit tracking
  const [deliveryConfirming, setDeliveryConfirming] = useState(false);
  const [deliverySuccessMsg, setDeliverySuccessMsg] = useState('');
  const [deliveryErrorMsg, setDeliveryErrorMsg] = useState('');
  const [viewTransitBlockId, setViewTransitBlockId] = useState(null);

  // ── Sync with Sidebar activeTab ───────────────────────────────────────────
  useEffect(() => {
    if (activeTab === 'citizen_portal' || activeTab === 'dashboard') {
      setCurrentView('overview');
    } else if (activeTab === 'plans') {
      setCurrentView('plans');
    } else if (activeTab === 'calculator') {
      setCurrentView('calculator');
    } else if (activeTab === 'dispatch_quota') {
      setCurrentView('dispatch_quota');
    } else if (activeTab === 'public_track') {
      setCurrentView('public_track');
    }
  }, [activeTab]);

  const switchView = (viewKey) => {
    setCurrentView(viewKey);
    if (setActiveTab) {
      if (viewKey === 'overview') setActiveTab('citizen_portal');
      else if (viewKey === 'plans') setActiveTab('plans');
      else if (viewKey === 'calculator') setActiveTab('calculator');
      else if (viewKey === 'dispatch_quota') setActiveTab('dispatch_quota');
      else if (viewKey === 'public_track') setActiveTab('public_track');
    }
  };

  // Load granite types & user plans on mount
  useEffect(() => {
    loadGraniteTypes();
    loadUserPlans();
  }, []);

  const loadGraniteTypes = async () => {
    try {
      const types = await api.getCitizenGraniteTypes();
      setGraniteTypes(types || []);
      if (types && types.length > 0 && !selectedType) {
        setSelectedType(types[0]);
      }
    } catch (err) {
      console.error('Failed to load granite types:', err);
    }
  };

  const loadUserPlans = async () => {
    setPlansLoading(true);
    try {
      const plans = await api.getCitizenPlans();
      setUserPlans(plans || []);
    } catch (err) {
      console.error('Failed to load user citizen plans:', err);
    } finally {
      setPlansLoading(false);
    }
  };

  // Recalculate cost when type, weight, duration, or billing cycle changes
  useEffect(() => {
    if (!selectedType) return;
    fetchCalculation();
  }, [selectedType, tonnage, durationMonths, billingCycle, deliveryDistrict]);

  const fetchCalculation = async () => {
    if (!selectedType) return;
    setCalcLoading(true);
    try {
      const res = await api.calculateCitizenPlan({
        granite_type: selectedType.name,
        monthly_tonnage: Number(tonnage),
        duration_months: Number(durationMonths),
        billing_cycle: billingCycle,
        delivery_district: deliveryDistrict,
      });
      setCalculation(res);
    } catch (err) {
      console.error('Calculation error:', err);
    } finally {
      setCalcLoading(false);
    }
  };

  const openPaymentGateway = () => {
    if (!selectedType || !calculation) return;
    const challanNo = `CFMS-AP26-${Math.floor(100000 + Math.random() * 900000)}`;
    const totalAmount = calculation.total_period_amount || calculation.total_monthly_amount;
    setPaymentTxnData({
      challanNo,
      hoa: '0853-00-102-00-01 Non-Ferrous Mines & Mineral Concession Fees & Royalty',
      ddoCode: '25000303001 (ADMG Ongole / Prakasam)',
      serviceCode: 'APMMCR-CITIZEN-DIR-01',
      graniteType: selectedType.name,
      tonnage: Number(tonnage),
      cbm: calculation.total_cbm,
      district: deliveryDistrict,
      durationMonths: Number(durationMonths),
      billingCycle,
      totalAmount,
      royaltyAmount: calculation.royalty_amount,
      dmfAmount: calculation.dmf_amount,
      meritAmount: calculation.merit_amount,
      gstAmount: calculation.gst_amount,
      createdAt: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'medium' }),
      bankRef: `BRN-${selectedBank}-${Math.floor(10000000 + Math.random() * 90000000)}`,
      cfmsTxnId: `CFMS-AP26-TXN-${Date.now().toString().slice(-6)}${Math.floor(1000 + Math.random() * 9000)}`,
    });
    setPaymentStep('select');
    setShowPaymentModal(true);
  };

  const executePayment = async () => {
    if (!selectedType || !calculation) return;
    setSubscribing(true);
    setPaymentStep('processing');
    setProcessingStage(1);

    // Realistic AP Cyber Treasury handshake stages
    await new Promise((r) => setTimeout(r, 650));
    setProcessingStage(2);

    await new Promise((r) => setTimeout(r, 650));
    setProcessingStage(3);

    try {
      // Safe creation via existing API, completely preserves all existing records & DB schema
      const newPlan = await api.createCitizenPlan({
        granite_type: selectedType.name,
        monthly_tonnage: Number(tonnage),
        duration_months: Number(durationMonths),
        billing_cycle: billingCycle,
        delivery_district: deliveryDistrict,
      });

      setPaymentTxnData((prev) => ({
        ...prev,
        createdPlan: newPlan,
        planCode: newPlan.plan_code,
      }));
      setSubscribeSuccess(newPlan);
      await loadUserPlans();
      await new Promise((r) => setTimeout(r, 450));
      setPaymentStep('success');
    } catch (err) {
      alert('AP Cyber Treasury Payment Failed: ' + (err.message || 'Gateway response error'));
      setPaymentStep('select');
    } finally {
      setSubscribing(false);
    }
  };

  const handleSubscribe = () => {
    openPaymentGateway();
  };

  const handleDispatchSubmit = async (e) => {
    e.preventDefault();
    if (!selectedPlanForDispatch) return;
    setDispatchLoading(true);
    setDispatchSuccess(null);
    try {
      const res = await api.dispatchCitizenQuota(selectedPlanForDispatch.id, {
        tonnage: Number(dispatchTonnage),
        destination_address: dispatchAddress,
        vehicle_number: dispatchVehicle,
        purpose: 'Direct AP Citizen Construction Allocation',
      });
      setDispatchSuccess(res);
      await loadUserPlans();
    } catch (err) {
      alert('Dispatch request failed: ' + (err.message || 'Error'));
    } finally {
      setDispatchLoading(false);
    }
  };

  const handlePublicTrack = async (e) => {
    e?.preventDefault();
    if (!trackBlockId.trim()) return;
    setTrackLoading(true);
    setTrackError('');
    setTrackResult(null);
    try {
      const res = await api.trackBlock(trackBlockId.trim().toUpperCase());
      setTrackResult(res);
    } catch (err) {
      setTrackError(err.message || 'Block not found or unregistered.');
    } finally {
      setTrackLoading(false);
    }
  };

  const handleCitizenConfirmDelivery = async (blockId) => {
    try {
      setDeliveryConfirming(true);
      setDeliveryErrorMsg('');
      setDeliverySuccessMsg('');
      await api.confirmDelivery(blockId);
      setDeliverySuccessMsg(`Consignment ${blockId} delivery confirmed! Status updated to Delivered.`);
      const updated = await api.trackBlock(blockId);
      setTrackResult(updated);
    } catch (err) {
      setDeliveryErrorMsg(err.message || 'Failed to confirm delivery');
    } finally {
      setDeliveryConfirming(false);
    }
  };

  // Aggregated citizen stats
  const totalAllocated = userPlans.reduce((acc, p) => acc + (p.allocated_tonnage || 0), 0);
  const totalConsumed = userPlans.reduce((acc, p) => acc + (p.consumed_tonnage || 0), 0);
  const totalRemaining = Math.max(0, totalAllocated - totalConsumed);
  const activePlans = userPlans.filter(p => p.status === 'ACTIVE');

  return (
    <div style={{ padding: '24px 28px', maxWidth: 1400, margin: '0 auto', color: '#1E293B' }}>

      {/* ── Sub Navigation Tabs (Synchronized with Sidebar) ──────────────── */}
      <div style={{
        display: 'flex',
        gap: 8,
        borderBottom: '2px solid #E2E8F0',
        marginBottom: 24,
        paddingBottom: 2,
        overflowX: 'auto',
      }}>
        <button
          onClick={() => switchView('overview')}
          style={{
            padding: '10px 18px',
            border: 'none',
            background: 'none',
            fontWeight: 800,
            fontSize: '0.88rem',
            color: currentView === 'overview' ? '#1A56DB' : '#64748B',
            borderBottom: currentView === 'overview' ? '3px solid #1A56DB' : '3px solid transparent',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            transition: 'all 0.15s ease',
          }}
        >
          <LayoutDashboard size={16} /> 1. Citizen Portal Overview
        </button>

        <button
          onClick={() => switchView('plans')}
          style={{
            padding: '10px 18px',
            border: 'none',
            background: 'none',
            fontWeight: 800,
            fontSize: '0.88rem',
            color: currentView === 'plans' ? '#1A56DB' : '#64748B',
            borderBottom: currentView === 'plans' ? '3px solid #1A56DB' : '3px solid transparent',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            transition: 'all 0.15s ease',
          }}
        >
          <Calendar size={16} /> 2. Monthly Plans ({userPlans.length})
        </button>

        <button
          onClick={() => switchView('calculator')}
          style={{
            padding: '10px 18px',
            border: 'none',
            background: 'none',
            fontWeight: 800,
            fontSize: '0.88rem',
            color: currentView === 'calculator' ? '#1A56DB' : '#64748B',
            borderBottom: currentView === 'calculator' ? '3px solid #1A56DB' : '3px solid transparent',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            transition: 'all 0.15s ease',
          }}
        >
          <Calculator size={16} /> 3. Royalty &amp; Price Estimator
        </button>

        <button
          onClick={() => switchView('dispatch_quota')}
          style={{
            padding: '10px 18px',
            border: 'none',
            background: 'none',
            fontWeight: 800,
            fontSize: '0.88rem',
            color: currentView === 'dispatch_quota' ? '#1A56DB' : '#64748B',
            borderBottom: currentView === 'dispatch_quota' ? '3px solid #1A56DB' : '3px solid transparent',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            transition: 'all 0.15s ease',
          }}
        >
          <Truck size={16} /> 4. Dispatch Quota
        </button>

        <button
          onClick={() => switchView('public_track')}
          style={{
            padding: '10px 18px',
            border: 'none',
            background: 'none',
            fontWeight: 800,
            fontSize: '0.88rem',
            color: currentView === 'public_track' ? '#1A56DB' : '#64748B',
            borderBottom: currentView === 'public_track' ? '3px solid #1A56DB' : '3px solid transparent',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            transition: 'all 0.15s ease',
          }}
        >
          <Search size={16} /> 5. Block QR Tracker
        </button>
      </div>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* ── VIEW 1: CITIZEN PORTAL OVERVIEW (DASHBOARD) ──────────────────── */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {currentView === 'overview' && (
        <div>
          {/* Welcome & System Banner */}
          <div style={{
            background: 'linear-gradient(135deg, #0F172A 0%, #1E3A8A 55%, #0D9488 100%)',
            borderRadius: 20,
            padding: '28px 32px',
            color: '#FFFFFF',
            boxShadow: '0 12px 32px rgba(15, 23, 42, 0.18)',
            marginBottom: 26,
            position: 'relative',
            overflow: 'hidden',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <span style={{
                    background: 'rgba(255, 255, 255, 0.15)',
                    padding: '4px 12px',
                    borderRadius: 20,
                    fontSize: '0.74rem',
                    fontWeight: 800,
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    color: '#6EE7B7',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                  }}>
                    <ShieldCheck size={14} /> AP DMG CITIZEN PORTAL
                  </span>
                  <span style={{ fontSize: '0.78rem', color: '#CBD5E1' }}>
                    Beneficiary: <strong>{user?.full_name || 'K. Venkat Rao (Citizen)'}</strong>
                  </span>
                </div>

                <h1 style={{ fontSize: '1.85rem', fontWeight: 900, margin: '0 0 8px 0', letterSpacing: '-0.02em', color: '#FFFFFF' }}>
                  Citizen Granite Procurement Dashboard
                </h1>
                <p style={{ margin: 0, fontSize: '0.92rem', color: '#E2E8F0', maxWidth: 760, lineHeight: 1.5 }}>
                  Direct citizen window under <strong>Andhra Pradesh Minor Mineral Concession Rules 1966</strong>. Track your active monthly allocations, customize stone plans as per granite variety and tonnage, and request verified e-Transit passes.
                </p>
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  onClick={() => switchView('calculator')}
                  style={{
                    background: '#10B981',
                    border: 'none',
                    color: '#FFFFFF',
                    padding: '11px 18px',
                    borderRadius: 12,
                    fontWeight: 800,
                    fontSize: '0.86rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    boxShadow: '0 4px 14px rgba(16, 185, 129, 0.35)',
                  }}
                >
                  <Sparkles size={16} /> Customize Monthly Plan
                </button>
              </div>
            </div>

            {/* Metrics Row */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
              gap: 14,
              marginTop: 24,
              paddingTop: 20,
              borderTop: '1px solid rgba(255, 255, 255, 0.12)',
            }}>
              <div style={{ background: 'rgba(255,255,255,0.08)', padding: '14px 18px', borderRadius: 12 }}>
                <div style={{ fontSize: '0.74rem', color: '#CBD5E1', fontWeight: 600 }}>ACTIVE SUBSCRIPTIONS</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#38BDF8', marginTop: 2 }}>
                  {activePlans.length} <span style={{ fontSize: '0.8rem', fontWeight: 500, color: '#CBD5E1' }}>Plans</span>
                </div>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.08)', padding: '14px 18px', borderRadius: 12 }}>
                <div style={{ fontSize: '0.74rem', color: '#CBD5E1', fontWeight: 600 }}>TOTAL ALLOCATED QUOTA</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#A7F3D0', marginTop: 2 }}>
                  {totalAllocated.toFixed(1)} <span style={{ fontSize: '0.8rem', fontWeight: 500, color: '#CBD5E1' }}>MT</span>
                </div>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.08)', padding: '14px 18px', borderRadius: 12 }}>
                <div style={{ fontSize: '0.74rem', color: '#CBD5E1', fontWeight: 600 }}>CONSUMED TONNAGE</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#FDE047', marginTop: 2 }}>
                  {totalConsumed.toFixed(1)} <span style={{ fontSize: '0.8rem', fontWeight: 500, color: '#CBD5E1' }}>MT</span>
                </div>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.08)', padding: '14px 18px', borderRadius: 12 }}>
                <div style={{ fontSize: '0.74rem', color: '#CBD5E1', fontWeight: 600 }}>AVAILABLE BALANCE</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#4ADE80', marginTop: 2 }}>
                  {totalRemaining.toFixed(1)} <span style={{ fontSize: '0.8rem', fontWeight: 500, color: '#CBD5E1' }}>MT</span>
                </div>
              </div>
            </div>
          </div>

          {/* 4 Quick Action Cards */}
          <div style={{ marginBottom: 28 }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 900, color: '#0F172A', marginBottom: 14 }}>
              Quick Citizen Portals &amp; Actions
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
              {/* Card A: Calculator */}
              <div
                onClick={() => switchView('calculator')}
                style={{
                  background: '#FFFFFF',
                  borderRadius: 16,
                  padding: '20px 22px',
                  border: '1px solid #E2E8F0',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.03)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                    <Calculator size={20} color="#1A56DB" />
                  </div>
                  <div style={{ fontWeight: 800, fontSize: '1rem', color: '#0F172A', marginBottom: 4 }}>
                    Royalty &amp; Plan Estimator
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#64748B', lineHeight: 1.4 }}>
                    Customize granite variety (Black Galaxy, Colour, Black) and weight (1-100 MT) to calculate statutory seigniorage and subscribe.
                  </div>
                </div>
                <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 6, color: '#1A56DB', fontWeight: 700, fontSize: '0.84rem' }}>
                  Open Estimator <ArrowRight size={15} />
                </div>
              </div>

              {/* Card B: Monthly Plans */}
              <div
                onClick={() => switchView('plans')}
                style={{
                  background: '#FFFFFF',
                  borderRadius: 16,
                  padding: '20px 22px',
                  border: '1px solid #E2E8F0',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.03)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: '#F0FDF4', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                    <Calendar size={20} color="#10B981" />
                  </div>
                  <div style={{ fontWeight: 800, fontSize: '1rem', color: '#0F172A', marginBottom: 4 }}>
                    My Subscribed Plans
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#64748B', lineHeight: 1.4 }}>
                    Manage your {userPlans.length} active monthly quotas, track consumed tonnage, and download official Form G-11 Citizen Passes.
                  </div>
                </div>
                <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 6, color: '#10B981', fontWeight: 700, fontSize: '0.84rem' }}>
                  Manage Quotas <ArrowRight size={15} />
                </div>
              </div>

              {/* Card C: Dispatch Quota */}
              <div
                onClick={() => switchView('dispatch_quota')}
                style={{
                  background: '#FFFFFF',
                  borderRadius: 16,
                  padding: '20px 22px',
                  border: '1px solid #E2E8F0',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.03)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: '#FFFBEB', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                    <Truck size={20} color="#D97706" />
                  </div>
                  <div style={{ fontWeight: 800, fontSize: '1rem', color: '#0F172A', marginBottom: 4 }}>
                    Request Stone Dispatch
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#64748B', lineHeight: 1.4 }}>
                    Draw down stone from your approved quota for direct transport to your residential or commercial construction site.
                  </div>
                </div>
                <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 6, color: '#D97706', fontWeight: 700, fontSize: '0.84rem' }}>
                  Book Dispatch <ArrowRight size={15} />
                </div>
              </div>

              {/* Card D: QR Authenticator */}
              <div
                onClick={() => switchView('public_track')}
                style={{
                  background: '#FFFFFF',
                  borderRadius: 16,
                  padding: '20px 22px',
                  border: '1px solid #E2E8F0',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.03)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: '#F5F3FF', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                    <Search size={20} color="#7C3AED" />
                  </div>
                  <div style={{ fontWeight: 800, fontSize: '1rem', color: '#0F172A', marginBottom: 4 }}>
                    Public Block QR Tracker
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#64748B', lineHeight: 1.4 }}>
                    Enter block serial number or scan QR code to inspect quarry provenance, 3D measurements, and DMGO check status.
                  </div>
                </div>
                <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 6, color: '#7C3AED', fontWeight: 700, fontSize: '0.84rem' }}>
                  Verify Block <ArrowRight size={15} />
                </div>
              </div>
            </div>
          </div>

          {/* Active Quota Snapshot Cards */}
          <div style={{
            background: '#FFFFFF',
            borderRadius: 16,
            padding: '24px 26px',
            border: '1px solid #E2E8F0',
            boxShadow: '0 4px 16px rgba(0,0,0,0.03)',
            marginBottom: 24,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 900, margin: 0, color: '#0F172A' }}>
                  Active Monthly Granite Subscriptions
                </h3>
                <span style={{ fontSize: '0.78rem', color: '#64748B' }}>Real-time balance of approved mineral quotas</span>
              </div>
              <button
                onClick={() => switchView('plans')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#1A56DB',
                  fontWeight: 700,
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                View All Plans <ArrowRight size={14} />
              </button>
            </div>

            {userPlans.length === 0 ? (
              <div style={{ padding: '30px 0', textAlign: 'center', color: '#64748B' }}>
                No active monthly plans. <a href="#" onClick={() => switchView('calculator')} style={{ color: '#1A56DB', fontWeight: 700 }}>Customize your first plan</a>.
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 14 }}>
                {userPlans.slice(0, 3).map((p) => {
                  const rem = Math.max(0, p.allocated_tonnage - p.consumed_tonnage);
                  const pct = Math.min(100, Math.round((p.consumed_tonnage / p.allocated_tonnage) * 100));
                  return (
                    <div
                      key={p.id}
                      style={{
                        padding: '16px 18px',
                        borderRadius: 12,
                        background: '#F8FAFC',
                        border: '1px solid #E2E8F0',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                        <span style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: '0.82rem', color: '#1A56DB' }}>
                          {p.plan_code}
                        </span>
                        <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#15803D', background: '#DCFCE7', padding: '2px 8px', borderRadius: 10 }}>
                          {p.status}
                        </span>
                      </div>
                      <div style={{ fontWeight: 800, fontSize: '0.98rem', color: '#0F172A', marginBottom: 6 }}>
                        {p.granite_type}
                      </div>
                      <div style={{ width: '100%', height: 6, background: '#E2E8F0', borderRadius: 3, overflow: 'hidden', marginBottom: 6 }}>
                        <div style={{ width: `${pct}%`, height: '100%', background: '#0D9488' }} />
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.74rem', color: '#475569' }}>
                        <span>Remaining: <strong>{rem.toFixed(1)} MT</strong></span>
                        <span>Monthly: <strong>₹{p.total_monthly_amount.toLocaleString()}</strong></span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Statutory Guidelines Card */}
          <div style={{
            background: '#F8FAFC',
            borderRadius: 14,
            padding: '18px 22px',
            border: '1px solid #E2E8F0',
            display: 'flex',
            alignItems: 'flex-start',
            gap: 14,
          }}>
            <Shield size={22} color="#0D9488" style={{ flexShrink: 0, marginTop: 2 }} />
            <div style={{ fontSize: '0.82rem', color: '#475569', lineHeight: 1.5 }}>
              <div style={{ fontWeight: 800, color: '#0F172A', marginBottom: 2 }}>
                APMMCR 1966 Citizen Procurement Compliance
              </div>
              All granite blocks issued under the Citizen Monthly Quota scheme are directly tracked through the Andhra Pradesh Department of Mines &amp; Geology digital ledger. Each dispatch includes an authentic e-Permit transit pass with cryptographically signed QR codes and statutory DMF/Cess payment certificates.
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* ── VIEW 2: MY MONTHLY PLANS & SUBSCRIPTIONS ─────────────────────── */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {currentView === 'plans' && (
        <div>
          {/* Header Banner */}
          <div style={{
            background: 'linear-gradient(135deg, #1E40AF 0%, #1E3A8A 100%)',
            borderRadius: 18,
            padding: '24px 28px',
            color: '#FFFFFF',
            marginBottom: 24,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 16,
          }}>
            <div>
              <div style={{ fontSize: '0.74rem', fontWeight: 800, color: '#93C5FD', letterSpacing: '0.04em' }}>
                AP DMG CITIZEN ALLOCATIONS
              </div>
              <h2 style={{ fontSize: '1.6rem', fontWeight: 900, margin: '4px 0', color: '#FFF' }}>
                My Monthly Granite Plans &amp; Active Quotas
              </h2>
              <p style={{ margin: 0, fontSize: '0.86rem', color: '#E0E7FF' }}>
                Review active subscriptions, monitor monthly tonnage draw-downs, and generate official Form G-11 passes.
              </p>
            </div>
            <button
              onClick={() => switchView('calculator')}
              style={{
                background: '#10B981',
                border: 'none',
                color: '#FFF',
                padding: '11px 20px',
                borderRadius: 10,
                fontWeight: 800,
                fontSize: '0.86rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <Sparkles size={16} /> + Customize New Plan
            </button>
          </div>

          {plansLoading ? (
            <div style={{ textAlign: 'center', padding: '60px 0', color: '#64748B' }}>
              <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 12px' }} />
              <div>Loading your monthly plans…</div>
            </div>
          ) : userPlans.length === 0 ? (
            <div style={{
              background: '#FFFFFF',
              borderRadius: 16,
              padding: '60px 24px',
              textAlign: 'center',
              border: '1px dashed #CBD5E1',
            }}>
              <Calendar size={42} color="#94A3B8" style={{ margin: '0 auto 14px' }} />
              <div style={{ fontWeight: 800, fontSize: '1.15rem', color: '#0F172A' }}>
                No active monthly subscriptions yet
              </div>
              <p style={{ fontSize: '0.88rem', color: '#64748B', maxWidth: 450, margin: '8px auto 20px' }}>
                Choose your preferred granite type (Black Galaxy, Colour, Absolute Black) and monthly weight to start your allocation.
              </p>
              <button
                onClick={() => switchView('calculator')}
                style={{
                  background: '#1A56DB',
                  color: '#fff',
                  border: 'none',
                  padding: '11px 22px',
                  borderRadius: 10,
                  fontWeight: 700,
                  fontSize: '0.9rem',
                  cursor: 'pointer'
                }}
              >
                Go to Royalty &amp; Plan Estimator
              </button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: 20 }}>
              {userPlans.map((plan) => {
                const consumedPct = Math.min(100, Math.round((plan.consumed_tonnage / plan.allocated_tonnage) * 100));
                const remaining = Math.max(0, plan.allocated_tonnage - plan.consumed_tonnage);

                return (
                  <div
                    key={plan.id}
                    style={{
                      background: '#FFFFFF',
                      borderRadius: 16,
                      padding: '22px 24px',
                      border: '1px solid #E2E8F0',
                      boxShadow: '0 4px 18px rgba(0,0,0,0.04)',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                    }}
                  >
                    <div>
                      {/* Plan Code & Status */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                          <span style={{
                            fontFamily: 'monospace',
                            fontWeight: 800,
                            fontSize: '0.85rem',
                            background: '#F1F5F9',
                            padding: '4px 8px',
                            borderRadius: 6,
                            color: '#0F172A'
                          }}>
                            {plan.plan_code}
                          </span>
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            padding: '2px 7px',
                            borderRadius: 6,
                            fontSize: '0.68rem',
                            fontWeight: 800,
                            background: '#EFF6FF',
                            color: '#1D4ED8',
                            border: '1px solid #BFDBFE'
                          }}>
                            <ShieldCheck size={12} /> CFMS Paid
                          </span>
                        </div>
                        <span style={{
                          padding: '3px 10px',
                          borderRadius: 20,
                          fontSize: '0.72rem',
                          fontWeight: 800,
                          background: plan.status === 'ACTIVE' ? '#DCFCE7' : '#FEE2E2',
                          color: plan.status === 'ACTIVE' ? '#15803D' : '#B91C1C',
                        }}>
                          {plan.status}
                        </span>
                      </div>

                      {/* Granite Name & Delivery District */}
                      <div style={{ fontWeight: 900, fontSize: '1.15rem', color: '#0F172A', marginBottom: 4 }}>
                        {plan.granite_type}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: '#64748B', marginBottom: 14 }}>
                        Destination District: <strong>{plan.delivery_district || 'Prakasam'}</strong>
                      </div>

                      {/* Quota Progress Bar */}
                      <div style={{
                        background: '#F8FAFC',
                        padding: '12px 14px',
                        borderRadius: 10,
                        border: '1px solid #E2E8F0',
                        marginBottom: 16,
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', fontWeight: 700, marginBottom: 6 }}>
                          <span>Quota Consumed: {consumedPct}%</span>
                          <span style={{ color: '#0D9488' }}>{remaining.toFixed(1)} MT Remaining</span>
                        </div>
                        <div style={{ width: '100%', height: 8, background: '#E2E8F0', borderRadius: 4, overflow: 'hidden' }}>
                          <div
                            style={{
                              width: `${consumedPct}%`,
                              height: '100%',
                              background: consumedPct > 80 ? '#EF4444' : '#0D9488',
                              borderRadius: 4,
                              transition: 'width 0.3s ease',
                            }}
                          />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: '#64748B', marginTop: 4 }}>
                          <span>Used: {plan.consumed_tonnage} MT</span>
                          <span>Total Quota: {plan.allocated_tonnage} MT</span>
                        </div>
                      </div>

                      {/* Financial info */}
                      <div style={{ fontSize: '0.78rem', display: 'flex', justifyContent: 'space-between', color: '#475569', marginBottom: 6 }}>
                        <span>Monthly Subscription:</span>
                        <span style={{ fontWeight: 800, color: '#0F172A' }}>₹{plan.total_monthly_amount.toLocaleString()}</span>
                      </div>
                      <div style={{ fontSize: '0.78rem', display: 'flex', justifyContent: 'space-between', color: '#475569', marginBottom: 16 }}>
                        <span>Seigniorage Fee Paid:</span>
                        <span style={{ fontWeight: 700 }}>₹{plan.seigniorage_fee.toLocaleString()}</span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'flex', gap: 8, borderTop: '1px solid #F1F5F9', paddingTop: 14 }}>
                      <button
                        onClick={() => {
                          setSelectedPlanForDispatch(plan);
                          setDispatchTonnage(Math.min(5, remaining));
                          switchView('dispatch_quota');
                        }}
                        disabled={remaining <= 0 || plan.status !== 'ACTIVE'}
                        style={{
                          flex: 1,
                          padding: '9px 12px',
                          borderRadius: 8,
                          border: 'none',
                          background: remaining <= 0 ? '#E2E8F0' : '#1A56DB',
                          color: remaining <= 0 ? '#94A3B8' : '#fff',
                          fontWeight: 700,
                          fontSize: '0.8rem',
                          cursor: remaining <= 0 ? 'not-allowed' : 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 6,
                        }}
                      >
                        <Truck size={14} /> Dispatch Stone
                      </button>

                      <button
                        onClick={() => setReceiptPlan(plan)}
                        style={{
                          padding: '9px 12px',
                          borderRadius: 8,
                          border: '1px solid #0D9488',
                          background: '#F0FDFA',
                          color: '#0F766E',
                          fontWeight: 700,
                          fontSize: '0.8rem',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 5,
                        }}
                        title="View Official AP CFMS Cyber Treasury Receipt"
                      >
                        <CreditCard size={14} /> CFMS Receipt
                      </button>

                      <button
                        onClick={() => setViewCertificatePlan(plan)}
                        style={{
                          padding: '9px 14px',
                          borderRadius: 8,
                          border: '1px solid #CBD5E1',
                          background: '#FFFFFF',
                          color: '#334155',
                          fontWeight: 700,
                          fontSize: '0.8rem',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                        }}
                      >
                        <FileText size={14} /> View Pass
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* ── VIEW 3: ROYALTY ESTIMATOR & PLAN CUSTOMIZER ──────────────────── */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {currentView === 'calculator' && (
        <div>
          {/* Header Banner */}
          <div style={{
            background: 'linear-gradient(135deg, #0D9488 0%, #115E59 100%)',
            borderRadius: 18,
            padding: '24px 28px',
            color: '#FFFFFF',
            marginBottom: 24,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 16,
          }}>
            <div>
              <div style={{ fontSize: '0.74rem', fontWeight: 800, color: '#99F6E4', letterSpacing: '0.04em' }}>
                APMMCR 1966 STATUTORY ROYALTY ENGINE
              </div>
              <h2 style={{ fontSize: '1.6rem', fontWeight: 900, margin: '4px 0', color: '#FFF' }}>
                Granite Royalty &amp; Monthly Plan Estimator
              </h2>
              <p style={{ margin: 0, fontSize: '0.86rem', color: '#CCFBF1' }}>
                Select your granite variety and adjust the weight slider (MT) to calculate statutory seigniorage, 30% DMF, 2% Cess, and monthly subscription cost.
              </p>
            </div>
            <div style={{
              background: 'rgba(255,255,255,0.18)',
              padding: '6px 14px',
              borderRadius: 10,
              fontSize: '0.82rem',
              fontWeight: 800,
            }}>
              Official Govt Gazette Rates
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 24, alignItems: 'start' }}>
            {/* Left Column: Form Controls */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>

              {/* Step 1: Choose Granite Type */}
              <div style={{
                background: '#FFFFFF',
                borderRadius: 16,
                padding: '24px 26px',
                border: '1px solid #E2E8F0',
                boxShadow: '0 4px 16px rgba(0,0,0,0.03)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{
                      width: 24, height: 24, borderRadius: '50%', background: '#0D9488',
                      color: '#fff', fontSize: '0.78rem', fontWeight: 800,
                      display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>1</span>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0, color: '#0F172A' }}>
                      Select Granite Variety
                    </h3>
                  </div>
                  <span style={{ fontSize: '0.76rem', color: '#64748B' }}>5 AP Gazette Varieties</span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
                  {graniteTypes.map((gt) => {
                    const isSelected = selectedType?.name === gt.name;
                    return (
                      <div
                        key={gt.name}
                        onClick={() => setSelectedType(gt)}
                        style={{
                          borderRadius: 12,
                          padding: '14px 16px',
                          cursor: 'pointer',
                          border: isSelected ? '2px solid #0D9488' : '1px solid #E2E8F0',
                          background: isSelected ? '#F0FDFA' : '#F8FAFC',
                          transition: 'all 0.18s ease',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                          <span style={{
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: 6,
                            background: isSelected ? '#CCFBF1' : '#E2E8F0',
                            color: isSelected ? '#0F766E' : '#475569',
                          }}>
                            {gt.badge || 'Standard Grade'}
                          </span>
                          {isSelected && <CheckCircle2 size={18} color="#0D9488" />}
                        </div>

                        <div style={{ fontWeight: 800, fontSize: '0.94rem', color: '#0F172A', marginBottom: 4 }}>
                          {gt.name}
                        </div>

                        <div style={{ fontSize: '0.74rem', color: '#64748B', lineHeight: 1.35, marginBottom: 8 }}>
                          {gt.description}
                        </div>

                        <div style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          fontSize: '0.72rem',
                          paddingTop: 8,
                          borderTop: '1px dashed #CBD5E1',
                          color: '#334155',
                        }}>
                          <span>Royalty: <strong>₹{gt.seigniorage_per_m3.toLocaleString()}/m³</strong></span>
                          <span>Base: <strong>₹{gt.base_rate_per_ton.toLocaleString()}/MT</strong></span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Step 2: Choose Weight of Granite (Metric Tonnes) */}
              <div style={{
                background: '#FFFFFF',
                borderRadius: 16,
                padding: '24px 26px',
                border: '1px solid #E2E8F0',
                boxShadow: '0 4px 16px rgba(0,0,0,0.03)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{
                      width: 24, height: 24, borderRadius: '50%', background: '#0D9488',
                      color: '#fff', fontSize: '0.78rem', fontWeight: 800,
                      display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>2</span>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0, color: '#0F172A' }}>
                      Select Weight of Granite (Monthly Allocation)
                    </h3>
                  </div>
                  <div style={{
                    background: '#ECFDF5',
                    padding: '4px 10px',
                    borderRadius: 8,
                    fontSize: '0.76rem',
                    fontWeight: 800,
                    color: '#047857',
                    border: '1px solid #A7F3D0'
                  }}>
                    {tonnage} MT ≈ {(tonnage / 2.75).toFixed(2)} m³
                  </div>
                </div>

                {/* Range Slider */}
                <div style={{ marginBottom: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', fontWeight: 700, color: '#475569', marginBottom: 6 }}>
                    <span>Min: 1 Metric Tonne</span>
                    <span style={{ fontSize: '1.1rem', color: '#0D9488', fontWeight: 900 }}>{tonnage} MT / Month</span>
                    <span>Max: 100 Metric Tonnes</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="100"
                    step="1"
                    value={tonnage}
                    onChange={(e) => setTonnage(Number(e.target.value))}
                    style={{
                      width: '100%',
                      accentColor: '#0D9488',
                      height: 8,
                      borderRadius: 4,
                      cursor: 'pointer',
                    }}
                  />
                </div>

                {/* Weight Presets */}
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
                  {WEIGHT_PRESETS.map((p) => {
                    const isPresetActive = tonnage === p.mt;
                    return (
                      <button
                        key={p.mt}
                        onClick={() => setTonnage(p.mt)}
                        style={{
                          flex: '1 1 90px',
                          padding: '8px 10px',
                          borderRadius: 10,
                          border: isPresetActive ? '2px solid #0D9488' : '1px solid #E2E8F0',
                          background: isPresetActive ? '#F0FDFA' : '#FFFFFF',
                          color: isPresetActive ? '#0F766E' : '#334155',
                          fontWeight: 700,
                          fontSize: '0.78rem',
                          cursor: 'pointer',
                          textAlign: 'center',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <div>{p.label}</div>
                        <div style={{ fontSize: '0.66rem', fontWeight: 500, color: '#64748B' }}>{p.desc}</div>
                      </button>
                    );
                  })}
                </div>

                <div style={{
                  background: '#F8FAFC',
                  borderRadius: 10,
                  padding: '10px 14px',
                  fontSize: '0.75rem',
                  color: '#475569',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}>
                  <Award size={16} color="#0D9488" />
                  <span>
                    Density standard in AP Mines: <strong>2.75 Metric Tonnes per Cubic Metre (MT/m³)</strong>.
                  </span>
                </div>
              </div>

              {/* Step 3: Duration & District */}
              <div style={{
                background: '#FFFFFF',
                borderRadius: 16,
                padding: '24px 26px',
                border: '1px solid #E2E8F0',
                boxShadow: '0 4px 16px rgba(0,0,0,0.03)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                  <span style={{
                    width: 24, height: 24, borderRadius: '50%', background: '#0D9488',
                    color: '#fff', fontSize: '0.78rem', fontWeight: 800,
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>3</span>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0, color: '#0F172A' }}>
                    Subscription Duration &amp; Delivery District
                  </h3>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: 6 }}>
                      Billing Cycle &amp; Discount
                    </label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <div
                        onClick={() => { setBillingCycle('monthly'); setDurationMonths(1); }}
                        style={{
                          padding: '10px 14px',
                          borderRadius: 8,
                          border: billingCycle === 'monthly' ? '2px solid #0D9488' : '1px solid #E2E8F0',
                          background: billingCycle === 'monthly' ? '#F0FDFA' : '#FFF',
                          cursor: 'pointer',
                          fontSize: '0.8rem',
                          fontWeight: 700,
                          display: 'flex',
                          justifyContent: 'space-between',
                        }}
                      >
                        <span>1 Month (Standard Plan)</span>
                        <span style={{ color: '#64748B' }}>Standard</span>
                      </div>

                      <div
                        onClick={() => { setBillingCycle('quarterly'); setDurationMonths(3); }}
                        style={{
                          padding: '10px 14px',
                          borderRadius: 8,
                          border: billingCycle === 'quarterly' ? '2px solid #0D9488' : '1px solid #E2E8F0',
                          background: billingCycle === 'quarterly' ? '#F0FDFA' : '#FFF',
                          cursor: 'pointer',
                          fontSize: '0.8rem',
                          fontWeight: 700,
                          display: 'flex',
                          justifyContent: 'space-between',
                        }}
                      >
                        <span>3 Months (Quarterly)</span>
                        <span style={{ color: '#059669', fontWeight: 800 }}>Save 5%</span>
                      </div>

                      <div
                        onClick={() => { setBillingCycle('annual'); setDurationMonths(12); }}
                        style={{
                          padding: '10px 14px',
                          borderRadius: 8,
                          border: billingCycle === 'annual' ? '2px solid #0D9488' : '1px solid #E2E8F0',
                          background: billingCycle === 'annual' ? '#F0FDFA' : '#FFF',
                          cursor: 'pointer',
                          fontSize: '0.8rem',
                          fontWeight: 700,
                          display: 'flex',
                          justifyContent: 'space-between',
                        }}
                      >
                        <span>12 Months (Annual Partner)</span>
                        <span style={{ color: '#059669', fontWeight: 800 }}>Save 10%</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: 6 }}>
                      Destination AP District
                    </label>
                    <select
                      value={deliveryDistrict}
                      onChange={(e) => setDeliveryDistrict(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: 8,
                        border: '1px solid #CBD5E1',
                        fontSize: '0.84rem',
                        fontWeight: 600,
                        background: '#FFF',
                        marginBottom: 12,
                      }}
                    >
                      {AP_DISTRICTS.map((d) => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>

                    <div style={{
                      padding: '10px 12px',
                      borderRadius: 8,
                      background: '#F1F5F9',
                      fontSize: '0.72rem',
                      color: '#475569',
                      lineHeight: 1.4,
                    }}>
                      <div style={{ fontWeight: 700, color: '#1E293B', marginBottom: 2 }}>
                        <MapPin size={13} style={{ display: 'inline', marginRight: 4 }} />
                        Supply Hub:
                      </div>
                      {selectedType?.mining_hubs ? selectedType.mining_hubs.join(', ') : 'Chimakurthy, Prakasam'} Hub
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Sticky Statutory Calculation Card */}
            <div style={{ position: 'sticky', top: 20 }}>
              <div style={{
                background: '#FFFFFF',
                borderRadius: 20,
                padding: '24px 26px',
                border: '1px solid #E2E8F0',
                boxShadow: '0 10px 30px rgba(0,0,0,0.06)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                  <div>
                    <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#0D9488', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                      STATUTORY BREAKDOWN
                    </span>
                    <h3 style={{ fontSize: '1.2rem', fontWeight: 900, margin: 0, color: '#0F172A' }}>
                      Monthly Cost Estimate
                    </h3>
                  </div>
                  {calcLoading && <RefreshCw size={16} className="animate-spin" color="#0D9488" />}
                </div>

                {calculation && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <div style={{
                      background: '#F8FAFC',
                      padding: '12px 14px',
                      borderRadius: 10,
                      border: '1px solid #E2E8F0',
                    }}>
                      <div style={{ fontWeight: 800, color: '#0F172A', fontSize: '0.92rem' }}>
                        {calculation.granite_type}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: '#64748B', marginTop: 2 }}>
                        Allocation: <strong>{calculation.monthly_tonnage} MT/month</strong> ({calculation.estimated_volume_m3} m³)
                      </div>
                    </div>

                    <div style={{ fontSize: '0.82rem', display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569' }}>
                        <span>Raw Material ({calculation.monthly_tonnage} MT × ₹{calculation.base_rate_per_ton.toLocaleString()}):</span>
                        <span style={{ fontWeight: 700, color: '#0F172A' }}>₹{calculation.base_material_cost.toLocaleString()}</span>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569' }}>
                        <span>Seigniorage ({calculation.estimated_volume_m3} m³ × ₹{calculation.seigniorage_rate_per_m3.toLocaleString()}):</span>
                        <span style={{ fontWeight: 700, color: '#0F172A' }}>₹{calculation.seigniorage_fee.toLocaleString()}</span>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569' }}>
                        <span>District Mineral Foundation (DMF 30%):</span>
                        <span style={{ fontWeight: 700, color: '#0F172A' }}>₹{calculation.dmf_amount.toLocaleString()}</span>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569' }}>
                        <span>Mineral Investigation Cess (2%):</span>
                        <span style={{ fontWeight: 700, color: '#0F172A' }}>₹{calculation.cess_amount.toLocaleString()}</span>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569' }}>
                        <span>Digital Green Transit Passes:</span>
                        <span style={{ fontWeight: 700, color: '#0F172A' }}>₹{calculation.transit_pass_fee.toLocaleString()}</span>
                      </div>

                      {calculation.savings_discount > 0 && (
                        <div style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          color: '#059669',
                          fontWeight: 700,
                          background: '#ECFDF5',
                          padding: '6px 10px',
                          borderRadius: 6
                        }}>
                          <span>Billing Discount ({calculation.billing_cycle}):</span>
                          <span>- ₹{calculation.savings_discount.toLocaleString()}</span>
                        </div>
                      )}
                    </div>

                    <div style={{
                      borderTop: '2px solid #E2E8F0',
                      paddingTop: 12,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 4,
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                        <span style={{ fontSize: '0.84rem', fontWeight: 700, color: '#64748B' }}>Monthly Payable:</span>
                        <span style={{ fontSize: '1.45rem', fontWeight: 900, color: '#0D9488' }}>
                          ₹{calculation.total_monthly_amount.toLocaleString()}
                        </span>
                      </div>

                      {calculation.duration_months > 1 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: '#475569' }}>
                          <span>Total ({calculation.duration_months} Months):</span>
                          <span style={{ fontWeight: 800 }}>₹{calculation.total_period_amount.toLocaleString()}</span>
                        </div>
                      )}
                    </div>

                    <button
                      onClick={openPaymentGateway}
                      disabled={subscribing}
                      style={{
                        marginTop: 10,
                        background: subscribing ? '#94A3B8' : 'linear-gradient(135deg, #0D9488 0%, #1E3A8A 100%)',
                        border: 'none',
                        color: '#FFFFFF',
                        padding: '14px 20px',
                        borderRadius: 12,
                        fontWeight: 800,
                        fontSize: '0.94rem',
                        cursor: subscribing ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 8,
                        boxShadow: '0 6px 20px rgba(13, 148, 136, 0.25)',
                      }}
                    >
                      <CreditCard size={18} />
                      Proceed to AP Cyber Treasury Payment (₹{(calculation.total_period_amount || calculation.total_monthly_amount)?.toLocaleString()})
                    </button>

                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                      fontSize: '0.72rem',
                      color: '#64748B',
                      marginTop: 10
                    }}>
                      <Lock size={12} color="#0D9488" />
                      <span>Govt of AP • CFMS Cyber Treasury Payment Gateway • Head 0853</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* ── VIEW 4: DISPATCH QUOTA ORDER FORM ────────────────────────────── */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {currentView === 'dispatch_quota' && (
        <div style={{ maxWidth: 780, margin: '0 auto' }}>
          {/* Header Banner */}
          <div style={{
            background: 'linear-gradient(135deg, #D97706 0%, #B45309 100%)',
            borderRadius: 18,
            padding: '24px 28px',
            color: '#FFFFFF',
            marginBottom: 24,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 16,
          }}>
            <div>
              <div style={{ fontSize: '0.74rem', fontWeight: 800, color: '#FDE68A', letterSpacing: '0.04em' }}>
                CITIZEN STONE LOGISTICS
              </div>
              <h2 style={{ fontSize: '1.6rem', fontWeight: 900, margin: '4px 0', color: '#FFF' }}>
                Request Stone Dispatch from Quota
              </h2>
              <p style={{ margin: 0, fontSize: '0.86rem', color: '#FEF3C7' }}>
                Book delivery draw-downs against your approved monthly quota with automated AP e-Transit pass generation.
              </p>
            </div>
          </div>

          <div style={{
            background: '#FFFFFF',
            borderRadius: 20,
            padding: '28px 32px',
            border: '1px solid #E2E8F0',
            boxShadow: '0 8px 24px rgba(0,0,0,0.04)',
          }}>
            {dispatchSuccess && (
              <div style={{
                background: '#ECFDF5',
                border: '1px solid #A7F3D0',
                borderRadius: 12,
                padding: '16px 20px',
                marginBottom: 20,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#065F46', fontWeight: 800, fontSize: '0.95rem' }}>
                  <CheckCircle2 size={18} color="#059669" />
                  Dispatch Order Authorized Successfully!
                </div>
                <div style={{ fontSize: '0.82rem', color: '#047857', marginTop: 4 }}>
                  Reference: <strong>{dispatchSuccess.dispatch_reference}</strong> | Dispatched: <strong>{dispatchSuccess.dispatched_tonnage} MT</strong> | Remaining: <strong>{dispatchSuccess.remaining_tonnage} MT</strong>
                </div>
              </div>
            )}

            <form onSubmit={handleDispatchSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              {/* Select Plan */}
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                  Select Subscribed Granite Plan
                </label>
                <select
                  value={selectedPlanForDispatch ? selectedPlanForDispatch.id : ''}
                  onChange={(e) => {
                    const found = userPlans.find(p => p.id === Number(e.target.value));
                    setSelectedPlanForDispatch(found || null);
                  }}
                  required
                  style={{
                    width: '100%',
                    padding: '11px 14px',
                    borderRadius: 8,
                    border: '1px solid #CBD5E1',
                    fontSize: '0.88rem',
                    fontWeight: 600,
                    background: '#FFF',
                  }}
                >
                  <option value="">-- Choose Active Plan --</option>
                  {userPlans.filter(p => p.status === 'ACTIVE').map(p => {
                    const rem = Math.max(0, p.allocated_tonnage - p.consumed_tonnage);
                    return (
                      <option key={p.id} value={p.id}>
                        {p.plan_code} — {p.granite_type} ({rem.toFixed(1)} MT remaining)
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Tonnage to Dispatch */}
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                  Weight to Dispatch (Metric Tonnes)
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <input
                    type="number"
                    min="0.5"
                    max={selectedPlanForDispatch ? (selectedPlanForDispatch.allocated_tonnage - selectedPlanForDispatch.consumed_tonnage) : 100}
                    step="0.5"
                    value={dispatchTonnage}
                    onChange={(e) => setDispatchTonnage(Number(e.target.value))}
                    required
                    style={{
                      flex: 1,
                      padding: '11px 14px',
                      borderRadius: 8,
                      border: '1px solid #CBD5E1',
                      fontSize: '0.88rem',
                      fontWeight: 600,
                    }}
                  />
                  <span style={{ fontSize: '0.85rem', color: '#64748B', fontWeight: 700 }}>
                    ≈ {(dispatchTonnage / 2.75).toFixed(2)} m³
                  </span>
                </div>
              </div>

              {/* Delivery Address */}
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                  Site Delivery Address
                </label>
                <textarea
                  rows="3"
                  placeholder="Enter full construction plot address, landmark, and district..."
                  value={dispatchAddress}
                  onChange={(e) => setDispatchAddress(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: 8,
                    border: '1px solid #CBD5E1',
                    fontSize: '0.86rem',
                    boxSizing: 'border-box',
                    fontFamily: 'inherit',
                  }}
                />
              </div>

              {/* Vehicle Number (Optional) */}
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                  Vehicle / Tipper Registration Number (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. AP 27 TX 4892 (Leave blank for DMGO automated transporter match)"
                  value={dispatchVehicle}
                  onChange={(e) => setDispatchVehicle(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '11px 14px',
                    borderRadius: 8,
                    border: '1px solid #CBD5E1',
                    fontSize: '0.88rem',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <button
                type="submit"
                disabled={dispatchLoading || !selectedPlanForDispatch}
                style={{
                  background: dispatchLoading || !selectedPlanForDispatch ? '#94A3B8' : '#D97706',
                  color: '#fff',
                  border: 'none',
                  padding: '14px 20px',
                  borderRadius: 10,
                  fontWeight: 800,
                  fontSize: '0.92rem',
                  cursor: dispatchLoading || !selectedPlanForDispatch ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                }}
              >
                {dispatchLoading ? <RefreshCw size={18} className="animate-spin" /> : <Truck size={18} />}
                Generate AP e-Transit Pass &amp; Authorize Dispatch
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* ── VIEW 5: PUBLIC QR BLOCK AUTHENTICATOR ────────────────────────── */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {currentView === 'public_track' && (
        <div style={{ maxWidth: 840, margin: '0 auto' }}>
          {/* Header Banner */}
          <div style={{
            background: 'linear-gradient(135deg, #7C3AED 0%, #5B21B6 100%)',
            borderRadius: 18,
            padding: '24px 28px',
            color: '#FFFFFF',
            marginBottom: 24,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 16,
          }}>
            <div>
              <div style={{ fontSize: '0.74rem', fontWeight: 800, color: '#DDD6FE', letterSpacing: '0.04em' }}>
                CITIZEN AUDIT &amp; VERIFICATION
              </div>
              <h2 style={{ fontSize: '1.6rem', fontWeight: 900, margin: '4px 0', color: '#FFF' }}>
                Public Block QR Authenticator
              </h2>
              <p style={{ margin: 0, fontSize: '0.86rem', color: '#EDE9FE' }}>
                Verify physical block authenticity, laser QR codes, origin quarry, and DMGO check measurements.
              </p>
            </div>
          </div>

          <div style={{
            background: '#FFFFFF',
            borderRadius: 20,
            padding: '28px 32px',
            border: '1px solid #E2E8F0',
            boxShadow: '0 8px 24px rgba(0,0,0,0.04)',
            marginBottom: 24,
          }}>
            <form onSubmit={handlePublicTrack} style={{ display: 'flex', gap: 10 }}>
              <input
                type="text"
                placeholder="Enter Granite Block ID (e.g. BLK-413478, BLK-928104)..."
                value={trackBlockId}
                onChange={(e) => setTrackBlockId(e.target.value)}
                style={{
                  flex: 1,
                  padding: '12px 16px',
                  borderRadius: 10,
                  border: '1px solid #CBD5E1',
                  fontSize: '0.92rem',
                  fontWeight: 600,
                  fontFamily: 'monospace',
                }}
              />
              <button
                type="submit"
                disabled={trackLoading}
                style={{
                  background: '#7C3AED',
                  color: '#fff',
                  border: 'none',
                  padding: '0 24px',
                  borderRadius: 10,
                  fontWeight: 800,
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                {trackLoading ? <RefreshCw size={16} className="animate-spin" /> : <Search size={16} />}
                Verify Block
              </button>
            </form>

            {trackError && (
              <div style={{
                marginTop: 16,
                padding: '12px 16px',
                borderRadius: 8,
                background: '#FEF2F2',
                border: '1px solid #FCA5A5',
                color: '#B91C1C',
                fontSize: '0.84rem',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}>
                <AlertTriangle size={16} /> {trackError}
              </div>
            )}
          </div>

          {trackResult && (
            <div style={{
              background: '#FFFFFF',
              borderRadius: 20,
              padding: '28px 32px',
              border: '1px solid #E2E8F0',
              boxShadow: '0 10px 28px rgba(0,0,0,0.05)',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div>
                  <span style={{ fontSize: '0.72rem', color: '#16A34A', fontWeight: 800, letterSpacing: '0.04em' }}>
                    ● CERTIFIED AP MINES BLOCK
                  </span>
                  <h3 style={{ fontSize: '1.35rem', fontWeight: 900, margin: '2px 0 0 0', fontFamily: 'monospace' }}>
                    {trackResult.block_id || trackResult.id}
                  </h3>
                </div>
                <span style={{
                  padding: '4px 12px',
                  borderRadius: 20,
                  fontSize: '0.76rem',
                  fontWeight: 800,
                  background: '#DCFCE7',
                  color: '#15803D'
                }}>
                  {trackResult.status || 'VERIFIED'}
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
                <div style={{ background: '#F8FAFC', padding: '12px 14px', borderRadius: 10 }}>
                  <div style={{ fontSize: '0.72rem', color: '#64748B' }}>GRANITE TYPE</div>
                  <div style={{ fontWeight: 800, color: '#0F172A', marginTop: 2 }}>{trackResult.granite_type || 'Black Galaxy Granite'}</div>
                </div>
                <div style={{ background: '#F8FAFC', padding: '12px 14px', borderRadius: 10 }}>
                  <div style={{ fontSize: '0.72rem', color: '#64748B' }}>WEIGHT (TONNES)</div>
                  <div style={{ fontWeight: 800, color: '#0F172A', marginTop: 2 }}>
                    {trackResult.weighbridge_weight || (trackResult.volume ? (trackResult.volume * 2.75).toFixed(2) : '18.40')} MT
                  </div>
                </div>
                <div style={{ background: '#F8FAFC', padding: '12px 14px', borderRadius: 10 }}>
                  <div style={{ fontSize: '0.72rem', color: '#64748B' }}>VOLUME (m³)</div>
                  <div style={{ fontWeight: 800, color: '#0F172A', marginTop: 2 }}>{trackResult.volume ? trackResult.volume.toFixed(3) : '6.691'} m³</div>
                </div>
                <div style={{ background: '#F8FAFC', padding: '12px 14px', borderRadius: 10 }}>
                  <div style={{ fontSize: '0.72rem', color: '#64748B' }}>ORIGIN QUARRY</div>
                  <div style={{ fontWeight: 800, color: '#0F172A', marginTop: 2 }}>{trackResult.quarry_name || 'Chimakurthy Galaxy Quarry'}</div>
                </div>
              </div>

              {/* Delivery Action & Transit Status Banner */}
              {deliverySuccessMsg && (
                <div style={{
                  marginTop: 18,
                  padding: '12px 16px',
                  borderRadius: 10,
                  background: '#ECFDF5',
                  border: '1px solid #A7F3D0',
                  color: '#065F46',
                  fontSize: '0.86rem',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}>
                  <CheckCircle2 size={18} color="#059669" />
                  {deliverySuccessMsg}
                </div>
              )}

              {deliveryErrorMsg && (
                <div style={{
                  marginTop: 18,
                  padding: '12px 16px',
                  borderRadius: 10,
                  background: '#FEF2F2',
                  border: '1px solid #FCA5A5',
                  color: '#B91C1C',
                  fontSize: '0.86rem',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}>
                  <AlertTriangle size={18} />
                  {deliveryErrorMsg}
                </div>
              )}

              {trackResult.status === 'dispatched' ? (
                <div style={{
                  marginTop: 20,
                  padding: '18px 22px',
                  background: 'linear-gradient(135deg, #F0FDF4 0%, #DCFCE7 100%)',
                  border: '1px solid #86EFAC',
                  borderRadius: 14,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: 14,
                }}>
                  <div>
                    <div style={{ fontWeight: 800, color: '#166534', fontSize: '0.94rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Truck size={18} /> Consignment In Transit to Destination
                    </div>
                    <div style={{ fontSize: '0.82rem', color: '#15803D', marginTop: 3 }}>
                      Material has reached your construction site or processing plant? Acknowledge receipt to officially complete transit.
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button
                      type="button"
                      onClick={() => setViewTransitBlockId(trackResult.block_id || trackResult.id)}
                      style={{
                        background: '#FFFFFF',
                        color: '#15803D',
                        border: '1px solid #86EFAC',
                        padding: '10px 16px',
                        borderRadius: 10,
                        fontWeight: 700,
                        fontSize: '0.86rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                      }}
                    >
                      <MapPin size={16} /> Live Route
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCitizenConfirmDelivery(trackResult.block_id || trackResult.id)}
                      disabled={deliveryConfirming}
                      style={{
                        background: 'linear-gradient(135deg, #16A34A, #15803D)',
                        color: '#FFFFFF',
                        border: 'none',
                        padding: '10px 18px',
                        borderRadius: 10,
                        fontWeight: 800,
                        fontSize: '0.86rem',
                        cursor: deliveryConfirming ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        boxShadow: '0 4px 12px rgba(22, 163, 74, 0.3)',
                      }}
                    >
                      {deliveryConfirming ? <RefreshCw size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                      Confirm Material Received
                    </button>
                  </div>
                </div>
              ) : (trackResult.status === 'delivered' || trackResult.status === 'received') ? (
                <div style={{
                  marginTop: 20,
                  padding: '16px 20px',
                  background: '#F0FDF4',
                  border: '1px solid #BBF7D0',
                  borderRadius: 12,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: 12,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: '50%',
                      background: '#16A34A', display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                      <CheckCircle2 size={18} color="#fff" />
                    </div>
                    <div>
                      <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#166534' }}>
                        Delivery Completed &amp; Material Acknowledged
                      </div>
                      <div style={{ fontSize: '0.78rem', color: '#15803D' }}>
                        Transit pass is closed in the AP Mines &amp; Geology digital registry.
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setViewTransitBlockId(trackResult.block_id || trackResult.id)}
                    style={{
                      background: '#FFFFFF',
                      color: '#166534',
                      border: '1px solid #86EFAC',
                      padding: '8px 14px',
                      borderRadius: 8,
                      fontWeight: 700,
                      fontSize: '0.82rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                    }}
                  >
                    <Clock size={14} /> View Completed Route
                  </button>
                </div>
              ) : null}
            </div>
          )}
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* ── OFFICIAL AP DMG CITIZEN QUOTA PASS CERTIFICATE MODAL ─────────── */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {viewCertificatePlan && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(6px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 20,
          zIndex: 1000,
        }}>
          <div style={{
            background: '#FFFFFF',
            borderRadius: 20,
            maxWidth: 680,
            width: '100%',
            overflow: 'hidden',
            boxShadow: '0 25px 60px rgba(0,0,0,0.25)',
            position: 'relative',
          }}>
            {/* Certificate Header */}
            <div style={{
              background: 'linear-gradient(135deg, #1E3A8A 0%, #0F172A 100%)',
              color: '#FFFFFF',
              padding: '24px 30px',
              textAlign: 'center',
              position: 'relative',
            }}>
              <div style={{ fontSize: '0.74rem', letterSpacing: '0.08em', color: '#93C5FD', fontWeight: 800 }}>
                GOVERNMENT OF ANDHRA PRADESH
              </div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 900, margin: '4px 0 2px 0' }}>
                DEPARTMENT OF MINES &amp; GEOLOGY
              </h2>
              <div style={{ fontSize: '0.78rem', color: '#CBD5E1' }}>
                Statutory Citizen Granite Quota Pass (Form G-11)
              </div>
            </div>

            {/* Certificate Body */}
            <div style={{ padding: '28px 32px' }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                borderBottom: '1px solid #E2E8F0',
                paddingBottom: 14,
                marginBottom: 16,
              }}>
                <div>
                  <div style={{ fontSize: '0.72rem', color: '#64748B' }}>PASS REFERENCE ID</div>
                  <div style={{ fontFamily: 'monospace', fontWeight: 900, fontSize: '1rem', color: '#1A56DB' }}>
                    {viewCertificatePlan.plan_code}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.72rem', color: '#64748B' }}>VALIDITY PERIOD</div>
                  <div style={{ fontWeight: 800, fontSize: '0.85rem' }}>
                    {viewCertificatePlan.duration_months} Months ({viewCertificatePlan.billing_cycle})
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, fontSize: '0.82rem', marginBottom: 20 }}>
                <div>
                  <span style={{ color: '#64748B' }}>Citizen Beneficiary:</span>
                  <div style={{ fontWeight: 800, color: '#0F172A' }}>{user?.full_name || 'K. Venkat Rao (Citizen)'}</div>
                </div>
                <div>
                  <span style={{ color: '#64748B' }}>Delivery District:</span>
                  <div style={{ fontWeight: 800, color: '#0F172A' }}>{viewCertificatePlan.delivery_district || 'Prakasam'}</div>
                </div>
                <div>
                  <span style={{ color: '#64748B' }}>Granite Variety:</span>
                  <div style={{ fontWeight: 800, color: '#0F172A' }}>{viewCertificatePlan.granite_type}</div>
                </div>
                <div>
                  <span style={{ color: '#64748B' }}>Allocated Quota:</span>
                  <div style={{ fontWeight: 800, color: '#059669' }}>
                    {viewCertificatePlan.allocated_tonnage} MT ({viewCertificatePlan.estimated_volume_m3} m³)
                  </div>
                </div>
                <div>
                  <span style={{ color: '#64748B' }}>Seigniorage Fee Paid:</span>
                  <div style={{ fontWeight: 800, color: '#0F172A' }}>₹{viewCertificatePlan.seigniorage_fee.toLocaleString()}</div>
                </div>
                <div>
                  <span style={{ color: '#64748B' }}>Total Monthly Amount:</span>
                  <div style={{ fontWeight: 800, color: '#1A56DB' }}>₹{viewCertificatePlan.total_monthly_amount.toLocaleString()}</div>
                </div>
              </div>

              {/* Security Seal */}
              <div style={{
                background: '#F8FAFC',
                border: '1px dashed #CBD5E1',
                borderRadius: 12,
                padding: '14px 18px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 20,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <ShieldCheck size={28} color="#0D9488" />
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '0.82rem', color: '#0F172A' }}>
                      Cryptographically Signed e-Permit
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#64748B' }}>
                      Verified under Rule 26 of AP Minor Mineral Concession Rules 1966.
                    </div>
                  </div>
                </div>
                <div style={{
                  width: 50, height: 50, background: '#1E293B', borderRadius: 8,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '0.65rem'
                }}>
                  QR CODE
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button
                  onClick={() => setViewCertificatePlan(null)}
                  style={{
                    padding: '9px 16px',
                    borderRadius: 8,
                    border: '1px solid #CBD5E1',
                    background: '#FFF',
                    fontWeight: 700,
                    fontSize: '0.82rem',
                    cursor: 'pointer',
                  }}
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    window.print();
                  }}
                  style={{
                    padding: '9px 18px',
                    borderRadius: 8,
                    border: 'none',
                    background: '#1A56DB',
                    color: '#FFF',
                    fontWeight: 700,
                    fontSize: '0.82rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <Download size={15} /> Print / Save PDF
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Transit Tracker Modal for Citizen ───────────────────────────── */}
      {viewTransitBlockId && (
        <TransitTracker
          blockId={viewTransitBlockId}
          onClose={() => setViewTransitBlockId(null)}
        />
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* ── AP CFMS CYBER TREASURY PAYMENT GATEWAY MODAL (OPTION 2) ──────── */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {showPaymentModal && paymentTxnData && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.75)',
          backdropFilter: 'blur(5px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: 16,
          overflowY: 'auto'
        }}>
          <div style={{
            background: '#FFFFFF',
            borderRadius: 20,
            maxWidth: 840,
            width: '100%',
            overflow: 'hidden',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
            border: '1px solid #CBD5E1',
            display: 'flex',
            flexDirection: 'column',
            maxHeight: '92vh',
          }}>
            {/* Header: Andhra Pradesh Cyber Treasury Branding */}
            <div style={{
              background: 'linear-gradient(135deg, #0F172A 0%, #1E3A8A 55%, #0D9488 100%)',
              color: '#FFFFFF',
              padding: '18px 24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottom: '3px solid #F59E0B'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  background: 'rgba(255,255,255,0.15)',
                  border: '1px solid rgba(255,255,255,0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.3rem',
                }}>
                  🏛️
                </div>
                <div>
                  <div style={{ fontSize: '0.68rem', fontWeight: 800, color: '#FCD34D', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                    Government of Andhra Pradesh • Cyber Treasury
                  </div>
                  <div style={{ fontSize: '1.15rem', fontWeight: 900, color: '#FFFFFF', display: 'flex', alignItems: 'center', gap: 8 }}>
                    CFMS Electronic Payment Gateway
                    <span style={{ fontSize: '0.65rem', background: 'rgba(255,255,255,0.2)', padding: '2px 8px', borderRadius: 12, fontWeight: 700 }}>
                      Live Treasury Remittance
                    </span>
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#CBD5E1' }}>
                    Dept: Mines &amp; Geology (DMG) | Head: 0853-00-102-00-01 Non-Ferrous Mineral Royalty
                  </div>
                </div>
              </div>

              {paymentStep !== 'processing' && (
                <button
                  onClick={() => setShowPaymentModal(false)}
                  style={{
                    background: 'rgba(255,255,255,0.15)',
                    border: 'none',
                    borderRadius: 8,
                    color: '#FFFFFF',
                    width: 32,
                    height: 32,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                  }}
                >
                  <X size={18} />
                </button>
              )}
            </div>

            {/* Modal Body */}
            <div style={{ padding: '22px 24px', overflowY: 'auto' }}>
              {/* STEP 1: SELECT PAYMENT METHOD & CONFIRM ASSESSMENT */}
              {paymentStep === 'select' && (
                <div>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: '#F0FDF4',
                    border: '1px solid #BBF7D0',
                    borderRadius: 10,
                    padding: '10px 14px',
                    marginBottom: 18,
                    fontSize: '0.75rem',
                    color: '#166534',
                    flexWrap: 'wrap',
                    gap: 6
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700 }}>
                      <ShieldCheck size={16} color="#16A34A" />
                      <span>256-Bit SSL Secured Treasury Session</span>
                    </div>
                    <div>
                      DDO Code: <strong>{paymentTxnData.ddoCode}</strong>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>
                    {/* Left: Payment Method Chooser */}
                    <div>
                      <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#1E293B', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        Select Payment Mode
                      </div>

                      {/* Payment Mode Selector Tabs */}
                      <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
                        <button
                          type="button"
                          onClick={() => setPaymentMethod('upi')}
                          style={{
                            flex: 1,
                            padding: '10px 8px',
                            borderRadius: 10,
                            border: paymentMethod === 'upi' ? '2px solid #0D9488' : '1px solid #E2E8F0',
                            background: paymentMethod === 'upi' ? '#F0FDFA' : '#FFF',
                            color: paymentMethod === 'upi' ? '#0F766E' : '#475569',
                            fontWeight: 800,
                            fontSize: '0.78rem',
                            cursor: 'pointer',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: 4,
                          }}
                        >
                          <QrCode size={18} />
                          <span>UPI / QR</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setPaymentMethod('netbanking')}
                          style={{
                            flex: 1,
                            padding: '10px 8px',
                            borderRadius: 10,
                            border: paymentMethod === 'netbanking' ? '2px solid #0D9488' : '1px solid #E2E8F0',
                            background: paymentMethod === 'netbanking' ? '#F0FDFA' : '#FFF',
                            color: paymentMethod === 'netbanking' ? '#0F766E' : '#475569',
                            fontWeight: 800,
                            fontSize: '0.78rem',
                            cursor: 'pointer',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: 4,
                          }}
                        >
                          <Building2 size={18} />
                          <span>Net Banking</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setPaymentMethod('challan')}
                          style={{
                            flex: 1,
                            padding: '10px 8px',
                            borderRadius: 10,
                            border: paymentMethod === 'challan' ? '2px solid #0D9488' : '1px solid #E2E8F0',
                            background: paymentMethod === 'challan' ? '#F0FDFA' : '#FFF',
                            color: paymentMethod === 'challan' ? '#0F766E' : '#475569',
                            fontWeight: 800,
                            fontSize: '0.78rem',
                            cursor: 'pointer',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: 4,
                          }}
                        >
                          <FileText size={18} />
                          <span>e-Challan</span>
                        </button>
                      </div>

                      {/* UPI Mode Details */}
                      {paymentMethod === 'upi' && (
                        <div style={{
                          background: '#F8FAFC',
                          borderRadius: 12,
                          border: '1px solid #E2E8F0',
                          padding: 16,
                          textAlign: 'center'
                        }}>
                          <div style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            background: '#DCFCE7',
                            color: '#15803D',
                            padding: '3px 10px',
                            borderRadius: 12,
                            fontSize: '0.7rem',
                            fontWeight: 800,
                            marginBottom: 10
                          }}>
                            <CheckCircle2 size={12} /> Instant Quota Clearance (Zero Fee)
                          </div>

                          {/* Dynamic QR Box */}
                          <div style={{
                            width: 140,
                            height: 140,
                            margin: '0 auto 12px',
                            background: '#FFFFFF',
                            border: '2px dashed #0D9488',
                            borderRadius: 12,
                            padding: 8,
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            position: 'relative'
                          }}>
                            {/* Simulated SVG QR */}
                            <svg width="100" height="100" viewBox="0 0 100 100" fill="#0F172A">
                              <rect x="0" y="0" width="30" height="30" fill="#0D9488" rx="4" />
                              <rect x="5" y="5" width="20" height="20" fill="#FFF" rx="2" />
                              <rect x="10" y="10" width="10" height="10" fill="#0D9488" />
                              
                              <rect x="70" y="0" width="30" height="30" fill="#0D9488" rx="4" />
                              <rect x="75" y="5" width="20" height="20" fill="#FFF" rx="2" />
                              <rect x="80" y="10" width="10" height="10" fill="#0D9488" />
                              
                              <rect x="0" y="70" width="30" height="30" fill="#0D9488" rx="4" />
                              <rect x="5" y="75" width="20" height="20" fill="#FFF" rx="2" />
                              <rect x="10" y="80" width="10" height="10" fill="#0D9488" />
                              
                              <rect x="40" y="10" width="8" height="20" fill="#1E293B" />
                              <rect x="55" y="10" width="8" height="10" fill="#1E293B" />
                              <rect x="40" y="40" width="20" height="20" fill="#0D9488" rx="2" />
                              <rect x="70" y="40" width="10" height="25" fill="#1E293B" />
                              <rect x="10" y="40" width="20" height="10" fill="#1E293B" />
                              <rect x="40" y="70" width="15" height="25" fill="#1E293B" />
                              <rect x="65" y="75" width="25" height="10" fill="#1E293B" />
                            </svg>
                            <span style={{ fontSize: '0.62rem', fontWeight: 800, color: '#0D9488', marginTop: 2 }}>
                              Scan with any UPI App
                            </span>
                          </div>

                          <div style={{ fontSize: '0.72rem', color: '#64748B', marginBottom: 12 }}>
                            Supports PhonePe, Google Pay, BHIM, Paytm &amp; Cred
                          </div>

                          <div style={{ textAlign: 'left' }}>
                            <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: '#475569', marginBottom: 4 }}>
                              Or Enter UPI Virtual Address (VPA)
                            </label>
                            <div style={{ display: 'flex', gap: 6 }}>
                              <input
                                type="text"
                                value={upiId}
                                onChange={(e) => setUpiId(e.target.value)}
                                placeholder="username@oksbi"
                                style={{
                                  flex: 1,
                                  padding: '8px 12px',
                                  borderRadius: 8,
                                  border: '1px solid #CBD5E1',
                                  fontSize: '0.8rem',
                                  fontWeight: 600,
                                }}
                              />
                              <button
                                type="button"
                                style={{
                                  padding: '8px 12px',
                                  borderRadius: 8,
                                  border: '1px solid #0D9488',
                                  background: '#F0FDFA',
                                  color: '#0F766E',
                                  fontSize: '0.75rem',
                                  fontWeight: 800,
                                }}
                              >
                                Verify
                              </button>
                            </div>
                            <div style={{ fontSize: '0.68rem', color: '#15803D', marginTop: 4, fontWeight: 600 }}>
                              ✓ Beneficiary: AP Consolidated Fund Mines (ADMG Ongole)
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Net Banking Details */}
                      {paymentMethod === 'netbanking' && (
                        <div style={{
                          background: '#F8FAFC',
                          borderRadius: 12,
                          border: '1px solid #E2E8F0',
                          padding: 16
                        }}>
                          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: '#334155', marginBottom: 8 }}>
                            Authorized Treasury Settlement Banks
                          </label>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
                            {[
                              { id: 'SBI', name: 'State Bank of India', tag: 'Primary Gateway' },
                              { id: 'UBI', name: 'Union Bank of India', tag: 'AP Treasury Branch' },
                              { id: 'HDFC', name: 'HDFC Bank', tag: 'Fast Clear' },
                              { id: 'ICICI', name: 'ICICI Bank', tag: 'Direct Debit' },
                              { id: 'CANARA', name: 'Canara Bank', tag: 'Govt Portal' },
                              { id: 'PNB', name: 'Punjab National Bank', tag: 'CBS Connected' },
                            ].map((b) => (
                              <div
                                key={b.id}
                                onClick={() => setSelectedBank(b.id)}
                                style={{
                                  padding: '10px 12px',
                                  borderRadius: 8,
                                  border: selectedBank === b.id ? '2px solid #0D9488' : '1px solid #CBD5E1',
                                  background: selectedBank === b.id ? '#F0FDFA' : '#FFFFFF',
                                  cursor: 'pointer',
                                }}
                              >
                                <div style={{ fontSize: '0.78rem', fontWeight: 800, color: selectedBank === b.id ? '#0F766E' : '#1E293B' }}>
                                  {b.name}
                                </div>
                                <div style={{ fontSize: '0.66rem', color: '#64748B' }}>{b.tag}</div>
                              </div>
                            ))}
                          </div>
                          <div style={{ fontSize: '0.7rem', color: '#475569', background: '#F1F5F9', padding: '8px 10px', borderRadius: 6 }}>
                            ⚡ Direct electronic clearing authorized under AP Cyber Treasury Rules.
                          </div>
                        </div>
                      )}

                      {/* e-Challan / Virtual Account Details */}
                      {paymentMethod === 'challan' && (
                        <div style={{
                          background: '#F8FAFC',
                          borderRadius: 12,
                          border: '1px solid #E2E8F0',
                          padding: 16,
                          fontSize: '0.75rem',
                          color: '#334155'
                        }}>
                          <div style={{ fontWeight: 800, fontSize: '0.82rem', marginBottom: 8, color: '#0F172A' }}>
                            Treasury Virtual Account (RTGS / NEFT / OTC)
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr', gap: 6, marginBottom: 10 }}>
                            <span style={{ color: '#64748B' }}>Virtual A/C:</span>
                            <span style={{ fontFamily: 'monospace', fontWeight: 800 }}>APCFMS0853202688</span>
                            <span style={{ color: '#64748B' }}>IFSC Code:</span>
                            <span style={{ fontFamily: 'monospace', fontWeight: 800 }}>SBIN0000001</span>
                            <span style={{ color: '#64748B' }}>Beneficiary:</span>
                            <span style={{ fontWeight: 700 }}>PAO Mines &amp; Geology, Amaravati</span>
                          </div>
                          <div style={{ background: '#FEF3C7', padding: '8px 10px', borderRadius: 6, color: '#92400E', fontSize: '0.7rem' }}>
                            ℹ️ Quota will be cleared instantly upon simulated RTGS treasury acknowledgement.
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Right: Challan & Statutory Assessment Breakdown */}
                    <div style={{
                      background: '#F8FAFC',
                      borderRadius: 14,
                      border: '1px solid #E2E8F0',
                      padding: 18,
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                    }}>
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, borderBottom: '1px solid #E2E8F0', paddingBottom: 8 }}>
                          <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#475569' }}>
                            e-Challan Assessment
                          </span>
                          <span style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: '0.75rem', background: '#E2E8F0', padding: '2px 6px', borderRadius: 4 }}>
                            {paymentTxnData.challanNo}
                          </span>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: '0.78rem', marginBottom: 14 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: '#64748B' }}>Applicant:</span>
                            <span style={{ fontWeight: 700 }}>{user?.full_name || 'Citizen Applicant'}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: '#64748B' }}>Granite Grade:</span>
                            <span style={{ fontWeight: 700 }}>{paymentTxnData.graniteType}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: '#64748B' }}>Approved Quota:</span>
                            <span style={{ fontWeight: 800, color: '#0D9488' }}>
                              {paymentTxnData.tonnage} MT ({paymentTxnData.cbm} m³)
                            </span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: '#64748B' }}>Delivery District:</span>
                            <span style={{ fontWeight: 700 }}>{paymentTxnData.district}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: '#64748B' }}>Subscription Duration:</span>
                            <span style={{ fontWeight: 700 }}>{paymentTxnData.durationMonths} Month(s)</span>
                          </div>
                        </div>

                        {/* Statutory Fees Itemization */}
                        <div style={{
                          background: '#FFFFFF',
                          borderRadius: 8,
                          border: '1px solid #E2E8F0',
                          padding: '10px 12px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 6,
                          fontSize: '0.74rem',
                          color: '#475569',
                          marginBottom: 14
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span>Seigniorage Fee (Royalty):</span>
                            <span style={{ fontWeight: 700 }}>₹{paymentTxnData.royaltyAmount?.toLocaleString()}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span>District Mineral Foundation (DMF 30%):</span>
                            <span style={{ fontWeight: 700 }}>₹{paymentTxnData.dmfAmount?.toLocaleString()}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span>MERIT Fund (2%):</span>
                            <span style={{ fontWeight: 700 }}>₹{paymentTxnData.meritAmount?.toLocaleString()}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span>AP SGST + CGST (18%):</span>
                            <span style={{ fontWeight: 700 }}>₹{paymentTxnData.gstAmount?.toLocaleString()}</span>
                          </div>
                        </div>

                        {/* Total Amount Box */}
                        <div style={{
                          background: '#F0FDFA',
                          border: '2px solid #99F6E4',
                          borderRadius: 10,
                          padding: '12px 14px',
                          marginBottom: 14,
                        }}>
                          <div style={{ fontSize: '0.72rem', color: '#0F766E', fontWeight: 700 }}>
                            TOTAL TREASURY PAYABLE
                          </div>
                          <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#0D9488' }}>
                            ₹{paymentTxnData.totalAmount?.toLocaleString()}
                          </div>
                        </div>
                      </div>

                      {/* Pay Action Button */}
                      <div>
                        <button
                          type="button"
                          onClick={executePayment}
                          disabled={subscribing}
                          style={{
                            width: '100%',
                            padding: '14px 18px',
                            borderRadius: 12,
                            border: 'none',
                            background: 'linear-gradient(135deg, #0D9488 0%, #1E3A8A 100%)',
                            color: '#FFFFFF',
                            fontWeight: 800,
                            fontSize: '0.92rem',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 8,
                            boxShadow: '0 6px 18px rgba(13, 148, 136, 0.3)',
                          }}
                        >
                          <Lock size={16} /> Pay ₹{paymentTxnData.totalAmount?.toLocaleString()} via Cyber Treasury
                        </button>
                        <div style={{ fontSize: '0.68rem', color: '#64748B', textAlign: 'center', marginTop: 8 }}>
                          Direct credit to AP Govt Consolidated Fund (Head 0853)
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 2: PROCESSING / AUTHORIZATION */}
              {paymentStep === 'processing' && (
                <div style={{ padding: '36px 20px', textAlign: 'center' }}>
                  <div style={{
                    width: 70,
                    height: 70,
                    borderRadius: '50%',
                    background: '#F0FDFA',
                    border: '3px solid #0D9488',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 20px'
                  }}>
                    <RefreshCw size={32} color="#0D9488" className="animate-spin" />
                  </div>

                  <h3 style={{ fontSize: '1.25rem', fontWeight: 900, color: '#0F172A', marginBottom: 6 }}>
                    Connecting with AP Cyber Treasury Gateway
                  </h3>
                  <p style={{ fontSize: '0.82rem', color: '#64748B', maxWidth: 440, margin: '0 auto 24px' }}>
                    Authorizing statutory royalty remittance and locking quota allocation. Please do not refresh or close.
                  </p>

                  {/* Stage Progress Indicators */}
                  <div style={{ maxWidth: 460, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 12, textAlign: 'left' }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '10px 14px',
                      borderRadius: 8,
                      background: processingStage >= 1 ? '#F0FDF4' : '#F8FAFC',
                      border: processingStage >= 1 ? '1px solid #86EFAC' : '1px solid #E2E8F0',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      color: processingStage >= 1 ? '#15803D' : '#94A3B8'
                    }}>
                      {processingStage >= 1 ? <CheckCircle2 size={16} color="#15803D" /> : <Clock size={16} />}
                      <span>1. Connecting to AP Cyber Treasury Server (Amaravati)...</span>
                    </div>

                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '10px 14px',
                      borderRadius: 8,
                      background: processingStage >= 2 ? '#F0FDF4' : '#F8FAFC',
                      border: processingStage >= 2 ? '1px solid #86EFAC' : '1px solid #E2E8F0',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      color: processingStage >= 2 ? '#15803D' : '#94A3B8'
                    }}>
                      {processingStage >= 2 ? <CheckCircle2 size={16} color="#15803D" /> : <Clock size={16} />}
                      <span>2. Clearing royalty payment via {paymentMethod === 'upi' ? 'UPI Gateway' : paymentMethod === 'netbanking' ? selectedBank : 'CFMS e-Challan'}...</span>
                    </div>

                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '10px 14px',
                      borderRadius: 8,
                      background: processingStage >= 3 ? '#F0FDF4' : '#F8FAFC',
                      border: processingStage >= 3 ? '1px solid #86EFAC' : '1px solid #E2E8F0',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      color: processingStage >= 3 ? '#15803D' : '#94A3B8'
                    }}>
                      {processingStage >= 3 ? <CheckCircle2 size={16} color="#15803D" /> : <Clock size={16} />}
                      <span>3. Crediting Head 0853-00-102 and activating quota in Mines DB...</span>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 3: SUCCESS & OFFICIAL CFMS TREASURY RECEIPT */}
              {paymentStep === 'success' && (
                <div>
                  <div style={{
                    background: '#F0FDF4',
                    border: '1px solid #86EFAC',
                    borderRadius: 14,
                    padding: '16px 20px',
                    marginBottom: 20,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 14,
                  }}>
                    <div style={{
                      width: 44,
                      height: 44,
                      borderRadius: '50%',
                      background: '#15803D',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#FFF'
                    }}>
                      <CheckCircle2 size={26} />
                    </div>
                    <div>
                      <div style={{ fontSize: '1.05rem', fontWeight: 900, color: '#14532D' }}>
                        CFMS Cyber Treasury Remittance Successful!
                      </div>
                      <div style={{ fontSize: '0.78rem', color: '#166534' }}>
                        Official Treasury e-Challan generated. Your {paymentTxnData.tonnage} MT quota is now active and ready for dispatch.
                      </div>
                    </div>
                  </div>

                  {/* Form AP-CFMS-21 Official Printable Challan */}
                  <div style={{
                    border: '2px solid #0D9488',
                    borderRadius: 14,
                    padding: 22,
                    background: '#FFFFFF',
                    boxShadow: '0 4px 16px rgba(0,0,0,0.04)',
                    marginBottom: 20,
                  }}>
                    {/* Challan Top Header */}
                    <div style={{ textAlign: 'center', borderBottom: '2px solid #E2E8F0', paddingBottom: 14, marginBottom: 14 }}>
                      <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#0F766E', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                        Government of Andhra Pradesh • Department of Mines and Geology
                      </div>
                      <div style={{ fontSize: '1.1rem', fontWeight: 900, color: '#0F172A', margin: '3px 0' }}>
                        FORM AP-CFMS-21 : ELECTRONIC TREASURY CHALLAN RECEIPT
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#64748B' }}>
                        Under APMMCR 1966 &amp; AP Treasury Code • Head of Account: 0853-00-102-00-01
                      </div>
                    </div>

                    {/* Receipt Details Grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 20px', fontSize: '0.78rem', color: '#334155', marginBottom: 16 }}>
                      <div>
                        <span style={{ color: '#64748B', display: 'block', fontSize: '0.7rem' }}>Challan Reference No:</span>
                        <strong style={{ fontFamily: 'monospace', color: '#0F172A' }}>{paymentTxnData.challanNo}</strong>
                      </div>
                      <div>
                        <span style={{ color: '#64748B', display: 'block', fontSize: '0.7rem' }}>CFMS Transaction ID:</span>
                        <strong style={{ fontFamily: 'monospace', color: '#0D9488' }}>{paymentTxnData.cfmsTxnId}</strong>
                      </div>
                      <div>
                        <span style={{ color: '#64748B', display: 'block', fontSize: '0.7rem' }}>Bank Ref No (CIN):</span>
                        <strong style={{ fontFamily: 'monospace', color: '#0F172A' }}>{paymentTxnData.bankRef}</strong>
                      </div>
                      <div>
                        <span style={{ color: '#64748B', display: 'block', fontSize: '0.7rem' }}>Date &amp; Time:</span>
                        <strong>{paymentTxnData.createdAt}</strong>
                      </div>
                      <div>
                        <span style={{ color: '#64748B', display: 'block', fontSize: '0.7rem' }}>Remitter Name:</span>
                        <strong>{user?.full_name || 'Citizen Applicant'}</strong>
                      </div>
                      <div>
                        <span style={{ color: '#64748B', display: 'block', fontSize: '0.7rem' }}>Delivery District:</span>
                        <strong>{paymentTxnData.district} District</strong>
                      </div>
                      <div>
                        <span style={{ color: '#64748B', display: 'block', fontSize: '0.7rem' }}>Granite Specification:</span>
                        <strong>{paymentTxnData.graniteType} ({paymentTxnData.tonnage} MT Quota)</strong>
                      </div>
                      <div>
                        <span style={{ color: '#64748B', display: 'block', fontSize: '0.7rem' }}>Settlement Status:</span>
                        <span style={{
                          display: 'inline-block',
                          padding: '2px 8px',
                          background: '#DCFCE7',
                          color: '#15803D',
                          borderRadius: 4,
                          fontWeight: 800,
                          fontSize: '0.72rem'
                        }}>
                          ✓ SETTLED &amp; RECONCILED (RBI)
                        </span>
                      </div>
                    </div>

                    {/* Amount Highlight */}
                    <div style={{
                      background: '#F8FAFC',
                      borderRadius: 10,
                      padding: '12px 16px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      border: '1px solid #E2E8F0',
                      marginBottom: 12
                    }}>
                      <div>
                        <div style={{ fontSize: '0.7rem', color: '#64748B', fontWeight: 700 }}>
                          TOTAL STATUTORY AMOUNT REMITTED
                        </div>
                        <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#0D9488' }}>
                          ₹{paymentTxnData.totalAmount?.toLocaleString()}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '0.68rem', color: '#64748B' }}>Allocated Plan Code:</div>
                        <div style={{ fontFamily: 'monospace', fontWeight: 900, color: '#1E3A8A' }}>
                          {paymentTxnData.planCode || paymentTxnData.createdPlan?.plan_code || 'AP-CIT-PLAN'}
                        </div>
                      </div>
                    </div>

                    {/* Security Seal Note */}
                    <div style={{ fontSize: '0.68rem', color: '#64748B', fontStyle: 'italic', textAlign: 'center' }}>
                      This is a computer generated electronic receipt recognized under AP Minor Mineral Concession Rules 1966. No physical signature required.
                    </div>
                  </div>

                  {/* Modal Footer Actions */}
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                    <button
                      type="button"
                      onClick={() => window.print()}
                      style={{
                        padding: '10px 18px',
                        borderRadius: 10,
                        border: '1px solid #CBD5E1',
                        background: '#FFFFFF',
                        color: '#1E293B',
                        fontWeight: 700,
                        fontSize: '0.84rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                      }}
                    >
                      <Printer size={15} /> Print / Save Challan
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setShowPaymentModal(false);
                        switchView('plans');
                      }}
                      style={{
                        padding: '10px 22px',
                        borderRadius: 10,
                        border: 'none',
                        background: '#0D9488',
                        color: '#FFFFFF',
                        fontWeight: 800,
                        fontSize: '0.84rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        boxShadow: '0 4px 12px rgba(13, 148, 136, 0.25)',
                      }}
                    >
                      <Check size={16} /> Proceed to My Active Plans
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* ── AP CFMS RECEIPT VIEWER MODAL (FOR TAB 2 ACTIVE PLANS) ────────── */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {receiptPlan && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.75)',
          backdropFilter: 'blur(5px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: 16,
          overflowY: 'auto'
        }}>
          <div style={{
            background: '#FFFFFF',
            borderRadius: 20,
            maxWidth: 720,
            width: '100%',
            overflow: 'hidden',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
            border: '1px solid #CBD5E1',
          }}>
            {/* Header */}
            <div style={{
              background: 'linear-gradient(135deg, #0F172A 0%, #0D9488 100%)',
              color: '#FFFFFF',
              padding: '16px 22px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottom: '3px solid #F59E0B'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: '1.3rem' }}>🏛️</span>
                <div>
                  <div style={{ fontSize: '0.68rem', fontWeight: 800, color: '#FCD34D', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                    Government of Andhra Pradesh
                  </div>
                  <div style={{ fontSize: '1.05rem', fontWeight: 900 }}>
                    Official CFMS Treasury e-Challan Receipt
                  </div>
                </div>
              </div>
              <button
                onClick={() => setReceiptPlan(null)}
                style={{
                  background: 'rgba(255,255,255,0.15)',
                  border: 'none',
                  borderRadius: 8,
                  color: '#FFFFFF',
                  width: 30,
                  height: 30,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Body */}
            <div style={{ padding: 22 }}>
              <div style={{
                border: '2px solid #0D9488',
                borderRadius: 12,
                padding: 20,
                background: '#FFFFFF',
                marginBottom: 18
              }}>
                <div style={{ textAlign: 'center', borderBottom: '2px solid #E2E8F0', paddingBottom: 12, marginBottom: 14 }}>
                  <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#0F766E' }}>
                    DEPARTMENT OF MINES &amp; GEOLOGY • CYBER TREASURY AP
                  </div>
                  <div style={{ fontSize: '1.05rem', fontWeight: 900, color: '#0F172A' }}>
                    FORM AP-CFMS-21 : STATUTORY RECEIPT
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#64748B' }}>
                    Head of Account: 0853-00-102-00-01 (Mines &amp; Minerals Concession Fees &amp; Royalty)
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 16px', fontSize: '0.78rem', color: '#334155', marginBottom: 14 }}>
                  <div>
                    <span style={{ color: '#64748B', display: 'block', fontSize: '0.7rem' }}>Challan Reference No:</span>
                    <strong style={{ fontFamily: 'monospace' }}>CFMS-AP26-{String(receiptPlan.id || 1).padStart(6, '0')}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748B', display: 'block', fontSize: '0.7rem' }}>CFMS Txn ID:</span>
                    <strong style={{ fontFamily: 'monospace', color: '#0D9488' }}>CFMS-TXN-{receiptPlan.plan_code}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748B', display: 'block', fontSize: '0.7rem' }}>Plan Reference Code:</span>
                    <strong style={{ fontFamily: 'monospace' }}>{receiptPlan.plan_code}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748B', display: 'block', fontSize: '0.7rem' }}>Remitter:</span>
                    <strong>{user?.full_name || 'Citizen Applicant'}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748B', display: 'block', fontSize: '0.7rem' }}>Mineral Grade:</span>
                    <strong>{receiptPlan.granite_type}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748B', display: 'block', fontSize: '0.7rem' }}>Allocated Quota:</span>
                    <strong style={{ color: '#0D9488' }}>{receiptPlan.allocated_tonnage} Metric Tonnes</strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748B', display: 'block', fontSize: '0.7rem' }}>Destination District:</span>
                    <strong>{receiptPlan.delivery_district || 'Prakasam'}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748B', display: 'block', fontSize: '0.7rem' }}>Payment Status:</span>
                    <span style={{
                      display: 'inline-block',
                      padding: '2px 8px',
                      background: '#DCFCE7',
                      color: '#15803D',
                      borderRadius: 4,
                      fontWeight: 800,
                      fontSize: '0.72rem'
                    }}>
                      ✓ CFMS SETTLED &amp; RECONCILED
                    </span>
                  </div>
                </div>

                <div style={{
                  background: '#F0FDFA',
                  borderRadius: 8,
                  padding: '10px 14px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  border: '1px solid #99F6E4'
                }}>
                  <div>
                    <div style={{ fontSize: '0.68rem', color: '#0F766E', fontWeight: 700 }}>
                      TOTAL CFMS TREASURY REMITTANCE
                    </div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#0D9488' }}>
                      ₹{receiptPlan.total_monthly_amount?.toLocaleString()}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', fontSize: '0.75rem' }}>
                    <span style={{ color: '#64748B' }}>Seigniorage Fee:</span>{' '}
                    <strong>₹{receiptPlan.seigniorage_fee?.toLocaleString()}</strong>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button
                  type="button"
                  onClick={() => setReceiptPlan(null)}
                  style={{
                    padding: '9px 16px',
                    borderRadius: 8,
                    border: '1px solid #CBD5E1',
                    background: '#FFFFFF',
                    fontWeight: 700,
                    fontSize: '0.82rem',
                    cursor: 'pointer',
                  }}
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  style={{
                    padding: '9px 18px',
                    borderRadius: 8,
                    border: 'none',
                    background: '#0D9488',
                    color: '#FFFFFF',
                    fontWeight: 800,
                    fontSize: '0.82rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <Printer size={15} /> Print / Save PDF
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
