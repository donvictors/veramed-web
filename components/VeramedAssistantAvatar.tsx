import Image from "next/image";

export function VeramedAssistantAvatar({ thinking = false }: { thinking?: boolean }) {
  return (
    <span
      aria-label="Asistente clínico Veramed"
      role="img"
      className={`relative inline-flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_8px_24px_-12px_rgba(15,23,42,0.35)] ${
        thinking ? "animate-pulse" : ""
      }`}
    >
      <Image
        src="/brand/veramed-icon.png"
        alt=""
        width={36}
        height={36}
        className="h-full w-full object-contain"
      />
    </span>
  );
}
