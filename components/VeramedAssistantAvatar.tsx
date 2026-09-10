export function VeramedAssistantAvatar({ thinking = false }: { thinking?: boolean }) {
  return (
    <span
      aria-label="Asistente clínico Veramed"
      role="img"
      className={`relative inline-flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-emerald-200 bg-[linear-gradient(145deg,#f7fffb_0%,#dff8ec_48%,#b8ead5_100%)] shadow-[0_8px_24px_-12px_rgba(5,150,105,0.7)] ${
        thinking ? "animate-pulse" : ""
      }`}
    >
      <svg viewBox="0 0 40 40" className="h-full w-full" aria-hidden="true">
        <defs>
          <linearGradient id="veramed-avatar-mark" x1="8" y1="7" x2="31" y2="34">
            <stop stopColor="#10b981" />
            <stop offset="1" stopColor="#047857" />
          </linearGradient>
        </defs>
        <path
          d="M10 9.5c3.2-2.8 7.8-4.1 12.1-3.2 5.5 1.1 9.6 6 9.6 11.8 0 7.1-5.6 13.1-12.4 14.2-3.9.6-7.7-.4-10.6-2.8l2.1-4.1a8.4 8.4 0 0 0 7.4 2.4c4.5-.8 8-4.8 8-9.4 0-3.7-2.2-6.9-5.5-7.8-2.5-.7-5.1 0-7 1.6L10 9.5Z"
          fill="url(#veramed-avatar-mark)"
        />
        <path d="m13.3 14.2 5.9 10.1 7-13" fill="none" stroke="#064e3b" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.6" />
        <circle cx="30.7" cy="8.2" r="2.4" fill="#f1c75b" />
      </svg>
      <span className="absolute inset-x-1 bottom-0 h-px bg-gradient-to-r from-transparent via-emerald-500/60 to-transparent" />
    </span>
  );
}
