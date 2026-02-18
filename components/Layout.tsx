
import React, { useState, useEffect } from 'react';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: 'catalog' | 'queue' | 'printers';
  setActiveTab: (tab: 'catalog' | 'queue' | 'printers') => void;
  queueCount: number;
}

export const Layout: React.FC<LayoutProps> = ({ children, activeTab, setActiveTab, queueCount }) => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBtn, setShowInstallBtn] = useState(false);

  useEffect(() => {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallBtn(true);
    });

    window.addEventListener('appinstalled', () => {
      setShowInstallBtn(false);
      setDeferredPrompt(null);
    });
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowInstallBtn(false);
    }
    setDeferredPrompt(null);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      {/* Sidebar Nav */}
      <aside className="w-full md:w-64 bg-white border-b md:border-r border-slate-200 p-6 flex flex-col">
        <div className="flex items-center gap-2 mb-10">
          <div className="flex relative items-end">
             <svg className="w-8 h-8 text-pinelab-dark -mr-3" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2L4.5 14h3.5L3 20h18l-5-6h3.5L12 2z" />
             </svg>
             <svg className="w-6 h-6 text-pinelab-light z-10" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2L4.5 14h3.5L3 20h18l-5-6h3.5L12 2z" />
             </svg>
          </div>
          <div className="ml-1 text-xl font-bold tracking-tight flex">
            <span className="text-pinelab-light">PINE</span>
            <span className="text-pinelab-dark">LAB</span>
          </div>
        </div>

        <nav className="flex-1 space-y-2">
          <button 
            onClick={() => setActiveTab('catalog')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'catalog' ? 'bg-pinelab-bg text-pinelab-dark font-semibold' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 10h16M4 14h16M4 18h16"></path></svg>
            Catálogo
          </button>
          <button 
            onClick={() => setActiveTab('queue')}
            className={`w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'queue' ? 'bg-pinelab-bg text-pinelab-dark font-semibold' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
              Fila de Produção
            </div>
            {queueCount > 0 && (
              <span className="bg-pinelab-dark text-white text-[10px] px-2 py-0.5 rounded-full">{queueCount}</span>
            )}
          </button>
          <button 
            onClick={() => setActiveTab('printers')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'printers' ? 'bg-pinelab-bg text-pinelab-dark font-semibold' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z"></path></svg>
            Impressoras
          </button>
        </nav>

        <div className="mt-auto space-y-4 pt-6 border-t border-slate-100">
          {showInstallBtn && (
            <button 
              onClick={handleInstallClick}
              className="w-full flex items-center gap-3 px-4 py-3 bg-pinelab-dark text-white rounded-xl font-bold shadow-lg shadow-pinelab-dark/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
              Instalar App
            </button>
          )}
          <div className="flex items-center gap-3 px-4 py-2 text-sm text-slate-400">
            <div className="w-2 h-2 rounded-full bg-pinelab-light animate-pulse"></div>
            Pinelab Cloud Active
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-8">
        <div className="max-w-6xl mx-auto h-full">
          {children}
        </div>
      </main>
    </div>
  );
};
