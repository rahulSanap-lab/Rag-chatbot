import React, { useState } from 'react';
import { useChat } from '../context/ChatContext';
import {
  Plus,
  MessageSquare,
  FileText,
  Trash2,
  Edit2,
  Check,
  X,
  Search,
  ChevronLeft,
  ChevronRight,
  FileCode,
  FileSpreadsheet,
  Layers,
  Sparkles,
  Info,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

export const Sidebar = () => {
  const {
    sessions,
    currentSessionId,
    loadSession,
    createNewChat,
    deleteSession,
    renameSession,
    documents,
    selectedDocIds,
    setSelectedDocIds,
    deleteDocument,
    renameDocument,
    setActiveSummaryDoc,
    setIsUploadModalOpen,
  } = useChat();

  const [isCollapsed, setIsCollapsed] = useState(false);
  const [sessionSearch, setSessionSearch] = useState('');
  const [editingSessionId, setEditingSessionId] = useState(null);
  const [editingSessionTitle, setEditingSessionTitle] = useState('');

  const [editingDocId, setEditingDocId] = useState(null);
  const [editingDocName, setEditingDocName] = useState('');

  const filteredSessions = sessions.filter((s) =>
    s.title.toLowerCase().includes(sessionSearch.toLowerCase())
  );

  const handleStartRenameSession = (s, e) => {
    e.stopPropagation();
    setEditingSessionId(s.id);
    setEditingSessionTitle(s.title);
  };

  const handleSaveRenameSession = (id, e) => {
    e.stopPropagation();
    if (editingSessionTitle.trim()) {
      renameSession(id, editingSessionTitle.trim());
    }
    setEditingSessionId(null);
  };

  const handleStartRenameDoc = (doc, e) => {
    e.stopPropagation();
    setEditingDocId(doc.id);
    setEditingDocName(doc.filename);
  };

  const handleSaveRenameDoc = (id, e) => {
    e.stopPropagation();
    if (editingDocName.trim()) {
      renameDocument(id, editingDocName.trim());
    }
    setEditingDocId(null);
  };

  const toggleDocSelection = (docId) => {
    setSelectedDocIds((prev) =>
      prev.includes(docId) ? prev.filter((id) => id !== docId) : [...prev, docId]
    );
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'completed':
        return (
          <span className="flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="w-3 h-3" /> Ready
          </span>
        );
      case 'failed':
        return (
          <span className="flex items-center gap-1 text-[10px] text-rose-500">
            <AlertCircle className="w-3 h-3" /> Failed
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1 text-[10px] text-amber-500 font-medium">
            <Loader2 className="w-3 h-3 animate-spin" /> {status}...
          </span>
        );
    }
  };

  const getFileIcon = (filetype) => {
    const ext = filetype?.toLowerCase();
    if (ext === 'pdf') return <FileText className="w-4 h-4 text-rose-500" />;
    if (['docx', 'doc'].includes(ext))
      return <FileSpreadsheet className="w-4 h-4 text-blue-500" />;
    if (['md', 'markdown'].includes(ext))
      return <FileCode className="w-4 h-4 text-purple-500" />;
    return <FileText className="w-4 h-4 text-slate-400" />;
  };

  if (isCollapsed) {
    return (
      <aside className="w-16 h-[calc(100vh-4rem)] glass-panel border-r border-slate-200 dark:border-slate-800 flex flex-col items-center py-4 gap-4 transition-all duration-300">
        <button
          onClick={() => setIsCollapsed(false)}
          className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
          title="Expand Sidebar"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
        <button
          onClick={createNewChat}
          className="p-3 rounded-xl bg-indigo-600 text-white shadow-md hover:bg-indigo-700 transition-transform active:scale-95"
          title="New Chat"
        >
          <Plus className="w-5 h-5" />
        </button>
      </aside>
    );
  }

  return (
    <aside className="w-80 h-[calc(100vh-4rem)] glass-panel border-r border-slate-200 dark:border-slate-800 flex flex-col transition-all duration-300 z-20">
      {/* Header & New Chat button */}
      <div className="p-4 border-b border-slate-200/80 dark:border-slate-800/80 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Workspace
          </span>
          <button
            onClick={() => setIsCollapsed(true)}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        </div>

        <button
          onClick={createNewChat}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-medium text-sm shadow-md shadow-indigo-500/20 transition-all hover:scale-[1.01] active:scale-[0.99]"
        >
          <Plus className="w-4 h-4" />
          <span>New Chat Session</span>
        </button>
      </div>

      {/* Chat History Section */}
      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3 border-b border-slate-200/80 dark:border-slate-800/80">
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5 text-indigo-500" /> Chat History
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-mono">
              {sessions.length}
            </span>
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search chats..."
              value={sessionSearch}
              onChange={(e) => setSessionSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg glass-input text-slate-800 dark:text-slate-200"
            />
          </div>
        </div>

        <div className="space-y-1">
          {filteredSessions.map((s) => {
            const isActive = s.id === currentSessionId;
            return (
              <div
                key={s.id}
                onClick={() => loadSession(s.id)}
                className={`group relative flex items-center justify-between p-2 rounded-xl text-xs cursor-pointer transition-all ${
                  isActive
                    ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-medium border border-indigo-200 dark:border-indigo-800/80'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                }`}
              >
                <div className="flex items-center gap-2 overflow-hidden flex-1 pr-2">
                  <MessageSquare className="w-3.5 h-3.5 flex-shrink-0 text-slate-400 group-hover:text-indigo-500" />
                  {editingSessionId === s.id ? (
                    <input
                      type="text"
                      value={editingSessionTitle}
                      onChange={(e) => setEditingSessionTitle(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      onKeyDown={(e) => e.key === 'Enter' && handleSaveRenameSession(s.id, e)}
                      className="w-full px-1 py-0.5 text-xs rounded bg-white dark:bg-slate-800 border border-indigo-500 outline-none"
                      autoFocus
                    />
                  ) : (
                    <span className="truncate">{s.title}</span>
                  )}
                </div>

                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {editingSessionId === s.id ? (
                    <button
                      onClick={(e) => handleSaveRenameSession(s.id, e)}
                      className="p-1 hover:text-emerald-500 text-slate-400"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={(e) => handleStartRenameSession(s, e)}
                        className="p-1 hover:text-indigo-500 text-slate-400"
                        title="Rename Chat"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteSession(s.id);
                        }}
                        className="p-1 hover:text-rose-500 text-slate-400"
                        title="Delete Chat"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}

          {filteredSessions.length === 0 && (
            <p className="text-xs text-center py-4 text-slate-400 italic">No chat sessions found</p>
          )}
        </div>
      </div>

      {/* Uploaded Documents Section */}
      <div className="h-64 overflow-y-auto p-3 flex flex-col gap-2">
        <div className="flex items-center justify-between px-1">
          <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-purple-500" /> Documents ({documents.length})
          </span>
          {selectedDocIds.length > 0 && (
            <button
              onClick={() => setSelectedDocIds([])}
              className="text-[10px] text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              Clear filter ({selectedDocIds.length})
            </button>
          )}
        </div>

        <div className="space-y-1">
          {documents.map((doc) => {
            const isSelected = selectedDocIds.includes(doc.id);
            return (
              <div
                key={doc.id}
                className={`group flex items-center justify-between p-2 rounded-xl text-xs border transition-all ${
                  isSelected
                    ? 'bg-purple-50 dark:bg-purple-950/40 border-purple-200 dark:border-purple-800'
                    : 'bg-white/50 dark:bg-slate-900/40 border-slate-200/60 dark:border-slate-800/60 hover:bg-slate-100/80 dark:hover:bg-slate-800/80'
                }`}
              >
                <div className="flex items-center gap-2 overflow-hidden flex-1">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleDocSelection(doc.id)}
                    className="w-3.5 h-3.5 rounded border-slate-300 text-purple-600 focus:ring-purple-500 cursor-pointer"
                    title="Select to filter search context"
                  />
                  {getFileIcon(doc.filetype)}
                  <div className="flex flex-col min-w-0 flex-1">
                    {editingDocId === doc.id ? (
                      <input
                        type="text"
                        value={editingDocName}
                        onChange={(e) => setEditingDocName(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSaveRenameDoc(doc.id, e)}
                        className="w-full px-1 py-0.5 text-xs rounded bg-white dark:bg-slate-800 border border-purple-500 outline-none"
                        autoFocus
                      />
                    ) : (
                      <span className="truncate font-medium text-slate-800 dark:text-slate-200">
                        {doc.filename}
                      </span>
                    )}
                    <div className="flex items-center justify-between text-[10px] text-slate-400">
                      <span>{doc.page_count || 1} pg</span>
                      {getStatusBadge(doc.status)}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-1">
                  <button
                    onClick={() => setActiveSummaryDoc(doc)}
                    className="p-1 hover:text-indigo-500 text-slate-400"
                    title="View Document Summary"
                  >
                    <Info className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={(e) => handleStartRenameDoc(doc, e)}
                    className="p-1 hover:text-purple-500 text-slate-400"
                    title="Rename Document"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => deleteDocument(doc.id)}
                    className="p-1 hover:text-rose-500 text-slate-400"
                    title="Delete Document"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}

          {documents.length === 0 && (
            <div className="text-center py-4 text-slate-400 text-xs flex flex-col items-center gap-2">
              <p>No documents uploaded yet</p>
              <button
                onClick={() => setIsUploadModalOpen(true)}
                className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 font-medium"
              >
                <Plus className="w-3.5 h-3.5" /> Add document
              </button>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};
