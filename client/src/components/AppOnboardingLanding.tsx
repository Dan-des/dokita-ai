import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ActivityIcon,
  ShieldCheckIcon,
  GlobeIcon,
  HospitalIcon,
  FileDownIcon,
  PillIcon,
  ArrowRightIcon,
  ArrowLeftIcon,
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

  // Swipe gesture handlers
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
        setCurrentSlide((prev) => prev + 1);
      } else if (diffX < 0 && currentSlide > 0) {
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
      className="fixed inset-0 z-50 bg-slate-100 text-slate-900 flex flex-col justify-between select-none overflow-hidden h-[100dvh]"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Top App Bar */}
      <header className="px-5 pt-4 pb-2 flex items-center justify-between shrink-0 z-10 bg-slate-100 border-b border-slate-200">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-xl bg-teal-700 flex items-center justify-center text-white font-bold">
            <ActivityIcon className="w-4 h-4 text-white" />
          </div>
          <span className="text-base font-bold text-slate-900 tracking-tight">
            Dokita<span className="text-teal-700">AI</span>
          </span>
        </div>

        <div className="flex items-center gap-2">
          {currentSlide < totalSlides - 1 && (
            <button
              onClick={() => setCurrentSlide(totalSlides - 1)}
              className="text-xs font-semibold text-slate-600 hover:text-slate-900 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
            >
              Skip
            </button>
          )}

          {onDismissToWeb && (
            <button
              onClick={onDismissToWeb}
              className="text-[11px] font-medium text-teal-800 hover:text-teal-900 bg-slate-200 px-2.5 py-1 rounded-lg border border-slate-300 transition-colors cursor-pointer"
            >
              Web Mode
            </button>
          )}
        </div>
      </header>

      {/* Main Slide Carousel Area */}
      <main className="flex-1 flex flex-col justify-center px-5 sm:px-8 max-w-md mx-auto w-full min-h-0 py-3">
        {/* ============================================================ */}
        {/* SLIDE 1: HEALTH TECH AI & CLINICAL TELEHEALTH CORE */}
        {/* ============================================================ */}
        {currentSlide === 0 && (
          <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-200">
            {/* Category Tag */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-200 border border-slate-300 text-slate-800 text-[11px] font-semibold">
              <ShieldCheckIcon className="w-3.5 h-3.5 text-teal-700 shrink-0" />
              <span>Next-Gen Clinical Health Tech AI</span>
            </div>

            {/* Structured Clinical Status Card */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-300 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-teal-100 text-teal-800 flex items-center justify-center">
                    <StethoscopeIcon className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900">DokitaAI Clinical Engine</p>
                    <p className="text-[10px] text-slate-500">Triage Protocol v2.5</p>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                  Online 24/7
                </span>
              </div>

              <div className="space-y-1.5 text-xs">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-500">Evidence Standards:</span>
                  <span className="font-semibold text-slate-800">WHO • CDC • NHS • NAFDAC</span>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-500">Triage Speed:</span>
                  <span className="font-semibold text-teal-800">Real-Time Telehealth</span>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-500">Service Resilience:</span>
                  <span className="font-semibold text-emerald-800">Zero-Downtime Multi-Tier</span>
                </div>
              </div>
            </div>

            {/* Headline & Description */}
            <div className="space-y-1.5">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight leading-tight">
                Your 24/7 Clinical AI Health Companion
              </h1>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Evidence-based medical artificial intelligence engineered to assess symptoms, identify urgent red flags, and navigate emergency healthcare.
              </p>
            </div>

            {/* Key Clinical Insights */}
            <div className="space-y-1.5 pt-1 text-xs text-slate-700">
              <div className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-teal-700 mt-1.5 shrink-0"></span>
                <span>Immediate clinical preliminary triage and symptom evaluation</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-teal-700 mt-1.5 shrink-0"></span>
                <span>Instant emergency red-flag identification (112 / 767 dispatch alerts)</span>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* SLIDE 2: MULTILINGUAL INTELLIGENCE & DRUG SAFETY */}
        {/* ============================================================ */}
        {currentSlide === 1 && (
          <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-200">
            {/* Category Tag */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-200 border border-slate-300 text-slate-800 text-[11px] font-semibold">
              <GlobeIcon className="w-3.5 h-3.5 text-teal-700 shrink-0" />
              <span>Multilingual AI &amp; Drug Safety</span>
            </div>

            {/* Dialect and Drug Safety Card */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-300 space-y-3">
              <div className="space-y-1.5">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  Automatic Language Detection:
                </p>
                <div className="flex flex-wrap gap-1.5">
                  <span className="px-2 py-0.5 rounded-md bg-teal-100 text-teal-900 text-[10px] font-semibold border border-teal-200">
                    Nigerian Pidgin
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-slate-200 text-slate-800 text-[10px] font-medium border border-slate-300">
                    Yorùbá
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-slate-200 text-slate-800 text-[10px] font-medium border border-slate-300">
                    Hausa
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-slate-200 text-slate-800 text-[10px] font-medium border border-slate-300">
                    Igbo
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-slate-200 text-slate-800 text-[10px] font-medium border border-slate-300">
                    English &amp; French
                  </span>
                </div>
              </div>

              {/* Sample Turn */}
              <div className="p-2.5 rounded-lg bg-slate-200/70 border border-slate-300 space-y-1 text-[11px]">
                <p className="text-slate-800 font-medium italic">
                  "Doc, my head dey pain me and body hot..."
                </p>
                <div className="flex items-center gap-1.5 text-teal-800 font-semibold">
                  <PillIcon className="w-3 h-3 shrink-0" />
                  <span>Drug safety: Checks malaria protocol &amp; safe paracetamol limits</span>
                </div>
              </div>
            </div>

            {/* Headline & Description */}
            <div className="space-y-1.5">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight leading-tight">
                Speak in Any Dialect. Check Every Medication.
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Describe symptoms naturally in your native dialect. DokitaAI screens prescription interactions, max safe doses, and contraindications before you take any medicine.
              </p>
            </div>

            {/* Key Insights */}
            <div className="space-y-1.5 pt-1 text-xs text-slate-700">
              <div className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-teal-700 mt-1.5 shrink-0"></span>
                <span>Voice and text dictation in African dialects and international languages</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-teal-700 mt-1.5 shrink-0"></span>
                <span>Automated NSAID, antibiotic, and ulcer contraindication safety</span>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* SLIDE 3: CONNECTED HEALTHCARE ECOSYSTEM & ACTION LAUNCH */}
        {/* ============================================================ */}
        {currentSlide === 2 && (
          <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-200">
            {/* Category Tag */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-200 border border-slate-300 text-slate-800 text-[11px] font-semibold">
              <HospitalIcon className="w-3.5 h-3.5 text-teal-700 shrink-0" />
              <span>Connected Healthcare Ecosystem</span>
            </div>

            {/* Ecosystem Dual Tiles */}
            <div className="grid grid-cols-2 gap-2.5">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-300 space-y-1">
                <div className="w-7 h-7 rounded-lg bg-teal-100 text-teal-800 flex items-center justify-center">
                  <HospitalIcon className="w-4 h-4" />
                </div>
                <p className="text-xs font-bold text-slate-900 leading-tight">GPS Hospital Finder</p>
                <p className="text-[10px] text-slate-500 leading-tight">
                  24/7 verified emergency clinics and phone contacts
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-300 space-y-1">
                <div className="w-7 h-7 rounded-lg bg-teal-100 text-teal-800 flex items-center justify-center">
                  <FileDownIcon className="w-4 h-4" />
                </div>
                <p className="text-xs font-bold text-slate-900 leading-tight">Doctor PDF Report</p>
                <p className="text-[10px] text-slate-500 leading-tight">
                  Export structured briefings for attending physicians
                </p>
              </div>
            </div>

            {/* Headline & Description */}
            <div className="space-y-1.5">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight leading-tight">
                From AI Consultation to Clinical Care
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Seamlessly bridge digital symptom triage with real-world hospitals. Find nearby 24/7 emergency centers and hand your doctor a clean clinical summary PDF.
              </p>
            </div>

            {/* Reminders Callout */}
            <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-300 flex items-center gap-2 text-xs text-slate-800">
              <BellIcon className="w-4 h-4 text-teal-700 shrink-0" />
              <span>Native medication reminder alerts and scheduled dosage alarms</span>
            </div>
          </div>
        )}
      </main>

      {/* Bottom Sticky Action Panel */}
      <footer className="p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] bg-slate-100 border-t border-slate-300 shrink-0 space-y-3 z-10 max-w-md mx-auto w-full">
        {/* Step Indicator Dots */}
        <div className="flex items-center justify-center gap-2 pb-0.5">
          {Array.from({ length: totalSlides }).map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentSlide(index)}
              className={`h-1.5 rounded-full transition-all duration-200 cursor-pointer ${
                index === currentSlide ? 'w-6 bg-teal-700' : 'w-2 bg-slate-300 hover:bg-slate-400'
              }`}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>

        {/* Dynamic Buttons Depending on Slide */}
        {currentSlide < totalSlides - 1 ? (
          <div className="flex items-center gap-2.5">
            {currentSlide > 0 ? (
              <button
                type="button"
                onClick={handlePrev}
                className="py-3 px-4 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 shrink-0"
              >
                <ArrowLeftIcon className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>
            ) : null}

            <button
              type="button"
              onClick={handleNext}
              className="flex-1 py-3 px-5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
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
                className="w-full py-3.5 px-4 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
              >
                <span>Get Started</span>
                <ChevronRightIcon className="w-4 h-4 text-teal-200" />
              </button>

              <button
                type="button"
                onClick={handleSignIn}
                className="w-full py-3.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
              >
                <span>Sign In</span>
              </button>
            </div>

            {/* Quick Guest Triage link */}
            <div className="text-center pt-0.5">
              <button
                type="button"
                onClick={handleGuestTriage}
                className="text-[11px] font-medium text-teal-800 hover:text-teal-900 transition-colors underline cursor-pointer"
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
