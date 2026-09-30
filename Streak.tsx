import React, { useEffect, useState } from 'react';
import { StreakState, loadStreak, STREAK_EVENT, isTodayValidated, lastSevenDays, setGoal } from '../streak';

/** Hook : état de la série, mis à jour en direct. */
export const useStreak = (): StreakState => {
  const [s, setS] = useState<StreakState>(() => loadStreak());
  useEffect(() => {
    const update = () => setS(loadStreak());
    window.addEventListener(STREAK_EVENT, update);
    window.addEventListener('focus', update);
    return () => {
      window.removeEventListener(STREAK_EVENT, update);
      window.removeEventListener('focus', update);
    };
  }, []);
  return s;
};

export const Flame: React.FC<{ lit: boolean; className?: string }> = ({ lit, className = 'w-5 h-5' }) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
    <path
      d="M12 2c.6 3.2-1.2 5-2.8 6.9C7.6 10.8 6 12.6 6 15.2 6 18.9 8.7 22 12 22s6-3 6-6.6c0-2.6-1.2-4.6-2.6-6.1-.3 1.5-1 2.6-2.2 3.1.5-3.5-.2-7.6-1.2-10.4z"
      fill={lit ? '#ea580c' : '#44403c'}
    />
    <path
      d="M12 22c-1.8 0-3.2-1.5-3.2-3.4 0-1.6 1-2.6 2-3.6.6-.6 1.1-1.3 1.2-2.2 1.4 1 3.2 3 3.2 5.6 0 2-1.4 3.6-3.2 3.6z"
      fill={lit ? '#fbbf24' : '#57534e'}
    />
  </svg>
);

/** Petit badge dans l'en-tête. */
export const StreakBadge: React.FC<{ onClick?: () => void }> = ({ onClick }) => {
  const s = useStreak();
  const lit = isTodayValidated(s);
  return (
    <button
      onClick={onClick}
      title={lit ? 'Journée validée' : `${s.todayCount} / ${s.goal} cartes aujourd'hui`}
      className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border transition-all ${
        lit ? 'border-orange-600/40 bg-orange-600/10' : 'border-stone-800 bg-stone-950/50'
      }`}
    >
      <Flame lit={lit} />
      <span className={`text-sm font-black ${lit ? 'text-orange-500' : 'text-stone-500'}`}>{s.current}</span>
    </button>
  );
};

/** Panneau complet pour l'accueil. */
export const StreakPanel: React.FC<{ onStart: () => void }> = ({ onStart }) => {
  const s = useStreak();
  const lit = isTodayValidated(s);
  const pct = Math.min(100, Math.round((s.todayCount / s.goal) * 100));
  const days = lastSevenDays(s);

  return (
    <div className="bg-stone-900 border border-stone-800 rounded-[3rem] p-8 sm:p-10 shadow-2xl">
      <div className="flex items-center gap-6">
        <Flame lit={lit} className={`w-20 h-20 shrink-0 ${lit ? 'drop-shadow-[0_0_24px_rgba(234,88,12,0.5)]' : ''}`} />
        <div>
          <div className="text-6xl font-black text-white tracking-tighter leading-none">
            {s.current} <span className="text-2xl text-stone-500">jour{s.current > 1 ? 's' : ''}</span>
          </div>
          <p className="text-stone-500 font-medium mt-2">
            {lit
              ? 'Journée validée. Reviens demain pour prolonger ta série.'
              : s.current > 0
                ? `Révise ${s.goal - s.todayCount} carte${s.goal - s.todayCount > 1 ? 's' : ''} de plus pour ne pas perdre ta série.`
                : `Révise ${s.goal} cartes pour lancer ta série.`}
          </p>
        </div>
      </div>

      <div className="mt-8">
        <div className="flex justify-between text-sm font-bold text-stone-400 mb-2">
          <span>Aujourd'hui</span>
          <span>{Math.min(s.todayCount, s.goal)} / {s.goal}</span>
        </div>
        <div className="h-3 bg-stone-950 rounded-full overflow-hidden border border-stone-800">
          <div
            className="h-full bg-gradient-to-r from-orange-600 to-amber-400 transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      <div className="mt-8 grid grid-cols-7 gap-2">
        {days.map(d => (
          <div key={d.key} className="flex flex-col items-center gap-2">
            <span className={`text-xs font-bold ${d.isToday ? 'text-stone-200' : 'text-stone-600'}`}>{d.label}</span>
            <div
              className={`w-9 h-9 rounded-full flex items-center justify-center border ${
                d.done ? 'bg-orange-600/15 border-orange-600/50' : 'bg-stone-950 border-stone-800'
              } ${d.isToday ? 'ring-2 ring-stone-600 ring-offset-2 ring-offset-stone-900' : ''}`}
            >
              {d.done && <Flame lit className="w-5 h-5" />}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
        <div className="text-stone-500 text-sm font-medium">
          Record : <span className="text-stone-200 font-black">{s.best} jour{s.best > 1 ? 's' : ''}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-stone-500 text-sm font-medium">Objectif</span>
          {[5, 10, 20, 30].map(g => (
            <button
              key={g}
              onClick={() => setGoal(g)}
              className={`px-3 py-1.5 rounded-lg text-sm font-black border transition-all ${
                s.goal === g ? 'bg-orange-600 border-orange-600 text-white' : 'border-stone-800 text-stone-500 hover:text-stone-300'
              }`}
            >
              {g}
            </button>
          ))}
        </div>
      </div>

      {!lit && (
        <button
          onClick={onStart}
          className="mt-8 w-full py-4 rounded-2xl bg-orange-600 hover:bg-orange-500 text-white font-black text-lg transition-all active:scale-[0.98]"
        >
          Réviser maintenant
        </button>
      )}
    </div>
  );
};

/** Célébration affichée quand la journée vient d'être validée. */
export const StreakCelebration: React.FC<{ days: number; onClose: () => void }> = ({ days, onClose }) => (
  <div className="fixed inset-0 z-[100] bg-stone-950/85 backdrop-blur-md flex items-center justify-center p-6 animate-modal" onClick={onClose}>
    <div className="text-center space-y-6" onClick={e => e.stopPropagation()}>
      <Flame lit className="w-32 h-32 mx-auto drop-shadow-[0_0_40px_rgba(234,88,12,0.6)] animate-bounce" />
      <div className="text-8xl font-black text-white tracking-tighter leading-none">{days}</div>
      <p className="text-2xl font-black text-orange-500">
        {days === 1 ? 'Série lancée !' : `jours d'affilée !`}
      </p>
      <p className="text-stone-400 font-medium">Objectif du jour atteint. Reviens demain.</p>
      <button onClick={onClose} className="px-10 py-4 rounded-2xl bg-orange-600 hover:bg-orange-500 text-white font-black text-lg">
        Continuer
      </button>
    </div>
  </div>
);
