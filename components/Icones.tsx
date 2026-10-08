type P = { className?: string };
const base = (d: React.ReactNode, c?: string) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className={c ?? "h-5 w-5"} aria-hidden>
    {d}
  </svg>
);
export const ICasa = ({ className }: P) => base(<><path d="M3 11l9-7 9 7" /><path d="M5 10v10h14V10" /></>, className);
export const ICarteira = ({ className }: P) => base(<><rect x="3" y="6" width="18" height="14" rx="2" /><path d="M16 13h2M3 10h18M7 6l8-3 2 3" /></>, className);
export const IEtiqueta = ({ className }: P) => base(<><path d="M3 12V4h8l10 10-8 8L3 12z" /><circle cx="7.5" cy="7.5" r="1.5" /></>, className);
export const IPessoas = ({ className }: P) => base(<><circle cx="9" cy="8" r="3.5" /><path d="M2 20c0-3.5 3-6 7-6s7 2.5 7 6" /><path d="M16 4.5a3.5 3.5 0 010 7M18 14c2.5.6 4 2.8 4 6" /></>, className);
export const IGrafico = ({ className }: P) => base(<><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></>, className);
export const IEngrenagem = ({ className }: P) => base(<><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3H9a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V9a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z" /></>, className);
export const ICifrao = ({ className }: P) => base(<><circle cx="12" cy="12" r="9" /><path d="M15 9.5c0-1.4-1.3-2.5-3-2.5s-3 1-3 2.3c0 3.2 6 1.7 6 5 0 1.4-1.3 2.7-3 2.7s-3-1.1-3-2.5M12 5.5v13" /></>, className);
export const ITendencia = ({ className }: P) => base(<><path d="M3 17l6-6 4 4 8-8" /><path d="M15 7h6v6" /></>, className);
export const IPedido = ({ className }: P) => base(<><rect x="5" y="3" width="14" height="18" rx="2" /><path d="M9 8h6M9 12h6M9 16h4" /></>, className);
export const ISeta = ({ className, baixo }: P & { baixo?: boolean }) =>
  base(baixo ? <path d="M12 5v14M6 13l6 6 6-6" /> : <path d="M12 19V5M6 11l6-6 6 6" />, className);
export const ICheck = ({ className }: P) => base(<path d="M5 12.5l4.5 4.5L19 7" />, className);
export const IAlerta = ({ className }: P) => base(<><path d="M12 3l10 18H2L12 3z" /><path d="M12 10v4M12 17.5v.01" /></>, className);
export const ILampada = ({ className }: P) => base(<><path d="M9 18h6M10 21h4" /><path d="M12 3a6 6 0 00-3.5 10.9c.6.5 1 1.2 1 2V16h5v-.1c0-.8.4-1.5 1-2A6 6 0 0012 3z" /></>, className);
export const IOS = ({ className }: P) => base(<><rect x="5" y="4" width="14" height="17" rx="2" /><path d="M9 4V3h6v1M9 11l2 2 4-4M9 17h6" /></>, className);
export const IAssessor = ({ className }: P) => base(<><path d="M4 7h16v12H4z" /><path d="M4 7l8 6 8-6" /><path d="M9 3h6" /></>, className);
export const IRelatorio = ({ className }: P) => base(<><path d="M6 3h9l4 4v14H6z" /><path d="M14 3v5h5M9 17v-3M12 17v-6M15 17v-4" /></>, className);
