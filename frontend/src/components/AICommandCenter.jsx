import React, { useState, useRef, useEffect } from 'react';
import { api } from '../api';
import { useLanguage, ROLE_GREETINGS_TE } from '../i18n';

const C = {
  bg:      '#F8FAFC',
  surface: '#FFFFFF',
  border:  '#E2E8F0',
  text:    '#1E293B',
  sub:     '#64748B',
  brand:   '#1A56DB',
  brandL:  '#EBF5FF',
  success: '#10B981',
  warn:    '#F59E0B',
  dark:    '#0F172A',
};

const ROLE_PRESETS = {
  operator: [
    { icon: '📸', label: 'Capture Help',       msg: 'How do I capture and submit a new granite block using the camera?', msg_te: 'కెమెరాను ఉపయోగించి కొత్త గ్రానైట్ బ్లాక్‌ను ఎలా క్యాప్చర్ చేసి సమర్పించాలి?' },
    { icon: '📐', label: 'Gangsaw Rules',      msg: 'What are the dimension rules and volume thresholds for Super Gangsaw vs Gangsaw?', msg_te: 'సూపర్ గ్యాంగ్‌సా మరియు గ్యాంగ్‌సా పరిమాణ నిబంధనలు మరియు వాల్యూమ్ పరిమితులు ఏమిటి?' },
    { icon: '🚛', label: 'Dispatch Process',   msg: 'What are the steps to request an e-Permit and dispatch a block?', msg_te: 'ఇ-పర్మిట్ కోరడానికి మరియు బ్లాక్‌ను రవాణా చేయడానికి దశలు ఏమిటి?' },
    { icon: '⛏️', label: 'Pit Face Uploads',  msg: 'What is required for undressed block registration at the quarry pit?', msg_te: 'క్వారీ పిట్ వద్ద అన్‌డ్రెస్డ్ బ్లాక్ నమోదుకు ఏమి అవసరం?' },
    { icon: '🚩', label: 'My Flagged Blocks',  msg: 'Show any flagged or rejected blocks from my quarry', msg_te: 'నా క్వారీ నుండి ఏవైనా ఫ్లాగ్ చేయబడిన లేదా తిరస్కరించబడిన బ్లాక్‌లను చూపించండి' },
    { icon: '💰', label: 'Seigniorage Rates',  msg: 'What are the current seigniorage fees per cubic meter for granite?', msg_te: 'గ్రానైట్ కోసం క్యూబిక్ మీటరుకు ప్రస్తుత సీనియరేజ్ రుసుములు ఎంత?' },
  ],
  dmgo: [
    { icon: '🏗️', label: 'Pending Approvals',  msg: 'List all blocks pending DMGO review and approval', msg_te: 'DMGO సమీక్ష మరియు ఆమోదం కోసం పెండింగ్‌లో ఉన్న అన్ని బ్లాక్‌లను చూపించండి' },
    { icon: '🚩', label: 'Flagged Blocks',     msg: 'Show me all blocks that are currently flagged or rejected with variance details', msg_te: 'వ్యత్యాస వివరాలతో ప్రస్తుతం ఫ్లాగ్ చేయబడిన లేదా తిరస్కరించబడిన అన్ని బ్లాక్‌లను చూపించండి' },
    { icon: '💰', label: 'Revenue Summary',    msg: 'Give me a summary of total seigniorage collected and district breakdown', msg_te: 'మొత్తం సీనియరేజ్ ఆదాయం మరియు జిల్లాల వారీ వివరాల సారాంశాన్ని ఇవ్వండి' },
    { icon: '⚖️', label: 'Weighbridge Issues', msg: 'Which blocks have weighbridge discrepancies above 5%?', msg_te: 'ఏ బ్లాక్‌లలో 5% కంటే ఎక్కువ వేబ్రిడ్జ్ వ్యత్యాసాలు ఉన్నాయి?' },
    { icon: '📊', label: 'Top Quarries',       msg: 'Which quarries have the highest production this month?', msg_te: 'ఈ నెలలో అత్యధిక ఉత్పత్తి సాధించిన క్వారీలు ఏవి?' },
    { icon: '🔄', label: 'OMEPS Sync Status',  msg: 'What is the status of integration sync with OMEPS portal?', msg_te: 'OMEPS పోర్టల్‌తో అనుసంధాన సమన్వయ స్థితి ఏమిటి?' },
  ],
  weighbridge: [
    { icon: '⚖️', label: 'Gross & Tare Entry', msg: 'Explain the protocol for logging weighbridge gross and tare weights', msg_te: 'వేబ్రిడ్జ్ స్థూల మరియు నికర బరువులను నమోదు చేసే విధానాన్ని వివరించండి' },
    { icon: '⚠️', label: '5% Discrepancy Rule', msg: 'What happens when weighbridge weight differs by more than 5% from AI volume estimate?', msg_te: 'AI వాల్యూమ్ అంచనా కంటే వేబ్రిడ్జ్ బరువు 5% కంటే ఎక్కువగా తేడా ఉంటే ఏమి జరుగుతుంది?' },
    { icon: '🚩', label: 'Flagged Vehicles',   msg: 'Show recently flagged vehicles with weight discrepancies', msg_te: 'బరువు వ్యత్యాసాలతో ఇటీవల ఫ్లాగ్ చేయబడిన వాహనాలను చూపించండి' },
    { icon: '📋', label: 'Transit Pass Check', msg: 'How to verify the statutory e-Permit transit pass at the weighbridge scale?', msg_te: 'వేబ్రిడ్జ్ వద్ద ఇ-పర్మిట్ రవాణా పాస్‌ను ఎలా ధృవీకరించాలి?' },
    { icon: '🚛', label: 'Active Dispatches',  msg: 'Show all blocks currently dispatched and heading to weighbridges', msg_te: 'ప్రస్తుతం పంపబడి వేబ్రిడ్జ్‌లకు వెళ్తున్న అన్ని బ్లాక్‌లను చూపించండి' },
  ],
  enforcement: [
    { icon: '🔍', label: 'Roadside Inspection', msg: 'What are the statutory guidelines under Section 21 MMDR Act for roadside vehicle checks?', msg_te: 'రోడ్‌సైడ్ వాహన తనిఖీల కోసం సెక్షన్ 21 MMDR చట్టం ప్రకారం చట్టబద్ధమైన మార్గదర్శకాలు ఏమిటి?' },
    { icon: '📱', label: 'QR Code Verification', msg: 'How to verify QR codes and tamper-proof e-Permits on transit vehicles?', msg_te: 'రవాణా వాహనాలపై QR కోడ్‌లు మరియు ఇ-పర్మిట్లను ఎలా ధృవీకరించాలి?' },
    { icon: '🚩', label: 'Flagged Transits',   msg: 'List all active transit alerts and flagged consignments', msg_te: 'అన్ని క్రియాశీల రవాణా హెచ్చరికలు మరియు ఫ్లాగ్ చేయబడిన సరుకులను చూపించండి' },
    { icon: '🚔', label: 'Seizure Protocol',   msg: 'What is the procedure to issue Form G seizure notices for unpermitted granite?', msg_te: 'అనుమతి లేని గ్రానైట్ కోసం ఫారమ్ G జప్తు నోటీసులను జారీ చేసే విధానం ఏమిటి?' },
    { icon: '🚛', label: 'Vehicle Search',     msg: 'How can I lookup transport permits by vehicle registration number?', msg_te: 'వాహన రిజిస్ట్రేషన్ నంబర్ ద్వారా రవాణా అనుమతులను ఎలా శోధించాలి?' },
  ],
  admin: [
    { icon: '🚩', label: 'Flagged Blocks',     msg: 'Show me all blocks that are currently flagged or rejected', msg_te: 'ప్రస్తుతం ఫ్లాగ్ చేయబడిన లేదా తిరస్కరించబడిన అన్ని బ్లాక్‌లను చూపించండి' },
    { icon: '💰', label: 'Revenue Summary',    msg: 'Give me a summary of total seigniorage collected and revenue breakdown', msg_te: 'మొత్తం సీనియరేజ్ మరియు ఆదాయ వివరాల సారాంశాన్ని ఇవ్వండి' },
    { icon: '⚖️', label: 'Weighbridge Issues', msg: 'Which blocks have weighbridge discrepancies above 5%?', msg_te: 'ఏ బ్లాక్‌లలో 5% కంటే ఎక్కువ వేబ్రిడ్జ్ వ్యత్యాసాలు ఉన్నాయి?' },
    { icon: '🏗️', label: 'Pending Approval',  msg: 'List all blocks pending DMGO review', msg_te: 'DMGO సమీక్ష కోసం పెండింగ్‌లో ఉన్న అన్ని బ్లాక్‌లను చూపించండి' },
    { icon: '🚛', label: 'In Transit',         msg: 'Show current active transit permits and vehicle details', msg_te: 'ప్రస్తుత క్రియాశీల రవాణా పర్మిట్లు మరియు వాహన వివరాలను చూపించండి' },
    { icon: '📊', label: 'Top Quarries',       msg: 'Which quarries have submitted the most blocks this month?', msg_te: 'ఈ నెలలో అత్యధిక బ్లాక్‌లను సమర్పించిన క్వారీలు ఏవి?' },
    { icon: '🪨', label: 'Super Gangsaw',      msg: 'How many Super Gangsaw category blocks have been processed?', msg_te: 'ఎన్ని సూపర్ గ్యాంగ్‌సా వర్గం బ్లాక్‌లు ప్రాసెస్ చేయబడ్డాయి?' },
    { icon: '🔄', label: 'OMEPS Status',       msg: 'Show status of OMEPS sync and external integration logs', msg_te: 'OMEPS సమన్వయం మరియు బాహ్య అనుసంధాన లాగ్‌ల స్థితిని చూపించండి' },
  ],
};

const ROLE_GREETINGS = {
  operator: "Namaste! I'm your Quarry Operator AI Assistant. I can help you with block capture guidance, dimension standards, pit-face logging, and dispatch permits.",
  dmgo: "Namaste Officer! I'm your DMGO AI Assistant. I can assist you with block approvals, weight discrepancy audits, seigniorage revenue reports, and quarry compliance.",
  weighbridge: "Namaste! I'm your Weighbridge Operations AI Assistant. I can help with gross/tare reconciliation, weight variance rules, and transit pass verification.",
  enforcement: "Namaste Officer! I'm your Road Vigilance AI Assistant. I can assist with Section 21 MMDR compliance, roadside checks, QR verification, and seizure protocol.",
  admin: "Namaste! I'm your Smart Granite AI Command Center. I have live access to all quarry, block, transit, weighbridge, and seigniorage data across Andhra Pradesh.",
};

function ChatBubble({ message }) {
  const isUser = message.role === 'user';
  return (
    <div style={{
      display: 'flex',
      flexDirection: isUser ? 'row-reverse' : 'row',
      gap: 10, marginBottom: 16, alignItems: 'flex-start',
    }}>
      {/* Avatar */}
      <div style={{
        width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
        background: isUser ? C.brand : C.dark,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 14,
      }}>
        {isUser ? '👤' : '🤖'}
      </div>

      <div style={{ maxWidth: '75%' }}>
        {/* Bubble */}
        <div style={{
          background: isUser ? C.brand : C.surface,
          color: isUser ? '#fff' : C.text,
          border: isUser ? 'none' : `1px solid ${C.border}`,
          borderRadius: isUser ? '16px 4px 16px 16px' : '4px 16px 16px 16px',
          padding: '10px 14px',
          fontSize: 14,
          lineHeight: 1.6,
          whiteSpace: 'pre-wrap',
          boxShadow: isUser ? '0 2px 8px rgba(26,86,219,0.25)' : '0 1px 4px rgba(0,0,0,0.06)',
        }}>
          {message.content}
        </div>
        <div style={{ fontSize: 11, color: C.sub, marginTop: 4, textAlign: isUser ? 'right' : 'left' }}>
          {new Date(message.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 16 }}>
      <div style={{ width: 34, height: 34, borderRadius: '50%', background: C.dark, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>🤖</div>
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: '4px 16px 16px 16px', padding: '10px 18px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
        <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
          {[0, 1, 2].map(i => (
            <div key={i} style={{
              width: 7, height: 7, borderRadius: '50%', background: C.sub,
              animation: `typingDot 1.2s ${i * 0.2}s infinite ease-in-out`,
            }} />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function AICommandCenter({ user }) {
  const { t, lang } = useLanguage();
  const role = user?.role || 'admin';
  const presets = ROLE_PRESETS[role] || ROLE_PRESETS.admin;
  const greeting = (lang === 'te' ? ROLE_GREETINGS_TE[role] : ROLE_GREETINGS[role]) || ROLE_GREETINGS.admin;

  const [messages, setMessages] = useState(() => [
    {
      role: 'assistant',
      content: `${greeting}\n\n${lang === 'te' ? 'మీ ప్రశ్నను క్రింద టైప్ చేయండి లేదా పై సూచించిన ప్రశ్నలలో ఒకదాన్ని ఎంచుకోండి.' : 'Type your question below or click one of the quick queries tailored for your role.'}`,
      timestamp: new Date().toISOString(),
    },
  ]);

  // Update initial greeting when language toggles if no chat history yet
  useEffect(() => {
    setMessages(prev => {
      if (prev.length <= 1) {
        return [{
          role: 'assistant',
          content: `${greeting}\n\n${lang === 'te' ? 'మీ ప్రశ్నను క్రింద టైప్ చేయండి లేదా పై సూచించిన ప్రశ్నలలో ఒకదాన్ని ఎంచుకోండి.' : 'Type your question below or click one of the quick queries tailored for your role.'}`,
          timestamp: new Date().toISOString(),
        }];
      }
      return prev;
    });
  }, [lang, greeting]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const send = async (text) => {
    const msg = text || input.trim();
    if (!msg || loading) return;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: msg, timestamp: new Date().toISOString() }]);
    setLoading(true);
    try {
      const res = await api.chatbot(msg, lang);
      const reply = res?.reply || res?.response || res?.message || (typeof res === 'string' ? res : JSON.stringify(res, null, 2));
      setMessages(prev => [...prev, { role: 'assistant', content: reply, timestamp: new Date().toISOString() }]);
    } catch (e) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `⚠ Could not connect to AI engine: ${e.message}\n\nMake sure the backend is running and /api/chatbot is reachable.`,
        timestamp: new Date().toISOString(),
      }]);
    } finally {
      setLoading(false);
    }
  };

  const clearChat = () => {
    setMessages([{
      role: 'assistant',
      content: `Chat cleared. ${greeting}`,
      timestamp: new Date().toISOString(),
    }]);
  };

  return (
    <div style={{ fontFamily: "'Inter', sans-serif", display: 'flex', flexDirection: 'column', height: '100%', minHeight: 'calc(100vh - 160px)' }}>
      <style>{`
        @keyframes typingDot {
          0%,60%,100%{transform:translateY(0)}
          30%{transform:translateY(-6px)}
        }
      `}</style>

      {/* Header */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 16 }}>
        <div style={{ background: C.dark, borderRadius: 12, width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>🤖</div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: C.text }}>{t('AI Assistant & Command Center')}</h1>
            <span style={{
              background: C.brandL, color: C.brand, padding: '2px 8px', borderRadius: 6,
              fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em',
            }}>
              {t(role)}
            </span>
          </div>
          <p style={{ margin: 0, fontSize: 13, color: C.sub }}>{t('Natural language interface with real-time AP Mines & Geology database access')}</p>
        </div>
        <button onClick={clearChat} style={{ padding: '6px 14px', borderRadius: 8, border: `1px solid ${C.border}`, background: C.surface, color: C.sub, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
          {t('Clear Chat')}
        </button>
      </div>

      {/* Preset queries */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: C.sub, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {t('Suggested Queries for')} {t(role.replace('_', ' ').toUpperCase())}
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {presets.map((q, i) => (
            <button key={i} onClick={() => send(lang === 'te' ? (q.msg_te || q.msg) : q.msg)} disabled={loading}
              style={{
                display: 'flex', gap: 5, alignItems: 'center',
                padding: '6px 12px', borderRadius: 20, border: `1px solid ${C.border}`,
                background: C.surface, color: C.text, cursor: 'pointer', fontSize: 12, fontWeight: 500,
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = C.brandL; e.currentTarget.style.borderColor = C.brand; e.currentTarget.style.color = C.brand; }}
              onMouseLeave={e => { e.currentTarget.style.background = C.surface; e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.text; }}
            >
              <span>{q.icon}</span> {t(q.label)}
            </button>
          ))}
        </div>
      </div>

      {/* Chat window */}
      <div style={{
        flex: 1, background: C.bg, border: `1px solid ${C.border}`, borderRadius: 16,
        padding: '16px 20px', overflowY: 'auto', marginBottom: 12,
        minHeight: 320, maxHeight: 'calc(100vh - 420px)',
      }}>
        {messages.map((m, i) => <ChatBubble key={i} message={m} />)}
        {loading && <TypingIndicator />}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{ display: 'flex', gap: 10, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: '10px 14px' }}>
        <input
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), send())}
          placeholder={lang === 'te' ? `${t(role)} గా ఏదైనా అడగండి: బ్లాక్‌లు, విధానాలు, రవాణా స్థితి, నిబంధనలు...` : `Ask anything as ${role.replace('_', ' ')}: blocks, policies, transit status, rules...`}
          disabled={loading}
          style={{
            flex: 1, border: 'none', outline: 'none', fontSize: 14, color: C.text,
            background: 'transparent', fontFamily: 'inherit',
          }}
        />
        <button onClick={() => send()} disabled={loading || !input.trim()}
          style={{
            padding: '8px 20px', borderRadius: 10, border: 'none',
            background: loading || !input.trim() ? '#E2E8F0' : C.brand,
            color: loading || !input.trim() ? C.sub : '#fff',
            fontWeight: 700, fontSize: 14, cursor: loading || !input.trim() ? 'not-allowed' : 'pointer',
            transition: 'all 0.15s',
          }}
        >
          {loading ? t('Thinking...') : `↑ ${t('Send')}`}
        </button>
      </div>
      <div style={{ fontSize: 11, color: C.sub, textAlign: 'center', marginTop: 6 }}>
        {t('Powered by Gemini AI · Context-grounded with live AP Granite lifecycle data')}
      </div>
    </div>
  );
}
