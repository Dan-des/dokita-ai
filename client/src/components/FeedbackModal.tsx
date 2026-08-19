import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { StarIcon, CloseIcon, ChatBubbleIcon, LoaderIcon } from './Icons';
import { submitFeedback } from '../api/feedback';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const FeedbackModal: React.FC<FeedbackModalProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [comment, setComment] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim()) {
      setErrorMsg('Please share a brief comment about your experience.');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMsg(null);
      await submitFeedback({ rating, comment: comment.trim() });
      onClose();
      navigate('/thank-you');
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Failed to submit feedback. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getRatingLabel = (score: number) => {
    switch (score) {
      case 5: return '5/5: Exceptional and clear clinical guidance';
      case 4: return '4/5: Very helpful medical advice';
      case 3: return '3/5: Satisfactory preliminary triage';
      case 2: return '2/5: Needs clinical improvement';
      case 1: return '1/5: Unsatisfactory triage';
      default: return '';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="relative w-full max-w-md bg-white rounded-2xl border border-slate-300 overflow-hidden shadow-lg">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-teal-50 border border-teal-200 text-teal-700 flex items-center justify-center">
              <ChatBubbleIcon className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">Clinical Feedback & Review</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <CloseIcon className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {errorMsg && (
            <div className="p-3 text-xs bg-red-50 text-red-700 rounded-xl border border-red-200">
              {errorMsg}
            </div>
          )}

          {/* Star Rating */}
          <div className="text-center space-y-1.5">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Rate your triage consultation
            </label>
            <div className="flex items-center justify-center gap-1 py-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  className="p-1 focus:outline-none cursor-pointer"
                >
                  <StarIcon
                    className={`w-6 h-6 transition-colors ${
                      (hoverRating || rating) >= star
                        ? 'fill-amber-400 text-amber-400'
                        : 'fill-slate-100 text-slate-300'
                    }`}
                  />
                </button>
              ))}
            </div>
            <p className="text-xs font-semibold text-slate-700">
              {getRatingLabel(hoverRating || rating)}
            </p>
          </div>

          {/* Comment */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700">
              Comments & Clinical Feedback
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="What did you like or how can we improve DokitaAI triage accuracy?"
              rows={3}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs sm:text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-700/20 focus:border-teal-700 resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-xl transition-colors disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
            >
              {isSubmitting && <LoaderIcon className="w-3.5 h-3.5 animate-spin" />}
              <span>{isSubmitting ? 'Submitting...' : 'Submit Feedback'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
