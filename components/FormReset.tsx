"use client";
import { useRef } from "react";
// Form que limpa os campos depois de salvar
export default function FormReset({ action, children, className }: { action: (fd: FormData) => Promise<void>; children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLFormElement>(null);
  return (
    <form ref={ref} className={className} action={async (fd) => { await action(fd); ref.current?.reset(); }}>
      {children}
    </form>
  );
}
