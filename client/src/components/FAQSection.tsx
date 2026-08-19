import React, { useState } from 'react';
import { ChevronDownIcon, HelpIcon, ShieldCheckIcon, StethoscopeIcon, ClockIcon, GlobeIcon } from './Icons';

interface FAQItem {
  question: string;
  answer: string;
  category: string;
}

const FAQS: FAQItem[] = [
  {
    category: 'Clinical Safety',
    question: 'How accurate is DokitaAI triage and can it replace my doctor?',
    answer: 'DokitaAI is an evidence-based preliminary triage engine built on recognized clinical guidelines from WHO, CDC, Mayo Clinic, and NHS. It is designed to help you quickly understand symptom urgency (Emergency, Urgent, Routine, or Self-Care) and prepare for clinical visits. It does not replace in-person examination or diagnostic testing by a licensed physician.',
  },
  {
    category: 'Emergency Protocol',
    question: 'What should I do if I or a family member experience an acute emergency?',
    answer: 'Do not wait for AI responses during life-critical emergencies. If you notice severe chest pain radiating to the arm/jaw, acute shortness of breath, sudden facial drooping or weakness, uncontrolled bleeding, or pediatric convulsions, call 112 / 767 toll-free immediately or proceed to the nearest emergency trauma center.',
  },
  {
    category: 'Languages & Dialects',
    question: 'Can I speak or type in Nigerian Pidgin, Yoruba, Hausa, or other languages?',
    answer: 'Yes. DokitaAI features automatic language and dialect detection. You can type or speak via voice dictation in Nigerian Pidgin (e.g. "Doc, my head dey pain me well well"), Yoruba, Hausa, Igbo, French, Spanish, or English, and the system will automatically reply in the exact same language with clear clinical guidance.',
  },
  {
    category: 'Doctor Briefing PDF',
    question: 'What is the "Export for Doctor" PDF feature?',
    answer: 'The "Export for Doctor" button compiles your conversation history, symptom timeline, calculated triage urgency, and relevant red flags into a structured, printable clinical briefing document. You can download and bring this PDF directly to your physician consultation to save time and ensure accurate reporting.',
  },
  {
    category: 'GPS Hospital Locator',
    question: 'How does the "Hospitals Near Me" GPS locator work?',
    answer: 'With your permission, DokitaAI reads your device GPS coordinates and calculates exact road and air distances to verified 24/7 emergency rooms and trauma centers. Results are sorted from closest to farthest, with direct phone dial buttons and Google Maps turn-by-turn navigation.',
  },
  {
    category: 'Privacy & Security',
    question: 'Is my health conversation data kept private and can I delete it?',
    answer: 'Yes. Health disclosures are encrypted with TLS 1.3. We never monetize or sell user data. You have full privacy control: you can permanently delete individual consultation sessions or wipe your entire consultation history with a single click at any time.',
  },
];

export const FAQSection: React.FC = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section className="space-y-6">
      <div className="space-y-1.5 text-center sm:text-left">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-teal-50 border border-teal-200 text-teal-800 text-xs font-semibold">
          <HelpIcon className="w-3.5 h-3.5" />
          <span>Frequently Asked Questions</span>
        </div>
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
          Clinical Guidance, Safety & Platform FAQs
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 max-w-2xl">
          Everything you need to know about DokitaAI triage accuracy, emergency protocols, and doctor briefings.
        </p>
      </div>

      <div className="space-y-3">
        {FAQS.map((faq, idx) => {
          const isOpen = openIndex === idx;
          return (
            <div
              key={idx}
              className={`border rounded-xl transition-colors ${
                isOpen ? 'bg-white border-teal-600/40' : 'bg-slate-50 border-slate-200 hover:bg-white'
              }`}
            >
              <button
                type="button"
                onClick={() => toggleFAQ(idx)}
                className="w-full px-4 sm:px-5 py-4 text-left flex items-center justify-between gap-3 cursor-pointer"
              >
                <div className="space-y-0.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-teal-700 block">
                    {faq.category}
                  </span>
                  <span className="text-xs sm:text-sm font-bold text-slate-900 leading-snug">
                    {faq.question}
                  </span>
                </div>
                <ChevronDownIcon
                  className={`w-4 h-4 text-slate-500 shrink-0 transition-transform duration-200 ${
                    isOpen ? 'rotate-180 text-teal-700' : ''
                  }`}
                />
              </button>

              {isOpen && (
                <div className="px-4 sm:px-5 pb-4 pt-1 text-xs sm:text-sm text-slate-600 leading-relaxed border-t border-slate-100">
                  {faq.answer}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
};
