import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, X, Send, Briefcase, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../i18n';

const ROLE_GUIDES_EN = [
  {
    role: "Quarry Operator",
    description: "As a Quarry Operator, you are responsible for registering and photographing granite blocks. The AI automatically calculates the 3D volume.",
    actionText: "Go to Login",
    actionPath: "/login"
  },
  {
    role: "DMGO Officer",
    description: "As a DMGO Officer, your workflow includes approving AI measurements, auditing seigniorage, and issuing e-permits for dispatch.",
    actionText: "Go to Login",
    actionPath: "/login"
  },
  {
    role: "Weighbridge Operator",
    description: "As a Weighbridge Operator, you validate physical weights against AI estimates. The system flags anything outside a ±5% tolerance.",
    actionText: "Go to Login",
    actionPath: "/login"
  },
  {
    role: "Vigilance Squad",
    description: "The Vigilance Squad performs mobile QR checkpost scans, vehicle audits, and handles Form G seizures to prevent illegal transport.",
    actionText: "Go to Login",
    actionPath: "/login"
  },
  {
    role: "Administrator",
    description: "As an Administrator, you have full access to statewide telemetry, OMEPS 2.0 syncing, and Role-Based Access Control (RBAC).",
    actionText: "Go to Login",
    actionPath: "/login"
  }
];

const ROLE_GUIDES_TE = [
  {
    role: "క్వారీ ఆపరేటర్",
    description: "క్వారీ ఆపరేటర్‌గా, గ్రానైట్ బ్లాక్‌లను నమోదు చేయడం మరియు ఫోటోలు తీయడం మీ బాధ్యత. AI స్వయంచాలకంగా 3D వాల్యూమ్‌ను గణిస్తుంది.",
    actionText: "లాగిన్ అవ్వండి",
    actionPath: "/login"
  },
  {
    role: "DMGO అధికారి",
    description: "DMGO అధికారిగా, AI కొలతలను ఆమోదించడం, సీనియరేజ్ ఆడిట్ చేయడం మరియు రవాణా కోసం ఇ-పర్మిట్లను జారీ చేయడం మీ విధులు.",
    actionText: "లాగిన్ అవ్వండి",
    actionPath: "/login"
  },
  {
    role: "వేబ్రిడ్జ్ ఆపరేటర్",
    description: "వేబ్రిడ్జ్ ఆపరేటర్‌గా, మీరు AI అంచనాలతో ప్రత్యక్ష బరువును ధృవీకరిస్తారు. ±5% పరిమితి దాటినప్పుడు సిస్టమ్ హెచ్చరికను జారీ చేస్తుంది.",
    actionText: "లాగిన్ అవ్వండి",
    actionPath: "/login"
  },
  {
    role: "విజిలెన్స్ స్క్వాడ్",
    description: "చట్టవిరుద్ధ రవాణాను అరికట్టడానికి మొబైల్ QR చెక్‌పోస్ట్ స్కానింగ్, వాహన ఆడిట్ మరియు ఫారమ్ G జప్తు చర్యలను విజిలెన్స్ స్క్వాడ్ నిర్వహిస్తుంది.",
    actionText: "లాగిన్ అవ్వండి",
    actionPath: "/login"
  },
  {
    role: "అడ్మినిస్ట్రేటర్",
    description: "అడ్మినిస్ట్రేటర్‌గా, రాష్ట్రవ్యాప్త టెలిమెట్రీ, OMEPS 2.0 సమన్వయం మరియు వినియోగదారుల అనుమతులపై పూర్తి నియంత్రణ ఉంటుంది.",
    actionText: "లాగిన్ అవ్వండి",
    actionPath: "/login"
  }
];

export default function FloatingChatbot() {
  const { t, lang } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const guides = lang === 'te' ? ROLE_GUIDES_TE : ROLE_GUIDES_EN;

  const [messages, setMessages] = useState(() => [
    { 
      role: 'bot', 
      text: lang === 'te'
        ? 'నమస్కారం! నేను మీ స్మార్ట్ గ్రానైట్ పర్సనల్ అసిస్టెంట్‌ని. మీకు మార్గదర్శకత్వం కోసం, ఏ పాత్ర గురించి తెలుసుకోవాలనుకుంటున్నారు?'
        : 'Hello! I am your Smart Granite Personal Assistant. To give you the best guidance, which role would you like to explore?' 
    }
  ]);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef(null);
  const navigate = useNavigate();

  // Update initial message when language changes if no conversation yet
  useEffect(() => {
    setMessages(prev => {
      if (prev.length <= 1) {
        return [{
          role: 'bot',
          text: lang === 'te'
            ? 'నమస్కారం! నేను మీ స్మార్ట్ గ్రానైట్ పర్సనల్ అసిస్టెంట్‌ని. మీకు మార్గదర్శకత్వం కోసం, ఏ పాత్ర గురించి తెలుసుకోవాలనుకుంటున్నారు?'
            : 'Hello! I am your Smart Granite Personal Assistant. To give you the best guidance, which role would you like to explore?'
        }];
      }
      return prev;
    });
  }, [lang]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const handleSend = (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    setMessages(prev => [...prev, { role: 'user', text: input }]);
    
    setTimeout(() => {
      setMessages(prev => [...prev, { 
        role: 'bot', 
        text: "I can help you explore specific roles in the system. Try selecting one of the roles below to learn more about your required actions!" 
      }]);
    }, 600);
    
    setInput('');
  };

  const handleRoleClick = (roleGuide) => {
    setMessages(prev => [...prev, { role: 'user', text: `Explore: ${roleGuide.role}` }]);
    setTimeout(() => {
      setMessages(prev => [...prev, { 
        role: 'bot', 
        text: roleGuide.description,
        action: { text: roleGuide.actionText, path: roleGuide.actionPath }
      }]);
    }, 500);
  };

  const handleActionClick = (path) => {
    navigate(path);
    setIsOpen(false);
  };

  return (
    <>
      {/* Floating Button */}
      {!isOpen && (
        <button
          className="floating-chat-btn"
          onClick={() => setIsOpen(true)}
          style={{
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #1A56DB, #3B82F6)',
            color: 'white',
            border: 'none',
            boxShadow: '0 8px 24px rgba(26, 86, 219, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            zIndex: 9999,
            transition: 'transform 0.2s, box-shadow 0.2s',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.transform = 'scale(1.05) translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 12px 28px rgba(26, 86, 219, 0.4)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.transform = 'scale(1) translateY(0)';
            e.currentTarget.style.boxShadow = '0 8px 24px rgba(26, 86, 219, 0.3)';
          }}
          aria-label="Open AI Assistant"
        >
          <MessageCircle size={26} />
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div 
          className="floating-chat-window"
          style={{
            background: '#fff',
            borderRadius: '20px',
            boxShadow: '0 12px 40px rgba(0, 0, 0, 0.15)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            zIndex: 9999,
            fontFamily: "'Inter', sans-serif",
            border: '1px solid #E2E8F0',
            animation: 'chatSlideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
          }}
        >
          <style>
            {`
              .floating-chat-btn {
                position: fixed;
                bottom: 24px;
                right: 24px;
                width: 58px;
                height: 58px;
              }
              .floating-chat-window {
                position: fixed;
                bottom: 24px;
                right: 24px;
                width: 380px;
                height: 560px;
                max-height: calc(100vh - 48px);
              }
              @media (max-width: 768px) {
                .floating-chat-btn {
                  bottom: 74px !important;
                  right: 14px !important;
                  width: 50px !important;
                  height: 50px !important;
                }
                .floating-chat-window {
                  bottom: 72px !important;
                  right: 8px !important;
                  left: 8px !important;
                  width: calc(100vw - 16px) !important;
                  height: calc(100vh - 86px) !important;
                  max-height: calc(100vh - 86px) !important;
                  border-radius: 16px !important;
                }
              }
              @keyframes chatSlideUp {
                from { opacity: 0; transform: translateY(20px) scale(0.95); }
                to { opacity: 1; transform: translateY(0) scale(1); }
              }
              .scrollbar-hide::-webkit-scrollbar {
                display: none;
              }
              .scrollbar-hide {
                -ms-overflow-style: none;
                scrollbar-width: none;
              }
            `}
          </style>

          {/* Header */}
          <div style={{
            background: 'linear-gradient(135deg, #1A56DB, #1D4ED8)',
            padding: '16px 20px',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                background: 'rgba(255,255,255,0.2)',
                padding: '8px',
                borderRadius: '10px'
              }}>
                <MessageCircle size={18} />
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{lang === 'te' ? 'పర్సనల్ అసిస్టెంట్' : 'Personal Assistant'}</div>
                <div style={{ fontSize: '0.7rem', color: '#BFDBFE', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ width: '6px', height: '6px', background: '#4ADE80', borderRadius: '50%', display: 'inline-block' }}></span>
                  {lang === 'te' ? 'రోల్ గైడ్ యాక్టివ్' : 'Role Guide Active'}
                </div>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#fff',
                cursor: 'pointer',
                padding: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '50%',
                transition: 'background 0.2s'
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <X size={20} />
            </button>
          </div>

          {/* Messages Area */}
          <div className="scrollbar-hide" style={{
            flex: 1,
            overflowY: 'auto',
            padding: '20px',
            background: '#F8FAFC',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}>
            {messages.map((msg, i) => (
              <div key={i} style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start'
              }}>
                <div style={{
                  maxWidth: '85%',
                  padding: '12px 16px',
                  borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                  background: msg.role === 'user' ? '#1A56DB' : '#fff',
                  color: msg.role === 'user' ? '#fff' : '#0F1729',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                  fontSize: '0.88rem',
                  lineHeight: 1.5,
                  border: msg.role === 'bot' ? '1px solid #E2E8F0' : 'none'
                }}>
                  {msg.text}
                  {msg.action && (
                    <button
                      onClick={() => handleActionClick(msg.action.path)}
                      style={{
                        marginTop: '12px',
                        background: '#EEF2FF',
                        color: '#1A56DB',
                        border: '1px solid #C7D2FE',
                        padding: '8px 12px',
                        borderRadius: '8px',
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        width: '100%',
                        cursor: 'pointer',
                        transition: 'background 0.2s'
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = '#E0E7FF'}
                      onMouseLeave={e => e.currentTarget.style.background = '#EEF2FF'}
                    >
                      {msg.action.text} <ArrowRight size={14} />
                    </button>
                  )}
                </div>
                <div style={{ fontSize: '0.65rem', color: '#94A3B8', marginTop: '4px', padding: '0 4px' }}>
                  {msg.role === 'user' ? (lang === 'te' ? 'మీరు' : 'You') : (lang === 'te' ? 'అసిస్టెంట్' : 'Assistant')}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Role Quick Actions */}
          <div style={{
            padding: '12px 16px',
            background: '#fff',
            borderTop: '1px solid #E2E8F0',
            display: 'flex',
            gap: '8px',
            overflowX: 'auto',
            whiteSpace: 'nowrap'
          }} className="scrollbar-hide">
            {guides.map((guide, i) => (
              <button
                key={i}
                onClick={() => handleRoleClick(guide)}
                style={{
                  background: '#F1F5F9',
                  border: '1px solid #E2E8F0',
                  padding: '6px 12px',
                  borderRadius: '16px',
                  fontSize: '0.75rem',
                  color: '#334155',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontWeight: 600
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = '#E2E8F0';
                  e.currentTarget.style.borderColor = '#CBD5E1';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = '#F1F5F9';
                  e.currentTarget.style.borderColor = '#E2E8F0';
                }}
              >
                <Briefcase size={12} color="#1A56DB" />
                {guide.role}
              </button>
            ))}
          </div>

          {/* Input Area */}
          <div style={{
            padding: '16px',
            background: '#fff',
            borderTop: '1px solid #E2E8F0',
          }}>
            <form onSubmit={handleSend} style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                placeholder={lang === 'te' ? 'పాత్ర గురించి లేదా నియమాల గురించి అడగండి...' : 'Ask about a role...'}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                style={{
                  flex: 1,
                  padding: '10px 16px',
                  borderRadius: '20px',
                  border: '1px solid #E2E8F0',
                  outline: 'none',
                  fontSize: '0.85rem',
                  background: '#F8FAFC',
                  color: '#0F1729'
                }}
                onFocus={e => e.target.style.borderColor = '#1A56DB'}
                onBlur={e => e.target.style.borderColor = '#E2E8F0'}
              />
              <button
                type="submit"
                disabled={!input.trim()}
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  background: input.trim() ? '#1A56DB' : '#E2E8F0',
                  color: input.trim() ? '#fff' : '#94A3B8',
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: input.trim() ? 'pointer' : 'not-allowed',
                  transition: 'background 0.2s'
                }}
              >
                <Send size={16} style={{ marginLeft: '2px' }} />
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
