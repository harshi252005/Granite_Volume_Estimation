import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { Camera, Layers, LayoutDashboard, Truck, History, Plus } from 'lucide-react';
import OperatorDashboard from './OperatorDashboard';
import OperatorBlocksList from './OperatorBlocksList';
import OperatorCaptureBlock from './OperatorCaptureBlock';
import OperatorDispatch from './OperatorDispatch';
import AICommandCenter from './AICommandCenter';
import SeigniorageCalculator from './SeigniorageCalculator';
import LeaseComplianceTracker from './LeaseComplianceTracker';
import UploadHistory from './UploadHistory';

export default function OperatorPanel({ user, activeTab, setActiveTab }) {
  const [blocks, setBlocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [targetUndressedBlock, setTargetUndressedBlock] = useState(null);

  const fetchBlocks = async () => {
    try {
      setLoading(true);
      const data = await api.getBlocks();
      setBlocks(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchBlocks(); }, []);

  const handleNavigateToCapture = (blockToDress = null) => {
    setTargetUndressedBlock(blockToDress);
    setActiveTab('capture');
  };

  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [queueCount, setQueueCount] = useState(0);

  useEffect(() => {
    const handleOnline  = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online',  handleOnline);
    window.addEventListener('offline', handleOffline);
    // Check offline queue size
    import('../utils/offlineQueue.js').then(({ offlineQueue }) => {
      offlineQueue.pendingCount().then(setQueueCount).catch(() => {});
    });
    return () => { window.removeEventListener('online', handleOnline); window.removeEventListener('offline', handleOffline); };
  }, []);

  const renderTab = () => {
    switch (activeTab) {
      case 'capture':   return (
        <OperatorCaptureBlock
          onActionCompleted={fetchBlocks}
          user={user}
          onNavigateToBlocks={() => setActiveTab('blocks')}
          initialUndressedBlock={targetUndressedBlock}
        />
      );
      case 'blocks':    return (
        <OperatorBlocksList
          blocks={blocks}
          activeSubTab="op_blocks_all"
          onActionCompleted={fetchBlocks}
          onNavigateToCapture={handleNavigateToCapture}
        />
      );
      case 'dispatch':     return <OperatorDispatch blocks={blocks} onActionCompleted={fetchBlocks} />;
      case 'history':      return (
        <UploadHistory
          blocks={blocks}
          loading={loading}
          onRefresh={fetchBlocks}
          onNavigateToCapture={handleNavigateToCapture}
          user={user}
        />
      );
      case 'calculator':   return <SeigniorageCalculator />;
      case 'compliance':   return <LeaseComplianceTracker user={user} />;
      case 'ai_center':    return <AICommandCenter user={user} />;
      default:             return <OperatorDashboard blocks={blocks} setActiveTab={setActiveTab} loading={loading} onNavigateToCapture={handleNavigateToCapture} />;
    }
  };

  return (
    <div style={{ animation: 'fadeIn 0.25s ease' }}>
      {/* Offline Banner */}
      {!isOnline && (
        <div style={{
          background: '#FEF3C7', border: '1px solid #F59E0B', borderRadius: 10,
          padding: '10px 16px', marginBottom: 14,
          display: 'flex', gap: 10, alignItems: 'center',
          fontWeight: 600, fontSize: 13, color: '#92400E',
        }}>
          <span>📡</span>
          <span>You are offline — captures will be queued and submitted automatically when connectivity returns.</span>
          {queueCount > 0 && (
            <span style={{ marginLeft: 'auto', background: '#F59E0B', color: '#fff', borderRadius: 20, padding: '2px 10px', fontSize: 12 }}>
              {queueCount} queued
            </span>
          )}
        </div>
      )}
      {renderTab()}
    </div>
  );
}

