"use client";
import { usePathname, useRouter } from "next/navigation";

export default function SeletorMes({ mes }: { mes: string }) {
  const router = useRouter();
  const path = usePathname();
  const [a, m] = mes.split("-").map(Number);
  const fim = new Date(a, m, 0).getDate();
  return (
    <label className="flex items-center gap-3 rounded-xl border border-line bg-panel px-4 py-2">
      <svg viewBox="0 0 24 24" className="h-6 w-6 text-mute" fill="none" stroke="currentColor" strokeWidth={1.6} aria-hidden>
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M3 10h18M8 3v4M16 3v4" />
      </svg>
      <span className="leading-tight">
        <span className="block text-xs text-mute">Período</span>
        <span className="relative block text-sm text-ink">
          01/{String(m).padStart(2, "0")}/{a} – {fim}/{String(m).padStart(2, "0")}/{a}
          <input
            type="month"
            value={mes}
            aria-label="Escolher mês"
            onChange={(e) => e.target.value && router.push(`${path}?mes=${e.target.value}`)}
            className="absolute inset-0 cursor-pointer opacity-0"
          />
        </span>
      </span>
    </label>
  );
}
