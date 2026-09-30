/**
 * Système de série quotidienne (streak) façon Duolingo.
 * Une journée est validée quand l'objectif de cartes révisées est atteint.
 * Données stockées localement dans le navigateur (localStorage).
 */

export interface StreakState {
  current: number;       // série en cours (jours consécutifs validés)
  best: number;          // record
  lastValidated: string; // dernier jour validé (YYYY-MM-DD)
  todayDate: string;     // jour du compteur ci-dessous
  todayCount: number;    // cartes révisées aujourd'hui
  goal: number;          // objectif quotidien
  history: string[];     // jours validés (60 derniers)
}

const KEY = 'identif101_streak';
export const STREAK_EVENT = 'identif101-streak';

export const dayKey = (d: Date = new Date()): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const shift = (days: number): string => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return dayKey(d);
};

const empty = (): StreakState => ({
  current: 0, best: 0, lastValidated: '', todayDate: dayKey(), todayCount: 0, goal: 10, history: []
});

/** Lit l'état et le « normalise » : remet le compteur du jour à 0 si on a changé de jour, casse la série si un jour a été manqué. */
export const loadStreak = (): StreakState => {
  let s: StreakState;
  try {
    const raw = localStorage.getItem(KEY);
    s = raw ? { ...empty(), ...JSON.parse(raw) } : empty();
  } catch {
    s = empty();
  }
  const today = dayKey();
  if (s.todayDate !== today) {
    s.todayDate = today;
    s.todayCount = 0;
  }
  if (s.lastValidated && s.lastValidated !== today && s.lastValidated !== shift(-1)) {
    s.current = 0; // série perdue
  }
  return s;
};

const save = (s: StreakState) => {
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* stockage indisponible */ }
  window.dispatchEvent(new CustomEvent(STREAK_EVENT, { detail: s }));
};

export const isTodayValidated = (s: StreakState) => s.lastValidated === dayKey();

/** À appeler à chaque carte notée. Renvoie true si cette carte vient de valider la journée. */
export const recordReview = (): { state: StreakState; justValidated: boolean } => {
  const s = loadStreak();
  s.todayCount += 1;
  let justValidated = false;
  if (!isTodayValidated(s) && s.todayCount >= s.goal) {
    s.current = s.lastValidated === shift(-1) ? s.current + 1 : 1;
    s.best = Math.max(s.best, s.current);
    s.lastValidated = dayKey();
    s.history = [...s.history.filter(d => d !== s.lastValidated), s.lastValidated].slice(-60);
    justValidated = true;
  }
  save(s);
  return { state: s, justValidated };
};

export const setGoal = (goal: number) => {
  const s = loadStreak();
  s.goal = goal;
  save(s);
};

/** Les 7 derniers jours (du plus ancien à aujourd'hui) avec leur statut. */
export const lastSevenDays = (s: StreakState) => {
  const labels = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const key = dayKey(d);
    return { key, label: labels[d.getDay()], done: s.history.includes(key), isToday: i === 6 };
  });
};
