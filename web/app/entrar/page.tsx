import { entrar } from "./actions";

export const metadata = { title: "Entrar · LimiarLab" };

export default async function Entrar({ searchParams }: { searchParams: Promise<{ erro?: string }> }) {
  const { erro } = await searchParams;
  const configured = Boolean(process.env.APP_PASSWORD && process.env.SESSION_SECRET);
  return (
    <main className="login">
      <header>
        <p className="eyebrow">LimiarLab</p>
        <h1>Entrar</h1>
      </header>
      {configured ? (
        <form action={entrar} className="login" style={{ margin: 0 }}>
          <label htmlFor="senha" className="muted">Senha do app</label>
          <input id="senha" name="senha" type="password" autoComplete="current-password" required autoFocus />
          {erro && <p className="err" role="alert">Senha incorreta. Tente de novo.</p>}
          <button type="submit">Entrar</button>
        </form>
      ) : (
        <p className="err" role="alert">O app ainda não tem senha configurada. Defina APP_PASSWORD e SESSION_SECRET no .env.production da VPS.</p>
      )}
    </main>
  );
}
