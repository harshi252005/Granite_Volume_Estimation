import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { MapPin, Truck, CheckCircle2, Clock, Navigation, AlertCircle, RefreshCw } from 'lucide-react';

export default function TransitTracker({ blockId, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const fetchTracking = async () => {
    try {
      setLoading(true);
      const res = await api.getTransitTrack(blockId);
      setData(res);
    } catch (err) {
      setError(err.message || 'Failed to fetch transit data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTracking();
    const interval = setInterval(fetchTracking, 30000); // refresh every 30s
    return () => clearInterval(interval);
  }, [blockId]);

  const handleConfirmDelivery = async () => {
    try {
      setConfirming(true);
      setError('');
      await api.confirmDelivery(blockId);
      setSuccessMsg('Material delivery successfully confirmed! Transit complete.');
      // Refresh tracking immediately
      await fetchTracking();
    } catch (err) {
      setError(err.message || 'Failed to confirm delivery');
    } finally {
      setConfirming(false);
    }
  };

  if (loading && !data) {
    return (
      <div className="modal-overlay" onClick={onClose} style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(4px)',
        zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center'
      }}>
        <div style={{ background: '#fff', padding: 30, borderRadius: 16, textAlign: 'center' }}>
          <div style={{
            width: 40, height: 40, borderRadius: '50%', border: '3px solid #E2E8F0',
            borderTopColor: '#3B82F6', animation: 'spin 1s linear infinite', margin: '0 auto 16px'
          }} />
          <p style={{ fontWeight: 600, color: '#1E293B' }}>Locating Vehicle...</p>
        </div>
      </div>
    );
  }

  const isDelivered = data && (data.current_status === 'Delivered' || data.current_status === 'Arrived' || data.progress_percentage >= 100);

  return (
    <div className="modal-overlay" onClick={onClose} style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(4px)',
      zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20
    }}>
      <div 
        className="modal-content" 
        onClick={e => e.stopPropagation()}
        style={{
          background: '#fff', width: '100%', maxWidth: 500, borderRadius: 20,
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', overflow: 'hidden',
          display: 'flex', flexDirection: 'column', maxHeight: '90vh'
        }}
      >
        {/* Header */}
        <div style={{
          background: isDelivered 
            ? 'linear-gradient(135deg, #065F46, #059669)' 
            : 'linear-gradient(135deg, #1E3A8A, #3B82F6)',
          padding: '24px', color: '#fff', position: 'relative'
        }}>
          <button onClick={onClose} style={{
            position: 'absolute', top: 16, right: 16, background: 'rgba(255,255,255,0.2)',
            border: 'none', color: '#fff', width: 32, height: 32, borderRadius: '50%',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            backdropFilter: 'blur(4px)'
          }}>✕</button>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <div style={{ background: 'rgba(255,255,255,0.2)', padding: 10, borderRadius: 12 }}>
              <Truck size={24} color="#fff" />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600 }}>Live Transit Tracking</h2>
              <p style={{ margin: 0, color: '#DBEAFE', fontSize: '0.85rem', opacity: 0.9 }}>Block: {blockId}</p>
            </div>
          </div>
          
          {error ? (
             <div style={{ background: 'rgba(239, 68, 68, 0.2)', padding: '12px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem' }}>
               <AlertCircle size={16} />
               {error}
             </div>
          ) : data && (
            <div style={{ background: 'rgba(255,255,255,0.1)', padding: 16, borderRadius: 12, backdropFilter: 'blur(8px)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12, fontSize: '0.85rem' }}>
                <div><span style={{ color: '#93C5FD' }}>Vehicle:</span> <strong style={{ color: '#fff' }}>{data.vehicle_number}</strong></div>
                <div><span style={{ color: '#93C5FD' }}>Status:</span> <strong style={{ color: '#fff' }}>{data.current_status}</strong></div>
              </div>
              
              {/* Progress Bar */}
              <div style={{ height: 6, background: 'rgba(255,255,255,0.2)', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ 
                  height: '100%', width: `${data.progress_percentage}%`, 
                  background: isDelivered ? '#10B981' : '#34D399', transition: 'width 1s ease-in-out'
                }} />
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: '0.75rem', color: '#DBEAFE' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Navigation size={12} /> {data.progress_percentage}% Completed</div>
                <div>{data.current_location}</div>
              </div>
            </div>
          )}
        </div>
        
        {/* Timeline */}
        <div style={{ padding: 24, overflowY: 'auto', background: '#F8FAFC', flex: 1 }}>
          {successMsg && (
            <div style={{
              background: '#ECFDF5', border: '1px solid #A7F3D0', color: '#065F46',
              padding: '12px 16px', borderRadius: 10, fontSize: '0.84rem', fontWeight: 600,
              marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8
            }}>
              <CheckCircle2 size={16} color="#059669" />
              {successMsg}
            </div>
          )}

          {data && data.checkpoints && (
            <div style={{ position: 'relative' }}>
              <div style={{ 
                position: 'absolute', top: 20, bottom: 20, left: 24, 
                width: 2, background: '#E2E8F0', zIndex: 0 
              }} />
              
              {data.checkpoints.map((cp, idx) => {
                const isPassed = cp.status === 'passed';
                const isCurrent = idx > 0 && data.checkpoints[idx-1].status === 'passed' && !isPassed;
                
                return (
                  <div key={cp.id} style={{ 
                    display: 'flex', gap: 20, marginBottom: 24, position: 'relative', zIndex: 1,
                    opacity: isPassed ? 1 : 0.6
                  }}>
                    <div style={{ 
                      width: 48, height: 48, borderRadius: '50%', 
                      background: isPassed ? '#10B981' : (isCurrent ? '#3B82F6' : '#F1F5F9'),
                      border: isPassed || isCurrent ? 'none' : '2px solid #E2E8F0',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: isPassed || isCurrent ? '#fff' : '#94A3B8',
                      flexShrink: 0,
                      boxShadow: isCurrent ? '0 0 0 4px rgba(59, 130, 246, 0.2)' : 'none'
                    }}>
                      {isPassed ? <CheckCircle2 size={24} /> : <MapPin size={24} />}
                    </div>
                    
                    <div style={{ flex: 1, paddingTop: 4 }}>
                      <h4 style={{ margin: '0 0 4px 0', color: isPassed ? '#1E293B' : '#475569', fontSize: '0.95rem' }}>
                        {cp.name}
                      </h4>
                      <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748B', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Clock size={14} />
                        {isPassed ? 
                          `Passed at ${new Date(cp.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}` : 
                          `ETA: ${new Date(cp.eta).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer: Confirm Material Received Action */}
        {data && (
          isDelivered ? (
            <div style={{
              padding: '16px 24px', background: '#ECFDF5', borderTop: '1px solid #A7F3D0',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              color: '#065F46', fontSize: '0.88rem', fontWeight: 800
            }}>
              <CheckCircle2 size={20} color="#059669" />
              Consignment Delivered &amp; Officially Received
            </div>
          ) : (
            <div style={{
              padding: '16px 24px', background: '#FFFFFF', borderTop: '1px solid #E2E8F0',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12
            }}>
              <div style={{ fontSize: '0.8rem', color: '#64748B' }}>
                Reached destination site?
              </div>
              <button
                onClick={handleConfirmDelivery}
                disabled={confirming}
                style={{
                  background: 'linear-gradient(135deg, #10B981, #059669)',
                  color: '#FFFFFF',
                  border: 'none',
                  padding: '11px 20px',
                  borderRadius: 10,
                  fontWeight: 800,
                  fontSize: '0.88rem',
                  cursor: confirming ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  boxShadow: '0 4px 14px rgba(16, 185, 129, 0.3)',
                  transition: 'all 0.2s ease',
                }}
              >
                {confirming ? <RefreshCw size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                Confirm Material Received
              </button>
            </div>
          )
        )}
      </div>
    </div>
  );
}
