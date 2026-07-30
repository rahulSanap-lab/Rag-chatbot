import React, { useEffect, useState } from 'react';
import { dashboardApi } from '../services/api';
import { useChat } from '../context/ChatContext';
import {
  FileText,
  MessageSquare,
  HardDrive,
  UploadCloud,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sparkles,
  ArrowRight,
} from 'lucide-react';

export const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const { setIsUploadModalOpen, setActiveView, createNewChat } = useChat();

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const res = await dashboardApi.getStats();
      setStats(res.data);
    } catch (err) {
      console.error('Failed to load dashboard stats:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 lg:p-8 space-y-6">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 p-6 text-white shadow-xl">
        <div className="relative z-10 space-y-2 max-w-2xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-semibold text-white mb-2">
            <Sparkles className="w-3.5 h-3.5" /> Next-Gen Document Intelligence
          </div>
          <h2 className="text-2xl lg:text-3xl font-extrabold tracking-tight">
            Welcome to RAG AI Dashboard
          </h2>
          <p className="text-indigo-100 text-sm">
            Upload documents, explore semantic vectors, and interact with your knowledge base in real-time.
          </p>
          <div className="pt-3 flex flex-wrap items-center gap-3">
            <button
              onClick={() => setIsUploadModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-white text-indigo-700 font-semibold text-xs shadow-lg hover:bg-indigo-50 transition-transform active:scale-95 flex items-center gap-2"
            >
              <UploadCloud className="w-4 h-4" /> Upload Document
            </button>
            <button
              onClick={createNewChat}
              className="px-4 py-2 rounded-xl bg-indigo-900/40 backdrop-blur-md border border-white/20 text-white font-semibold text-xs hover:bg-indigo-900/60 transition-transform active:scale-95 flex items-center gap-2"
            >
              <MessageSquare className="w-4 h-4" /> Start New Chat <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Decorative ambient elements */}
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none" />
      </div>

      {/* Analytics Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Card 1: Total Documents */}
        <div className="glass-panel p-5 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center justify-between shadow-sm hover:shadow-md transition-shadow">
          <div className="space-y-1">
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Total Documents
            </p>
            <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              {loading ? <Loader2 className="w-6 h-6 animate-spin text-indigo-500" /> : stats?.total_documents || 0}
            </h3>
          </div>
          <div className="w-12 h-12 rounded-xl bg-indigo-100 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
            <FileText className="w-6 h-6" />
          </div>
        </div>

        {/* Card 2: Total Chats */}
        <div className="glass-panel p-5 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center justify-between shadow-sm hover:shadow-md transition-shadow">
          <div className="space-y-1">
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Total Chat Sessions
            </p>
            <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              {loading ? <Loader2 className="w-6 h-6 animate-spin text-purple-500" /> : stats?.total_chats || 0}
            </h3>
          </div>
          <div className="w-12 h-12 rounded-xl bg-purple-100 dark:bg-purple-950/80 text-purple-600 dark:text-purple-400 flex items-center justify-center">
            <MessageSquare className="w-6 h-6" />
          </div>
        </div>

        {/* Card 3: Storage Used */}
        <div className="glass-panel p-5 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center justify-between shadow-sm hover:shadow-md transition-shadow">
          <div className="space-y-1">
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Storage Utilized
            </p>
            <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              {loading ? <Loader2 className="w-6 h-6 animate-spin text-pink-500" /> : stats?.storage_used_formatted || '0 B'}
            </h3>
          </div>
          <div className="w-12 h-12 rounded-xl bg-pink-100 dark:bg-pink-950/80 text-pink-600 dark:text-pink-400 flex items-center justify-center">
            <HardDrive className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Recent Uploaded Documents Table */}
      <div className="glass-panel rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-indigo-500" />
            <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">
              Recent Uploaded Documents
            </h3>
          </div>
          <button
            onClick={() => setIsUploadModalOpen(true)}
            className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
          >
            + Upload New
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100/60 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 font-semibold uppercase">
              <tr>
                <th className="py-3 px-4">Document Name</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Pages</th>
                <th className="py-3 px-4">Size</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Uploaded Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/60 dark:divide-slate-800/60 text-slate-700 dark:text-slate-300">
              {stats?.recent_documents?.map((doc) => (
                <tr key={doc.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                  <td className="py-3 px-4 font-medium flex items-center gap-2">
                    <FileText className="w-4 h-4 text-indigo-500" />
                    <span className="truncate max-w-xs">{doc.filename}</span>
                  </td>
                  <td className="py-3 px-4 uppercase font-mono text-[10px] text-slate-400">
                    {doc.filetype}
                  </td>
                  <td className="py-3 px-4">{doc.page_count || 1}</td>
                  <td className="py-3 px-4">{(doc.filesize / 1024).toFixed(1)} KB</td>
                  <td className="py-3 px-4">
                    {doc.status === 'completed' && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 font-medium text-[10px]">
                        <CheckCircle2 className="w-3 h-3" /> Completed
                      </span>
                    )}
                    {doc.status === 'failed' && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 font-medium text-[10px]">
                        <AlertCircle className="w-3 h-3" /> Failed
                      </span>
                    )}
                    {!['completed', 'failed'].includes(doc.status) && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 font-medium text-[10px]">
                        <Loader2 className="w-3 h-3 animate-spin" /> {doc.status}...
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-slate-400">
                    {new Date(doc.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}

              {(!stats?.recent_documents || stats.recent_documents.length === 0) && (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-slate-400 italic">
                    No documents uploaded yet. Click 'Upload Document' to add files.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
