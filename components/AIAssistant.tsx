import React, { useState } from 'react';
import { Send, Bot, User, Loader2, Sparkles, X, Trash2 } from 'lucide-react';
import { FinancialSummary, TrialBalanceRow } from '../types';
import { askFinancialAssistant } from '../services/geminiService';
import { useLanguage } from '../context/LanguageContext';

interface AIAssistantProps {
  summary: FinancialSummary;
  trialBalance: TrialBalanceRow[];
}

interface Message {
  role: 'user' | 'assistant';
  text: string;
}

const AIAssistant: React.FC<AIAssistantProps> = ({ summary, trialBalance }) => {
  const { t, language } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', text: 'Hello! I can help analyze your financial data or draft journal entries. What would you like to know?' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg = input.trim();
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setInput('');
    setIsLoading(true);

    try {
      const promptWithLang = `${userMsg}\n\n[System Instruction: Please respond in ${language} language mode]`;
      const response = await askFinancialAssistant(promptWithLang, summary, trialBalance);
      setMessages(prev => [...prev, { role: 'assistant', text: response }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', text: 'Error analyzing accounting data. Please try again.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClear = () => {
    setMessages([{ role: 'assistant', text: 'Chat cleared. How can I help you?' }]);
  };

  if (!isOpen) {
    return (
      <button 
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 bg-indigo-600 text-white p-3 rounded-full shadow-lg hover:bg-indigo-700 transition-all z-50 flex items-center gap-2 font-bold text-xs"
      >
        <Sparkles size={18} />
        <span className="hidden md:inline">{t('aiAssistant')}</span>
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 w-80 h-[480px] bg-white rounded-xl shadow-2xl border border-gray-200 z-50 flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
      {/* Header */}
      <div className="bg-indigo-600 p-3 text-white flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Bot size={18} />
          <span className="font-semibold text-sm">{t('aiAssistant')}</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleClear} className="text-white hover:text-gray-200 p-1" title={t('clearChat')}>
            <Trash2 size={14} />
          </button>
          <button onClick={() => setIsOpen(false)} className="text-white hover:text-gray-200 text-lg font-bold p-1">
            &times;
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-gray-50">
        {messages.map((m, idx) => (
          <div key={idx} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] p-2.5 rounded-lg text-xs font-medium leading-relaxed ${
              m.role === 'user' 
                ? 'bg-indigo-600 text-white rounded-br-none' 
                : 'bg-white text-gray-800 border border-gray-200 rounded-bl-none shadow-xs'
            }`}>
              <div className="whitespace-pre-line">{m.text}</div>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white p-2 rounded-lg border border-gray-200 shadow-xs rounded-bl-none flex items-center gap-2">
              <Loader2 className="animate-spin text-indigo-600" size={14} />
              <span className="text-[10px] text-gray-500 font-bold">Analyzing...</span>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-2 bg-white border-t border-gray-200">
        <div className="flex items-center gap-2">
          <input 
            type="text" 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder={t('askAiPlaceholder')}
            className="flex-1 p-2 border border-gray-300 rounded-lg focus:outline-none focus:border-indigo-500 text-xs font-medium"
          />
          <button 
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
            className="p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-300 transition-all"
          >
            <Send size={14} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default AIAssistant;