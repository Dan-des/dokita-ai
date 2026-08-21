import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  ActivityIcon,
  ShieldCheckIcon,
  GlobeIcon,
  HospitalIcon,
  FileDownIcon,
  PillIcon,
  ArrowRightIcon,
  ArrowLeftIcon,
  CheckIcon,
  StethoscopeIcon,
  BellIcon,
  ChevronRightIcon,
} from './Icons';

interface AppOnboardingLandingProps {
  onDismissToWeb?: () => void;
}

export const AppOnboardingLanding: React.FC<AppOnboardingLandingProps> = ({ onDismissToWeb }) => {
  const navigate = useNavigate();
  const [currentSlide, setCurrentSlide] = useState<number>(0);
  const touchStartX = useRef<number>(0);
  const touchEndX = useRef<number>(0);

  const totalSlides = 3;

  // Swipe navigation support for mobile screens
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    const diffX = touchStartX.current - touchEndX.current;
    if (Math.abs(diffX) > 45) {
      if (diffX > 0 && currentSlide < totalSlides - 1) {
        // Swiped left -> Next
        setCurrentSlide((prev) => prev + 1);
      } else if (diffX < 0 && currentSlide > 0) {
        // Swiped right -> Prev
        setCurrentSlide((prev) => prev - 1);
      }
    }
  };

  const handleNext = () => {
    if (currentSlide < totalSlides - 1) {
      setCurrentSlide((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentSlide > 0) {
      setCurrentSlide((prev) => prev - 1);
    }
  };

  const handleGetStarted = () => {
    navigate('/register', {
      state: { redirectAfter: '/chat' },
    });
  };

  const handleSignIn = () => {
    navigate('/login', {
      state: { redirectAfter: '/chat' },
    });
  };

  const handleGuestTriage = () => {
    navigate('/chat');
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900 text-slate-100 flex flex-col justify-between select-none overflow-hidden h-[100dvh]"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Top Mobile Bar */}
      <header className="px-5 pt-4 pb-2 flex items-center justify-between shrink-0 z-10">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-xl bg-teal-600 flex items-center justify-center text-white font-bold">
            <ActivityIcon className="w-4 h-4 text-white" />
          </div>
          <span className="text-base font-bold text-white tracking-tight">
            Dokita<span className="text-teal-400">AI</span>
          </span>
        </div>

        <div className="flex items-center gap-2">
          {currentSlide < totalSlides - 1 && (
            <button
              onClick={() => setCurrentSlide(totalSlides - 1)}
              className="text-xs font-semibold text-slate-400 hover:text-slate-200 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
            >
              Skip
            </button>
          )}

          {onDismissToWeb && (
            <button
              onClick={onDismissToWeb}
              className="text-[11px] font-medium text-teal-400 hover:text-teal-300 bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-700 transition-colors cursor-pointer"
            >
              Web Mode
            </button>
          )}
        </div>
      </header>

      {/* Main Slide Carousel Area */}
      <main className="flex-1 flex flex-col justify-center px-5 sm:px-8 max-w-md mx-auto w-full min-h-0 py-2">
        {/* ============================================================ */}
        {/* SLIDE 1: HEALTH TECH AI & CLINICAL TELEHEALTH CORE */}
        {/* ============================================================ */}
        {currentSlide === 0 && (
          <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
            {/* Category Tag */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-950 border border-teal-600/40 text-teal-300 text-[11px] font-semibold">
              <ShieldCheckIcon className="w-3.5 h-3.5 text-teal-400 shrink-0" />
              <span>Next-Gen Clinical Health Tech AI</span>
            </div>

            {/* Visual Tech Card */}
            <div className="p-4 rounded-2xl bg-slate-800/90 border border-slate-700/80 space-y-3 shadow-lg">
              <div className="flex items-center justify-between border-b border-slate-700 pb-2.5">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-teal-600/20 text-teal-400 flex items-center justify-center">
                    <StethoscopeIcon className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white">DokitaAI Triage Engine</p>
                    <p className="text-[10px] text-slate-400">Clinical Protocol v2.5</p>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-700/50">
                  Online 24/7
                </span>
              </div>

              <div className="space-y-2 text-xs text-slate-300">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-400">Evidence Standards:</span>
                  <span className="font-semibold text-slate-200">WHO • CDC • NHS • NAFDAC</span>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-400">Triage Latency:</span>
                  <span className="font-semibold text-teal-300">Real-Time (Under 1.5s)</span>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-400">Zero-Downtime Guarantee:</span>
                  <span className="font-semibold text-emerald-300">Active Multi-Tier Fallback</span>
                </div>
              </div>
            </div>

            {/* Headline & Description */}
            <div className="space-y-2">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight leading-tight">
                Your 24/7 AI Health Companion &amp; Triage Engine
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                Advanced clinical artificial intelligence engineered to assess symptoms, identify urgent red flags, and deliver evidence-based health guidance instantly.
              </p>
            </div>

            {/* Feature Highlights */}
            <div className="space-y-2 pt-1">
              <div className="flex items-start gap-2.5 text-xs text-slate-200">
                <div className="w-4 h-4 rounded-full bg-teal-600/30 text-teal-400 flex items-center justify-center shrink-0 mt-0.5">
                  <CheckIcon className="w-2.5 h-2.5" />
                </div>
                <span>Evidence-based clinical preliminary triage anytime, anywhere</span>
              </div>
              <div className="flex items-start gap-2.5 text-xs text-slate-200">
                <div className="w-4 h-4 rounded-full bg-teal-600/30 text-teal-400 flex items-center justify-center shrink-0 mt-0.5">
                  <CheckIcon className="w-2.5 h-2.5" />
                </div>
                <span>Instant emergency red-flag detection and 112 / 767 alerts</span>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* SLIDE 2: MULTILINGUAL INTELLIGENCE & DRUG SAFETY */}
        {/* ============================================================ */}
        {currentSlide === 1 && (
          <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
            {/* Category Tag */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-950 border border-teal-600/40 text-teal-300 text-[11px] font-semibold">
              <GlobeIcon className="w-3.5 h-3.5 text-teal-400 shrink-0" />
              <span>Multilingual AI &amp; Drug Safety</span>
            </div>

            {/* Interactive Dialect & Pharmacology Visual */}
            <div className="p-4 rounded-2xl bg-slate-800/90 border border-slate-700/80 space-y-3 shadow-lg">
              {/* Dialect Badges */}
              <div className="space-y-1.5">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Automatic Language Detection:
                </p>
                <div className="flex flex-wrap gap-1.5">
                  <span className="px-2 py-0.5 rounded-md bg-teal-900/60 text-teal-300 text-[10px] font-semibold border border-teal-700/40">
                    Nigerian Pidgin
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-slate-700 text-slate-200 text-[10px] font-medium">
                    Yorùbá
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-slate-700 text-slate-200 text-[10px] font-medium">
                    Hausa
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-slate-700 text-slate-200 text-[10px] font-medium">
                    Igbo
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-slate-700 text-slate-200 text-[10px] font-medium">
                    English &amp; French
                  </span>
                </div>
              </div>

              {/* Sample Turn */}
              <div className="p-2.5 rounded-xl bg-slate-900/70 border border-slate-700/50 space-y-1.5 text-[11px]">
                <p className="text-slate-300 font-medium italic">
                  "Doc, my head dey pain me and body hot..."
                </p>
                <div className="flex items-center gap-1.5 text-teal-400 font-semibold">
                  <PillIcon className="w-3 h-3 shrink-0" />
                  <span>Drug safety check: Paracetamol dose vs NSAID contraindication</span>
                </div>
              </div>
            </div>

            {/* Headline & Description */}
            <div className="space-y-2">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight leading-tight">
                Speak in Any Language. Check Every Medication.
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                Describe symptoms naturally in your native dialect. DokitaAI checks prescription interactions, max safe doses, and contraindications before you take any medicine.
              </p>
            </div>

            {/* Feature Highlights */}
            <div className="space-y-2 pt-1">
              <div className="flex items-start gap-2.5 text-xs text-slate-200">
                <div className="w-4 h-4 rounded-full bg-teal-600/30 text-teal-400 flex items-center justify-center shrink-0 mt-0.5">
                  <CheckIcon className="w-2.5 h-2.5" />
                </div>
                <span>Voice and text dictation in African dialects and international languages</span>
              </div>
              <div className="flex items-start gap-2.5 text-xs text-slate-200">
                <div className="w-4 h-4 rounded-full bg-teal-600/30 text-teal-400 flex items-center justify-center shrink-0 mt-0.5">
                  <CheckIcon className="w-2.5 h-2.5" />
                </div>
                <span>Automated NSAID, antibiotic, and ulcer contraindication safety</span>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* SLIDE 3: CONNECTED HEALTHCARE ECOSYSTEM & ACTION LAUNCH */}
        {/* ============================================================ */}
        {currentSlide === 2 && (
          <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
            {/* Category Tag */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-950 border border-teal-600/40 text-teal-300 text-[11px] font-semibold">
              <HospitalIcon className="w-3.5 h-3.5 text-teal-400 shrink-0" />
              <span>Connected Healthcare Ecosystem</span>
            </div>

            {/* Ecosystem Visual Cards */}
            <div className="grid grid-cols-2 gap-2.5">
              <div className="p-3 rounded-2xl bg-slate-800/90 border border-slate-700/80 space-y-1.5">
                <div className="w-7 h-7 rounded-lg bg-teal-600/20 text-teal-400 flex items-center justify-center">
                  <HospitalIcon className="w-4 h-4" />
                </div>
                <p className="text-xs font-bold text-white leading-tight">GPS Hospital Finder</p>
                <p className="text-[10px] text-slate-400 leading-tight">
                  24/7 verified emergency rooms &amp; clinic contacts
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-slate-800/90 border border-slate-700/80 space-y-1.5">
                <div className="w-7 h-7 rounded-lg bg-teal-600/20 text-teal-400 flex items-center justify-center">
                  <FileDownIcon className="w-4 h-4" />
                </div>
                <p className="text-xs font-bold text-white leading-tight">Doctor PDF Report</p>
                <p className="text-[10px] text-slate-400 leading-tight">
                  Export structured briefings for attending physicians
                </p>
              </div>
            </div>

            {/* Headline & Description */}
            <div className="space-y-2">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight leading-tight">
                From AI Triage Directly to Clinical Care
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                Seamlessly bridge digital consultations with real-world hospitals. Find nearby 24/7 emergency centers and hand your doctor a clean clinical summary PDF.
              </p>
            </div>

            {/* Reminders Callout */}
            <div className="p-2.5 rounded-xl bg-teal-950/60 border border-teal-700/40 flex items-center gap-2.5 text-xs text-teal-200">
              <BellIcon className="w-4 h-4 text-teal-400 shrink-0" />
              <span>Includes native medication reminder alerts and scheduled alarms</span>
            </div>
          </div>
        )}
      </main>

      {/* Bottom Sticky Action Panel */}
      <footer className="p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] bg-slate-950/90 border-t border-slate-800 shrink-0 space-y-3 z-10 max-w-md mx-auto w-full">
        {/* Step Indicator Dots */}
        <div className="flex items-center justify-center gap-2 pb-1">
          {Array.from({ length: totalSlides }).map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentSlide(index)}
              className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                index === currentSlide ? 'w-6 bg-teal-400' : 'w-2 bg-slate-700 hover:bg-slate-500'
              }`}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>

        {/* Dynamic Buttons Depending on Slide */}
        {currentSlide < totalSlides - 1 ? (
          <div className="flex items-center gap-3">
            {currentSlide > 0 ? (
              <button
                type="button"
                onClick={handlePrev}
                className="py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 shrink-0"
              >
                <ArrowLeftIcon className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>
            ) : null}

            <button
              type="button"
              onClick={handleNext}
              className="flex-1 py-3 px-5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95 shadow-md"
            >
              <span>Continue</span>
              <ArrowRightIcon className="w-4 h-4" />
            </button>
          </div>
        ) : (
          /* ============================================================ */
          /* SLIDE 3: TWO LARGE BOTTOM-CENTER BUTTONS: GET STARTED & SIGN IN */
          /* ============================================================ */
          <div className="space-y-2.5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={handleGetStarted}
                className="w-full py-3.5 px-4 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95 shadow-md shadow-teal-900/30"
              >
                <span>Get Started</span>
                <ChevronRightIcon className="w-4 h-4 text-teal-200" />
              </button>

              <button
                type="button"
                onClick={handleSignIn}
                className="w-full py-3.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 hover:border-slate-600 font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
              >
                <span>Sign In</span>
              </button>
            </div>

            {/* Quick Guest Triage fallback link */}
            <div className="text-center pt-1">
              <button
                type="button"
                onClick={handleGuestTriage}
                className="text-[11px] font-medium text-slate-400 hover:text-teal-300 transition-colors underline cursor-pointer"
              >
                Or launch instant guest triage without an account
              </button>
            </div>
          </div>
        )}
      </footer>
    </div>
  );
};
