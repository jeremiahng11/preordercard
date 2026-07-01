"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const ITEMS = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/collections", label: "Collections" },
  { href: "/admin/products", label: "Products" },
  { href: "/admin/settings", label: "Settings" },
  { href: "/admin/api-docs", label: "API docs" },
];

export default function AdminNav() {
  const pathname = usePathname();
  const router = useRouter();

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
        <Link href="/admin" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none", color: "#fff" }}>
          <span style={{ fontSize: 18 }}>🎀</span>
          <span style={{ fontWeight: 800, fontSize: 16 }}>Gift Card Admin</span>
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
      <button
        onClick={logout}
        style={{
          padding: "8px 14px",
          borderRadius: 8,
          border: "1px solid #2d333f",
          background: "#2d333f",
          color: "#e2e6ec",
          fontWeight: 600,
          fontSize: 13,
          cursor: "pointer",
        }}
      >
        Sign out
      </button>
    </div>
  );
}
