"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ADV_LOGO } from "@/lib/assets";

const ITEMS = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/collections", label: "Collections" },
  { href: "/admin/products", label: "Products" },
  { href: "/admin/interests", label: "Interests" },
  { href: "/admin/promocodes", label: "Promo codes" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/audit", label: "Audit" },
  { href: "/admin/api-keys", label: "API keys" },
  { href: "/admin/api-docs", label: "API docs" },
  { href: "/admin/account", label: "Account" },
];

export default function AdminNav({ role = "user" }: { role?: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const canSettings = role === "admin" || role === "user";

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.replace("/admin/login");
    router.refresh();
  }

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 16,
        flexWrap: "wrap",
        marginBottom: 24,
        paddingBottom: 16,
        borderBottom: "1px solid #20242d",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 18, flexWrap: "wrap" }}>
        <Link href="/admin" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none", color: "#fff" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={ADV_LOGO} alt="Aleta Adventure" style={{ height: 28, width: "auto" }} />
          <span style={{ fontWeight: 800, fontSize: 16 }}>Gift Card Admin</span>
          {role === "developer" && (
            <span style={{ fontSize: 10, fontWeight: 700, color: "#8fc1ff", background: "#1c2c44", padding: "2px 7px", borderRadius: 99, textTransform: "uppercase" }}>
              read-only
            </span>
          )}
        </Link>
        <nav style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
          {ITEMS.map((it) => {
            const active = pathname === it.href;
            return (
              <Link
                key={it.href}
                href={it.href}
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  textDecoration: "none",
                  padding: "7px 12px",
                  borderRadius: 8,
                  color: active ? "#fff" : "#9aa3b2",
                  background: active ? "#242a36" : "transparent",
                }}
              >
                {it.label}
              </Link>
            );
          })}
        </nav>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {canSettings && (
          <Link
            href="/admin/settings"
            aria-label="Settings"
            title="Settings"
            style={{
              display: "grid",
              placeItems: "center",
              width: 36,
              height: 36,
              borderRadius: 8,
              border: "1px solid #2d333f",
              background: pathname === "/admin/settings" ? "#242a36" : "transparent",
              color: "#c4cbd6",
              textDecoration: "none",
              fontSize: 17,
            }}
          >
            ⚙️
          </Link>
        )}
        <button
          onClick={logout}
          style={{ padding: "8px 14px", borderRadius: 8, border: "1px solid #2d333f", background: "#2d333f", color: "#e2e6ec", fontWeight: 600, fontSize: 13, cursor: "pointer" }}
        >
          Sign out
        </button>
      </div>
    </div>
  );
}
