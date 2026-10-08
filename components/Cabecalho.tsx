import Seletor from "./SeletorMes";
import { BotaoOlho } from "./Privacidade";

export default function Cabecalho({ titulo, sub, mes }: { titulo: string; sub: string; mes?: string }) {
  return (
    <header className="flex flex-wrap items-center gap-4 border-b border-line px-5 py-5 lg:h-[100px] lg:px-8 lg:py-0">
      <div className="mr-auto">
        <h1 className="font-display text-2xl font-bold text-ink lg:text-[32px]">{titulo}</h1>
        <p className="text-sm text-mute lg:text-base">{sub}</p>
      </div>
      {mes && <Seletor mes={mes} />}
      <BotaoOlho />
    </header>
  );
}
