"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

export type ProductView = {
  id: string;
  slug: string;
  name: string;
  priceMinor: number;
  currency: string;
  image: string;
  back: string;
  status: string;
};

const STATUS_STYLE: Record<string, { label: string; bg: string; fg: string }> = {
  active: { label: "On sale", bg: "#16361f", fg: "#7ee2a0" },
  soldout: { label: "Sold out", bg: "#3a3320", fg: "#f4d58d" },
  delisted: { label: "Delisted", bg: "#2a2e36", fg: "#aab2c0" },
};

function dollars(minor: number) {
  return (minor / 100).toFixed(2);
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = () => reject(new Error("Could not read file"));
    r.readAsDataURL(file);
  });
}

export default function AdminProducts({ products }: { products: ProductView[] }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function call(url: string, payload: unknown) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || data.detail || "Request failed");
      router.refresh();
      return true;
    } catch (e) {
      setError((e as Error).message);
      return false;
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      {error && (
        <div style={{ background: "#3a2330", color: "#ff9fc0", padding: "10px 14px", borderRadius: 8, marginBottom: 14, fontSize: 13 }}>
          {error}
        </div>
      )}

      <AddProduct busy={busy} onCreate={(p) => call("/api/admin/products", p)} />

      <div style={{ display: "grid", gap: 14, marginTop: 20 }}>
        {products.map((p) => (
          <ProductRow key={p.id} product={p} busy={busy} call={call} />
        ))}
      </div>
    </div>
  );
}

function AddProduct({
  busy,
  onCreate,
}: {
  busy: boolean;
  onCreate: (p: { name: string; priceMinor: number; image: string }) => Promise<boolean>;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("18.00");
  const [image, setImage] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) setImage(await readFileAsDataUrl(f));
  }

  async function submit() {
    const priceMinor = Math.round(parseFloat(price) * 100);
    if (!name.trim() || !image || !Number.isFinite(priceMinor) || priceMinor <= 0) return;
    const ok = await onCreate({ name: name.trim(), priceMinor, image });
    if (ok) {
      setName("");
      setPrice("18.00");
      setImage(null);
      setOpen(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} style={primaryBtn}>
        + Add card product
      </button>
    );
  }

  return (
    <div style={card}>
      <div style={{ fontWeight: 700, marginBottom: 12 }}>New card product</div>
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
        <CardPreview image={image} />
        <div style={{ flex: 1, minWidth: 220 }}>
          <Label>Name</Label>
          <input style={input} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Starry Night" />
          <Label>Price (SGD)</Label>
          <input style={input} value={price} onChange={(e) => setPrice(e.target.value)} inputMode="decimal" />
          <Label>Card image (front artwork — landscape)</Label>
          <input ref={fileRef} type="file" accept="image/*" onChange={onFile} style={{ color: "#c4cbd6", fontSize: 13 }} />
          <div style={{ marginTop: 14, display: "flex", gap: 8 }}>
            <button onClick={submit} disabled={busy || !name.trim() || !image} style={primaryBtn}>
              Create
            </button>
            <button onClick={() => setOpen(false)} style={ghostBtn}>
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ProductRow({
  product,
  busy,
  call,
}: {
  product: ProductView;
  busy: boolean;
  call: (url: string, payload: unknown) => Promise<boolean>;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(product.name);
  const [price, setPrice] = useState(dollars(product.priceMinor));
  const [image, setImage] = useState<string | null>(null);
  const s = STATUS_STYLE[product.status] ?? { label: product.status, bg: "#2a2e36", fg: "#aab2c0" };

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) setImage(await readFileAsDataUrl(f));
  }

  async function save() {
    const priceMinor = Math.round(parseFloat(price) * 100);
    const payload: Record<string, unknown> = { id: product.id, name: name.trim(), priceMinor };
    if (image) payload.image = image;
    const ok = await call("/api/admin/products/update", payload);
    if (ok) {
      setEditing(false);
      setImage(null);
    }
  }

  return (
    <div style={card}>
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "flex-start" }}>
        <CardPreview image={image ?? product.image} />
        <div style={{ flex: 1, minWidth: 220 }}>
          {editing ? (
            <>
              <Label>Name</Label>
              <input style={input} value={name} onChange={(e) => setName(e.target.value)} />
              <Label>Price (SGD)</Label>
              <input style={input} value={price} onChange={(e) => setPrice(e.target.value)} inputMode="decimal" />
              <Label>Replace image (optional)</Label>
              <input type="file" accept="image/*" onChange={onFile} style={{ color: "#c4cbd6", fontSize: 13 }} />
              <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
                <button onClick={save} disabled={busy} style={primaryBtn}>
                  Save
                </button>
                <button onClick={() => { setEditing(false); setImage(null); setName(product.name); setPrice(dollars(product.priceMinor)); }} style={ghostBtn}>
                  Cancel
                </button>
              </div>
            </>
          ) : (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ fontSize: 16, fontWeight: 700 }}>{product.name}</div>
                <span style={{ background: s.bg, color: s.fg, padding: "3px 9px", borderRadius: 99, fontSize: 11, fontWeight: 700 }}>
                  {s.label}
                </span>
              </div>
              <div style={{ color: "#aeb6c2", fontSize: 14, marginTop: 4 }}>
                {product.currency} {dollars(product.priceMinor)}
              </div>
              <div style={{ color: "#5b6473", fontSize: 11, marginTop: 2 }}>slug: {product.slug}</div>

              <div style={{ marginTop: 14, display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button onClick={() => setEditing(true)} disabled={busy} style={ghostBtn}>
                  Edit
                </button>
                {product.status !== "active" && (
                  <button onClick={() => call("/api/admin/products/status", { id: product.id, status: "active" })} disabled={busy} style={ghostBtn}>
                    Put on sale
                  </button>
                )}
                {product.status === "active" && (
                  <button onClick={() => call("/api/admin/products/status", { id: product.id, status: "soldout" })} disabled={busy} style={ghostBtn}>
                    Mark sold out
                  </button>
                )}
                {product.status !== "delisted" && (
                  <button onClick={() => call("/api/admin/products/status", { id: product.id, status: "delisted" })} disabled={busy} style={dangerBtn}>
                    Delist
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function CardPreview({ image }: { image: string | null }) {
  return (
    <div style={{ width: 200, flexShrink: 0 }}>
      <div style={{ aspectRatio: "1.586 / 1", borderRadius: 14, overflow: "hidden", background: "#0f1115", border: "1px solid #262b36", display: "grid", placeItems: "center" }}>
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image} alt="card" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          <span style={{ color: "#5b6473", fontSize: 12 }}>No image</span>
        )}
      </div>
      <div style={{ color: "#5b6473", fontSize: 11, marginTop: 6, textAlign: "center" }}>1.586:1 (card ratio)</div>
    </div>
  );
}

const card: React.CSSProperties = { background: "#181b22", border: "1px solid #262b36", borderRadius: 14, padding: 18 };
const input: React.CSSProperties = {
  width: "100%",
  padding: "9px 11px",
  borderRadius: 9,
  border: "1px solid #2d333f",
  background: "#0f1115",
  color: "#e8eaed",
  fontSize: 14,
  marginBottom: 6,
  outline: "none",
};
function Label({ children }: { children: React.ReactNode }) {
  return <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#9aa3b2", margin: "8px 0 4px" }}>{children}</label>;
}
const primaryBtn: React.CSSProperties = {
  padding: "10px 16px",
  borderRadius: 9,
  border: 0,
  background: "linear-gradient(135deg,#6b39e8,#9b5cf0)",
  color: "#fff",
  fontWeight: 700,
  fontSize: 13,
  cursor: "pointer",
};
const ghostBtn: React.CSSProperties = {
  padding: "8px 14px",
  borderRadius: 8,
  border: "1px solid #2d333f",
  background: "#2d333f",
  color: "#e2e6ec",
  fontWeight: 600,
  fontSize: 13,
  cursor: "pointer",
};
const dangerBtn: React.CSSProperties = { ...ghostBtn, background: "#4a2740", color: "#ffb0cd" };
