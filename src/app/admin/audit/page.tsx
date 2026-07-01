import { redirect } from "next/navigation";
import { getCurrentUser, isAdminConfigured } from "@/lib/admin-auth";
import { isDbConfigured } from "@/lib/db";
import { listAudit } from "@/lib/audit";
import AdminNav from "@/components/AdminNav";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function AdminAuditPage() {
  if (!isAdminConfigured()) redirect("/admin");
  if (!(await getCurrentUser())) redirect("/admin/login");

  let rows: Awaited<ReturnType<typeof listAudit>> = [];
  let dbError: string | null = null;
  if (isDbConfigured()) {
    try {
      rows = await listAudit();
    } catch (e) {
      dbError = (e as Error).message;
    }
  } else {
    dbError = "Database is not configured.";
  }

  const cell: React.CSSProperties = { padding: "10px 14px", borderBottom: "1px solid #20242d", fontSize: 13, verticalAlign: "top" };
  const th: React.CSSProperties = { padding: "10px 14px", textAlign: "left", fontSize: 11, textTransform: "uppercase", letterSpacing: 0.6, color: "#7c8595", borderBottom: "1px solid #262b36" };

  return (
    <div style={{ minHeight: "100vh", background: "#0f1115", color: "#e8eaed", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ maxWidth: 1080, margin: "0 auto", padding: "28px 20px 56px" }}>
        <AdminNav />
        <h1 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 18px" }}>Audit log</h1>
        {dbError ? (
          <p style={{ color: "#ff9fc0" }}>{dbError}</p>
        ) : rows.length === 0 ? (
          <p style={{ color: "#7c8595", fontSize: 14 }}>No activity yet.</p>
        ) : (
          <div style={{ overflowX: "auto", border: "1px solid #20242d", borderRadius: 12 }}>
            <table style={{ width: "100%", borderCollapse: "collapse", color: "#e2e6ec" }}>
              <thead>
                <tr>
                  <th style={th}>When</th>
                  <th style={th}>Actor</th>
                  <th style={th}>Action</th>
                  <th style={th}>Target</th>
                  <th style={th}>Detail</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td style={{ ...cell, whiteSpace: "nowrap", color: "#aeb6c2" }}>
                      {r.createdAt.toLocaleString("en-SG", { dateStyle: "medium", timeStyle: "short" })}
                    </td>
                    <td style={cell}>{r.actor ?? "—"}</td>
                    <td style={{ ...cell, fontFamily: "ui-monospace, monospace" }}>{r.action}</td>
                    <td style={{ ...cell, fontFamily: "ui-monospace, monospace" }}>{r.target ?? "—"}</td>
                    <td style={{ ...cell, color: "#7c8595" }}>{r.detail ?? ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
