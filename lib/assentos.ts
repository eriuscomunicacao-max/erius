// Regras de vagas de funcionário (puras, sem banco/rede).
export const FUNCIONARIOS_INCLUIDOS = 1;

/** Vagas extras (pagas) necessárias para comportar a equipe + convites pendentes. */
export const extrasNecessarios = (equipe: number, convitesPendentes: number) =>
  Math.max(0, equipe + convitesPendentes - FUNCIONARIOS_INCLUIDOS);

/** Mensalidade: plano + 1 plano por funcionário adicional. */
export const valorMensal = (base: number, extras: number) => Math.round(base * (1 + extras) * 100) / 100;
