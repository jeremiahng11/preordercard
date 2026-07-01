import { redirect } from "next/navigation";
import { getCurrentUser, isAdminConfigured } from "@/lib/admin-auth";
import { isDbConfigured } from "@/lib/db";
import { listKeysForUser } from "@/lib/apikeys";
import { resolveBaseUrl } from "@/lib/config";
import AdminApiKeys, { type KeyView } from "@/components/AdminApiKeys";
import AdminNav from "@/components/AdminNav";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function AdminApiKeysPage() {
  if (!isAdminConfigured()) redirect("/admin");
  const me = await getCurrentUser();
  if (!me) redirect("/admin/login");

  let keys: KeyView[] = [];
  if (isDbConfigured()) {
    try {
      keys = (await listKeysForUser(me.id)).map((k) => ({ environment: k.environment, key: k.key }));
    } catch {
      /* ignore */
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: "#0f1115", color: "#e8eaed", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ maxWidth: 1080, margin: "0 auto", padding: "28px 20px 56px" }}>
        <AdminNav role={me.role} />
        <h1 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 18px" }}>API keys</h1>
        <AdminApiKeys keys={keys} baseUrl={resolveBaseUrl()} />
      </div>
    </div>
  );
}
