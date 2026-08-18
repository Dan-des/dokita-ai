import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  askTriage, 
  getChatSessions, 
  getSessionById, 
  deleteChatSession, 
  clearAllChatSessions 
} from '../api/chat';
import { ChatMessage, ChatSession } from '../types';
import { CitationCard } from '../components/CitationCard';
import { MedicationReminderModal } from '../components/MedicationReminderModal';
import { exportDoctorReport } from '../utils/pdfExport';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { useTextToSpeech } from '../hooks/useTextToSpeech';
import { useReminders } from '../context/ReminderContext';
import { fetchNearbyHospitals, formatHospitalResults, isHospitalQuery } from '../hooks/useNearbyHospitals';
import { 
  Send, 
  FileDown, 
  Bot, 
  User as UserIcon, 
  RotateCcw,
  ShieldAlert,
  Loader2,
  Plus,
  Clock,
  LogOut,
  LogIn,
  Activity,
  ChevronRight,
  MessageSquare,
  Mic,
  MicOff,
  Trash2,
  Copy,
  Check,
  ShieldCheck,
  PanelLeftClose,
  PanelLeft,
  Volume2,
  Square,
  Bell,
  Pill,
  X,
  Globe,
  MapPin,
  RefreshCw,
  Stethoscope,
  ChevronDown,
  Sparkles
} from 'lucide-react';

// AI progress steps shown while loading — one at a time, no emojis
const PROGRESS_STEPS = [
  'Identifying symptoms and context...',
  'Consulting WHO / CDC / NHS guidelines...',
  'Checking drug interactions & safety...',
  'Searching clinical triage protocols...',
  'Curating personalised response...',
];

type ChatMode = 'ai' | 'websearch';

export const Chat: React.FC = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [sessionId, setSessionId] = useState<string>('');
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [isLoadingSessions, setIsLoadingSessions] = useState<boolean>(false);
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [reminderModalOpen, setReminderModalOpen] = useState<boolean>(false);
  const [chatMode, setChatMode] = useState<ChatMode>('ai');
  const [modeDropdownOpen, setModeDropdownOpen] = useState<boolean>(false);
  const [progressStep, setProgressStep] = useState<number>(0);
  const [locationGranted, setLocationGranted] = useState<boolean>(false);
  const [notifGranted, setNotifGranted] = useState<boolean>(false);
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const modeDropdownRef = useRef<HTMLDivElement>(null);

  // Custom DokitaAI Pull-to-Refresh Gesture State
  const [pullY, setPullY] = useState<number>(0);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const touchStartY = useRef<number>(0);
  const isPullingRef = useRef<boolean>(false);

  // Audio Read-Aloud TTS Hook
  const { speak, stop: stopSpeaking, speakingIndex, isSupported: isTtsSupported } = useTextToSpeech();

  // Medication Reminders Context
  const { 
    reminders, 
    parseAndAddFromChat, 
    activeAlert, 
    dismissActiveAlert 
  } = useReminders();

  // Speech-to-Text Voice Hook
  const { 
    isListening, 
    isSupported: isSpeechSupported, 
    startListening, 
    stopListening, 
    error: speechError 
  } = useSpeechRecognition((spokenText) => {
    setInputValue(spokenText);
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatScrollContainerRef = useRef<HTMLDivElement>(null);

  const symptomSuggestions = [
    'Find 24/7 emergency hospitals near me',
    'Can I take Ibuprofen if I have a stomach ulcer?',
    'Remind me to take Paracetamol at 8:00 PM',
    'Doc, my stomach dey bite me since yesterday',
    'What should I do for a sudden severe migraine?',
  ];

  // Fetch session history
  const loadHistorySessions = async () => {
    if (isAuthenticated) {
      try {
        setIsLoadingSessions(true);
        const res = await getChatSessions();
        if (res.success) setSessions(res.sessions || []);
      } catch (err) {
        console.error('Failed to load chat sessions:', err);
      } finally {
        setIsLoadingSessions(false);
      }
    }
  };

  // Close intelligence mode dropdown on click outside or Escape key
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modeDropdownRef.current && !modeDropdownRef.current.contains(event.target as Node)) {
        setModeDropdownOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setModeDropdownOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Reset on user switch
  useEffect(() => {
    if (!isAuthenticated) {
      setMessages([]); setSessionId(''); setSessions([]);
    } else {
      setMessages([]); setSessionId('');
      loadHistorySessions();
    }
  }, [user?._id, (user as any)?.id, isAuthenticated]);

  // Request location on mount
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          setLocationGranted(true);
        },
        () => {},
        { timeout: 8000 }
      );
    }
    // Check notification permission status
    if ('Notification' in window) {
      setNotifGranted(Notification.permission === 'granted');
    }
  }, []);

  // Progress step cycling while loading
  useEffect(() => {
    if (isLoading) {
      setProgressStep(0);
      progressIntervalRef.current = setInterval(() => {
        setProgressStep(p => (p + 1) % PROGRESS_STEPS.length);
      }, 2200);
    } else {
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    }
    return () => { if (progressIntervalRef.current) clearInterval(progressIntervalRef.current); };
  }, [isLoading]);

  // Auto-scroll to bottom
  const scrollToBottom = () => {
    if (chatScrollContainerRef.current) {
      chatScrollContainerRef.current.scrollTop = chatScrollContainerRef.current.scrollHeight;
    }
  };
  useEffect(() => { scrollToBottom(); }, [messages, isLoading]);

  // Handle initial prompt from navigation state (guarded by ref to prevent duplicate triggers on reload)
  const initialPromptProcessed = useRef(false);
  useEffect(() => {
    const state = location.state as { initialPrompt?: string } | null;
    if (state?.initialPrompt && !initialPromptProcessed.current) {
      initialPromptProcessed.current = true;
      handleSendMessage(state.initialPrompt);
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  const requestLocation = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocationGranted(true);
      },
      () => alert('Location access denied. Please allow it in your browser settings.'),
      { timeout: 10000 }
    );
  };

  const requestNotifications = async () => {
    if (!('Notification' in window)) return;
    const result = await Notification.requestPermission();
    setNotifGranted(result === 'granted');
  };

  const handleSendMessage = async (customPrompt?: string) => {
    if (isListening) stopListening();
    stopSpeaking();

    const textToSend = customPrompt || inputValue;
    if (!textToSend.trim() || isLoading) return;

    const parsedReminder = parseAndAddFromChat(textToSend);

    const userMessage: ChatMessage = {
      role: 'user',
      content: textToSend.trim(),
      timestamp: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMessage]);
    if (!customPrompt) setInputValue('');
    setIsLoading(true);

    const attemptRequest = async (retryCount = 0): Promise<void> => {
      try {
        // --- GPS HOSPITAL LOCATOR ---
        if (isHospitalQuery(textToSend)) {
          let locationToUse = userLocation;
          if (!locationToUse && navigator.geolocation) {
            locationToUse = await new Promise(resolve => {
              navigator.geolocation.getCurrentPosition(
                pos => { const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude }; setUserLocation(loc); resolve(loc); },
                () => resolve(null),
                { timeout: 8000 }
              );
            });
          }
          if (locationToUse) {
            try {
              const hospitals = await fetchNearbyHospitals(locationToUse.lat, locationToUse.lng);
              setMessages(prev => [...prev, {
                role: 'assistant',
                content: formatHospitalResults(hospitals),
                timestamp: new Date().toISOString(),
              }]);
              setIsLoading(false);
              return;
            } catch (err) {
              console.warn('[Hospital Locator] API failed, falling back to AI', err);
            }
          } else {
            setMessages(prev => [...prev, {
              role: 'assistant',
              content: `📍 **Location Access Required**\n\nTo find hospitals near you, please:\n1. Tap **Enable Location** in the sidebar Setup panel\n2. Or type your city (e.g. *"Find hospitals in Ikeja, Lagos"*)\n\nFor emergencies: **112** or **767**`,
              timestamp: new Date().toISOString(),
            }]);
            setIsLoading(false);
            return;
          }
        }
        // --- END HOSPITAL LOCATOR ---

        const response = await askTriage({
          prompt: userMessage.content,
          sessionId: sessionId || undefined,
          conversationHistory: messages,
          location: userLocation || undefined,
          mode: chatMode,
        });

        if (response.success && response.message) {
          if (response.sessionId) setSessionId(response.sessionId);
          let assistantMessage = response.message;
          if (parsedReminder) {
            assistantMessage = {
              ...assistantMessage,
              content: `✅ Scheduled medication reminder for **${parsedReminder.medication}** (${parsedReminder.dosage}) at **${parsedReminder.time}** daily.\n\n${assistantMessage.content}`,
            };
          }
          setMessages(prev => [...prev, assistantMessage]);
          loadHistorySessions();
        }
      } catch (error: any) {
        if (retryCount === 0) {
          // Silent retry once after 1.5s
          await new Promise(r => setTimeout(r, 1500));
          return attemptRequest(1);
        }
        console.error('Triage Request Error:', error);
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: `⚠️ **Connection Issue**\n\nWe couldn't reach the triage service. This is usually temporary.\n\n**What to do:**\n- Tap the **↺ Retry** button below\n- Check your internet connection\n- For emergencies, call **112** immediately`,
          urgency: 'EMERGENCY',
          timestamp: new Date().toISOString(),
          isRetryable: true,
        } as any]);
      } finally {
        setIsLoading(false);
      }
    };

    await attemptRequest();
  };

  const handleToggleVoice = () => {
    if (isListening) {
      stopListening();
    } else {
      stopSpeaking();
      startListening();
    }
  };

  const handleNewChat = () => {
    if (isListening) stopListening();
    stopSpeaking();
    setMessages([]);
    setSessionId('');
    if (window.innerWidth < 1024) {
      setSidebarOpen(false);
    }
  };

  const handleSelectPastSession = async (pastSessionId: string) => {
    try {
      if (isListening) stopListening();
      stopSpeaking();
      setIsLoading(true);
      if (window.innerWidth < 1024) {
        setSidebarOpen(false);
      }
      const res = await getSessionById(pastSessionId);
      if (res.success && res.session) {
        setSessionId(res.session.sessionId);
        setMessages(res.session.messages || []);
      }
    } catch (err) {
      console.error('Failed to load past session:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Delete a single chat session
  const handleDeleteSession = async (targetSessionId: string, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }

    if (!window.confirm('Delete this consultation session for privacy? This action cannot be undone.')) {
      return;
    }

    try {
      await deleteChatSession(targetSessionId);
      setSessions((prev) => prev.filter((s) => s.sessionId !== targetSessionId));

      if (sessionId === targetSessionId) {
        setMessages([]);
        setSessionId('');
      }
    } catch (err) {
      console.error('Failed to delete session:', err);
      alert('Could not delete session. Please try again.');
    }
  };

  // Clear all sessions for full privacy wipe
  const handleClearAllHistory = async () => {
    if (!window.confirm('Are you sure you want to permanently clear ALL consultation history?')) {
      return;
    }

    try {
      await clearAllChatSessions();
      setSessions([]);
      setMessages([]);
      setSessionId('');
    } catch (err) {
      console.error('Failed to clear history:', err);
      alert('Could not clear history.');
    }
  };

  const handleExportPDF = () => {
    if (messages.length === 0) {
      alert('Please submit at least one symptom or triage question before exporting.');
      return;
    }
    exportDoctorReport(messages, user, sessionId);
  };

  const handleCopyMessage = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  // Helper to format inline bold text and markdown links without leaving raw syntax
  const formatInlineText = (text: string) => {
    // Regex matching either **bold** or [label](url)
    const parts = text.split(/(\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\))/g);
    return parts.map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong key={index} className="font-semibold text-slate-900">
            {part.slice(2, -2)}
          </strong>
        );
      }
      if (part.startsWith('[') && part.includes('](')) {
        const label = part.match(/\[([^\]]+)\]/)?.[1] || '';
        const url = part.match(/\(([^)]+)\)/)?.[1] || '';
        return (
          <a
            key={index}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-teal-700 hover:text-teal-900 font-semibold underline inline-flex items-center gap-0.5"
          >
            {label}
          </a>
        );
      }
      return part.replace(/\*/g, '');
    });
  };

  // Clean Markdown Renderer
  const renderFormattedContent = (content: string) => {
    const cleanedContent = content.replace(/^\s*\*{3,}\s*$/gm, '');
    const lines = cleanedContent.split('\n');

    return (
      <div className="space-y-2 text-xs sm:text-sm leading-relaxed text-slate-800">
        {lines.map((line, idx) => {
          const trimmed = line.trim();
          if (!trimmed) {
            return <div key={idx} className="h-1" />;
          }

          // Bullet points (- or * )
          if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
            const bulletText = trimmed.replace(/^[-*]\s+/, '');
            return (
              <div key={idx} className="flex items-start gap-2 ml-1 text-slate-700 text-xs sm:text-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-teal-700 mt-2 shrink-0"></span>
                <span>{formatInlineText(bulletText)}</span>
              </div>
            );
          }

          // Numbered lists (1. , 2. )
          if (/^\d+\.\s+/.test(trimmed)) {
            const num = trimmed.match(/^(\d+)\.\s+/)?.[1];
            const listText = trimmed.replace(/^\d+\.\s+/, '');
            return (
              <div key={idx} className="flex items-start gap-2 ml-1 text-slate-700 text-xs sm:text-sm">
                <span className="font-bold text-teal-800 text-xs shrink-0 w-4">{num}.</span>
                <span>{formatInlineText(listText)}</span>
              </div>
            );
          }

          // Horizontal rules
          if (trimmed.startsWith('---')) {
            return <hr key={idx} className="my-2.5 border-slate-200" />;
          }

          // Standard paragraph
          return (
            <p key={idx} className="leading-relaxed">
              {formatInlineText(line)}
            </p>
          );
        })}
      </div>
    );
  };

  // Touch handlers for DokitaAI Branded Pull-to-Refresh
  const handleTouchStart = (e: React.TouchEvent) => {
    if (chatScrollContainerRef.current && chatScrollContainerRef.current.scrollTop <= 2) {
      touchStartY.current = e.touches[0].clientY;
      isPullingRef.current = true;
    } else {
      isPullingRef.current = false;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isPullingRef.current || isRefreshing) return;
    if (chatScrollContainerRef.current && chatScrollContainerRef.current.scrollTop > 2) {
      isPullingRef.current = false;
      setPullY(0);
      return;
    }

    const currentY = e.touches[0].clientY;
    const diff = currentY - touchStartY.current;

    if (diff > 0) {
      // Elastic damping curve (max 75px)
      const damped = Math.min(diff * 0.45, 75);
      setPullY(damped);
    } else {
      setPullY(0);
    }
  };

  const handleTouchEnd = () => {
    if (!isPullingRef.current || isRefreshing) return;
    isPullingRef.current = false;

    if (pullY >= 48) {
      setIsRefreshing(true);
      setPullY(46);
      setTimeout(async () => {
        if (isAuthenticated) {
          await loadHistorySessions();
        }
        setIsRefreshing(false);
        setPullY(0);
      }, 900);
    } else {
      setPullY(0);
    }
  };

  const activeRemindersCount = reminders.filter(r => r.isActive).length;
  const setupNeeded = !locationGranted || !notifGranted;

  return (
    <div className="h-full w-full flex bg-slate-100 font-sans text-slate-900 overflow-hidden relative">
      {/* 1. SIDEBAR */}
      <aside
        className={`flex-shrink-0 bg-slate-900 text-slate-200 border-r border-slate-800 flex flex-col transition-all duration-300 ease-in-out overflow-hidden z-40 ${
          sidebarOpen ? 'w-72' : 'w-0'
        }`}
      >
        <div className="w-72 h-full flex flex-col overflow-hidden">
        {/* Brand Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <Link to="/" className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-teal-700 flex items-center justify-center text-white font-bold">
              <Activity className="w-4 h-4 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="text-base font-bold text-white tracking-tight flex items-center gap-1">
                Dokita<span className="text-teal-400">AI</span>
              </span>
              <span className="text-[9px] text-teal-300 font-semibold uppercase tracking-wider">
                Clinical Telehealth App
              </span>
            </div>
          </Link>
          <button
            onClick={() => setSidebarOpen(false)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
            title="Collapse Sidebar"
          >
            <PanelLeftClose className="w-5 h-5" />
          </button>
        </div>

        {/* New Consultation Button */}
        <div className="p-3 border-b border-slate-800 space-y-2">
          <button
            onClick={handleNewChat}
            className="w-full py-2.5 px-3.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-2 active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>New Consultation</span>
          </button>

          {/* Quick Reminders Drawer Trigger */}
          <button
            onClick={() => {
              setReminderModalOpen(true);
              if (window.innerWidth < 1024) setSidebarOpen(false);
            }}
            className="w-full py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors flex items-center justify-between cursor-pointer"
          >
            <span className="flex items-center gap-2">
              <Bell className="w-3.5 h-3.5 text-teal-400" />
              <span>Medication Reminders</span>
            </span>
            {activeRemindersCount > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-teal-600 text-[10px] font-bold text-white">
                {activeRemindersCount}
              </span>
            )}
          </button>
        </div>

        {/* ⚙️ Setup Panel — disappears once both permissions granted */}
        {setupNeeded && (
          <div className="mx-3 mb-2 p-3 rounded-xl bg-slate-800 border border-slate-700 space-y-2">
            <p className="text-[10px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <span>⚙️</span> Quick Setup
            </p>
            {!locationGranted && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-base">📍</span>
                  <div>
                    <p className="text-[11px] font-semibold text-slate-200">Location Access</p>
                    <p className="text-[10px] text-slate-500">For hospital finder</p>
                  </div>
                </div>
                <button
                  onClick={requestLocation}
                  className="px-2.5 py-1 rounded-lg bg-teal-700 hover:bg-teal-600 text-white text-[10px] font-bold transition-colors cursor-pointer shrink-0"
                >
                  Enable
                </button>
              </div>
            )}
            {!notifGranted && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-base">🔔</span>
                  <div>
                    <p className="text-[11px] font-semibold text-slate-200">Notifications</p>
                    <p className="text-[10px] text-slate-500">Medication reminders</p>
                  </div>
                </div>
                <button
                  onClick={requestNotifications}
                  className="px-2.5 py-1 rounded-lg bg-teal-700 hover:bg-teal-600 text-white text-[10px] font-bold transition-colors cursor-pointer shrink-0"
                >
                  Enable
                </button>
              </div>
            )}
          </div>
        )}

        {/* Chat History Session List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
          <div className="flex items-center justify-between px-2 py-1 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
            <span className="flex items-center gap-1.5">
              <Clock className="w-3 h-3 text-slate-400" />
              <span>Consultation History</span>
            </span>
            {isAuthenticated && sessions.length > 0 && (
              <button
                onClick={handleClearAllHistory}
                className="text-[9px] text-slate-400 hover:text-red-400 transition-colors cursor-pointer"
                title="Clear all consultation history for privacy"
              >
                Clear All
              </button>
            )}
          </div>

          {!isAuthenticated ? (
            <div className="p-3 bg-slate-800/50 rounded-xl border border-slate-800 text-center space-y-2 mt-2">
              <p className="text-[11px] text-slate-400 leading-tight">
                Sign in to save and review past consultation records.
              </p>
              <Link
                to="/login"
                className="inline-block px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-teal-400 text-xs font-semibold rounded-lg border border-slate-700 transition-colors"
              >
                Sign In
              </Link>
            </div>
          ) : isLoadingSessions ? (
            <div className="p-4 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-teal-500" />
              <span>Loading history...</span>
            </div>
          ) : sessions.length === 0 ? (
            <p className="text-[11px] text-slate-500 px-2 py-3">
              No saved sessions yet. Start a consultation to begin.
            </p>
          ) : (
            sessions.map((s) => {
              const firstUserMsg = s.messages.find((m) => m.role === 'user');
              const previewText = firstUserMsg ? firstUserMsg.content : 'Medical Consultation';
              const isSelected = s.sessionId === sessionId;

              return (
                <div
                  key={s.sessionId}
                  onClick={() => handleSelectPastSession(s.sessionId)}
                  className={`w-full text-left p-2.5 rounded-xl text-xs transition-colors flex items-center justify-between group cursor-pointer ${
                    isSelected
                      ? 'bg-teal-950 border border-teal-600/60 text-white font-semibold'
                      : 'hover:bg-slate-800 text-slate-300 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate pr-1 min-w-0">
                    <MessageSquare
                      className={`w-3.5 h-3.5 shrink-0 ${
                        isSelected ? 'text-teal-400' : 'text-slate-500 group-hover:text-slate-300'
                      }`}
                    />
                    <span className="truncate">{previewText}</span>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={(e) => handleDeleteSession(s.sessionId, e)}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition-colors cursor-pointer"
                      title="Delete consultation record"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <ChevronRight className="w-3 h-3 text-slate-600 group-hover:text-slate-400 shrink-0" />
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Admin Operations link if user is admin */}
        {user?.role === 'admin' && (
          <div className="p-3 border-t border-slate-800 space-y-1 text-xs">
            <Link
              to="/admin"
              className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-teal-300 hover:bg-teal-950/60 transition-colors font-medium"
            >
              <ShieldCheck className="w-4 h-4 text-teal-400 shrink-0" />
              <span>Admin Operations</span>
            </Link>
          </div>
        )}

        {/* User Profile Card */}
        <div className="p-3 border-t border-slate-800 bg-slate-950 flex items-center justify-between">
          {isAuthenticated ? (
            <>
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-teal-800 text-white flex items-center justify-center font-bold text-xs shrink-0">
                  {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
                </div>
                <div className="truncate">
                  <p className="text-xs font-semibold text-white truncate leading-tight">
                    {user?.name}
                  </p>
                  <p className="text-[10px] text-teal-400 capitalize">{user?.role}</p>
                </div>
              </div>
              <button
                onClick={() => {
                  logout();
                  navigate('/');
                }}
                className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-slate-800 transition-colors cursor-pointer"
                title="Sign Out to Overview"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </>
          ) : (
            <Link
              to="/login"
              className="w-full flex items-center justify-center gap-2 py-2 text-xs font-semibold text-teal-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Login / Register</span>
            </Link>
          )}
        </div>
        </div>{/* end w-72 inner */}
      </aside>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-30 bg-slate-900/60 lg:hidden"
        />
      )}

      {/* 2. MAIN CHAT PANEL */}
      <main className="flex-1 min-h-0 min-w-0 flex flex-col bg-slate-50 relative overflow-hidden">
        {/* Top Header Bar (Optimized for Mobile, Tablet & Desktop) */}
        <header className="h-14 bg-white border-b border-slate-300 px-3 sm:px-6 flex items-center justify-between gap-2 shrink-0 z-10">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
            {/* Sidebar Toggle Trigger */}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 rounded-xl text-slate-700 hover:bg-slate-100 border border-slate-200 transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-medium shrink-0"
              title={sidebarOpen ? 'Collapse menu' : 'Open history & menu'}
            >
              {sidebarOpen ? (
                <PanelLeftClose className="w-4 h-4 text-teal-700" />
              ) : (
                <PanelLeft className="w-4 h-4 text-teal-700" />
              )}
              <span className="hidden sm:inline">Menu</span>
            </button>

            <div className="min-w-0 truncate">
              <h1 className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                DokitaAI Telehealth Consultation
              </h1>
              <p className="text-[10px] text-slate-500 hidden md:block truncate">
                Multilingual AI • Drug Safety Checker • 24/7 Hospital Locator • Audio Readout
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Medication Reminders Trigger */}
            <button
              onClick={() => setReminderModalOpen(true)}
              className="px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-100 rounded-xl border border-slate-300 transition-colors flex items-center gap-1.5 cursor-pointer relative"
              title="View & Set Medication Reminders"
            >
              <Bell className="w-3.5 h-3.5 text-teal-700" />
              <span className="hidden sm:inline">Reminders</span>
              {activeRemindersCount > 0 && (
                <span className="w-2 h-2 rounded-full bg-teal-600 absolute -top-0.5 -right-0.5" />
              )}
            </button>

            {/* Delete current session for privacy */}
            {sessionId && (
              <button
                onClick={() => handleDeleteSession(sessionId)}
                className="hidden lg:flex px-2.5 py-1.5 text-xs font-medium text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 rounded-xl border border-red-200 transition-colors items-center gap-1 cursor-pointer"
                title="Delete this consultation for privacy"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete</span>
              </button>
            )}

            {messages.length > 0 && !sessionId && (
              <button
                onClick={handleNewChat}
                className="hidden sm:flex px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-100 rounded-xl border border-slate-300 transition-colors items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Clear</span>
              </button>
            )}

            <button
              onClick={handleExportPDF}
              className="px-2.5 sm:px-3 py-1.5 text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer shrink-0"
              title="Download structured briefing for attending physician"
            >
              <FileDown className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Export for Doctor</span>
              <span className="md:hidden">PDF</span>
            </button>
          </div>
        </header>

        {/* Live Medication Due Alert Banner (If triggered) */}
        {activeAlert && (
          <div className="bg-teal-700 text-white px-4 py-2.5 flex items-center justify-between text-xs animate-in slide-in-from-top-2 duration-200 shrink-0 shadow-md">
            <div className="flex items-center gap-2">
              <Pill className="w-4 h-4 text-teal-200 shrink-0 animate-bounce" />
              <span>
                <strong>Medication Due:</strong> It's time to take your <strong>{activeAlert.medication}</strong> ({activeAlert.dosage}). {activeAlert.instructions || ''}
              </span>
            </div>
            <button
              onClick={dismissActiveAlert}
              className="px-2.5 py-0.5 rounded bg-white text-teal-900 font-bold text-[11px] hover:bg-teal-50 transition-colors cursor-pointer"
            >
              Taken / Dismiss
            </button>
          </div>
        )}

        {/* Statutory Medical Notice Banner */}
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-1.5 flex items-center justify-between text-[11px] sm:text-xs text-amber-900 shrink-0">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <span className="truncate">
              <strong>Notice:</strong> Preliminary AI guidance only. In life-critical emergencies, call 112 / 767 immediately.
            </span>
          </div>
        </div>

        {/* Custom DokitaAI Branded Swipe-Down-To-Reload Indicator */}
        <div
          className="overflow-hidden transition-all duration-200 flex items-center justify-center bg-teal-50 border-b border-teal-200/70 shrink-0 select-none"
          style={{
            height: pullY > 0 ? `${pullY}px` : '0px',
            opacity: pullY > 6 ? Math.min(pullY / 35, 1) : 0,
          }}
        >
          <div className="flex items-center gap-2 text-xs font-semibold text-teal-800 py-1.5">
            <div
              className={`w-6 h-6 rounded-full bg-teal-700 text-white flex items-center justify-center shadow-xs transition-transform ${
                isRefreshing ? 'animate-spin' : ''
              }`}
              style={{
                transform: isRefreshing ? undefined : `rotate(${pullY * 6}deg)`,
              }}
            >
              {isRefreshing ? <RefreshCw className="w-3 h-3" /> : <Activity className="w-3 h-3 text-white" />}
            </div>
            <span>
              {isRefreshing
                ? 'Refreshing DokitaAI...'
                : pullY >= 48
                ? 'Release to reload'
                : 'Pull down to refresh'}
            </span>
          </div>
        </div>

        {/* Scrollable Conversation Stream — flex-1 takes all remaining space */}
        <div
          ref={chatScrollContainerRef}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 md:p-8 space-y-4"
          style={{ WebkitOverflowScrolling: 'touch', overscrollBehavior: 'contain' }}
        >
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center max-w-2xl mx-auto space-y-6 py-6 px-2">
              <div className="w-14 h-14 rounded-2xl bg-teal-50 border border-teal-200 text-teal-700 flex items-center justify-center">
                <Bot className="w-7 h-7" />
              </div>
              <div className="space-y-2">
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
                  {user ? `Hello ${user.name}, how can DokitaAI assist you today?` : 'How can DokitaAI assist you today?'}
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 leading-relaxed max-w-md mx-auto">
                  Type or speak symptoms in English, Pidgin, Yoruba, Hausa, or Igbo — check drug safety, set medication reminders, or find nearby 24/7 hospitals.
                </p>
              </div>
              <div className="space-y-2 w-full pt-1">
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Tap to start:</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {symptomSuggestions.map((item, i) => (
                    <button
                      key={i}
                      onClick={() => handleSendMessage(item)}
                      className="w-full text-left px-3.5 py-3 rounded-xl text-xs bg-white hover:bg-teal-50 text-slate-700 hover:text-teal-900 border border-slate-300 hover:border-teal-700 transition-colors flex items-center justify-between group cursor-pointer"
                    >
                      <span className="truncate pr-2">{item}</span>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-teal-700 shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            messages.map((msg, index) => {
              const isUser = msg.role === 'user';
              const isSpeakingThis = speakingIndex === index;
              const isRetryable = (msg as any).isRetryable;

              return (
                <div
                  key={index}
                  className={`flex gap-3 max-w-3xl lg:max-w-4xl mx-auto msg-enter ${isUser ? 'justify-end' : 'justify-start'}`}
                >
                  {!isUser && (
                    <div className="w-8 h-8 rounded-xl bg-teal-700 text-white flex items-center justify-center shrink-0 mt-1">
                      <Bot className="w-4 h-4" />
                    </div>
                  )}

                  <div
                    className={`max-w-[90%] sm:max-w-[85%] md:max-w-[80%] rounded-2xl p-4 sm:p-5 relative group border ${
                      isUser
                        ? 'bg-slate-900 text-white border-slate-900 rounded-br-xs'
                        : 'bg-white border-slate-300 rounded-tl-xs'
                    }`}
                  >
                    {!isUser && (
                      <div className="flex items-center justify-between gap-3 pb-2 mb-2 border-b border-slate-100 text-slate-400 text-[10px]">
                        <span className="font-semibold text-slate-600">DokitaAI Clinical Assistant</span>
                        <div className="flex items-center gap-2">
                          {isTtsSupported && (
                            <button
                              onClick={() => speak(msg.content, index)}
                              className={`p-1 rounded transition-colors cursor-pointer flex items-center gap-1 ${
                                isSpeakingThis ? 'bg-teal-100 text-teal-800 font-bold' : 'text-slate-400 hover:text-teal-800 hover:bg-slate-100'
                              }`}
                              title={isSpeakingThis ? 'Stop' : 'Listen'}
                            >
                              {isSpeakingThis ? <Square className="w-3.5 h-3.5 fill-teal-800" /> : <Volume2 className="w-3.5 h-3.5" />}
                            </button>
                          )}
                          <button
                            onClick={() => handleCopyMessage(msg.content, index)}
                            className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                          >
                            {copiedIndex === index ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                          <span className="font-mono">
                            {new Date(msg.timestamp || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                    )}

                    {isUser ? (
                      <p className="text-xs sm:text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                    ) : (
                      renderFormattedContent(msg.content)
                    )}

                    {!isUser && msg.sources && msg.sources.length > 0 && (
                      <CitationCard sources={msg.sources} />
                    )}

                    {/* Retry button on error messages */}
                    {isRetryable && (
                      <button
                        onClick={() => handleSendMessage(messages[index - 1]?.content)}
                        className="mt-3 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold transition-colors cursor-pointer"
                      >
                        <RefreshCw className="w-3 h-3" />
                        Retry
                      </button>
                    )}
                  </div>

                  {isUser && (
                    <div className="w-8 h-8 rounded-xl bg-slate-800 text-white flex items-center justify-center shrink-0 mt-1">
                      <UserIcon className="w-4 h-4 text-slate-300" />
                    </div>
                  )}
                </div>
              );
            })
          )}

          {/* Loading — single animated step, switches at intervals */}
          {isLoading && (
            <div className="flex gap-3 max-w-3xl lg:max-w-4xl mx-auto justify-start">
              <div className="w-8 h-8 rounded-xl bg-teal-700 text-white flex items-center justify-center shrink-0 mt-1">
                <Bot className="w-4 h-4" />
              </div>
              <div className="bg-white border border-slate-300 rounded-2xl rounded-tl-xs px-4 py-3 flex items-center gap-3 min-w-[200px]">
                <Loader2 className="w-3.5 h-3.5 text-teal-700 animate-spin shrink-0" />
                <span
                  key={progressStep}
                  className="text-xs text-slate-600 font-medium animate-pulse"
                  style={{ animationDuration: '1.5s' }}
                >
                  {PROGRESS_STEPS[progressStep]}
                </span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Pinned Bottom Input Form */}
        <div className="bg-white border-t border-slate-300 p-3 sm:p-4 md:px-8 shrink-0">
          <div className="max-w-3xl lg:max-w-4xl mx-auto space-y-2">
            {/* Live Listening Status Banner */}
            {isListening && (
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-teal-50 border border-teal-300 text-teal-900 text-xs animate-pulse">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
                  <span className="font-semibold">Listening... Speak symptoms clearly into your microphone</span>
                </div>
                <button
                  type="button"
                  onClick={stopListening}
                  className="px-2 py-0.5 rounded bg-teal-700 text-white font-medium text-[11px] cursor-pointer"
                >
                  Done Speaking
                </button>
              </div>
            )}

            {speechError && (
              <div className="p-2 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs">
                {speechError}
              </div>
            )}

            {/* Interactive Intelligence Engine Selector (Gemini / Antigravity Style) */}
            <div className="flex items-center justify-between overflow-visible py-0.5">
              {/* Gemini / Antigravity Model Selector Dropdown Pill */}
              <div className="relative" ref={modeDropdownRef}>
                <button
                  type="button"
                  onClick={() => setModeDropdownOpen(!modeDropdownOpen)}
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white hover:bg-slate-100/90 border border-slate-200 hover:border-slate-300 text-slate-800 text-xs font-semibold shadow-xs transition-all cursor-pointer select-none active:scale-95"
                  title="Select AI Intelligence & Search Mode"
                >
                  {chatMode === 'ai' ? (
                    <>
                      <div className="w-4 h-4 rounded-full bg-teal-100 flex items-center justify-center text-teal-700">
                        <Sparkles className="w-2.5 h-2.5 fill-teal-700/20" />
                      </div>
                      <span className="text-slate-800 font-medium">Dokita AI Triage</span>
                    </>
                  ) : (
                    <>
                      <div className="w-4 h-4 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                        <Globe className="w-2.5 h-2.5" />
                      </div>
                      <span className="text-slate-800 font-medium">Web Search Mode</span>
                    </>
                  )}
                  <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${modeDropdownOpen ? 'rotate-180 text-teal-700' : ''}`} />
                </button>

                {/* Popover Dropdown Menu */}
                {modeDropdownOpen && (
                  <div className="absolute bottom-full left-0 mb-2 w-72 sm:w-80 bg-white rounded-2xl border border-slate-200 shadow-xl shadow-slate-900/10 p-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                    <div className="px-2.5 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between border-b border-slate-100 pb-2 mb-1">
                      <span>Model & Grounding</span>
                      <span className="text-[9px] font-semibold text-teal-700 bg-teal-50 px-1.5 py-0.5 rounded-md">Gemini Grounded</span>
                    </div>

                    <div className="space-y-1">
                      {/* 1. Dokita AI Triage */}
                      <button
                        type="button"
                        onClick={() => {
                          setChatMode('ai');
                          setModeDropdownOpen(false);
                        }}
                        className={`w-full text-left p-2.5 rounded-xl transition-all flex items-start gap-3 cursor-pointer ${
                          chatMode === 'ai'
                            ? 'bg-teal-50/80 border border-teal-200 text-slate-900'
                            : 'hover:bg-slate-50 border border-transparent text-slate-700'
                        }`}
                      >
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                          chatMode === 'ai' ? 'bg-teal-700 text-white shadow-xs' : 'bg-slate-100 text-slate-600'
                        }`}>
                          <Sparkles className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-xs font-bold text-slate-900">Dokita AI Triage</span>
                            {chatMode === 'ai' && <Check className="w-3.5 h-3.5 text-teal-700 shrink-0" />}
                          </div>
                          <p className="text-[11px] text-slate-500 leading-tight mt-0.5">
                            Evidence-based clinical reasoning, symptom diagnosis & hospital locator
                          </p>
                        </div>
                      </button>

                      {/* 2. Web Search Mode */}
                      <button
                        type="button"
                        onClick={() => {
                          setChatMode('websearch');
                          setModeDropdownOpen(false);
                        }}
                        className={`w-full text-left p-2.5 rounded-xl transition-all flex items-start gap-3 cursor-pointer ${
                          chatMode === 'websearch'
                            ? 'bg-blue-50/80 border border-blue-200 text-slate-900'
                            : 'hover:bg-slate-50 border border-transparent text-slate-700'
                        }`}
                      >
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                          chatMode === 'websearch' ? 'bg-blue-600 text-white shadow-xs' : 'bg-slate-100 text-slate-600'
                        }`}>
                          <Globe className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-xs font-bold text-slate-900">Live Web Search</span>
                            {chatMode === 'websearch' && <Check className="w-3.5 h-3.5 text-blue-600 shrink-0" />}
                          </div>
                          <p className="text-[11px] text-slate-500 leading-tight mt-0.5">
                            Google Search grounding with live web citations & medical literature
                          </p>
                        </div>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider select-none pr-1">
                {chatMode === 'ai' ? '🤖 Clinical Mode' : '🌐 Research Mode'}
              </span>
            </div>

            {/* Quick Suggestion Chips (Separate vertical row for 100% visibility on all devices) */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none min-w-0">
              {symptomSuggestions.slice(0, 4).map((item, idx) => (
                <button
                  key={idx}
                  type="button"
                  disabled={isLoading}
                  onClick={() => handleSendMessage(item)}
                  className="text-[11px] font-medium px-3 py-1.5 rounded-full bg-slate-100 hover:bg-teal-50 border border-slate-200 text-slate-600 hover:text-teal-700 hover:border-teal-300 transition-colors shrink-0 active:scale-95 disabled:opacity-50 cursor-pointer truncate max-w-[140px] sm:max-w-none"
                >
                  + {item.split(' ').slice(0, 3).join(' ')}
                </button>
              ))}
            </div>

            {/* Prompt Input Form */}
            <form
              onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }}
              className="relative flex items-center gap-2 bg-slate-50 p-1.5 rounded-2xl border border-slate-300 focus-within:bg-white focus-within:ring-2 focus-within:ring-teal-700/20 focus-within:border-teal-700 transition-colors"
            >
              {isSpeechSupported && (
                <button
                  type="button"
                  onClick={handleToggleVoice}
                  disabled={isLoading}
                  className={`p-2.5 rounded-xl transition-colors cursor-pointer ${
                    isListening ? 'bg-red-500 text-white' : 'text-slate-500 hover:text-teal-800 hover:bg-teal-50'
                  }`}
                  title={isListening ? 'Stop listening' : 'Voice input'}
                >
                  {isListening ? <MicOff className="w-4 h-4 animate-pulse" /> : <Mic className="w-4 h-4" />}
                </button>
              )}

              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                disabled={isLoading}
                placeholder={
                  chatMode === 'websearch'
                    ? 'Search the web for medical info with citations...'
                    : isListening
                    ? 'Listening... (speak now)'
                    : 'Ask symptoms, drug safety, or hospital locations...'
                }
                className="w-full px-2 py-2 text-xs sm:text-sm bg-transparent border-none focus:outline-none disabled:opacity-50 text-slate-800"
              />

              <button
                type="submit"
                disabled={!inputValue.trim() || isLoading}
                className="p-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white transition-colors active:scale-95 disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      </main>

      {/* Medication Reminders Modal */}
      <MedicationReminderModal
        isOpen={reminderModalOpen}
        onClose={() => setReminderModalOpen(false)}
      />
    </div>
  );
};
