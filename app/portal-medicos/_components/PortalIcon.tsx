export type PortalIconName =
  | "calendar"
  | "chevron"
  | "document"
  | "external"
  | "home"
  | "logout"
  | "menu"
  | "pill"
  | "referral"
  | "syringe"
  | "user"
  | "x";

export default function PortalIcon({ name, className = "h-5 w-5" }: { name: PortalIconName; className?: string }) {
  const paths: Record<PortalIconName, React.ReactNode> = {
    home: <path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1V10Z" />,
    document: <><path d="M6 3h9l4 4v14H6V3Z" /><path d="M14 3v5h5M9 13l2 2 4-4" /></>,
    pill: <><path d="m8.5 4.5 11 11a4 4 0 0 1-5.7 5.7l-11-11a4 4 0 0 1 5.7-5.7Z" /><path d="m7 15 8-8" /></>,
    syringe: <><path d="m14 4 6 6M17 3l4 4M12 6l6 6-8.5 8.5-6-6L12 6ZM7 17l-4 4M7 11l3 3" /></>,
    referral: <><path d="M5 4h10v6" /><path d="m11 6 4 4-4 4" /><path d="M19 20H9v-6" /></>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 10h18M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01" /></>,
    user: <><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></>,
    logout: <><path d="M10 17l5-5-5-5M15 12H3" /><path d="M14 4h6a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-6" /></>,
    external: <><path d="M14 3h7v7M10 14 21 3" /><path d="M21 14v6a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h6" /></>,
    menu: <path d="M4 7h16M4 12h16M4 17h16" />,
    x: <path d="m6 6 12 12M18 6 6 18" />,
    chevron: <path d="m7 10 5 5 5-5" />,
  };

  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {paths[name]}
    </svg>
  );
}
