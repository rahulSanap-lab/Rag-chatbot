import React, { useEffect, useRef, useState } from 'react';
import { useChat } from '../context/ChatContext';
import { chatApi } from '../services/api';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import {
  Bot,
  User,
  Copy,
  Check,
  RefreshCw,
  Download,
  Volume2,
  VolumeX,
  Sparkles,
  BookOpen,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  HelpCircle,
  FileText,
} from 'lucide-react';

export const ChatWindow = () => {
  const {
    messages,
    isGenerating,
    sendMessage,
    currentSessionId,
    selectedDocIds,
    documents,
  } = useChat();

  const messagesEndRef = useRef(null);
  const [copiedId, setCopiedId] = useState(null);
  const [speakingId, setSpeakingId] = useState(null);
  const [expandedSources, setExpandedSources] = useState({});

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isGenerating]);

  const handleCopy = (text, msgId) => {
    navigator.clipboard.writeText(text);
    setCopiedId(msgId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSpeech = (text, msgId) => {
    if ('speechSynthesis' in window) {
      if (speakingId === msgId) {
        window.speechSynthesis.cancel();
        setSpeakingId(null);
        return;
      }
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.onend = () => setSpeakingId(null);
      utterance.onerror = () => setSpeakingId(null);
      setSpeakingId(msgId);
      window.speechSynthesis.speak(utterance);
    }
  };

  const toggleSourceExpand = (msgId, index) => {
    const key = `${msgId}-${index}`;
    setExpandedSources((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleRegenerate = () => {
    const lastUserMsg = [...messages].reverse().find((m) => m.role === 'user');
    if (lastUserMsg) {
      sendMessage(lastUserMsg.content);
    }
  };

  const selectedDocNames = documents
    .filter((d) => selectedDocIds.includes(d.id))
    .map((d) => d.filename);

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-4rem-4.5rem)] overflow-y-auto p-4 lg:p-6 space-y-6">
      {/* System & Active Context Badge */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-2xl bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-800/80 text-xs text-indigo-800 dark:text-indigo-200">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          <span>
            <b>RAG Mode:</b> Answers strictly grounded in uploaded document context.
          </span>
        </div>

        {selectedDocNames.length > 0 && (
          <div className="flex items-center gap-1 bg-white dark:bg-slate-900 px-2.5 py-1 rounded-lg border border-indigo-200 dark:border-indigo-800 font-mono text-[10px]">
            <FileText className="w-3 h-3 text-purple-500" />
            <span>Scope: {selectedDocNames.join(', ')}</span>
          </div>
        )}
      </div>

      {/* Messages Stream */}
      {messages.map((msg, idx) => {
        const isUser = msg.role === 'user';
        const isSpeaking = speakingId === msg.id;

        return (
          <div
            key={msg.id || idx}
            className={`flex gap-3.5 ${isUser ? 'justify-end' : 'justify-start'}`}
          >
            {!isUser && (
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-md flex-shrink-0 mt-1">
                <Bot className="w-4 h-4" />
              </div>
            )}

            <div
              className={`max-w-3xl space-y-3 rounded-2xl p-4 text-sm transition-all ${
                isUser
                  ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md'
                  : 'glass-panel text-slate-800 dark:text-slate-200'
              }`}
            >
              {/* Message Header Actions */}
              {!isUser && (
                <div className="flex items-center justify-between border-b border-slate-200/60 dark:border-slate-800/60 pb-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-xs text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5" /> AI Assistant
                    </span>
                    {msg.confidence_score !== undefined && msg.confidence_score !== null && (
                      <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300">
                        Confidence: {(msg.confidence_score * 100).toFixed(0)}%
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1 text-slate-400">
                    <button
                      onClick={() => handleCopy(msg.content, msg.id)}
                      className="p-1 hover:text-indigo-500 rounded"
                      title="Copy response"
                    >
                      {copiedId === msg.id ? (
                        <Check className="w-3.5 h-3.5 text-emerald-500" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                    <button
                      onClick={() => handleSpeech(msg.content, msg.id)}
                      className="p-1 hover:text-indigo-500 rounded"
                      title="Read aloud"
                    >
                      {isSpeaking ? (
                        <VolumeX className="w-3.5 h-3.5 text-rose-500" />
                      ) : (
                        <Volume2 className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* Message Content (Markdown & Syntax Highlighting) */}
              <div className="prose dark:prose-invert max-w-none text-sm leading-relaxed">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    code({ node, inline, className, children, ...props }) {
                      const match = /language-(\w+)/.exec(className || '');
                      return !inline && match ? (
                        <SyntaxHighlighter
                          style={oneDark}
                          language={match[1]}
                          PreTag="div"
                          className="rounded-xl my-2 text-xs"
                          {...props}
                        >
                          {String(children).replace(/\n$/, '')}
                        </SyntaxHighlighter>
                      ) : (
                        <code
                          className="bg-slate-200/60 dark:bg-slate-800/60 px-1.5 py-0.5 rounded font-mono text-xs"
                          {...props}
                        >
                          {children}
                        </code>
                      );
                    },
                  }}
                >
                  {msg.content}
                </ReactMarkdown>

                {msg.isStreaming && (
                  <span className="inline-block w-2 h-4 bg-indigo-500 animate-pulse ml-1" />
                )}
              </div>

              {/* Source References & Citations */}
              {!isUser && msg.sources && msg.sources.length > 0 && (
                <div className="pt-3 border-t border-slate-200/60 dark:border-slate-800/60 space-y-2">
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5 text-indigo-500" /> Source References (
                    {msg.sources.length})
                  </p>

                  <div className="space-y-1.5">
                    {msg.sources.map((src, srcIdx) => {
                      const isExpanded = expandedSources[`${msg.id}-${srcIdx}`];
                      return (
                        <div
                          key={srcIdx}
                          className="rounded-xl p-2.5 bg-slate-100/80 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-xs space-y-2"
                        >
                          <div
                            onClick={() => toggleSourceExpand(msg.id, srcIdx)}
                            className="flex items-center justify-between cursor-pointer font-medium text-slate-700 dark:text-slate-300 hover:text-indigo-600"
                          >
                            <div className="flex items-center gap-2">
                              <FileText className="w-3.5 h-3.5 text-purple-500" />
                              <span>{src.document_name}</span>
                              <span className="px-1.5 py-0.5 rounded bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-300 font-mono text-[10px]">
                                Page {src.page_number}
                              </span>
                            </div>
                            {isExpanded ? (
                              <ChevronUp className="w-4 h-4" />
                            ) : (
                              <ChevronDown className="w-4 h-4" />
                            )}
                          </div>

                          {isExpanded && (
                            <div className="space-y-2 pt-2 border-t border-slate-200/40 dark:border-slate-800/40">
                              <p className="text-slate-600 dark:text-slate-400 italic bg-white dark:bg-slate-950 p-2 rounded-lg border border-slate-200/50 dark:border-slate-800/50">
                                "{src.snippet}"
                              </p>

                              {src.exact_paragraph && (
                                <div className="text-[11px] bg-amber-50 dark:bg-amber-950/40 border-l-2 border-amber-500 p-2 rounded text-amber-900 dark:text-amber-200">
                                  <span className="font-bold">Exact Context Match:</span>{' '}
                                  {src.exact_paragraph}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Follow-up Question Suggestions */}
              {!isUser && msg.followup_questions && msg.followup_questions.length > 0 && (
                <div className="pt-2 flex flex-wrap items-center gap-1.5">
                  <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1 mr-1">
                    <HelpCircle className="w-3 h-3" /> Suggested:
                  </span>
                  {msg.followup_questions.map((q, qIdx) => (
                    <button
                      key={qIdx}
                      onClick={() => sendMessage(q)}
                      className="text-xs px-2.5 py-1 rounded-full bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/80 dark:hover:bg-indigo-900/80 text-indigo-600 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/60 transition-all hover:scale-105"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {isUser && (
              <div className="w-8 h-8 rounded-xl bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-300 shadow-md flex-shrink-0 mt-1">
                <User className="w-4 h-4" />
              </div>
            )}
          </div>
        );
      })}

      {/* Typing Indicator */}
      {isGenerating && (
        <div className="flex gap-3 items-center">
          <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-md">
            <Bot className="w-4 h-4 animate-bounce" />
          </div>
          <div className="glass-panel px-4 py-3 rounded-2xl flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-indigo-500 animate-dot-1" />
            <div className="w-2 h-2 rounded-full bg-indigo-500 animate-dot-2" />
            <div className="w-2 h-2 rounded-full bg-indigo-500 animate-dot-3" />
            <span className="text-xs text-slate-400 font-medium ml-2">
              Searching vectors & synthesizing response...
            </span>
          </div>
        </div>
      )}

      {/* Empty State Prompt Suggestions */}
      {messages.length === 0 && (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-8 space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-xl shadow-indigo-500/20">
            <Sparkles className="w-8 h-8 animate-pulse" />
          </div>
          <div className="max-w-md space-y-2">
            <h3 className="text-xl font-extrabold text-slate-900 dark:text-slate-100">
              Ask questions about your documents
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Upload PDF, DOCX, TXT, or Markdown files and get instant, grounded answers with exact source citations.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-lg w-full text-left">
            <div
              onClick={() => sendMessage('Summarize the main points of the uploaded documents.')}
              className="p-3 rounded-xl glass-card cursor-pointer hover:border-indigo-500 transition-all text-xs space-y-1"
            >
              <p className="font-semibold text-indigo-600 dark:text-indigo-400">
                📄 Document Summary
              </p>
              <p className="text-slate-500 dark:text-slate-400">
                "Summarize the main points of the uploaded documents."
              </p>
            </div>
            <div
              onClick={() => sendMessage('What key information is highlighted in page 1?')}
              className="p-3 rounded-xl glass-card cursor-pointer hover:border-indigo-500 transition-all text-xs space-y-1"
            >
              <p className="font-semibold text-purple-600 dark:text-purple-400">
                🔍 Page Level Search
              </p>
              <p className="text-slate-500 dark:text-slate-400">
                "What key information is highlighted in page 1?"
              </p>
            </div>
          </div>
        </div>
      )}

      <div ref={messagesEndRef} />
    </div>
  );
};
