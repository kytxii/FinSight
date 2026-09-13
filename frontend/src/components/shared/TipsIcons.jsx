// Tips-specific icons (cash-on-hand / deposited-to-bank), sized via a prop
// rather than fixed like categoryIcons.jsx's tiles - used at different
// scales in the desktop Tips overview column and MobileTips's hero tiles.
// Previously defined identically in both places (#177, #190).

export function IconHandCash({ size = 12 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 15h2a2 2 0 1 0 0-4h-3c-.6 0-1.1.2-1.4.6L3 17" />
      <path d="m7 21 1.6-1.4c.3-.4.8-.6 1.4-.6h4c1.1 0 2.1-.4 2.8-1.2l4.6-4.4a2 2 0 0 0-2.75-2.91l-4.2 3.9" />
      <path d="m2 16 6 6" />
      <circle cx="16" cy="9" r="2.9" />
      <circle cx="6" cy="5" r="3" />
    </svg>
  );
}

export function IconBank({ color, size = 11 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 21h18" />
      <path d="M12 3 3 8h18z" />
      <path d="M5 8v10M9.5 8v10M14.5 8v10M19 8v10" />
    </svg>
  );
}
