import { useState, useMemo, useEffect } from 'react';
import { Ordnance, CustomList } from '../types';
import { recordReview } from '../streak';
import { StreakCelebration } from './Streak';

interface RevisionProps {
  munitions: Ordnance[];
}

const Revision = ({ munitions }: RevisionProps) => {
  const [isConfiguring, setIsConfiguring] = useState(true);
  const [activeTab, setActiveTab] = useState<'categories' | 'custom'>('categories');
  
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedSubCategoryKeys, setSelectedSubCategoryKeys] = useState<string[]>([]);
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
  const [configSearch, setConfigSearch] = useState('');
  const [listName, setListName] = useState('');
  
  const [savedLists, setSavedLists] = useState([] as CustomList[]);
  
  const [sessionQueue, setSessionQueue] = useState([] as Ordnance[]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [randomImgIdx, setRandomImgIdx] = useState(0);
  const [backImgIdx, setBackImgIdx] = useState(0);
  const [celebrate, setCelebrate] = useState<number | null>(null);

  const subCatKey = (category: string, subCategory: string) => `${category}::${subCategory}`;

  const dynamicCategories = useMemo(() => {
    return Array.from(new Set(munitions.map(m => m.category))).sort();
  }, [munitions]);

  const availableSubCategories = useMemo(() => {
    if (selectedCategories.length === 0) return [];
    const keys = new Set<string>();
    for (const m of munitions) {
      if (!selectedCategories.includes(m.category)) continue;
      if (!m.subCategory) continue;
      keys.add(subCatKey(m.category, m.subCategory));
    }
    return Array.from(keys).sort((a, b) => a.localeCompare(b, 'fr'));
  }, [munitions, selectedCategories]);

  useEffect(() => {
    const stored = localStorage.getItem('eod_custom_lists');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        const normalized: CustomList[] = Array.isArray(parsed)
          ? parsed.map((l: any) => ({
              ...l,
              itemIds: Array.isArray(l?.itemIds) ? l.itemIds : [],
              categoryNames: Array.isArray(l?.categoryNames) ? l.categoryNames : [],
              subCategoryKeys: Array.isArray(l?.subCategoryKeys) ? l.subCategoryKeys : [],
            }))
          : [];
        setSavedLists(normalized);
      } catch (e) {
        console.error("Erreur chargement listes", e);
      }
    }
  }, []);

  // Sélectionne une image au hasard pour la munition en cours
  useEffect(() => {
    if (sessionQueue.length > 0 && sessionQueue[currentIndex]) {
      const activeItem = sessionQueue[currentIndex];
      if (activeItem.imageUrls && activeItem.imageUrls.length > 0) {
        setRandomImgIdx(Math.floor(Math.random() * activeItem.imageUrls.length));
      } else {
        setRandomImgIdx(0);
      }
    }
  }, [currentIndex, sessionQueue]);

  useEffect(() => {
    setBackImgIdx(randomImgIdx);
  }, [randomImgIdx, currentIndex, sessionQueue]);

  const saveListsToStorage = (lists: CustomList[]) => {
    localStorage.setItem('eod_custom_lists', JSON.stringify(lists));
    setSavedLists(lists);
  };

  const searchResults = useMemo(() => {
    if (!configSearch.trim()) return [];
    const lower = configSearch.toLowerCase();
    return munitions.filter(m => 
      m.name.toLowerCase().includes(lower) || 
      m.localName?.toLowerCase().includes(lower) ||
      m.tags.some(t => t.toLowerCase().includes(lower))
    ).slice(0, 8);
  }, [configSearch, munitions]);

  const toggleCategory = (cat: string) => {
    setSelectedCategories(prev => {
      const next = prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat];
      setSelectedSubCategoryKeys(subPrev =>
        subPrev.filter(k => {
          const [kCat] = k.split('::');
          return next.includes(kCat);
        })
      );
      return next;
    });
  };

  const toggleSubCategoryKey = (key: string) => {
    setSelectedSubCategoryKeys(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const toggleItemId = (id: string) => {
    setSelectedItemIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const saveCurrentList = () => {
    if (!listName.trim()) return alert("Veuillez donner un nom à votre liste.");
    if (selectedCategories.length === 0 && selectedSubCategoryKeys.length === 0 && selectedItemIds.length === 0) {
      return alert("Sélection vide.");
    }

    const newList: CustomList = {
      id: Date.now().toString(),
      name: listName,
      itemIds: selectedItemIds,
      categoryNames: selectedCategories,
      subCategoryKeys: selectedSubCategoryKeys,
      createdAt: new Date().toISOString()
    };

    saveListsToStorage([newList, ...savedLists]);
    setListName('');
    alert("Pack tactique enregistré.");
  };

  const deleteList = (id: string) => {
    saveListsToStorage(savedLists.filter(l => l.id !== id));
  };

  const startSession = (list?: CustomList) => {
    let filtered: Ordnance[] = [];
    
    if (list) {
      const catItems = munitions.filter(m => list.categoryNames.includes(m.category));
      const subCatItems = munitions.filter(m => list.subCategoryKeys.includes(subCatKey(m.category, m.subCategory)));
      const specificItems = munitions.filter(m => list.itemIds.includes(m.id));
      const combined = [...catItems, ...subCatItems, ...specificItems];
      filtered = Array.from(new Map(combined.map(item => [item.id, item])).values());
    } else {
      const catItems = munitions.filter(m => selectedCategories.includes(m.category));
      const subCatItems = munitions.filter(m => selectedSubCategoryKeys.includes(subCatKey(m.category, m.subCategory)));
      const specificItems = munitions.filter(m => selectedItemIds.includes(m.id));
      const combined = [...catItems, ...subCatItems, ...specificItems];
      filtered = Array.from(new Map(combined.map(item => [item.id, item])).values());
    }

    if (filtered.length === 0) return alert("Sélection vide.");
    
    setSessionQueue([...filtered].sort(() => Math.random() - 0.5));
    setCurrentIndex(0);
    setIsConfiguring(false);
    setIsFlipped(false);
    setIsTransitioning(false);
  };

  /**
   * FIX: Empêche de voir le nom avant l'image en attendant que la carte
   * ait fini de pivoter vers le recto avant de changer les données.
   */
  const handleRating = async (rating: 'easy' | 'hard') => {
    if (isTransitioning) return;
    const activeId = sessionQueue[currentIndex]?.id;
    if (!activeId) return;
    setIsTransitioning(true);

    // Série quotidienne : chaque carte notée compte
    const { state, justValidated } = recordReview();
    if (justValidated) setCelebrate(state.current);

    // 1. On retourne la carte vers le recto (image)
    setIsFlipped(false);

    // 2. On attend la fin physique de l'animation de pivotement (350ms)
    await new Promise(resolve => setTimeout(resolve, 350));

    // 3. Progression: si échec, on remet la carte plus tard jusqu'à réussite
    if (rating === 'hard') {
      setSessionQueue(prev => {
        const idx = prev.findIndex(i => i.id === activeId);
        if (idx === -1) return prev;
        const item = prev[idx];
        const next = [...prev.slice(0, idx), ...prev.slice(idx + 1), item];
        return next;
      });
      // On garde le même index: la prochaine carte "glisse" à cette position.
    } else {
      if (currentIndex < sessionQueue.length - 1) {
        setCurrentIndex(prev => prev + 1);
      } else {
        alert("Cycle de révision terminé.");
        setIsConfiguring(true);
      }
    }
    
    setIsTransitioning(false);
  };

  if (isConfiguring) {
    return (
      <div className="max-w-4xl mx-auto py-12 space-y-10 animate-in">
        {celebrate !== null && <StreakCelebration days={celebrate} onClose={() => setCelebrate(null)} />}
        <div>
          <h2 className="text-5xl font-black text-stone-100 tracking-tighter uppercase mb-2">Centre de Drill</h2>
          <p className="text-stone-500 font-medium">Configurez votre protocole d'identification.</p>
        </div>

        <div className="flex gap-4 border-b border-stone-800 pb-px">
          <button 
            onClick={() => setActiveTab('categories')}
            className={`pb-4 px-2 text-[10px] font-black uppercase tracking-widest transition-all relative ${activeTab === 'categories' ? 'text-orange-500' : 'text-stone-600 hover:text-stone-400'}`}
          >
            Libre
            {activeTab === 'categories' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-orange-600 rounded-full" />}
          </button>
          <button 
            onClick={() => setActiveTab('custom')}
            className={`pb-4 px-2 text-[10px] font-black uppercase tracking-widest transition-all relative ${activeTab === 'custom' ? 'text-orange-500' : 'text-stone-600 hover:text-stone-400'}`}
          >
            Packs ({savedLists.length})
            {activeTab === 'custom' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-orange-600 rounded-full" />}
          </button>
        </div>
        
        {activeTab === 'categories' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
            <div className="lg:col-span-2 space-y-8">
              <section className="space-y-4">
                <h3 className="text-stone-400 text-[10px] font-black uppercase tracking-widest flex items-center gap-2">Catégories MunDB</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {dynamicCategories.map(cat => (
                    <button
                      key={cat}
                      onClick={() => toggleCategory(cat)}
                      className={`px-5 py-4 rounded-2xl border text-left transition-all flex items-center justify-between group ${
                        selectedCategories.includes(cat) 
                        ? 'bg-orange-600 border-orange-500 text-white shadow-xl' 
                        : 'bg-stone-900 border-stone-800 text-stone-300 hover:border-stone-700'
                      }`}
                    >
                      <span className="text-[10px] font-black uppercase tracking-widest">{cat}</span>
                    </button>
                  ))}
                </div>
              </section>

              <section className="space-y-4">
                <h3 className="text-stone-400 text-[10px] font-black uppercase tracking-widest flex items-center gap-2">Sous-catégories</h3>
                {selectedCategories.length === 0 ? (
                  <div className="text-[10px] text-stone-600 font-bold uppercase tracking-widest bg-stone-900 border border-stone-800 rounded-2xl p-5">
                    Sélectionnez d’abord une catégorie pour afficher ses sous-catégories.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {availableSubCategories.map(key => {
                      const [, sub] = key.split('::');
                      const active = selectedSubCategoryKeys.includes(key);
                      return (
                        <button
                          key={key}
                          onClick={() => toggleSubCategoryKey(key)}
                          className={`px-5 py-4 rounded-2xl border text-left transition-all flex items-center justify-between group ${
                            active
                              ? 'bg-orange-600 border-orange-500 text-white shadow-xl'
                              : 'bg-stone-900 border-stone-800 text-stone-300 hover:border-stone-700'
                          }`}
                          title={key}
                        >
                          <span className="text-[10px] font-black uppercase tracking-widest">{sub}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </section>

              <section className="space-y-4">
                <h3 className="text-stone-400 text-[10px] font-black uppercase tracking-widest">Recherche spécifique</h3>
                <input 
                  type="text"
                  placeholder="Rechercher par nom..."
                  value={configSearch}
                  onChange={(e) => setConfigSearch(e.target.value)}
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-5 py-4 text-sm focus:ring-1 focus:ring-orange-600/50 outline-none text-stone-200"
                />
                
                {searchResults.length > 0 && (
                  <div className="bg-stone-900 border border-stone-800 rounded-xl overflow-hidden divide-y divide-stone-800">
                    {searchResults.map(m => (
                      <div 
                        key={m.id}
                        onClick={() => { toggleItemId(m.id); setConfigSearch(''); }}
                        className="px-4 py-3 flex justify-between items-center cursor-pointer hover:bg-stone-800"
                      >
                        <div className="text-xs font-black uppercase text-stone-300">{m.name}</div>
                        <div className={`w-5 h-5 rounded flex items-center justify-center border ${selectedItemIds.includes(m.id) ? 'bg-orange-600 border-orange-500' : 'border-stone-700'}`}>
                           {selectedItemIds.includes(m.id) && <svg viewBox="0 0 24 24" className="w-3 h-3 text-white" fill="none" stroke="currentColor" strokeWidth="4"><path d="M20 6 9 17l-5-5"/></svg>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>

            <div className="bg-stone-900 border border-stone-800 rounded-[2.5rem] p-8 flex flex-col justify-between space-y-8 shadow-2xl h-fit sticky top-24">
              <div className="space-y-6">
                <h3 className="text-stone-400 text-[10px] font-black uppercase tracking-widest text-center">Sauvegarder ce Pack</h3>
                <input 
                  type="text"
                  placeholder="Nom de la liste..."
                  value={listName}
                  onChange={(e) => setListName(e.target.value)}
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-4 py-4 text-center text-sm focus:ring-1 focus:ring-orange-600/50 outline-none text-stone-200"
                />
                <button 
                  onClick={saveCurrentList}
                  className="w-full py-4 border border-stone-800 text-stone-500 hover:text-orange-500 hover:border-orange-500/50 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                >
                  Mémoriser
                </button>
              </div>

              <div className="pt-8 border-t border-stone-800 text-center space-y-4">
                <button 
                  onClick={() => startSession()}
                  disabled={selectedCategories.length === 0 && selectedSubCategoryKeys.length === 0 && selectedItemIds.length === 0}
                  className="w-full py-6 bg-orange-600 hover:bg-orange-500 text-white font-black rounded-2xl shadow-xl transition-all disabled:opacity-20 uppercase tracking-[0.2em] text-[11px]"
                >
                  Lancer le Drill
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'custom' && (
           <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in">
             {savedLists.length === 0 ? (
               <div className="md:col-span-2 py-32 text-center text-stone-700 uppercase font-black tracking-widest border-2 border-dashed border-stone-800 rounded-[3rem]">
                 Aucun pack mémorisé
               </div>
             ) : (
               savedLists.map(list => (
                 <div key={list.id} className="bg-stone-900 border border-stone-800 rounded-[2.5rem] p-8 hover:border-orange-600/40 transition-all flex flex-col shadow-2xl group">
                    <div className="flex justify-between items-center mb-6">
                       <h3 className="text-2xl font-black text-white tracking-tighter">{list.name}</h3>
                       <button onClick={() => deleteList(list.id)} className="text-stone-800 hover:text-red-500 transition-colors">
                         <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                       </button>
                    </div>
                    <div className="flex-1 flex flex-wrap gap-2 mb-8">
                       {list.categoryNames.map(c => <span key={c} className="text-[8px] font-black text-stone-500 uppercase px-3 py-1 bg-stone-950 rounded-full border border-stone-800">{c}</span>)}
                      {list.subCategoryKeys?.length > 0 && (
                        <span className="text-[8px] font-black text-stone-400 uppercase px-3 py-1 bg-stone-950 rounded-full border border-stone-800">
                          {list.subCategoryKeys.length} SOUS-CAT
                        </span>
                      )}
                       {list.itemIds.length > 0 && <span className="text-[8px] font-black text-orange-600 uppercase px-3 py-1 bg-orange-600/5 rounded-full border border-orange-600/10">{list.itemIds.length} ITEMS</span>}
                    </div>
                    <button 
                      onClick={() => startSession(list)}
                      className="w-full py-4 bg-stone-950 text-stone-300 hover:bg-orange-600 hover:text-white font-black text-[10px] uppercase tracking-widest rounded-xl border border-stone-800 transition-all"
                    >
                      Activer le Drill
                    </button>
                 </div>
               ))
             )}
           </div>
        )}
      </div>
    );
  }

  const activeItem = sessionQueue[currentIndex];
  const backImages = activeItem?.imageUrls || [];
  const backHasImages = backImages.length > 0;
  const safeBackImgIdx = backHasImages ? Math.min(backImgIdx, backImages.length - 1) : 0;

  const nextBackImg = (e: { stopPropagation: () => void }) => {
    e.stopPropagation();
    if (!backHasImages) return;
    setBackImgIdx(prev => (prev + 1) % backImages.length);
  };

  const prevBackImg = (e: { stopPropagation: () => void }) => {
    e.stopPropagation();
    if (!backHasImages) return;
    setBackImgIdx(prev => (prev - 1 + backImages.length) % backImages.length);
  };

  return (
    <div className="max-w-2xl mx-auto py-8 sm:py-12 flex flex-col min-h-[600px] animate-in">
      {celebrate !== null && <StreakCelebration days={celebrate} onClose={() => setCelebrate(null)} />}
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-3">
           <div className="w-2 h-2 bg-orange-600 rounded-full animate-pulse"></div>
           <span className="text-[9px] sm:text-[10px] font-black text-stone-600 uppercase tracking-[0.3em] font-mono">
             SESSION_DRIVE // {currentIndex + 1} / {sessionQueue.length}
           </span>
        </div>
        <button onClick={() => setIsConfiguring(true)} className="text-[9px] sm:text-[10px] font-black text-stone-500 hover:text-orange-500 uppercase tracking-widest border border-stone-800 px-4 py-2 rounded-xl transition-all">Quitter</button>
      </div>

      <div className="relative flex-1 perspective-2000">
        <div 
          onClick={() => !isFlipped && !isTransitioning && setIsFlipped(true)}
          className={`relative w-full h-[520px] sm:h-[580px] transition-all duration-500 preserve-3d cursor-pointer ${isFlipped ? 'rotate-y-180' : ''}`}
        >
          {/* RECTO : IMAGE SEULEMENT (SCANNER MODE) */}
          <div className="absolute inset-0 backface-hidden bg-stone-900 border-2 border-stone-800 rounded-[3rem] sm:rounded-[3.5rem] p-6 sm:p-8 flex flex-col items-center justify-between shadow-2xl overflow-hidden">
            {/* Effet Scanner Overlay */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-orange-500/20 shadow-[0_0_15px_rgba(234,88,12,0.5)] animate-scan z-10 pointer-events-none"></div>
            
            <div className="w-full flex-1 bg-black rounded-[2rem] sm:rounded-[2.5rem] flex items-center justify-center border border-stone-800 overflow-hidden relative group">
               {activeItem.imageUrls && activeItem.imageUrls.length > 0 ? (
                 <img src={activeItem.imageUrls[randomImgIdx]} className="w-full h-full object-contain p-4 transition-all duration-700" />
               ) : (
                 <svg viewBox="0 0 24 24" className="w-24 h-24 text-stone-800" fill="none" stroke="currentColor" strokeWidth="1"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
               )}
               <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center pb-8">
                  <span className="text-[9px] font-black text-white uppercase tracking-[0.4em]">Cliquer pour Débloquer l'ID</span>
               </div>
            </div>
            <div className="text-center py-6 shrink-0">
              <span className="text-[9px] font-black text-orange-600 uppercase tracking-[0.5em] mb-2 block animate-pulse">Scanning Visual Profile</span>
              <h3 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-tighter">ANALYSE TACTIQUE</h3>
            </div>
          </div>

          {/* VERSO : RÉVÉLATION TECHNIQUE */}
          <div className="absolute inset-0 backface-hidden bg-stone-900 border-2 border-orange-600/30 rounded-[3rem] sm:rounded-[3.5rem] p-8 sm:p-12 rotate-y-180 flex flex-col shadow-2xl overflow-hidden">
            <div className="mb-6 pb-6 border-b border-stone-800">
              <span className="text-[9px] sm:text-[10px] font-black text-orange-500 uppercase tracking-widest mb-2 block">{activeItem.category} / {activeItem.subCategory}</span>
              <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tighter leading-none mb-1">{activeItem.name}</h2>
              <p className="text-xl sm:text-2xl text-stone-600 font-bold italic uppercase tracking-tighter">{activeItem.localName}</p>
            </div>
            
            <div className="flex-1 overflow-y-auto space-y-6 sm:space-y-8 pr-2 custom-scrollbar">
               {/* Galerie: apprendre l'apparence (toutes les photos) */}
               <div className="bg-stone-950/40 border border-stone-800 rounded-2xl overflow-hidden">
                 <div className="relative aspect-video bg-black flex items-center justify-center">
                   {backHasImages ? (
                     <img
                       src={backImages[safeBackImgIdx]}
                       className="w-full h-full object-contain p-4"
                     />
                   ) : (
                     <svg viewBox="0 0 24 24" className="w-16 h-16 text-stone-800" fill="none" stroke="currentColor" strokeWidth="1">
                       <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                     </svg>
                   )}

                   {backImages.length > 1 && (
                     <>
                       <button
                         onClick={prevBackImg}
                         className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-stone-900/80 border border-stone-800 hover:bg-orange-600 rounded-full flex items-center justify-center text-white transition-all shadow-2xl backdrop-blur-md"
                         title="Photo précédente"
                       >
                         <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="3">
                           <path d="M15 18l-6-6 6-6" />
                         </svg>
                       </button>
                       <button
                         onClick={nextBackImg}
                         className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-stone-900/80 border border-stone-800 hover:bg-orange-600 rounded-full flex items-center justify-center text-white transition-all shadow-2xl backdrop-blur-md"
                         title="Photo suivante"
                       >
                         <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="3">
                           <path d="M9 18l6-6-6-6" />
                         </svg>
                       </button>
                       <div className="absolute bottom-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-black/60 border border-stone-800 text-[9px] font-black uppercase tracking-widest text-stone-200">
                         {safeBackImgIdx + 1}/{backImages.length}
                       </div>
                     </>
                   )}
                 </div>

                 {backImages.length > 1 && (
                   <div className="p-3 border-t border-stone-800 flex gap-2 overflow-x-auto">
                     {backImages.map((url, i) => (
                       <button
                         key={`${url}-${i}`}
                         onClick={(e) => {
                           e.stopPropagation();
                           setBackImgIdx(i);
                         }}
                         className={`w-16 h-12 rounded-lg border overflow-hidden shrink-0 transition-all ${
                           i === safeBackImgIdx ? 'border-orange-600' : 'border-stone-800 hover:border-stone-700'
                         }`}
                         title={`Photo ${i + 1}`}
                       >
                         <img src={url} className="w-full h-full object-cover" />
                       </button>
                     ))}
                   </div>
                 )}
               </div>

               <div className="bg-stone-950/60 p-5 sm:p-6 rounded-2xl border border-stone-800 text-stone-300 italic text-sm sm:text-base leading-relaxed">
                 "{activeItem.description}"
               </div>
               
               <div className="grid grid-cols-2 gap-4 sm:gap-6">
                  <div className="space-y-1">
                    <label className="text-[8px] font-black text-stone-700 uppercase tracking-widest">Pays</label>
                    <p className="text-stone-200 font-bold text-sm sm:text-base">{activeItem.country || 'N/A'}</p>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[8px] font-black text-stone-700 uppercase tracking-widest">Charge</label>
                    <p className="text-stone-200 font-bold text-sm sm:text-base">{activeItem.fill || 'N/A'}</p>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[8px] font-black text-stone-700 uppercase tracking-widest">Masse</label>
                    <p className="text-stone-200 font-bold text-sm sm:text-base">{activeItem.weight || 'N/A'}</p>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[8px] font-black text-stone-700 uppercase tracking-widest">Allumeur</label>
                    <p className="text-stone-200 font-bold text-sm sm:text-base">{activeItem.fuze || 'N/A'}</p>
                  </div>
               </div>

               {activeItem.warning && (
                 <div className="p-5 bg-red-950/20 border border-red-900/40 rounded-xl flex gap-4 items-center">
                    <div className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center shrink-0">
                       <svg viewBox="0 0 24 24" className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth="3"><path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
                    </div>
                    <p className="text-[9px] font-black text-red-500 uppercase leading-tight">{activeItem.warning}</p>
                 </div>
               )}
            </div>
          </div>
        </div>
      </div>

      <div className={`grid grid-cols-2 gap-4 mt-8 transition-all duration-500 ${isFlipped && !isTransitioning ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 pointer-events-none translate-y-8 scale-95'}`}>
        <button 
          onClick={() => handleRating('hard')} 
          disabled={isTransitioning}
          className="group py-5 sm:py-6 bg-stone-950 border border-stone-800 hover:border-red-600/50 hover:bg-red-950/20 rounded-2xl transition-all shadow-xl active:scale-95"
        >
          <span className="text-stone-600 group-hover:text-red-500 font-black uppercase text-[10px] sm:text-[11px] tracking-[0.3em]">Échec Identification</span>
        </button>
        <button 
          onClick={() => handleRating('easy')} 
          disabled={isTransitioning}
          className="group py-5 sm:py-6 bg-white text-black font-black rounded-2xl transition-all shadow-xl hover:bg-orange-600 hover:text-white uppercase text-[10px] sm:text-[11px] tracking-[0.3em] active:scale-95"
        >
          Rapport Correct
        </button>
      </div>

      <style>{`
        .perspective-2000 { perspective: 2000px; }
        .preserve-3d { transform-style: preserve-3d; }
        .backface-hidden { backface-visibility: hidden; -webkit-backface-visibility: hidden; }
        .rotate-y-180 { transform: rotateY(180deg); }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #292524; border-radius: 10px; }
        @keyframes scan {
          0% { top: 0%; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { top: 100%; opacity: 0; }
        }
        .animate-scan { animation: scan 3s linear infinite; }
      `}</style>
    </div>
  );
};

export default Revision;