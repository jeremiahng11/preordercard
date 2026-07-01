import { redirect } from "next/navigation";
import { getCurrentUser, isAdminConfigured } from "@/lib/admin-auth";
import { isDbConfigured } from "@/lib/db";
import { listAllCollections } from "@/lib/collections";
import AdminCollections, { type CollectionView } from "@/components/AdminCollections";
import AdminNav from "@/components/AdminNav";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function AdminCollectionsPage() {
  if (!isAdminConfigured()) redirect("/admin");
  const me = await getCurrentUser();
  if (!me) redirect("/admin/login");
  const canWrite = me.role !== "developer";

  let collections: CollectionView[] = [];
  let dbError: string | null = null;
  if (isDbConfigured()) {
    try {
      const rows = await listAllCollections();
      collections = rows.map((c) => ({
        id: c.id,
        slug: c.slug,
        name: c.name,
        eyebrow: c.eyebrow,
        title: c.title,
        description: c.description,
        status: c.status,
        comingSoon: c.comingSoon,
        comingSoonDate: c.comingSoonDate ?? null,
      }));
    } catch (e) {
      dbError = (e as Error).message;
    }
  } else {
    dbError = "Database is not configured.";
  }

  return (
    <div style={{ minHeight: "100vh", background: "#0f1115", color: "#e8eaed", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ maxWidth: 1080, margin: "0 auto", padding: "28px 20px 56px" }}>
        <AdminNav role={me.role} />
        <h1 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 18px" }}>Collections</h1>
        {dbError ? <p style={{ color: "#ff9fc0" }}>{dbError}</p> : <AdminCollections collections={collections} canWrite={canWrite} />}
      </div>
    </div>
  );
}
