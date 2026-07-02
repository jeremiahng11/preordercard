import Link from "next/link";
import { ADV_LOGO } from "@/lib/assets";

/** Shared wrapper for the static policy pages (Terms, Privacy, Refund). */
export default function LegalPage({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        fontFamily: "'Plus Jakarta Sans',system-ui,sans-serif",
        color: "#2C2433",
        minHeight: "100vh",
        background:
          "radial-gradient(120% 90% at 0% 0%, #FDEFF5 0%, transparent 45%),radial-gradient(120% 90% at 100% 0%, #EAF2FE 0%, transparent 45%),#FBF5F8",
        padding: "28px 16px 64px",
      }}
    >
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none", marginBottom: 20 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={ADV_LOGO} alt="Aleta Adventure" style={{ height: 30 }} />
          <span style={{ color: "#6B39E8", fontFamily: "'Baloo 2'", fontWeight: 800, fontSize: 17 }}>Aleta Adventure</span>
        </Link>
        <div style={{ background: "#fff", border: "1px solid #EFE3EC", borderRadius: 20, padding: "28px 26px" }}>
          <h1 style={{ fontFamily: "'Baloo 2',sans-serif", fontWeight: 800, fontSize: 26, margin: "0 0 4px" }}>{title}</h1>
          <p style={{ color: "#9087A0", fontSize: 13, margin: "0 0 20px" }}>Last updated: {updated}</p>
          <div style={{ fontSize: 14.5, lineHeight: 1.7, color: "#4a4356" }}>{children}</div>
        </div>
        <div style={{ textAlign: "center", marginTop: 20, fontSize: 13 }}>
          <Link href="/terms" style={legalLink}>Terms</Link>
          <Link href="/refund" style={legalLink}>Refunds</Link>
          <Link href="/privacy" style={legalLink}>Privacy</Link>
          <Link href="/" style={legalLink}>Home</Link>
        </div>
      </div>
    </div>
  );
}

const legalLink: React.CSSProperties = { color: "#9087A0", textDecoration: "none", margin: "0 8px", fontWeight: 600 };

export function H2({ children }: { children: React.ReactNode }) {
  return <h2 style={{ fontSize: 16, fontWeight: 800, margin: "22px 0 6px", color: "#2C2433" }}>{children}</h2>;
}
