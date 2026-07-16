// A plain line glyph per category, drawn in the current colour. Used on the warm
// tile that stands in when a photo is missing, so a card is never a blank box.

type IconProps = { className?: string };

function S({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

const ICONS: Record<string, (p: IconProps) => React.ReactElement> = {
  dining: (p) => (
    <S {...p}>
      <path d="M6 3v7M9 3v7M7.5 10v11M17 3c-1.5 0-2.5 2-2.5 5s1 4 2.5 4 2.5-1 2.5-4-1-5-2.5-5zM17 12v9" />
    </S>
  ),
  cafe: (p) => (
    <S {...p}>
      <path d="M4 8h12v4a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5V8zM16 9h2a2 2 0 0 1 0 5h-1M6 3v2M9 3v2M12 3v2M4 21h13" />
    </S>
  ),
  cinema: (p) => (
    <S {...p}>
      <rect x="3" y="5" width="18" height="14" rx="1.5" />
      <path d="M3 9h18M7 5v14M17 5v14M7 9v10M17 9v10" />
    </S>
  ),
  bowling: (p) => (
    <S {...p}>
      <circle cx="8" cy="15" r="5" />
      <circle cx="7" cy="13" r="0.6" fill="currentColor" />
      <circle cx="9.5" cy="13.5" r="0.6" fill="currentColor" />
      <path d="M17 4c-1 0-1.7 1.5-1.7 4.5S16 20 17 20s1.7-3 1.7-11.5S18 4 17 4z" />
    </S>
  ),
  golf: (p) => (
    <S {...p}>
      <path d="M12 3v13M12 3l6 2.5L12 8" />
      <circle cx="12" cy="19" r="2.5" />
    </S>
  ),
  museum: (p) => (
    <S {...p}>
      <path d="M3 9l9-5 9 5M5 9v8M9 9v8M15 9v8M19 9v8M3 21h18M3 9h18" />
    </S>
  ),
  arcade: (p) => (
    <S {...p}>
      <rect x="6" y="3" width="12" height="18" rx="2" />
      <path d="M9 7h6M9 10h2M15 10h0.01M9 14h6v3H9z" />
    </S>
  ),
  nightlife: (p) => (
    <S {...p}>
      <path d="M6 4h12l-6 7zM12 11v7M8 21h8M9 4l3 3.5L15 4" />
    </S>
  ),
  shopping: (p) => (
    <S {...p}>
      <path d="M6 8h12l-1 12H7zM9 8V6a3 3 0 0 1 6 0v2" />
    </S>
  ),
  market: (p) => (
    <S {...p}>
      <path d="M4 9l1-4h14l1 4M4 9h16M4 9v11h16V9M4 9a2 2 0 0 0 4 0 2 2 0 0 0 4 0 2 2 0 0 0 4 0 2 2 0 0 0 4 0" />
    </S>
  ),
  outdoors: (p) => (
    <S {...p}>
      <path d="M12 3l5 8h-4l4 7H7l4-7H7z" />
      <path d="M12 18v3" />
    </S>
  ),
  groceries: (p) => (
    <S {...p}>
      <path d="M4 5h2l2 11h10M8 16h11l1-8H7M9 20h0.01M18 20h0.01" />
    </S>
  ),
  pharmacy: (p) => (
    <S {...p}>
      <rect x="4" y="4" width="16" height="16" rx="3" />
      <path d="M12 8v8M8 12h8" />
    </S>
  ),
  laundry: (p) => (
    <S {...p}>
      <rect x="5" y="3" width="14" height="18" rx="2" />
      <circle cx="12" cy="14" r="4" />
      <path d="M8 6h0.01M11 6h0.01" />
    </S>
  ),
  concert: (p) => (
    <S {...p}>
      <path d="M9 18V6l10-2v12" />
      <circle cx="6" cy="18" r="3" />
      <circle cx="16" cy="16" r="3" />
    </S>
  ),
  theatre: (p) => (
    <S {...p}>
      <path d="M4 5h7v6a3.5 3.5 0 0 1-7 0zM13 9h7v6a3.5 3.5 0 0 1-7 0zM6 8h0.01M9 8h0.01M15 12h0.01M18 12h0.01" />
    </S>
  ),
  sports: (p) => (
    <S {...p}>
      <rect x="3" y="7" width="18" height="10" rx="2" />
      <path d="M12 7v10M8 11l4 4 4-4" />
    </S>
  ),
};

function GenericIcon(p: IconProps) {
  return (
    <S {...p}>
      <path d="M12 3c3.5 0 6 2.5 6 6 0 4-6 12-6 12S6 13 6 9c0-3.5 2.5-6 6-6z" />
      <circle cx="12" cy="9" r="2" />
    </S>
  );
}

export function CategoryIcon({
  category,
  className,
}: {
  category: string;
  className?: string;
}) {
  const Icon = ICONS[category] ?? GenericIcon;
  return <Icon className={className} />;
}
