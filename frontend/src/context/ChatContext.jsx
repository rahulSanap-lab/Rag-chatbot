import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { chatApi, documentApi, settingsApi, API_BASE_URL } from '../services/api';

const ChatContext = createContext();

export const ChatProvider = ({ children }) => {
  const [activeView, setActiveView] = useState('chat'); // 'chat' | 'dashboard'
  const [sessions, setSessions] = useState([]);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [selectedDocIds, setSelectedDocIds] = useState([]); // Filter documents
  const [ragSettings, setRagSettings] = useState({
    llm_model: 'llama-3.3-70b-versatile',
    temperature: 0.2,
    max_tokens: 1024,
    top_k: 5,
    chunk_size: 800,
    chunk_overlap: 150,
    embedding_provider: 'sentence-transformers',
  });

  const [isGenerating, setIsGenerating] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [activeSummaryDoc, setActiveSummaryDoc] = useState(null);

  const abortControllerRef = useRef(null);

  // Load initial data
  useEffect(() => {
    fetchSessions();
    fetchDocuments();
    fetchSettings();
  }, []);

  // Polling document processing status if any document is currently processing
  useEffect(() => {
    const isProcessing = documents.some((d) =>
      ['uploading', 'extracting', 'chunking', 'embedding'].includes(d.status)
    );
    if (isProcessing) {
      const interval = setInterval(() => {
        fetchDocuments();
      }, 2500);
      return () => clearInterval(interval);
    }
  }, [documents]);

  const fetchSessions = async () => {
    try {
      const res = await chatApi.listSessions();
      setSessions(res.data);
      if (res.data.length > 0 && !currentSessionId) {
        loadSession(res.data[0].id);
      }
    } catch (err) {
      console.error('Error fetching sessions:', err);
    }
  };

  const fetchDocuments = async () => {
    try {
      const res = await documentApi.list();
      setDocuments(res.data);
    } catch (err) {
      console.error('Error fetching documents:', err);
    }
  };

  const fetchSettings = async () => {
    try {
      const res = await settingsApi.get();
      setRagSettings(res.data);
    } catch (err) {
      console.error('Error fetching settings:', err);
    }
  };

  const createNewChat = async () => {
    try {
      const res = await chatApi.createSession('New Chat');
      setSessions((prev) => [res.data, ...prev]);
      setCurrentSessionId(res.data.id);
      setMessages([]);
      setActiveView('chat');
    } catch (err) {
      console.error('Error creating chat:', err);
    }
  };

  const loadSession = async (sessionId) => {
    try {
      setCurrentSessionId(sessionId);
      const res = await chatApi.getSession(sessionId);
      setMessages(res.data.messages || []);
      setActiveView('chat');
    } catch (err) {
      console.error('Error loading session:', err);
    }
  };

  const deleteSession = async (sessionId) => {
    try {
      await chatApi.deleteSession(sessionId);
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      if (currentSessionId === sessionId) {
        const remaining = sessions.filter((s) => s.id !== sessionId);
        if (remaining.length > 0) {
          loadSession(remaining[0].id);
        } else {
          createNewChat();
        }
      }
    } catch (err) {
      console.error('Error deleting session:', err);
    }
  };

  const renameSession = async (sessionId, newTitle) => {
    try {
      const res = await chatApi.renameSession(sessionId, newTitle);
      setSessions((prev) =>
        prev.map((s) => (s.id === sessionId ? { ...s, title: res.data.title } : s))
      );
    } catch (err) {
      console.error('Error renaming session:', err);
    }
  };

  const sendMessage = async (userPrompt) => {
    if (!userPrompt.trim() || isGenerating) return;

    let targetSessionId = currentSessionId;
    if (!targetSessionId) {
      const res = await chatApi.createSession('New Chat');
      targetSessionId = res.data.id;
      setCurrentSessionId(targetSessionId);
      setSessions((prev) => [res.data, ...prev]);
    }

    const tempUserMsg = {
      id: 'user-' + Date.now(),
      session_id: targetSessionId,
      role: 'user',
      content: userPrompt,
      created_at: new Date().toISOString(),
    };

    const tempAiMsg = {
      id: 'ai-' + Date.now(),
      session_id: targetSessionId,
      role: 'assistant',
      content: '',
      sources: [],
      confidence_score: null,
      created_at: new Date().toISOString(),
      isStreaming: true,
    };

    setMessages((prev) => [...prev, tempUserMsg, tempAiMsg]);
    setIsGenerating(true);

    try {
      // Use Fetch EventSource for SSE streaming
      const response = await fetch(`${API_BASE_URL}/chat/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: targetSessionId,
          message: userPrompt,
          document_ids: selectedDocIds.length > 0 ? selectedDocIds : null,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let streamedContent = '';
      let metaData = {};

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.type === 'meta') {
                metaData = data;
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === tempAiMsg.id
                      ? {
                          ...m,
                          sources: data.sources,
                          confidence_score: data.confidence_score,
                          followup_questions: data.followup_questions,
                        }
                      : m
                  )
                );
              } else if (data.type === 'token') {
                streamedContent += data.content;
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === tempAiMsg.id ? { ...m, content: streamedContent } : m
                  )
                );
              }
            } catch (e) {
              // Ignore parse errors on incomplete frames
            }
          }
        }
      }

      setMessages((prev) =>
        prev.map((m) => (m.id === tempAiMsg.id ? { ...m, isStreaming: false } : m))
      );
      fetchSessions();
    } catch (err) {
      console.error('Streaming error:', err);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === tempAiMsg.id
            ? {
                ...m,
                content:
                  '⚠️ An error occurred while generating response. Please verify backend service and API key.',
                isStreaming: false,
              }
            : m
        )
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const stopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsGenerating(false);
    }
  };

  const deleteDocument = async (docId) => {
    try {
      await documentApi.delete(docId);
      setDocuments((prev) => prev.filter((d) => d.id !== docId));
      setSelectedDocIds((prev) => prev.filter((id) => id !== docId));
    } catch (err) {
      console.error('Error deleting document:', err);
    }
  };

  const renameDocument = async (docId, newName) => {
    try {
      const res = await documentApi.rename(docId, newName);
      setDocuments((prev) =>
        prev.map((d) => (d.id === docId ? { ...d, filename: res.data.filename } : d))
      );
    } catch (err) {
      console.error('Error renaming document:', err);
    }
  };

  return (
    <ChatContext.Provider
      value={{
        activeView,
        setActiveView,
        sessions,
        currentSessionId,
        messages,
        documents,
        selectedDocIds,
        setSelectedDocIds,
        ragSettings,
        setRagSettings,
        isGenerating,
        isUploadModalOpen,
        setIsUploadModalOpen,
        isSettingsModalOpen,
        setIsSettingsModalOpen,
        activeSummaryDoc,
        setActiveSummaryDoc,
        createNewChat,
        loadSession,
        deleteSession,
        renameSession,
        sendMessage,
        stopGeneration,
        deleteDocument,
        renameDocument,
        fetchDocuments,
        fetchSessions,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => useContext(ChatContext);
