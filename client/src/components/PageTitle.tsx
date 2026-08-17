import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export const PageTitle: React.FC = () => {
  const location = useLocation();

  useEffect(() => {
    const titles: Record<string, string> = {
      '/': 'DokitaAI: Evidence-Based Clinical Medical Triage & Hospital Locator',
      '/chat': 'DokitaAI: Interactive Medical Triage Workspace',
      '/hospitals': 'DokitaAI: Emergency Hospitals & Proximity Directory',
      '/faq': 'DokitaAI: Clinical Triage Frequently Asked Questions',
      '/privacy': 'DokitaAI: Privacy Policy & Patient Data Protection',
      '/terms': 'DokitaAI: Terms of Service & Clinical Disclaimer',
      '/thank-you': 'DokitaAI: Consultation & Feedback Confirmation',
      '/login': 'DokitaAI: Healthcare Portal Login',
      '/register': 'DokitaAI: Create Patient Account',
      '/admin': 'DokitaAI: Clinical Administration Console',
    };

    const currentTitle = titles[location.pathname] || 'DokitaAI: Clinical Telehealth Platform';
    document.title = currentTitle;
  }, [location.pathname]);

  return null;
};
