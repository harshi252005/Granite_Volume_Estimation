import React, { useState, useMemo } from 'react';
import CountUpNumber from './CountUpNumber';
import {
  IndianRupee, Calculator, TrendingUp, AlertCircle, FileText,
  Download, Send, CheckCircle2, ShieldCheck, BarChart3, HelpCircle,
  Building, PieChart as PieIcon, Receipt, Check, Clock
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from 'recharts';

const STATUTORY_TARIFFS = [
  { type: 'Super Gangsaw (>270×150 cm)', rate: 3000, dmfRate: 900, meritRate: 60, total: 3960, desc: 'Large export-quality monolithic blocks' },
  { type: 'Gangsaw (>200×100 cm)', rate: 2200, dmfRate: 660, meritRate: 44, total: 2904, desc: 'Standard gangsaw processing slabs' },
  { type: 'Below Gangsaw (Rough)', rate: 1500, dmfRate: 450, meritRate: 30, total: 1980, desc: 'Circular saw & monument grade' },
  { type: 'Undressed Raw Boulders', rate: 800, dmfRate: 240, meritRate: 16, total: 1056, desc: 'Quarry-run un-dressed rock' },
];

const MONTHLY_REVENUE = [
  { month: 'Apr', base: 2.1, dmf: 0.63, total: 2.77 },
  { month: 'May', base: 2.8, dmf: 0.84, total: 3.69 },
  { month: 'Jun', base: 2.4, dmf: 0.72, total: 3.16 },
  { month: 'Jul', base: 3.6, dmf: 1.08, total: 4.75 },
  { month: 'Aug', base: 3.2, dmf: 0.96, total: 4.22 },
  { month: 'Sep', base: 4.1, dmf: 1.23, total: 5.41 },
];

const QUARRY_LEDGER = [
  { id: 101, name: 'Chimakurthy Galaxy Quarry A-1', lessee: 'M/s Coastal Granites Ltd', vol: 3420, paid: 13543200, outstanding: 0, status: 'Clear' },
  { id: 104, name: 'Ballikurava Black Pearl Quarry', lessee: 'Prakasam Minerals Corp', vol: 2180, paid: 8632800, outstanding: 180000, status: 'Overdue' },
  { id: 108, name: 'Prakasam Premium Granite Unit 3', lessee: 'Deccan Stone Exports', vol: 1840, paid: 7286400, outstanding: 0, status: 'Clear' },
  { id: 112, name: 'Martur Black Galaxy Mines', lessee: 'Sri Balaji Granites', vol: 1420, paid: 5623200, outstanding: 450000, status: 'Overdue' },
  { id: 115, name: 'Santhanuthalapadu Stone Works', lessee: 'Andhra Royal Quarry Ltd', vol: 980, paid: 3880800, outstanding: 0, status: 'Clear' },
];

export default function DMGORevenue({ blocks = [], stats, user }) {
  const [calcLength, setCalcLength] = useState(280);
  const [calcBreadth, setCalcBreadth] = useState(160);
  const [calcHeight, setCalcHeight] = useState(140);
  const [selectedVariety, setSelectedVariety] = useState('Super Gangsaw');
  const [demandModalQuarry, setDemandModalQuarry] = useState(null);
  const [noticeSent, setNoticeSent] = useState(false);
  const [quarryLedger, setQuarryLedger] = useState(QUARRY_LEDGER);
  const [paymentModalQuarry, setPaymentModalQuarry] = useState(null);
  const [challanRef, setChallanRef] = useState('');
  const [bankUtr, setBankUtr] = useState('');
  const [paymentMode, setPaymentMode] = useState('CFMS Treasury Portal');
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [revenueRefresh, setRevenueRefresh] = useState(0);

  const district = user?.district || 'Prakasam';

  const blockRemittances = useMemo(() => {
    const list = [];
    (blocks || []).forEach(b => {
      try {
        const s = localStorage.getItem(`challan_record_${b.id}`);
        if (s) {
          list.push({ block: b, record: JSON.parse(s) });
        }
      } catch {}
    });
    return list;
  }, [blocks, revenueRefresh]);

  const handleAuthorizeChallanFromRevenue = (blockId, record) => {
    const approved = {
      ...record,
      status: 'authorized',
      authorized_by: `DMGO Officer (${district} District)`,
      authorized_at: new Date().toISOString(),
      receipt_no: `AP-DMG-REC-2026-${Math.floor(100000 + Math.random() * 900000)}`,
    };
    try {
      localStorage.setItem(`challan_record_${blockId}`, JSON.stringify(approved));
    } catch {}
    setRevenueRefresh(v => v + 1);
  };

  // Dynamic Calculator computation
  const calcVolume = (calcLength * calcBreadth * calcHeight) / 1000000;
  const isSuper = calcLength >= 270 && calcBreadth >= 150;
  const isGangsaw = calcLength >= 200 && calcBreadth >= 100;
  const grade = isSuper ? 'Super Gangsaw' : isGangsaw ? 'Gangsaw' : 'Below Gangsaw';
  const baseRate = isSuper ? 3000 : isGangsaw ? 2200 : 1500;
  const baseAmount = calcVolume * baseRate;
  const dmfAmount = baseAmount * 0.30;
  const meritAmount = baseAmount * 0.02;
  const totalChallan = baseAmount + dmfAmount + meritAmount;

  const totalAssessed = blocks.reduce((acc, b) => acc + (b.seigniorage?.total_fee || 0), 0) || 34200000;
  const dmfTotal = totalAssessed * 0.30;
  const meritTotal = totalAssessed * 0.02;

  const totalOverdue = quarryLedger.reduce((sum, q) => sum + (q.outstanding || 0), 0);
  const overdueCount = quarryLedger.filter(q => q.outstanding > 0).length;

  const handleSendDemandNotice = () => {
    setNoticeSent(true);
    setTimeout(() => {
      setNoticeSent(false);
      setDemandModalQuarry(null);
    }, 2000);
  };

  const handleReconcilePayment = () => {
    if (!paymentModalQuarry) return;
    setPaymentSuccess(true);
    setTimeout(() => {
      setQuarryLedger(prev => prev.map(item => {
        if (item.id === paymentModalQuarry.id) {
          return {
            ...item,
            paid: item.paid + item.outstanding,
            outstanding: 0,
            status: 'Clear'
          };
        }
        return item;
      }));
      setPaymentSuccess(false);
      setPaymentModalQuarry(null);
    }, 1500);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, animation: 'slideInUp 0.3s ease-out' }}>
      {/* Header */}
      <div className="page-header" style={{ flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h1 className="page-title" style={{ margin: 0 }}>Seigniorage Revenue &amp; Cess Portal</h1>
            <span className="badge badge-blue" style={{ fontSize: '0.72rem' }}>AP Minor Mineral Rules 1966</span>
          </div>
          <p className="page-subtitle" style={{ margin: '4px 0 0' }}>
            Statutory tariff schedules, District Mineral Foundation (DMF) cess, and revenue reconciliation for {district}
          </p>
        </div>
      </div>

      {/* Primary Revenue Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
        <div className="card" style={{ padding: '16px 20px', borderLeft: '4px solid #1A56DB' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Gross Seigniorage</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#1A56DB', marginTop: 4 }}>
            ₹<CountUpNumber target={Number((totalAssessed / 10000000).toFixed(2))} end={Number((totalAssessed / 10000000).toFixed(2))} decimals={2} /> Cr
          </div>
          <div style={{ fontSize: '0.7rem', color: '#059669', marginTop: 2 }}>FY 2025-26 Assessed Revenue</div>
        </div>

        <div className="card" style={{ padding: '16px 20px', borderLeft: '4px solid #10B981' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>DMF Cess (30%)</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#059669', marginTop: 4 }}>
            ₹<CountUpNumber target={Number((dmfTotal / 10000000).toFixed(2))} end={Number((dmfTotal / 10000000).toFixed(2))} decimals={2} /> Cr
          </div>
          <div style={{ fontSize: '0.7rem', color: '#64748B', marginTop: 2 }}>For District Welfare &amp; Water Projects</div>
        </div>

        <div className="card" style={{ padding: '16px 20px', borderLeft: '4px solid #7C3AED' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>MERIT Trust (2%)</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#7C3AED', marginTop: 4 }}>
            ₹<CountUpNumber target={Number((meritTotal / 100000).toFixed(1))} end={Number((meritTotal / 100000).toFixed(1))} decimals={1} /> Lakhs
          </div>
          <div style={{ fontSize: '0.7rem', color: '#64748B', marginTop: 2 }}>Mineral Exploration &amp; AI Research</div>
        </div>

        <div className="card" style={{ padding: '16px 20px', borderLeft: '4px solid #EF4444' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Overdue Demands</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#DC2626', marginTop: 4 }}>
            ₹{(totalOverdue / 100000).toFixed(1)} Lakhs
          </div>
          <div style={{ fontSize: '0.7rem', color: overdueCount > 0 ? '#DC2626' : '#059669', marginTop: 2 }}>
            {overdueCount > 0 ? `${overdueCount} quarries have overdue dues` : 'All 5 leaseholders compliant & paid up'}
          </div>
        </div>
      </div>

      {/* Two-Column: Interactive Calculator + Revenue Trend */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: 20 }}>
        {/* Interactive Statutory Calculator */}
        <div className="card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0F1729', margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Calculator size={18} color="#1A56DB" />
                Statutory Seigniorage &amp; Cess Calculator
              </h3>
              <p style={{ fontSize: '0.72rem', color: '#64748B', margin: '2px 0 0' }}>
                Simulate official challan fees under G.O. Ms. No. 56 AP Mining Rules
              </p>
            </div>
            <span className={`badge ${isSuper ? 'badge-gold' : 'badge-blue'}`} style={{ fontSize: '0.72rem' }}>
              {grade} Tier
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 14 }}>
            <div>
              <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>Length (cm)</label>
              <input
                type="number"
                className="form-control"
                value={calcLength}
                onChange={e => setCalcLength(Number(e.target.value))}
                style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700 }}
              />
            </div>
            <div>
              <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>Breadth (cm)</label>
              <input
                type="number"
                className="form-control"
                value={calcBreadth}
                onChange={e => setCalcBreadth(Number(e.target.value))}
                style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700 }}
              />
            </div>
            <div>
              <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>Height (cm)</label>
              <input
                type="number"
                className="form-control"
                value={calcHeight}
                onChange={e => setCalcHeight(Number(e.target.value))}
                style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700 }}
              />
            </div>
          </div>

          {/* Breakdown Card */}
          <div style={{ background: '#F8FAFC', padding: 14, borderRadius: 10, border: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem' }}>
              <span style={{ color: '#64748B' }}>Net Solid Volume:</span>
              <strong style={{ fontFamily: "'JetBrains Mono', monospace" }}>{calcVolume.toFixed(3)} m³</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem' }}>
              <span style={{ color: '#64748B' }}>Base Seigniorage (@ ₹{baseRate}/m³):</span>
              <strong style={{ fontFamily: "'JetBrains Mono', monospace" }}>₹{Math.round(baseAmount).toLocaleString('en-IN')}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem' }}>
              <span style={{ color: '#64748B' }}>DMF Cess (30% on base):</span>
              <strong style={{ color: '#059669', fontFamily: "'JetBrains Mono', monospace" }}>+ ₹{Math.round(dmfAmount).toLocaleString('en-IN')}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem' }}>
              <span style={{ color: '#64748B' }}>MERIT Cess (2% on base):</span>
              <strong style={{ color: '#7C3AED', fontFamily: "'JetBrains Mono', monospace" }}>+ ₹{Math.round(meritAmount).toLocaleString('en-IN')}</strong>
            </div>
            <div style={{ height: 1, background: '#CBD5E1', margin: '4px 0' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.92rem', fontWeight: 900 }}>
              <span style={{ color: '#0F1729' }}>Total Statutory Challan:</span>
              <span style={{ color: '#1A56DB', fontFamily: "'JetBrains Mono', monospace" }}>₹{Math.round(totalChallan).toLocaleString('en-IN')}</span>
            </div>
          </div>
        </div>

        {/* Revenue Collection Trend Chart */}
        <div className="card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0F1729', margin: 0 }}>
                Monthly Seigniorage Collection (Cr)
              </h3>
              <p style={{ fontSize: '0.72rem', color: '#64748B', margin: '2px 0 0' }}>District treasury receipts vs DMF share</p>
            </div>
            <span className="badge badge-green" style={{ fontSize: '0.7rem' }}>+28% Growth</span>
          </div>

          <div style={{ height: 210 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={MONTHLY_REVENUE} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                <defs>
                  <linearGradient id="totalGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#1A56DB" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#1A56DB" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="dmfGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#475569' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#475569' }} axisLine={false} tickLine={false} />
                <Tooltip formatter={(v) => [`₹${v} Crores`, 'Amount']} contentStyle={{ background: '#fff', border: '1px solid #CBD5E1', borderRadius: 8, fontSize: 12 }} />
                <Area type="monotone" dataKey="total" stroke="#1A56DB" strokeWidth={2.5} fillOpacity={1} fill="url(#totalGrad)" name="Total Revenue" />
                <Area type="monotone" dataKey="dmf" stroke="#10B981" strokeWidth={2} fillOpacity={1} fill="url(#dmfGrad)" name="DMF Share" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Statutory Tariff Schedule */}
      <div className="card" style={{ padding: 20 }}>
        <div style={{ marginBottom: 14 }}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0F1729', margin: 0 }}>
            Official Tariff Slabs — AP Minor Mineral Concession Rules
          </h3>
          <p style={{ fontSize: '0.72rem', color: '#64748B', margin: '2px 0 0' }}>Fixed statutory rates per cubic metre (m³) + mandatory cess</p>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table>
            <thead>
              <tr>
                <th>Granite Category &amp; Dimensions</th>
                <th>Base Seigniorage</th>
                <th>DMF Cess (30%)</th>
                <th>MERIT Cess (2%)</th>
                <th>Total / m³</th>
                <th>Application</th>
              </tr>
            </thead>
            <tbody>
              {STATUTORY_TARIFFS.map((t, idx) => (
                <tr key={idx}>
                  <td style={{ fontWeight: 700, fontSize: '0.82rem', color: '#0F1729' }}>{t.type}</td>
                  <td style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700 }}>₹{t.rate.toLocaleString('en-IN')}</td>
                  <td style={{ fontFamily: "'JetBrains Mono', monospace", color: '#059669', fontWeight: 700 }}>₹{t.dmfRate.toLocaleString('en-IN')}</td>
                  <td style={{ fontFamily: "'JetBrains Mono', monospace", color: '#7C3AED', fontWeight: 700 }}>₹{t.meritRate.toLocaleString('en-IN')}</td>
                  <td style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 900, color: '#1A56DB' }}>₹{t.total.toLocaleString('en-IN')}</td>
                  <td style={{ fontSize: '0.75rem', color: '#64748B' }}>{t.desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Lessee CFMS Challan Remittance & Treasury Reconciliation Queue */}
      <div className="card" style={{ padding: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
          <div>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0F1729', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Receipt size={18} color="#1A56DB" />
              Lessee CFMS Challan Remittances &amp; Cyber Treasury Audit
            </h3>
            <p style={{ fontSize: '0.72rem', color: '#64748B', margin: '2px 0 0' }}>
              Statutory verification of mineral block remittances submitted by quarry operators per Rule 12 &amp; 26 of APMMC Rules 1966
            </p>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <span className="badge badge-gold" style={{ fontSize: '0.7rem' }}>
              {blockRemittances.filter(r => r.record.status === 'pending_authorization').length} Pending Audit
            </span>
            <span className="badge badge-green" style={{ fontSize: '0.7rem' }}>
              {blockRemittances.filter(r => r.record.status === 'authorized').length} Authorized
            </span>
          </div>
        </div>

        {blockRemittances.length === 0 ? (
          <div style={{ background: '#F8FAFC', padding: 24, borderRadius: 8, textAlign: 'center', border: '1px dashed #CBD5E1' }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#64748B' }}>No block remittance records submitted yet in this browser session.</div>
            <div style={{ fontSize: '0.75rem', color: '#94A3B8', marginTop: 4 }}>
              When a quarry operator submits an e-Challan payment for any block, it will appear here for statutory DMGO authorization.
            </div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th>Block ID</th>
                  <th>Quarry / Lessee</th>
                  <th>Variety &amp; Vol</th>
                  <th>Statutory Demand</th>
                  <th>CFMS Challan Ref</th>
                  <th>Bank UTR</th>
                  <th>Submitted</th>
                  <th>Treasury Status</th>
                  <th>DMGO Officer Action</th>
                </tr>
              </thead>
              <tbody>
                {blockRemittances.map(({ block: b, record: r }) => {
                  const isPending = r.status === 'pending_authorization';
                  return (
                    <tr key={b.id} style={{ background: isPending ? '#FFFBEB' : 'transparent' }}>
                      <td style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 800, color: '#1A56DB', fontSize: '0.8rem' }}>
                        {b.id}
                      </td>
                      <td>
                        <div style={{ fontWeight: 700, fontSize: '0.8rem', color: '#0F1729' }}>{b.quarry_name || `Quarry #${b.quarry_id}`}</div>
                        <div style={{ fontSize: '0.68rem', color: '#64748B' }}>{r.submitted_by || 'Lessee'}</div>
                      </td>
                      <td>
                        <div style={{ fontSize: '0.78rem', fontWeight: 600 }}>{b.seigniorage?.granite_type || 'Black Galaxy'}</div>
                        <div style={{ fontSize: '0.68rem', color: '#64748B', fontFamily: "'JetBrains Mono', monospace" }}>
                          {b.measurement?.volume?.toFixed(3) || (b.undressed_volume?.toFixed(3)) || '—'} m³
                        </div>
                      </td>
                      <td style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 800, color: '#166534', fontSize: '0.82rem' }}>
                        ₹{Number(r.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.75rem', color: '#0F1729' }}>
                        {r.challan_no}
                      </td>
                      <td style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.75rem', fontWeight: 700, color: '#1A56DB' }}>
                        {r.utr}
                      </td>
                      <td style={{ fontSize: '0.72rem', color: '#64748B' }}>
                        {r.submitted_at ? new Date(r.submitted_at).toLocaleDateString('en-IN') : '—'}
                      </td>
                      <td>
                        {isPending ? (
                          <span className="badge badge-gold" style={{ fontSize: '0.68rem' }}>
                            <Clock size={10} /> Pending Audit
                          </span>
                        ) : (
                          <span className="badge badge-green" style={{ fontSize: '0.68rem' }}>
                            <CheckCircle2 size={10} /> Authorized
                          </span>
                        )}
                      </td>
                      <td>
                        {isPending ? (
                          <button
                            className="btn btn-success btn-sm"
                            style={{ padding: '4px 8px', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: 4, fontWeight: 700 }}
                            onClick={() => handleAuthorizeChallanFromRevenue(b.id, r)}
                            title="Authorize this statutory challan against State Cyber Treasury"
                          >
                            <ShieldCheck size={13} /> 🔏 Authorize as DMGO
                          </button>
                        ) : (
                          <div style={{ fontSize: '0.7rem', color: '#047857' }}>
                            <div style={{ fontWeight: 700 }}>{r.receipt_no}</div>
                            <div style={{ color: '#64748B', fontSize: '0.65rem' }}>{r.authorized_by}</div>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Quarry Ledger & Demand Notices */}
      <div className="card" style={{ padding: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0F1729', margin: 0 }}>
              Quarry Ledger &amp; Seigniorage Compliance
            </h3>
            <p style={{ fontSize: '0.72rem', color: '#64748B', margin: '2px 0 0' }}>Outstanding dues and demand notice enforcement</p>
          </div>
          <span className="badge badge-blue" style={{ fontSize: '0.7rem' }}>5 Monitored Leaseholders</span>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table>
            <thead>
              <tr>
                <th>Quarry Name</th>
                <th>Lessee Entity</th>
                <th>Extracted Volume</th>
                <th>Seigniorage Remitted</th>
                <th>Outstanding Dues</th>
                <th>Compliance Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {quarryLedger.map(q => (
                <tr key={q.id}>
                  <td style={{ fontWeight: 700, fontSize: '0.82rem' }}>{q.name}</td>
                  <td style={{ fontSize: '0.78rem', color: '#334155' }}>{q.lessee}</td>
                  <td style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.8rem' }}>{q.vol.toLocaleString()} m³</td>
                  <td style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, color: '#059669' }}>
                    ₹{q.paid.toLocaleString('en-IN')}
                  </td>
                  <td style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, color: q.outstanding > 0 ? '#DC2626' : '#64748B' }}>
                    {q.outstanding > 0 ? `₹${q.outstanding.toLocaleString('en-IN')}` : '₹0'}
                  </td>
                  <td>
                    <span className={`badge ${q.status === 'Clear' ? 'badge-green' : 'badge-rose'}`} style={{ fontSize: '0.7rem' }}>
                      {q.status}
                    </span>
                  </td>
                  <td>
                    {q.outstanding > 0 ? (
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={() => setDemandModalQuarry(q)}
                          style={{ padding: '4px 8px', fontSize: '0.72rem' }}
                          title="Issue Form E Statutory Demand Notice"
                        >
                          Issue Demand Notice
                        </button>
                        <button
                          className="btn btn-outline btn-sm"
                          onClick={() => {
                            setPaymentModalQuarry(q);
                            setChallanRef(`CFMS-2026-AP-${q.id}${Math.floor(1000 + Math.random() * 9000)}`);
                            setBankUtr(`SBIIN${Date.now().toString().slice(-8)}`);
                          }}
                          style={{ padding: '4px 8px', fontSize: '0.72rem', borderColor: '#059669', color: '#059669' }}
                          title="Verify CFMS Challan & Clear Dues"
                        >
                          <Receipt size={12} style={{ marginRight: 4 }} /> Record Payment
                        </button>
                      </div>
                    ) : (
                      <span style={{ fontSize: '0.74rem', color: '#059669', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <CheckCircle2 size={13} color="#059669" /> Paid Up
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* DEMAND NOTICE MODAL */}
      {demandModalQuarry && (
        <div className="modal-overlay" onClick={() => setDemandModalQuarry(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 500 }}>
            <div className="modal-header">
              <div className="modal-title" style={{ color: '#DC2626', display: 'flex', alignItems: 'center', gap: 6 }}>
                <AlertCircle size={20} color="#DC2626" />
                Statutory Demand Notice — Form E
              </div>
              <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setDemandModalQuarry(null)}>✕</button>
            </div>

            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {noticeSent ? (
                <div style={{ textAlign: 'center', padding: '24px 0' }}>
                  <CheckCircle2 size={40} color="#16A34A" style={{ margin: '0 auto 10px' }} />
                  <div style={{ fontWeight: 800, fontSize: '1rem', color: '#166534' }}>Notice Dispatched Successfully!</div>
                  <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: 4 }}>
                    Official demand letter sent to {demandModalQuarry.lessee} via Registered Speed Post &amp; e-Mining Portal.
                  </div>
                </div>
              ) : (
                <>
                  <div className="alert alert-rose" style={{ fontSize: '0.75rem' }}>
                    Demand notice issued under Rule 26 of AP Minor Mineral Concession Rules 1966. Lessee is granted 15 days to remit dues.
                  </div>

                  <div style={{ background: '#F8FAFC', padding: 14, borderRadius: 10, border: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', gap: 6, fontSize: '0.78rem' }}>
                    <div><strong>Quarry:</strong> {demandModalQuarry.name}</div>
                    <div><strong>Lessee:</strong> {demandModalQuarry.lessee}</div>
                    <div><strong>Total Overdue Amount:</strong> <span style={{ color: '#DC2626', fontWeight: 900 }}>₹{demandModalQuarry.outstanding.toLocaleString('en-IN')}</span></div>
                    <div><strong>Stipulated Period:</strong> 15 Business Days</div>
                  </div>

                  <div style={{ fontSize: '0.75rem', color: '#64748B' }}>
                    Failure to remit will result in suspension of transit permit issuance and impounding of mineral blocks at checkposts.
                  </div>
                </>
              )}
            </div>

            {!noticeSent && (
              <div className="modal-footer">
                <button className="btn btn-outline" onClick={() => setDemandModalQuarry(null)}>
                  Cancel
                </button>
                <button className="btn btn-danger" onClick={handleSendDemandNotice} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Send size={15} /> Dispatch Formal Demand Notice
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* PAYMENT RECONCILIATION MODAL */}
      {paymentModalQuarry && (
        <div className="modal-overlay" onClick={() => !paymentSuccess && setPaymentModalQuarry(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 520 }}>
            <div className="modal-header">
              <div className="modal-title" style={{ color: '#059669', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Receipt size={20} color="#059669" />
                Treasury Remittance &amp; CFMS Challan Verification
              </div>
              {!paymentSuccess && (
                <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setPaymentModalQuarry(null)}>✕</button>
              )}
            </div>

            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {paymentSuccess ? (
                <div style={{ textAlign: 'center', padding: '24px 0' }}>
                  <CheckCircle2 size={46} color="#059669" style={{ margin: '0 auto 12px' }} />
                  <div style={{ fontWeight: 800, fontSize: '1.1rem', color: '#065F46' }}>
                    Remittance Reconciled &amp; Approved!
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#1E3A8A', marginTop: 6 }}>
                    ₹{paymentModalQuarry.outstanding.toLocaleString('en-IN')} successfully verified via CFMS.
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#059669', marginTop: 4, fontWeight: 600 }}>
                    Quarry compliance updated to "CLEAR" &amp; status marked as "Paid Up".
                  </div>
                </div>
              ) : (
                <>
                  <div style={{ background: '#F0FDF4', padding: 12, borderRadius: 8, border: '1px solid #6EE7B7', fontSize: '0.78rem', color: '#065F46' }}>
                    Verify lessee payment reference from the AP Comprehensive Financial Management System (CFMS) or State Treasury scroll.
                  </div>

                  <div style={{ background: '#F8FAFC', padding: 14, borderRadius: 10, border: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', gap: 6, fontSize: '0.8rem' }}>
                    <div><strong>Quarry:</strong> {paymentModalQuarry.name}</div>
                    <div><strong>Lessee Entity:</strong> {paymentModalQuarry.lessee}</div>
                    <div><strong>Remittance Outstanding:</strong> <span style={{ color: '#059669', fontWeight: 800 }}>₹{paymentModalQuarry.outstanding.toLocaleString('en-IN')}</span></div>
                    <div><strong>Approving Officer:</strong> {user?.name || user?.username || 'DMGO Officer Vizag'}</div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div>
                      <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4 }}>
                        CFMS Challan / e-Payment Reference No.
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        value={challanRef}
                        onChange={e => setChallanRef(e.target.value)}
                        style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700 }}
                      />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                      <div>
                        <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4 }}>
                          Bank Transaction UTR
                        </label>
                        <input
                          type="text"
                          className="form-control"
                          value={bankUtr}
                          onChange={e => setBankUtr(e.target.value)}
                          style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.8rem' }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4 }}>
                          Treasury Gateway
                        </label>
                        <select
                          className="form-control"
                          value={paymentMode}
                          onChange={e => setPaymentMode(e.target.value)}
                          style={{ fontSize: '0.8rem' }}
                        >
                          <option value="CFMS Treasury Portal">CFMS Portal</option>
                          <option value="SBI e-Pay AP Govt">SBI e-Pay AP</option>
                          <option value="Treasury Cyber Challan">Cyber Challan</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>

            {!paymentSuccess && (
              <div className="modal-footer">
                <button className="btn btn-outline" onClick={() => setPaymentModalQuarry(null)}>
                  Cancel
                </button>
                <button
                  className="btn btn-success"
                  onClick={handleReconcilePayment}
                  style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                >
                  <Check size={16} /> Confirm &amp; Mark as Paid Up
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
