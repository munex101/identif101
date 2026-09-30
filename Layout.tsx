
import React from 'react';
import { AppView } from '../types';
import { StreakBadge } from './Streak';

interface LayoutProps {
  children: React.ReactNode;
  activeView: AppView;
  setView: (view: AppView) => void;
}

const Layout: React.FC<LayoutProps> = ({ children, activeView, setView }) => {
  return (
    <div className="min-h-screen flex flex-col bg-stone-950">
      <header className="sticky top-0 z-[60] bg-stone-900/90 backdrop-blur-xl border-b border-stone-800 px-4 py-3 flex items-center justify-between shadow-2xl">
        <div 
          className="flex items-center gap-3 cursor-pointer group"
          onClick={() => setView('home')}
        >
          <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-orange-700 flex items-center justify-center rounded-xl shadow-lg group-hover:scale-105 transition-all">
            <svg viewBox="0 0 24 24" className="w-6 h-6 text-white" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              <path d="M12 8v4" /><path d="M12 16h.01" />
            </svg>
          </div>
          <div className="hidden sm:block">
            <h1 className="text-xl font-black tracking-tighter text-stone-100 uppercase leading-none">IDENTIF 101</h1>
            <p className="text-[9px] text-orange-500 font-black tracking-widest uppercase">MUN DATABASE</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
        <StreakBadge onClick={() => setView('home')} />
        <nav className="flex gap-1 bg-stone-950/50 p-1 rounded-2xl border border-stone-800 shadow-inner">
          <NavButton 
            active={activeView === 'home'} 
            onClick={() => setView('home')} 
            label="Accueil" 
            icon={<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />}
          />
          <NavButton 
            active={activeView === 'catalogue'} 
            onClick={() => setView('catalogue')} 
            label="Catalogue" 
            icon={<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20M4 4.5A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5v-15z" />}
          />
          <NavButton 
            active={activeView === 'revision'} 
            onClick={() => setView('revision')} 
            label="Révision" 
            icon={<path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />}
          />
        </nav>
        </div>
      </header>

      <main className="flex-1 w-full max-w-7xl mx-auto px-4 py-8">
        {children}
      </main>

      <footer className="py-8 border-t border-stone-900 bg-stone-950/50 text-center space-y-2">
        <p className="text-[10px] text-stone-600 font-bold uppercase tracking-[0.3em]">Source Technique : GICHD Ukraine 2025</p>
        <div className="flex justify-center gap-4 text-[9px] text-stone-700 font-medium">
           <span>USAGE HUMANITAIRE UNIQUEMENT</span>
           <span>•</span>
           <span>SÉCURITÉ AVANT TOUT</span>
        </div>
      </footer>
    </div>
  );
};

interface NavBtnProps {
  active: boolean;
  onClick: () => void;
  label: string;
  icon: React.ReactNode;
}

const NavButton: React.FC<NavBtnProps> = ({ active, onClick, label, icon }) => (
  <button 
    onClick={onClick}
    className={`flex items-center gap-2 px-3 py-2 sm:px-5 sm:py-2.5 rounded-xl transition-all duration-300 ${
      active 
      ? 'bg-stone-800 text-orange-500 shadow-xl ring-1 ring-white/5 font-black' 
      : 'text-stone-500 hover:text-stone-300 hover:bg-stone-900/50'
    }`}
  >
    <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      {icon}
    </svg>
    <span className="text-xs uppercase tracking-wider hidden sm:inline">{label}</span>
  </button>
);

export default Layout;
