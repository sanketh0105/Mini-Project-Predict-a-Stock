import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, Send, X, Bot, User, Sparkles, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { chatWithInventoryAgent } from '../services/geminiService';
import { InventoryResult } from '../types';

interface Message {
  role: 'user' | 'model';
  parts: { text: string }[];
}

interface InventoryChatProps {
  inventoryData: InventoryResult[];
}

export const InventoryChat: React.FC<InventoryChatProps> = ({ inventoryData }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    { 
      role: 'model', 
      parts: [{ text: "Hello! I'm your AI Inventory Assistant. I've analyzed your stock levels—how can I help you today?" }] 
    }
  ]);
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage: Message = { role: 'user', parts: [{ text: input }] };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    try {
      const context = JSON.stringify(inventoryData.slice(0, 10)); // Provide some context
      const response = await chatWithInventoryAgent(newMessages, context);
      setMessages(prev => [...prev, { role: 'model', parts: [{ text: response }] }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'model', parts: [{ text: "I'm sorry, I encountered an error processing your request." }] }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Trigger Button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(true)}
        className="fixed bottom-8 right-8 w-14 h-14 vibrant-gradient rounded-full shadow-2xl flex items-center justify-center text-white z-50 group border border-white/20"
      >
        <MessageSquare className="group-hover:rotate-12 transition-transform" />
        <div className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-app-bg rounded-full animate-pulse"></div>
      </motion.button>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            className="fixed bottom-24 right-8 w-[400px] h-[600px] bg-app-card border border-app-border rounded-2xl shadow-2xl z-50 flex flex-col overflow-hidden transition-all duration-300"
          >
            {/* Header */}
            <div className="p-4 bg-app-subtle-bg border-b border-app-border flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 vibrant-gradient rounded-lg flex items-center justify-center">
                  <Bot size={18} className="text-white" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-app-text">Inventory AI</h3>
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>
                    <span className="text-[10px] text-emerald-500 font-bold uppercase tracking-widest">Active</span>
                  </div>
                </div>
              </div>
              <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-app-bg rounded-full text-app-muted">
                <X size={18} />
              </button>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide bg-[radial-gradient(circle_at_bottom_left,rgba(99,102,241,0.03),transparent)]">
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`flex gap-3 max-w-[85%] ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
                    <div className={`w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center ${
                      m.role === 'user' ? 'bg-brand' : 'bg-app-subtle-bg border border-app-border'
                    }`}>
                      {m.role === 'user' ? <User size={14} className="text-white" /> : <Sparkles size={14} className="text-brand" />}
                    </div>
                    <div className={`p-3 rounded-2xl text-sm leading-relaxed ${
                      m.role === 'user' 
                        ? 'bg-brand text-white rounded-tr-none shadow-lg shadow-brand/10' 
                        : 'bg-app-card text-app-text border border-app-border rounded-tl-none shadow-sm'
                    }`}>
                      {m.parts[0].text}
                    </div>
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="flex gap-3 max-w-[85%]">
                    <div className="w-8 h-8 bg-app-subtle-bg border border-app-border rounded-lg flex items-center justify-center">
                      <Loader2 size={14} className="animate-spin text-brand" />
                    </div>
                    <div className="p-3 bg-app-card text-app-muted border border-app-border rounded-2xl rounded-tl-none animate-pulse">
                      Analyzing data...
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Input */}
            <div className="p-4 bg-app-subtle-bg border-t border-app-border">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Ask about your stock levels..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                  className="w-full bg-app-card border border-app-border rounded-xl pl-4 pr-12 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand/50 transition-all placeholder:text-app-muted text-app-text"
                />
                <button
                  onClick={handleSend}
                  className="absolute right-2 top-2 p-2 text-brand hover:text-white hover:bg-brand rounded-lg transition-all"
                >
                  <Send size={18} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
