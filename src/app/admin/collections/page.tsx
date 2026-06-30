import Link from "next/link";
import { redirect } from "next/navigation";
import { isAdminAuthed, isAdminConfigured } from "@/lib/admin-auth";
import { isDbConfigured } from "@/lib/db";
import { listAllCollections } from "@/lib/collections";
import AdminCollections, { type CollectionView } from "@/components/AdminCollections";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function AdminCollectionsPage() {
  if (!isAdminConfigured()) redirect("/admin");
  if (!(await isAdminAuthed())) redirect("/admin/login");

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
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 22 }}>
          <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>Collections</h1>
          <div style={{ display: "flex", gap: 14 }}>
            <Link href="/admin/products" style={{ color: "#9b8cf0", fontSize: 13, textDecoration: "none", fontWeight: 600 }}>Products</Link>
            <Link href="/admin" style={{ color: "#9b8cf0", fontSize: 13, textDecoration: "none", fontWeight: 600 }}>Codes</Link>
          </div>
        </div>
        {dbError ? <p style={{ color: "#ff9fc0" }}>{dbError}</p> : <AdminCollections collections={collections} />}
      </div>
    </div>
  );
}
