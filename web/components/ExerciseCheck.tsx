"use client";
import { useEffect, useState } from "react";

/** Marca de exercício feito, guardada só neste aparelho (conveniência na academia; não vai ao banco). */
export default function ExerciseCheck({ id, label }: { id: string; label: string }) {
  const [done, setDone] = useState(false);
  useEffect(() => {
    try { setDone(localStorage.getItem(id) === "1"); } catch { /* sem armazenamento: só não lembra */ }
  }, [id]);
  const toggle = () => {
    const v = !done;
    setDone(v);
    try { v ? localStorage.setItem(id, "1") : localStorage.removeItem(id); } catch { /* idem */ }
  };
  return (
    <button type="button" className="check" aria-pressed={done} aria-label={`${label}: ${done ? "feito" : "marcar como feito"}`} onClick={toggle}>
      {done ? "✓" : ""}
    </button>
  );
}
