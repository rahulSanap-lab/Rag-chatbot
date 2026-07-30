import React, { useState, useRef, useEffect } from 'react';
import { useChat } from '../context/ChatContext';
import { chatApi } from '../services/api';
import {
  Send,
  Square,
  Paperclip,
  Mic,
  MicOff,
  Download,
  Sparkles,
} from 'lucide-react';

export const MessageInput = () => {
  const {
    sendMessage,
    isGenerating,
    stopGeneration,
    setIsUploadModalOpen,
    currentSessionId,
    messages,
  } = useChat();

  const [input, setInput] = useState('');
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef(null);

  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition =
        window.SpeechRecognition || window.webkitSpeechRecognition;
      const recog = new SpeechRecognition();
      recog.continuous = false;
      recog.interimResults = false;
      recog.lang = 'en-US';

      recog.onresult = (e) => {
        const transcript = e.results[0][0].transcript;
        setInput((prev) => (prev ? prev + ' ' + transcript : transcript));
        setIsListening(false);
      };

      recog.onerror = () => setIsListening(false);
      recog.onend = () => setIsListening(false);

      recognitionRef.current = recog;
    }
  }, []);

  const toggleMic = () => {
    if (!recognitionRef.current) {
      alert('Speech recognition is not supported in this browser.');
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  const handleSend = () => {
    if (!input.trim() || isGenerating) return;
    const msg = input;
    setInput('');
    sendMessage(msg);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleExportPDF = () => {
    if (!currentSessionId) return;
    window.open(chatApi.getExportPdfUrl(currentSessionId), '_blank');
  };

  return (
    <div className="p-3 lg:p-4 glass-panel border-t border-slate-200 dark:border-slate-800 flex flex-col gap-2 z-20">
      <div className="relative flex items-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-sm focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500 transition-all p-2">
        {/* Attach Document Trigger */}
        <button
          onClick={() => setIsUploadModalOpen(true)}
          className="p-2 rounded-xl text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title="Attach Document"
        >
          <Paperclip className="w-5 h-5" />
        </button>

        {/* Input Textarea */}
        <textarea
          rows={1}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask anything about your uploaded documents..."
          className="w-full bg-transparent border-none outline-none resize-none px-3 text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 max-h-32 min-h-[2.5rem] py-2"
        />

        {/* Voice Mic Trigger */}
        <button
          onClick={toggleMic}
          className={`p-2 rounded-xl transition-colors ${
            isListening
              ? 'bg-rose-500 text-white animate-pulse'
              : 'text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
          title={isListening ? 'Stop Listening' : 'Voice Input'}
        >
          {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
        </button>

        {/* Export PDF Button */}
        {messages.length > 0 && (
          <button
            onClick={handleExportPDF}
            className="p-2 rounded-xl text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Export Chat as PDF"
          >
            <Download className="w-5 h-5" />
          </button>
        )}

        {/* Send / Stop Generation Button */}
        {isGenerating ? (
          <button
            onClick={stopGeneration}
            className="p-2.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white shadow-md transition-all active:scale-95 ml-1"
            title="Stop Generation"
          >
            <Square className="w-4 h-4 fill-white" />
          </button>
        ) : (
          <button
            onClick={handleSend}
            disabled={!input.trim()}
            className={`p-2.5 rounded-xl text-white shadow-md transition-all active:scale-95 ml-1 ${
              input.trim()
                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-indigo-500/20'
                : 'bg-slate-300 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
            }`}
            title="Send Message"
          >
            <Send className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
        <span className="flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-indigo-500" /> Grounded RAG Generation • Press Enter to send
        </span>
        <span>Supports PDF, DOCX, TXT, MD (Max 25MB)</span>
      </div>
    </div>
  );
};
