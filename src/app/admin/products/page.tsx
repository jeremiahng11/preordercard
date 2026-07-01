import { redirect } from "next/navigation";
import { isAdminAuthed, isAdminConfigured } from "@/lib/admin-auth";
import { isDbConfigured } from "@/lib/db";
import { listAllProducts } from "@/lib/products";
import { listAllCollections } from "@/lib/collections";
import AdminProducts, { type CollectionOption, type ProductView } from "@/components/AdminProducts";
import AdminNav from "@/components/AdminNav";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function AdminProductsPage() {
  if (!isAdminConfigured()) redirect("/admin");
  if (!(await isAdminAuthed())) redirect("/admin/login");

  let products: ProductView[] = [];
  let collections: CollectionOption[] = [];
  let dbError: string | null = null;
  if (isDbConfigured()) {
    try {
      const [rows, colls] = await Promise.all([listAllProducts(), listAllCollections()]);
      collections = colls.map((c) => ({ id: c.id, name: c.name }));
      products = rows.map((p) => ({
        id: p.id,
        slug: p.slug,
        name: p.name,
        priceMinor: p.priceMinor,
        currency: p.currency,
        image: p.image,
        back: p.back,
        status: p.status,
        collectionId: p.collectionId ?? null,
        comingSoon: p.comingSoon,
        comingSoonDate: p.comingSoonDate ?? null,
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
        <AdminNav />
        <h1 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 18px" }}>Card products</h1>
        {dbError ? <p style={{ color: "#ff9fc0" }}>{dbError}</p> : <AdminProducts products={products} collections={collections} />}
      </div>
    </div>
  );
}
