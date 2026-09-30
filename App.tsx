import React, { useState, useEffect } from 'react';
import Layout from './components/Layout';
import Catalogue from './components/Catalogue';
import Revision from './components/Revision';
import { AppView, Ordnance } from './types';
import { StreakPanel } from './components/Streak';

/**
 * Initialisation du registre MunDB.
 * Charge le data.json central et associe les images situées dans MunDB/[catégorie]/[id]/
 */
const initializeMunDB = (): Ordnance[] => {
  try {
    // Import du JSON central
    // @ts-ignore
    const jsonModules = import.meta.glob('./MunDB/data.json', { eager: true });
    const dataFile = Object.values(jsonModules)[0] as any;
    const rawData = dataFile.default || dataFile;

    // Scan de TOUTES les images dans MunDB
    // @ts-ignore
    const imageModules = import.meta.glob('./MunDB/**/*.{jpg,jpeg,png,webp,svg}', { 
      eager: true, 
      import: 'default', 
      query: '?url' 
    });

    return rawData.map((item: any) => {
      // Pour chaque munition, on cherche les images dont le chemin contient /catégorie/id/
      // On normalise les chemins pour éviter les problèmes de casse ou d'espaces
      const categoryPath = item.category;
      const idPath = item.id;

      const matchedImages = Object.entries(imageModules)
        .filter(([path]) => {
          const lowerPath = path.toLowerCase();
          return lowerPath.includes(`/${categoryPath.toLowerCase()}/`) && 
                 lowerPath.includes(`/${idPath.toLowerCase()}/`);
        })
        .map(([_, url]) => url as string);

      return {
        ...item,
        hierarchy: ['MunDB', item.category, item.subCategory],
        imageUrls: matchedImages.length > 0 ? matchedImages : (item.imageUrls || []),
        tags: item.tags || []
      };
    });
  } catch (error) {
    console.error("Erreur critique d'indexation MunDB :", error);
    return [];
  }
};

const App: React.FC = () => {
  const [activeView, setActiveView] = useState<AppView>('home');
  const [munitions, setMunitions] = useState<Ordnance[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const data = initializeMunDB();
    setMunitions(data);
    const timer = setTimeout(() => setLoading(false), 800);
    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-950 flex items-center justify-center">
        <div className="text-center space-y-8">
          <div className="relative">
             <div className="w-24 h-24 border-4 border-stone-900 rounded-full mx-auto"></div>
             <div className="w-24 h-24 border-t-4 border-orange-600 rounded-full animate-spin absolute top-0 left-1/2 -ml-12 shadow-[0_0_40px_rgba(234,88,12,0.4)]"></div>
          </div>
          <div className="space-y-3">
            <p className="text-stone-100 font-black uppercase text-xs tracking-[0.5em]">Initialisation du Registre Central</p>
            <p className="text-stone-600 font-mono text-[10px] uppercase tracking-widest">Mapping assets MunDB...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Layout activeView={activeView} setView={setActiveView}>
      {activeView === 'home' && (
        <Home 
          setView={setActiveView} 
          stats={{
            total: munitions.length,
            categories: Array.from(new Set(munitions.map(m => m.category))).length,
            lastScan: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
          }}
        />
      )}
      {activeView === 'catalogue' && <Catalogue munitions={munitions} />}
      {activeView === 'revision' && <Revision munitions={munitions} />}
    </Layout>
  );
};

const Home: React.FC<{ setView: (v: AppView) => void, stats: any }> = ({ setView, stats }) => (
  <div className="space-y-16 py-12 animate-in">
    <div className="max-w-4xl">
      <h1 className="text-7xl lg:text-9xl font-black text-stone-100 tracking-tighter mb-8 leading-[0.85]">
        IDENTIF <span className="text-orange-600 italic">101</span><br/>
      </h1>
      <p className="text-2xl text-stone-500 max-w-2xl leading-relaxed font-medium italic">
        "Base de données de munitions et mines pour l'entrainement à l'identification. Toutes les données proviennent de sources ouvertes."
      </p>
    </div>

    <StreakPanel onStart={() => setView('revision')} />

    {stats.total === 0 && (
      <div className="bg-red-600/10 border border-red-600/30 p-10 rounded-[3rem] flex items-start gap-8 shadow-2xl">
        <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center shrink-0">
          <svg viewBox="0 0 24 24" className="w-8 h-8 text-white" fill="none" stroke="currentColor" strokeWidth="3">
            <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
          </svg>
        </div>
        <div className="space-y-2">
          <h4 className="text-red-500 font-black uppercase text-sm tracking-widest">Registre Introuvable</h4>
          <p className="text-stone-500 text-sm font-medium leading-relaxed">
            Le fichier <code className="text-stone-100">MunDB/data.json</code> est absent ou corrompu.
          </p>
        </div>
      </div>
    )}

    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      <ActionCard 
        title="Catalogue" 
        desc={`Explorez les ${stats.total} munitions répertoriées.`}
        onClick={() => setView('catalogue')}
        icon={<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20M4 4.5A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5v-15z" />}
      />
      <ActionCard 
        title="Centre de révisions" 
        desc="Entraînement à l'identification visuelle et technique."
        onClick={() => setView('revision')}
        icon={<path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4" />}
      />
    </div>

    <div className="grid grid-cols-2 md:grid-cols-2 gap-6">
      <StatBox label="Entrées DB" value={stats.total.toString()} />
      <StatBox label="Familles" value={stats.categories.toString()} />
    </div>
  </div>
);

const ActionCard: React.FC<{ title: string, desc: string, icon: any, onClick: () => void }> = ({ title, desc, icon, onClick }) => (
  <div 
    onClick={onClick}
    className="bg-stone-900 border border-stone-800 rounded-[3rem] p-10 hover:border-orange-600/50 transition-all cursor-pointer group shadow-2xl relative overflow-hidden active:scale-[0.98]"
  >
    <div className="w-16 h-16 bg-stone-950 rounded-2xl flex items-center justify-center border border-stone-800 mb-6 group-hover:scale-110 transition-transform">
      <svg viewBox="0 0 24 24" className="w-8 h-8 text-orange-500" fill="none" stroke="currentColor" strokeWidth="2">{icon}</svg>
    </div>
    <h3 className="text-3xl font-black text-white tracking-tighter mb-4">{title}</h3>
    <p className="text-stone-500 font-medium leading-relaxed">{desc}</p>
  </div>
);

const StatBox: React.FC<{ label: string, value: string }> = ({ label, value }) => (
  <div className="bg-stone-950/40 p-8 rounded-[2rem] border border-stone-800/50">
    <div className="text-4xl font-black text-white tracking-tighter mb-1">{value}</div>
    <div className="text-[10px] font-black text-stone-600 uppercase tracking-widest">{label}</div>
  </div>
);

export default App;
