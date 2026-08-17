import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  Building2, 
  ArrowRight, 
  Search, 
  Stethoscope, 
  Share2, 
  HelpCircle, 
  ShieldCheck, 
  Globe, 
  FileDown, 
  PhoneCall 
} from 'lucide-react';
import { SymptomChip } from '../components/SymptomChip';
import { FAQSection } from '../components/FAQSection';
import { SocialShareModal } from '../components/SocialShareModal';

interface HomeProps {
  onOpenFeedback: () => void;
}

export const Home: React.FC<HomeProps> = ({ onOpenFeedback }) => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [quickQuestion, setQuickQuestion] = useState('');
  const [shareModalOpen, setShareModalOpen] = useState(false);

  const whatsappNumber = import.meta.env.VITE_WHATSAPP_NUMBER || '+2348003654824';
  const cleanPhone = whatsappNumber.replace(/[^0-9]/g, '');

  const onboardingCapabilities = [
    {
      title: 'Multilingual Clinical Triage',
      desc: 'Communicate naturally in English, Nigerian Pidgin, Yoruba, Hausa, or Igbo. Get immediate preliminary guidance and red-flag alerts.',
      icon: Globe,
    },
    {
      title: 'Conversational Hospital Finder',
      desc: 'Ask DokitaAI directly for 24/7 emergency rooms and verified clinics near your GPS location without leaving the chat.',
      icon: Building2,
    },
    {
      title: 'Doctor Briefing Export',
      desc: 'Generate a structured clinical summary PDF at any time to share with attending hospital doctors and specialists.',
      icon: FileDown,
    },
  ];

  const samplePrompts = [
    'Find 24/7 emergency hospitals near me',
    'Persistent dry cough and fever (38.5 C)',
    'Doc, my stomach dey bite me since yesterday',
    'Sharp pain in lower right abdomen',
  ];

  const handleLaunchChat = (promptText?: string) => {
    const text = (promptText || quickQuestion).trim();
    if (!isAuthenticated) {
      // Require login / registration first
      navigate('/login', {
        state: {
          redirectAfter: '/chat',
          initialPrompt: text || undefined,
        },
      });
    } else {
      navigate('/chat', {
        state: text ? { initialPrompt: text } : undefined,
      });
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleLaunchChat(quickQuestion);
  };

  return (
    <div className="space-y-12 pb-16 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* 1. ONBOARDING HERO BANNER */}
      <section className="pt-8 md:pt-14 space-y-6 text-center">
        {/* Clinical Platform Badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-slate-100 border border-slate-300 text-slate-800 text-xs font-semibold">
          <ShieldCheck className="w-3.5 h-3.5 text-teal-700" />
          <span>Clinical AI Telehealth Assistant • Verified Guidelines (WHO / CDC / NHS)</span>
        </div>

        <div className="space-y-3 max-w-2xl mx-auto">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight">
            Your 24/7 AI Health Companion & Triage Navigator
          </h1>
          <p className="text-sm sm:text-base text-slate-600 leading-relaxed max-w-xl mx-auto">
            Describe symptoms in your own words, find nearby verified emergency hospitals, and export structured clinical reports for doctors.
          </p>
        </div>

        {/* Instant Question Form (Requires login to launch chat) */}
        <div className="max-w-2xl mx-auto pt-2">
          <form
            onSubmit={handleFormSubmit}
            className="p-2 bg-white rounded-2xl border border-slate-300 flex flex-col sm:flex-row items-center gap-2"
          >
            <div className="flex items-center gap-2.5 px-3 py-2 w-full">
              <Search className="w-4 h-4 text-slate-400 shrink-0" />
              <input
                type="text"
                value={quickQuestion}
                onChange={(e) => setQuickQuestion(e.target.value)}
                placeholder="Describe symptoms or ask 'Find 24/7 hospitals near me'..."
                className="w-full text-xs sm:text-sm bg-transparent border-none focus:outline-none text-slate-800"
              />
            </div>
            <button
              type="submit"
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs sm:text-sm font-semibold transition-colors flex items-center justify-center gap-2 shrink-0 cursor-pointer active:scale-95"
            >
              <span>Launch Chat</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Quick Prompt Chips */}
          <div className="flex flex-wrap items-center justify-center gap-1.5 pt-3">
            <span className="text-[11px] font-semibold text-slate-400 mr-1">Quick Prompts:</span>
            {samplePrompts.map((symptom, idx) => (
              <SymptomChip
                key={idx}
                label={symptom}
                onClick={() => handleLaunchChat(symptom)}
              />
            ))}
          </div>
        </div>
      </section>

      {/* 2. ONBOARDING CAPABILITIES (What DokitaAI Does) */}
      <section className="space-y-4 pt-4">
        <div className="text-center space-y-1">
          <h2 className="text-lg font-bold text-slate-900">How DokitaAI Helps You</h2>
          <p className="text-xs text-slate-500">Everything accessible inside one conversational assistant</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {onboardingCapabilities.map((cap, i) => {
            const Icon = cap.icon;
            return (
              <div
                key={i}
                className="bg-white p-5 rounded-2xl border border-slate-300 space-y-2.5 flex flex-col justify-between"
              >
                <div className="space-y-2.5">
                  <div className="w-9 h-9 rounded-xl bg-teal-50 border border-teal-200 text-teal-700 flex items-center justify-center">
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-900">{cap.title}</h3>
                  <p className="text-xs text-slate-600 leading-relaxed">{cap.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 3. EMERGENCY TOLL-FREE HOTLINES & WHATSAPP ACCESS */}
      <section className="bg-white p-6 rounded-2xl border border-slate-300 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-50 border border-red-200 text-red-700 flex items-center justify-center shrink-0">
              <PhoneCall className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">24/7 Emergency Dispatch Hotlines</h3>
              <p className="text-xs text-slate-500">Call immediately for acute life-threatening situations</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href="tel:112"
              className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-colors"
            >
              National: 112
            </a>
            <a
              href="tel:767"
              className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors"
            >
              Emergency: 767
            </a>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-1">
          <div className="text-xs text-slate-600">
            <strong>Prefer WhatsApp?</strong> You can also access triage via WhatsApp: <span className="font-mono text-slate-900 font-semibold">{whatsappNumber}</span>
          </div>
          <a
            href={`https://wa.me/${cleanPhone}?text=Hello%20DokitaAI,%20I%20need%20medical%20triage%20assistance.`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold transition-colors flex items-center gap-1.5 shrink-0"
          >
            <span>Open in WhatsApp</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </a>
        </div>
      </section>

      {/* 4. CLINICAL FAQ SECTION */}
      <section className="pt-2">
        <FAQSection />
      </section>

      {/* 5. FOOTER ACTIONS */}
      <div className="flex flex-wrap items-center justify-center gap-3 pt-4">
        <button
          onClick={() => setShareModalOpen(true)}
          className="px-4 py-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 text-xs font-semibold transition-colors flex items-center gap-2 cursor-pointer"
        >
          <Share2 className="w-3.5 h-3.5 text-teal-700" />
          <span>Share DokitaAI with Family</span>
        </button>

        <button
          onClick={onOpenFeedback}
          className="px-4 py-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 text-xs font-semibold transition-colors flex items-center gap-2 cursor-pointer"
        >
          <HelpCircle className="w-3.5 h-3.5 text-teal-700" />
          <span>Submit Clinical Feedback</span>
        </button>
      </div>

      {/* Social Share Sheet */}
      <SocialShareModal
        isOpen={shareModalOpen}
        onClose={() => setShareModalOpen(false)}
      />
    </div>
  );
};
