"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export type CollectionView = {
  id: string;
  slug: string;
  name: string;
  eyebrow: string | null;
  title: string | null;
  description: string | null;
  status: string;
  comingSoon: boolean;
  comingSoonDate: string | null;
};

export default function AdminCollections({ collections }: { collections: CollectionView[] }) {
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
      <AddCollection busy={busy} onCreate={(p) => call("/api/admin/collections", p)} />
      <div style={{ display: "grid", gap: 14, marginTop: 20 }}>
        {collections.map((c) => (
          <CollectionRow key={c.id} c={c} busy={busy} call={call} />
        ))}
      </div>
    </div>
  );
}

type CopyFields = {
  name: string;
  eyebrow: string;
  title: string;
  description: string;
  comingSoon: boolean;
  comingSoonDate: string;
};

function AddCollection({ busy, onCreate }: { busy: boolean; onCreate: (p: CopyFields) => Promise<boolean> }) {
  const [open, setOpen] = useState(false);
  const [f, setF] = useState<CopyFields>({ name: "", eyebrow: "", title: "", description: "", comingSoon: false, comingSoonDate: "" });

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} style={primaryBtn}>
        + Add collection
      </button>
    );
  }
  return (
    <div style={card}>
      <div style={{ fontWeight: 700, marginBottom: 12 }}>New collection</div>
      <Fields f={f} setF={setF} />
      <div style={{ marginTop: 14, display: "flex", gap: 8 }}>
        <button
          disabled={busy || !f.name.trim()}
          style={primaryBtn}
          onClick={async () => {
            if (await onCreate(f)) {
              setF({ name: "", eyebrow: "", title: "", description: "", comingSoon: false, comingSoonDate: "" });
              setOpen(false);
            }
          }}
        >
          Create
        </button>
        <button onClick={() => setOpen(false)} style={ghostBtn}>Cancel</button>
      </div>
    </div>
  );
}

function CollectionRow({
  c,
  busy,
  call,
}: {
  c: CollectionView;
  busy: boolean;
  call: (url: string, payload: unknown) => Promise<boolean>;
}) {
  const [editing, setEditing] = useState(false);
  const [f, setF] = useState<CopyFields>({
    name: c.name,
    eyebrow: c.eyebrow ?? "",
    title: c.title ?? "",
    description: c.description ?? "",
    comingSoon: c.comingSoon,
    comingSoonDate: c.comingSoonDate ?? "",
  });

  return (
    <div style={card}>
      {editing ? (
        <>
          <Fields f={f} setF={setF} />
          <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
            <button
              disabled={busy}
              style={primaryBtn}
              onClick={async () => {
                if (await call("/api/admin/collections/update", { id: c.id, ...f })) setEditing(false);
              }}
            >
              Save
            </button>
            <button onClick={() => setEditing(false)} style={ghostBtn}>Cancel</button>
          </div>
        </>
      ) : (
        <>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ fontSize: 16, fontWeight: 700 }}>{c.name}</div>
            <span style={{ background: c.status === "active" ? "#16361f" : "#2a2e36", color: c.status === "active" ? "#7ee2a0" : "#aab2c0", padding: "3px 9px", borderRadius: 99, fontSize: 11, fontWeight: 700 }}>
              {c.status === "active" ? "Visible" : "Hidden"}
            </span>
            {c.comingSoon && (
              <span style={{ background: "#332842", color: "#c9aef4", padding: "3px 9px", borderRadius: 99, fontSize: 11, fontWeight: 700 }}>
                Coming soon{c.comingSoonDate ? ` · ${c.comingSoonDate}` : ""}
              </span>
            )}
          </div>
          {c.eyebrow && <div style={{ color: "#9b8cf0", fontSize: 12, marginTop: 6, textTransform: "uppercase", letterSpacing: 0.6 }}>{c.eyebrow}</div>}
          {c.title && <div style={{ fontSize: 15, fontWeight: 600, marginTop: 2 }}>{c.title}</div>}
          {c.description && <div style={{ color: "#aeb6c2", fontSize: 13, marginTop: 4, lineHeight: 1.5 }}>{c.description}</div>}
          <div style={{ color: "#5b6473", fontSize: 11, marginTop: 6 }}>slug: {c.slug}</div>
          <div style={{ marginTop: 14, display: "flex", gap: 8 }}>
            <button onClick={() => setEditing(true)} disabled={busy} style={ghostBtn}>Edit copy</button>
            {c.status === "active" ? (
              <button onClick={() => call("/api/admin/collections/status", { id: c.id, status: "hidden" })} disabled={busy} style={ghostBtn}>Hide</button>
            ) : (
              <button onClick={() => call("/api/admin/collections/status", { id: c.id, status: "active" })} disabled={busy} style={ghostBtn}>Show</button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function Fields({ f, setF }: { f: CopyFields; setF: (f: CopyFields) => void }) {
  return (
    <>
      <Label>Collection name (e.g. Hello Kitty)</Label>
      <input style={input} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
      <Label>Eyebrow (e.g. Limited Edition · Hello Kitty)</Label>
      <input style={input} value={f.eyebrow} onChange={(e) => setF({ ...f, eyebrow: e.target.value })} />
      <Label>Title (e.g. Hello Kitty Visa Platinum)</Label>
      <input style={input} value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} />
      <Label>Description</Label>
      <textarea style={{ ...input, minHeight: 70, resize: "vertical" }} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} />
      <div style={{ marginTop: 10, padding: "10px 12px", border: "1px solid #2d333f", borderRadius: 9 }}>
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer" }}>
          <input type="checkbox" checked={f.comingSoon} onChange={(e) => setF({ ...f, comingSoon: e.target.checked })} />
          Coming soon (whole collection — visible but not purchasable)
        </label>
        {f.comingSoon && (
          <div style={{ marginTop: 8 }}>
            <Label>Estimated launch date (shown to customers)</Label>
            <input type="date" value={f.comingSoonDate} onChange={(e) => setF({ ...f, comingSoonDate: e.target.value })} style={input} />
          </div>
        )}
      </div>
    </>
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
