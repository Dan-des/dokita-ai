import React, { useState } from 'react';
import { CloseIcon, ShareIcon, CopyIcon, CheckIcon, ChatBubbleIcon, MailIcon, SmartphoneIcon } from './Icons';

interface SocialShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  shareUrl?: string;
  shareText?: string;
}

export const SocialShareModal: React.FC<SocialShareModalProps> = ({
  isOpen,
  onClose,
  title = 'Share DokitaAI Clinical Triage',
  shareUrl = window.location.origin,
  shareText = 'DokitaAI: Instant evidence-based medical triage, emergency hospital proximity locator, and multilingual consultations.',
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(`${shareText}\n${shareUrl}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title,
          text: shareText,
          url: shareUrl,
        });
        onClose();
      } catch (err) {
        // User dismissed
      }
    }
  };

  const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(
    `${shareText}\n${shareUrl}`
  )}`;

  const mailtoUrl = `mailto:?subject=${encodeURIComponent(
    title
  )}&body=${encodeURIComponent(`${shareText}\n\nAccess here: ${shareUrl}`)}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl border border-slate-200 max-w-sm w-full p-5 space-y-4 animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-teal-50 border border-teal-200 text-teal-700 flex items-center justify-center">
              <ShareIcon className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">{title}</h3>
              <p className="text-[10px] text-slate-500">Share with family or emergency contacts</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <CloseIcon className="w-4 h-4" />
          </button>
        </div>

        {/* Share Options */}
        <div className="grid grid-cols-1 gap-2">
          {typeof navigator.share === 'function' && (
            <button
              onClick={handleNativeShare}
              className="w-full py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <SmartphoneIcon className="w-4 h-4" />
              <span>Share via Device Menu</span>
            </button>
          )}

          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
          >
            <ChatBubbleIcon className="w-4 h-4" />
            <span>Share on WhatsApp</span>
          </a>

          <a
            href={mailtoUrl}
            className="w-full py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
          >
            <MailIcon className="w-4 h-4 text-slate-600" />
            <span>Share via Email</span>
          </a>
        </div>

        {/* Link Copy Box */}
        <div className="pt-2 border-t border-slate-100 space-y-1.5">
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
            Or copy direct link
          </p>
          <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-xl border border-slate-200">
            <input
              type="text"
              readOnly
              value={shareUrl}
              className="text-xs bg-transparent border-none text-slate-600 flex-1 px-2 focus:outline-none truncate"
            />
            <button
              onClick={handleCopy}
              className="px-3 py-1 bg-teal-700 hover:bg-teal-800 text-white text-xs font-medium rounded-lg flex items-center gap-1 transition-colors cursor-pointer shrink-0"
            >
              {copied ? <CheckIcon className="w-3.5 h-3.5" /> : <CopyIcon className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
