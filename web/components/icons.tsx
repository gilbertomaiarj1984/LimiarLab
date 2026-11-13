import type { Sport } from "@/lib/domain";

const base = { viewBox: "0 0 24 24", "aria-hidden": true } as const;

export const RunIcon = () => (
  <svg {...base}><circle cx="14" cy="4" r="2" /><path d="M8 21l3-6 3 2v4M6 12l3-3 4 1 3 3h3M11 15l-1-5" /></svg>
);
export const StrengthIcon = () => (
  <svg {...base}><path d="M6 7v10M18 7v10M3 10v4M21 10v4M6 12h12" /></svg>
);
export const RestIcon = () => (
  <svg {...base}><path d="M20 14A8 8 0 1 1 10 4a6 6 0 0 0 10 10z" /></svg>
);
export const HomeIcon = () => (
  <svg {...base}><path d="M3 11l9-7 9 7" /><path d="M5 10v10h14V10" /></svg>
);
export const CalendarIcon = () => (
  <svg {...base}><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></svg>
);
export const ChartIcon = () => (
  <svg {...base}><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></svg>
);
export const UserIcon = () => (
  <svg {...base}><circle cx="12" cy="8" r="4" /><path d="M4 21c1-4 4-6 8-6s7 2 8 6" /></svg>
);

export function SportIcon({ sport, rest }: { sport: Sport; rest?: boolean }) {
  if (rest || sport === "other") return <RestIcon />;
  return sport === "run" ? <RunIcon /> : <StrengthIcon />;
}
