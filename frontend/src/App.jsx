import React from 'react';
import { ThemeProvider } from './context/ThemeContext';
import { ChatProvider, useChat } from './context/ChatContext';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { ChatWindow } from './components/ChatWindow';
import { MessageInput } from './components/MessageInput';
import { DocumentUploadModal } from './components/DocumentUploadModal';
import { SettingsModal } from './components/SettingsModal';
import { DocumentSummaryModal } from './components/DocumentSummaryModal';

const MainAppLayout = () => {
  const { activeView } = useChat();

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 overflow-hidden font-sans">
      <Navbar />

      <div className="flex-1 flex overflow-hidden relative">
        <Sidebar />

        <main className="flex-1 flex flex-col overflow-hidden relative">
          {activeView === 'chat' ? (
            <>
              <ChatWindow />
              <MessageInput />
            </>
          ) : (
            <Dashboard />
          )}
        </main>
      </div>

      <DocumentUploadModal />
      <SettingsModal />
      <DocumentSummaryModal />
    </div>
  );
};

export default function App() {
  return (
    <ThemeProvider>
      <ChatProvider>
        <MainAppLayout />
      </ChatProvider>
    </ThemeProvider>
  );
}
