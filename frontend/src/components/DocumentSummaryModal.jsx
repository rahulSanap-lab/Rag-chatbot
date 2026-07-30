import React, { useEffect, useState } from 'react';
import { useChat } from '../context/ChatContext';
import { documentApi } from '../services/api';
import { FileText, X, Sparkles, Loader2, BookOpen } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export const DocumentSummaryModal = () => {
  const { activeSummaryDoc, setActiveSummaryDoc } = useChat();
  const [summary, setSummary] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (activeSummaryDoc) {
      fetchSummary(activeSummaryDoc.id);
    }
  }, [activeSummaryDoc]);

  const fetchSummary = async (docId) => {
    try {
      setLoading(true);
      const res = await documentApi.getSummary(docId);
      setSummary(res.data.summary);
    } catch (err) {
      setSummary('Failed to load summary for this document.');
    } finally {
      setLoading(false);
    }
  };

  if (!activeSummaryDoc) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-lg glass-panel rounded-3xl p-6 space-y-5 shadow-2xl border border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-slate-100 truncate max-w-xs">
                {activeSummaryDoc.filename}
              </h3>
              <p className="text-xs text-slate-500">AI Document Executive Summary</p>
            </div>
          </div>
          <button
            onClick={() => setActiveSummaryDoc(null)}
            className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1 text-xs">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-3">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
              <p className="text-slate-400 font-medium">Generating executive summary with Gemini...</p>
            </div>
          ) : (
            <div className="prose dark:prose-invert max-w-none leading-relaxed text-slate-800 dark:text-slate-200">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{summary}</ReactMarkdown>
            </div>
          )}
        </div>

        <div className="flex justify-end pt-3 border-t border-slate-200 dark:border-slate-800">
          <button
            onClick={() => setActiveSummaryDoc(null)}
            className="px-5 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-semibold text-xs hover:bg-slate-300 dark:hover:bg-slate-700"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
