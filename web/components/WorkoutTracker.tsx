"use client";
// Séries para marcar e contador de descanso, como na página do treino de quinta.
// As marcas ficam só neste aparelho (localStorage), por treino e por dia; nada vai ao banco.
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";

type Ctx = { done: Record<string, true>; toggle: (id: string, restS: number) => void };
const C = createContext<Ctx | null>(null);

export function WorkoutTracker({ storageKey, children }: { storageKey: string; children: ReactNode }) {
  const [done, setDone] = useState<Record<string, true>>({});
  const [left, setLeft] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    try { setDone(JSON.parse(localStorage.getItem(storageKey) || "{}") || {}); } catch { /* sem armazenamento */ }
  }, [storageKey]);
  const persist = (v: Record<string, true>) => { try { localStorage.setItem(storageKey, JSON.stringify(v)); } catch { /* idem */ } };

  const stop = useCallback(() => { if (timer.current) clearInterval(timer.current); timer.current = null; setLeft(0); }, []);
  const start = useCallback((s: number) => {
    if (timer.current) clearInterval(timer.current);
    setLeft(s);
    timer.current = setInterval(() => setLeft((v) => { if (v <= 1) { if (timer.current) clearInterval(timer.current); timer.current = null; return 0; } return v - 1; }), 1000);
  }, []);
  useEffect(() => stop, [stop]);

  const toggle = (id: string, restS: number) => {
    const next = { ...done };
    if (next[id]) delete next[id]; else { next[id] = true; start(restS); }
    setDone(next); persist(next);
  };
  const reset = () => { setDone({}); persist({}); stop(); };
  const m = Math.floor(left / 60), s = left % 60;

  return (
    <C.Provider value={{ done, toggle }}>
      {children}
      <div className="wo-foot"><button className="wo-btn" type="button" onClick={reset}>Zerar séries marcadas</button></div>
      <div className="wo-rest" hidden={left <= 0} aria-live="polite">
        <div><div className="wo-rest-k">Descanso</div><b>{m}:{s < 10 ? "0" : ""}{s}</b></div>
        <div className="wo-rest-b"><button type="button" onClick={() => setLeft((v) => v + 15)}>+15 s</button><button type="button" onClick={stop}>Pular</button></div>
      </div>
    </C.Provider>
  );
}

export function SetButtons({ ex, sets, restS }: { ex: number; sets: number; restS: number }) {
  const ctx = useContext(C);
  if (!ctx) return null;
  return (
    <div className="wo-sets">
      <span>Séries</span>
      {Array.from({ length: sets }, (_, i) => {
        const id = `${ex}-${i + 1}`;
        return (
          <button key={id} type="button" className="wo-set" aria-pressed={!!ctx.done[id]} aria-label={`Série ${i + 1} feita`} onClick={() => ctx.toggle(id, restS)}>
            {i + 1}
          </button>
        );
      })}
    </div>
  );
}
