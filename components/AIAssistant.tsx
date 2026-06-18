import React, { useState } from 'react';
import { Send, Bot, User, Loader2, Sparkles } from 'lucide-react';
import { FinancialSummary, TrialBalanceRow } from '../types';
import { askFinancialAssistant } from '../services/geminiService';

interface AIAssistantProps {
  summary: FinancialSummary;
  trialBalance: TrialBalanceRow[];
}

interface Message {
  role: 'user' | 'assistant';
  text: string;
}

const AIAssistant: React.FC<AIAssistantProps> = ({ summary, trialBalance }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', text: 'Hello! I can help analyze your financial data or draft journal entries. What would you like to know?' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMsg = input;
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setInput('');
    setIsLoading(true);

    const response = await askFinancialAssistant(userMsg, summary, trialBalance);
    
    setMessages(prev => [...prev, { role: 'assistant', text: response }]);
    setIsLoading(false);
  };

  if (!isOpen) {
    return (
      <button 
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 bg-indigo-600 text-white p-3 rounded-full shadow-lg hover:bg-indigo-700 transition-all z-50 flex items-center gap-2"
      >
        <Sparkles size={18} />
        <span className="font-medium text-sm hidden md:inline">AI Assistant</span>
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 w-80 h-[450px] bg-white rounded-xl shadow-2xl border border-gray-200 z-50 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="bg-indigo-600 p-3 text-white flex justify-between items-center">
         <div className="flex items-center gap-2">
            <Bot size={18} />
            <span className="font-semibold text-sm">Financial AI</span>
         </div>
         <button onClick={() => setIsOpen(false)} className="text-white hover:text-gray-200">
            &times;
         </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-gray-50">
        {messages.map((m, idx) => (
            <div key={idx} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] p-2 rounded-lg text-xs ${
                    m.role === 'user' 
                    ? 'bg-indigo-600 text-white rounded-br-none' 
                    : 'bg-white text-gray-800 border border-gray-200 rounded-bl-none shadow-sm'
                }`}>
                    <div className="whitespace-pre-line">{m.text}</div>
                </div>
            </div>
        ))}
        {isLoading && (
            <div className="flex justify-start">
                <div className="bg-white p-2 rounded-lg border border-gray-200 shadow-sm rounded-bl-none flex items-center gap-2">
                    <Loader2 className="animate-spin text-indigo-600" size={14} />
                    <span className="text-[10px] text-gray-500">Thinking...</span>
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
                placeholder="Ask about your profits..."
                className="flex-1 p-2 border border-gray-300 rounded focus:outline-none focus:border-indigo-500 text-xs"
            />
            <button 
                onClick={handleSend}
                disabled={isLoading}
                className="p-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:bg-gray-300"
            >
                <Send size={14} />
            </button>
         </div>
      </div>
    </div>
  );
};

export default AIAssistant;