import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert, ArrowLeft, AlertCircle } from 'lucide-react';

export const TermsOfService: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Back Button */}
      <Link
        to="/"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Return to Main Portal</span>
      </Link>

      {/* Header */}
      <div className="border-b border-slate-200 pb-6 space-y-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-amber-50 border border-amber-200 text-amber-900 text-xs font-semibold">
          <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
          <span>Statutory Terms & Clinical Disclaimer</span>
        </div>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
          Terms of Service & Clinical Agreement
        </h1>
        <p className="text-xs text-slate-500">
          Last Updated: August 17, 2026 | Mandatory agreement for all DokitaAI users.
        </p>
      </div>

      {/* Statutory Notice Callout */}
      <div className="p-4 bg-red-50 border-l-4 border-red-600 rounded-r-xl text-red-950 text-xs sm:text-sm space-y-1">
        <p className="font-bold flex items-center gap-1.5">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          <span>Emergency Medical Notice (112 / 767 / 911)</span>
        </p>
        <p className="leading-relaxed">
          DokitaAI is not an emergency dispatch provider. If you are experiencing acute chest pain, severe shortness of breath, heavy bleeding, stroke symptoms, or a pediatric emergency, call emergency services immediately or proceed to the nearest hospital trauma unit.
        </p>
      </div>

      {/* Main Legal Content */}
      <div className="space-y-6 text-xs sm:text-sm text-slate-700 leading-relaxed">
        <section className="space-y-2">
          <h2 className="text-base font-bold text-slate-900">1. Acceptance of Terms</h2>
          <p>
            By accessing or using the DokitaAI platform, web application, WhatsApp assistant, or hospital locator tools, you acknowledge that you have read, understood, and agreed to be bound by these Terms of Service.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-slate-900">2. Nature of Clinical AI Triage (Not a Doctor Replacement)</h2>
          <p>
            DokitaAI is an educational and preliminary triage decision-support tool. It synthesizes evidence-based medical information from recognized health authorities (such as WHO, CDC, Mayo Clinic, and NHS). It does not establish a formal doctor-patient relationship and does not provide personalized medical diagnoses, prescriptions, or treatment plans.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-slate-900">3. User Responsibilities & Accurate Disclosures</h2>
          <p>
            Users are responsible for the accuracy of symptoms and timelines provided during consultations. Misrepresentation of symptoms may compromise triage accuracy. Users agree not to rely solely on AI guidance for life-critical health decisions.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-slate-900">4. Hospital Directory & GPS Accuracy</h2>
          <p>
            Hospital location data and operating hours are maintained for emergency convenience. While we regularly verify contact numbers and 24/7 ER availability, users should confirm directly with facilities when time permits.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-slate-900">5. Limitation of Liability</h2>
          <p>
            To the maximum extent permitted by applicable law, DokitaAI and its developers shall not be liable for direct, indirect, incidental, or consequential damages resulting from the use or inability to use this platform.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-slate-900">6. Governing Law & Inquiries</h2>
          <p>
            These terms are governed by healthcare data and digital health compliance frameworks. For legal inquiries or regulatory questions, contact: <a href="mailto:legal@dokita.ai" className="text-teal-700 font-semibold underline">legal@dokita.ai</a>.
          </p>
        </section>
      </div>
    </div>
  );
};
