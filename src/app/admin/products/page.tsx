import Link from "next/link";
import { redirect } from "next/navigation";
import { isAdminAuthed, isAdminConfigured } from "@/lib/admin-auth";
import { isDbConfigured } from "@/lib/db";
import { listAllProducts } from "@/lib/products";
import AdminProducts, { type ProductView } from "@/components/AdminProducts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function AdminProductsPage() {
  if (!isAdminConfigured()) redirect("/admin");
  if (!(await isAdminAuthed())) redirect("/admin/login");

  let products: ProductView[] = [];
  let dbError: string | null = null;
  if (isDbConfigured()) {
    try {
      const rows = await listAllProducts();
      products = rows.map((p) => ({
        id: p.id,
        slug: p.slug,
        name: p.name,
        priceMinor: p.priceMinor,
        currency: p.currency,
        image: p.image,
        back: p.back,
        status: p.status,
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
          <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>Card products</h1>
          <Link href="/admin" style={{ color: "#9b8cf0", fontSize: 13, textDecoration: "none", fontWeight: 600 }}>
            ← Codes
          </Link>
        </div>
        {dbError ? <p style={{ color: "#ff9fc0" }}>{dbError}</p> : <AdminProducts products={products} />}
      </div>
    </div>
  );
}
