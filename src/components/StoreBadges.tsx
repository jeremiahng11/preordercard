import type { CSSProperties } from "react";

/**
 * App Store + Google Play download badges, rendered as crisp inline SVG/HTML
 * (no external image assets). Styled to match the official black pill badges.
 */

const pill: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  flex: 1,
  minWidth: 0,
  padding: "9px 16px",
  height: 52,
  borderRadius: 12,
  background: "#000",
  border: "1px solid rgba(255,255,255,0.18)",
  color: "#fff",
  textDecoration: "none",
  boxShadow: "0 6px 16px -10px rgba(0,0,0,0.6)",
};
const small: CSSProperties = { fontSize: 9.5, lineHeight: 1.1, letterSpacing: 0.3, opacity: 0.92 };
const big: CSSProperties = { fontSize: 17, lineHeight: 1.15, fontWeight: 600, letterSpacing: -0.2, marginTop: 1 };
const label: CSSProperties = { display: "flex", flexDirection: "column", justifyContent: "center", whiteSpace: "nowrap" };

const APPLE =
  "M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5c0 26.2 4.8 53.3 14.4 81.2 12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z";

export function AppStoreBadge({ href }: { href: string }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" style={pill} aria-label="Download on the App Store">
      <svg width="22" height="26" viewBox="0 0 384 512" fill="#fff" aria-hidden>
        <path d={APPLE} />
      </svg>
      <span style={label}>
        <span style={small}>Download on the</span>
        <span style={big}>App Store</span>
      </span>
    </a>
  );
}

export function GooglePlayBadge({ href }: { href: string }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" style={pill} aria-label="Get it on Google Play">
      <svg width="22" height="24" viewBox="0 0 25 26" aria-hidden>
        <polygon points="4,3 4,13 12,13" fill="#34A853" />
        <polygon points="4,13 4,23 12,13" fill="#EA4335" />
        <polygon points="4,3 12,13 22,13" fill="#4285F4" />
        <polygon points="4,23 12,13 22,13" fill="#FBBC04" />
      </svg>
      <span style={label}>
        <span style={small}>GET IT ON</span>
        <span style={big}>Google Play</span>
      </span>
    </a>
  );
}
