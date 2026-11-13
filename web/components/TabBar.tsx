import Link from "next/link";
import { CalendarIcon, ChartIcon, HomeIcon, UserIcon } from "./icons";

const TABS = [
  { href: "/", label: "Início", Icon: HomeIcon },
  { href: "/plano", label: "Plano", Icon: CalendarIcon },
  { href: "/analise", label: "Análise", Icon: ChartIcon },
  { href: "/perfil", label: "Perfil", Icon: UserIcon },
] as const;

export default function TabBar({ current }: { current: (typeof TABS)[number]["href"] }) {
  return (
    <nav className="tabs" aria-label="Seções do app">
      {TABS.map(({ href, label, Icon }) => (
        <Link key={href} href={href} className="tab" aria-current={href === current ? "page" : undefined}>
          <Icon />
          {label}
        </Link>
      ))}
    </nav>
  );
}
