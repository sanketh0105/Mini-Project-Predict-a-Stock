import React, { useState } from 'react';
import { X, Copy, Check, Send, Mail, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface CoPilotModalProps {
  isOpen: boolean;
  onClose: () => void;
  sku: string;
  emailContent: string;
}

export const CoPilotModal: React.FC<CoPilotModalProps> = ({ isOpen, onClose, sku, emailContent }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(emailContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-dark-bg/80 backdrop-blur-md"
        />

        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-2xl bg-app-card rounded-3xl shadow-2xl overflow-hidden border border-app-border"
        >
          <div className="flex items-center justify-between p-8 border-b border-app-border bg-app-subtle-bg/30">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 vibrant-gradient rounded-xl flex items-center justify-center shadow-lg shadow-brand/30">
                <Mail className="text-white" size={24} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-black text-app-text tracking-tight">Procurement Co-Pilot</h3>
                  <Sparkles size={16} className="text-brand" />
                </div>
                <p className="text-xs text-app-muted font-bold tracking-widest uppercase mt-1">Expediting SKU: {sku}</p>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="p-2 hover:bg-app-subtle-bg rounded-full transition-colors text-app-muted hover:text-app-text"
            >
              <X size={24} />
            </button>
          </div>

          <div className="p-8">
            <div className="mb-8">
              <div className="flex justify-between items-center mb-4">
                <label className="text-[10px] font-black text-app-muted uppercase tracking-widest">Intelligent Draft Generation</label>
                <span className="text-[10px] font-bold text-brand px-2 py-0.5 bg-brand/10 border border-brand/20 rounded">GEMINI 4 HYDROGEN</span>
              </div>
              <div className="relative group">
                <textarea 
                  readOnly
                  value={emailContent}
                  className="w-full h-80 p-8 bg-app-bg border border-app-border rounded-2xl text-app-text text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-brand/50 resize-none font-sans shadow-inner scrollbar-hide"
                />
                <button 
                  onClick={handleCopy}
                  className="absolute top-4 right-4 px-3 py-2 bg-app-card border border-app-border rounded-lg shadow-xl hover:border-brand hover:text-brand transition-all flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-app-muted"
                >
                  {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                  {copied ? 'Copied' : 'Copy Draft'}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between gap-8 pt-6 border-t border-app-border">
              <div className="flex flex-col gap-1">
                <p className="text-xs text-app-muted font-medium leading-relaxed">
                  Refine this message with your specific supplier details.
                </p>
                <div className="w-12 h-1 vibrant-gradient rounded-full"></div>
              </div>
              <div className="flex gap-4">
                <button 
                  onClick={onClose}
                  className="px-6 py-3 text-xs font-black text-app-muted hover:text-app-text transition-all uppercase tracking-widest"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleCopy}
                  className="px-8 py-3 bg-brand text-white rounded-xl text-xs font-black hover:bg-brand/90 transition-all flex items-center gap-2 shadow-xl shadow-brand/20 uppercase tracking-widest"
                >
                  <Send size={16} />
                  Authorize & Copy
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
