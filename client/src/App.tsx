import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ReminderProvider } from './context/ReminderContext';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { FeedbackModal } from './components/FeedbackModal';
import { ProtectedRoute } from './components/ProtectedRoute';
import { ScrollToTop } from './components/ScrollToTop';
import { InstallPwaBanner } from './components/InstallPwaBanner';
import { PageTitle } from './components/PageTitle';

import { Home } from './pages/Home';
import { Chat } from './pages/Chat';
import { FAQ } from './pages/FAQ';
import { PrivacyPolicy } from './pages/PrivacyPolicy';
import { TermsOfService } from './pages/TermsOfService';
import { ThankYou } from './pages/ThankYou';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Admin } from './pages/Admin';
import { NotFound } from './pages/NotFound';

const AppContent: React.FC = () => {
  const location = useLocation();
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const isChatRoute = location.pathname === '/chat';

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 selection:bg-teal-700 selection:text-white font-sans">
      <PageTitle />

      {/* Render Header only on standard site pages (never inside full-screen chat) */}
      {!isChatRoute && <Header onOpenFeedback={() => setFeedbackOpen(true)} />}

      <main className={`flex-1 flex flex-col ${isChatRoute ? 'h-screen overflow-hidden' : ''}`}>
        <Routes>
          <Route path="/" element={<Home onOpenFeedback={() => setFeedbackOpen(true)} />} />
          
          {/* Protected Chat App Route: requires login */}
          <Route element={<ProtectedRoute />}>
            <Route path="/chat" element={<Chat />} />
          </Route>

          <Route path="/faq" element={<FAQ />} />
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/terms" element={<TermsOfService />} />
          <Route path="/thank-you" element={<ThankYou />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          
          {/* Legacy /hospitals redirects to chat */}
          <Route path="/hospitals" element={<Navigate to="/chat" replace state={{ initialPrompt: 'Find 24/7 emergency hospitals near me' }} />} />

          {/* Admin Protected Routes */}
          <Route element={<ProtectedRoute requiredRole="admin" />}>
            <Route path="/admin" element={<Admin />} />
          </Route>

          {/* 404 Fallback */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>

      {/* Render Footer only on standard site pages (never inside chat) */}
      {!isChatRoute && <Footer />}

      {/* Feedback Modal */}
      <FeedbackModal
        isOpen={feedbackOpen}
        onClose={() => setFeedbackOpen(false)}
      />

      {/* PWA Home Screen Installation Prompt Banner */}
      <InstallPwaBanner />
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <ReminderProvider>
        <Router>
          <ScrollToTop />
          <AppContent />
        </Router>
      </ReminderProvider>
    </AuthProvider>
  );
};

export default App;
