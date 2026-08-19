import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheckIcon, LockIcon, ArrowLeftIcon } from '../components/Icons';

export const PrivacyPolicy: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Back Button */}
      <Link
        to="/"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
      >
        <ArrowLeftIcon className="w-4 h-4" />
        <span>Return to Main Portal</span>
      </Link>

      {/* Header */}
      <div className="border-b border-slate-200 pb-6 space-y-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-teal-50 border border-teal-200 text-teal-800 text-xs font-semibold">
          <ShieldCheckIcon className="w-3.5 h-3.5" />
          <span>Patient Data Protection Policy</span>
        </div>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
          Privacy Policy & Data Security
        </h1>
        <p className="text-xs text-slate-500">
          Last Updated: August 17, 2026 | Effective for all DokitaAI web, WhatsApp, and mobile services.
        </p>
      </div>

      {/* Main Legal Content */}
      <div className="space-y-6 text-xs sm:text-sm text-slate-700 leading-relaxed">
        <section className="space-y-2">
          <h2 className="text-base font-bold text-slate-900">1. Commitment to Health Data Privacy</h2>
          <p>
            At DokitaAI, we treat medical and personal health information with strict confidentiality. This Privacy Policy details how we collect, process, and protect your data when you interact with our AI triage assistant, hospital locator, and consultation export tools.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-slate-900">2. Information We Collect</h2>
          <p>We only collect information necessary to provide clinical triage and location-based emergency directory services:</p>
          <ul className="list-disc pl-5 space-y-1 text-slate-600">
            <li><strong>Symptom Disclosures:</strong> Information entered into the chat consultation interface solely to compute clinical urgency.</li>
            <li><strong>Geolocation Data:</strong> Device coordinates (latitude and longitude) requested strictly with user consent to calculate distances to nearest verified hospitals. Coordinates are never tracked or permanently stored.</li>
            <li><strong>Account Credentials:</strong> Name, email, and password (hashed with bcrypt) for users who optionally create accounts.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-slate-900">3. How Your Data Is Processed</h2>
          <p>
            Your symptom inputs are processed in real time by our clinical AI engine to generate triage urgency ratings and authoritative medical citations. We do not sell, monetize, or share patient disclosures with advertisers, insurance brokers, or third-party marketing networks.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-slate-900">4. Right to Permanent Deletion (Privacy Wipe)</h2>
          <p>
            You retain absolute ownership of your consultation history. Every user has access to one-click deletion of individual chat sessions or full history wipes directly from the consultation workspace. Once deleted, records are immediately purged from our database.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-slate-900">5. Security Standards & Encryption</h2>
          <p>
            All communications are encrypted in transit using industry-standard TLS 1.3 encryption. Passwords and session authentication tokens utilize cryptographic hashing and secure JSON Web Tokens (JWT).
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-slate-900">6. Contact Our Data Protection Officer</h2>
          <p>
            For privacy inquiries, audit requests, or data deletion confirmations, please reach our Data Compliance team at: <a href="mailto:privacy@dokita.ai" className="text-teal-700 font-semibold underline">privacy@dokita.ai</a>.
          </p>
        </section>
      </div>
    </div>
  );
};
