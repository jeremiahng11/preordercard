import { redirect } from "next/navigation";
import { isAdminAuthed, isAdminConfigured } from "@/lib/admin-auth";
import { resolveBaseUrl } from "@/lib/config";
import AdminNav from "@/components/AdminNav";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function ApiDocsPage() {
  if (!isAdminConfigured()) redirect("/admin");
  if (!(await isAdminAuthed())) redirect("/admin/login");

  const base = resolveBaseUrl();

  return (
    <div style={{ minHeight: "100vh", background: "#0f1115", color: "#e8eaed", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ maxWidth: 860, margin: "0 auto", padding: "28px 20px 64px" }}>
        <AdminNav />
        <h1 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 8px" }}>Redemption API — for the Aleta Adventure app</h1>

        <P>
          Hand this to the app developers. It lets the Aleta Adventure app validate a Cinnamoroll gift code and
          redeem it (once per purchase) so the user receives their Visa Platinum card at $0.
        </P>

        <H>Basics</H>
        <ul style={ul}>
          <li><b>Base URL:</b> <Code>{base}</Code></li>
          <li><b>Auth:</b> send the partner key on every request — <Code>x-api-key: &lt;REDEEM_API_KEY&gt;</Code> (or <Code>Authorization: Bearer &lt;key&gt;</Code>)</li>
          <li><b>Content-Type:</b> <Code>application/json</Code></li>
          <li><b>Amounts</b> are in the currency&apos;s minor unit (<Code>1800</Code> = SGD&nbsp;18.00).</li>
          <li><b>Code format:</b> <Code>CNR-XXXX-XXXX</Code> (uppercase; no <Code>0 O 1 I</Code>).</li>
          <li>A code is redeemable only <b>after payment succeeds</b>, and exactly <b>once</b> (atomic — no double-spend).</li>
        </ul>

        <H>1. Validate a code (no side effects)</H>
        <P>Use to show &quot;valid ✓&quot; before committing.</P>
        <Pre>{`GET ${base}/api/redeem/validate?code=CNR-AB2C-9XYZ
x-api-key: <REDEEM_API_KEY>

200 →
{
  "valid": true,
  "redeemable": true,        // true only when status === "active"
  "status": "active",
  "amount": 1800,
  "currency": "SGD",
  "design": "pinkcloud",
  "recipientName": "Mei Ling"
}`}</Pre>

        <H>2. Redeem a code (single use)</H>
        <P>Burns the code — call when the user applies the card.</P>
        <Pre>{`POST ${base}/api/redeem
x-api-key: <REDEEM_API_KEY>
Content-Type: application/json

{ "code": "CNR-AB2C-9XYZ", "userRef": "aleta-user-123" }

200 →
{
  "valid": true,
  "status": "redeemed",
  "code": "CNR-AB2C-9XYZ",
  "amount": 1800,
  "currency": "SGD",
  "design": "pinkcloud",
  "recipientName": "Mei Ling",
  "redeemedAt": "2026-06-30T09:15:00.000Z",
  "merOrderId": "GAC1a2b3c..."
}`}</Pre>

        <H>Failure responses</H>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, marginTop: 8 }}>
          <thead>
            <tr>
              <Th>HTTP</Th>
              <Th>reason</Th>
              <Th>Meaning</Th>
            </tr>
          </thead>
          <tbody>
            {[
              ["400", "BAD_REQUEST", "Missing/invalid code format"],
              ["401", "UNAUTHORIZED", "Missing or wrong API key"],
              ["402", "NOT_PAID", "Purchase payment not completed yet"],
              ["404", "NOT_FOUND", "No such code"],
              ["409", "ALREADY_REDEEMED", "Code already used (includes redeemedAt)"],
              ["409", "NOT_REDEEMABLE", "Code revoked / cancelled / expired"],
              ["500", "SERVER_ERROR", "Server-side issue"],
            ].map((r) => (
              <tr key={r[1]}>
                <Td mono>{r[0]}</Td>
                <Td mono>{r[1]}</Td>
                <Td>{r[2]}</Td>
              </tr>
            ))}
          </tbody>
        </table>
        <P>All failures return <Code>{`{ "valid": false, "reason": "...", "message": "..." }`}</Code>.</P>

        <H>cURL</H>
        <Pre>{`# validate
curl -s "${base}/api/redeem/validate?code=CNR-AB2C-9XYZ" \\
  -H "x-api-key: $REDEEM_API_KEY"

# redeem
curl -s -X POST "${base}/api/redeem" \\
  -H "x-api-key: $REDEEM_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"code":"CNR-AB2C-9XYZ","userRef":"aleta-user-123"}'`}</Pre>

        <P>
          Treat <Code>POST /api/redeem</Code> as the authoritative commit — <Code>validate</Code> is advisory and a
          code could be redeemed by another device between the two calls.
        </P>
      </div>
    </div>
  );
}

const ul: React.CSSProperties = { color: "#c4cbd6", fontSize: 14, lineHeight: 1.9, paddingLeft: 20 };

function P({ children }: { children: React.ReactNode }) {
  return <p style={{ color: "#c4cbd6", fontSize: 14, lineHeight: 1.6, margin: "12px 0" }}>{children}</p>;
}
function H({ children }: { children: React.ReactNode }) {
  return <h2 style={{ fontSize: 15, fontWeight: 700, marginTop: 28, marginBottom: 4, color: "#fff" }}>{children}</h2>;
}
function Code({ children }: { children: React.ReactNode }) {
  return (
    <code style={{ background: "#1b1f27", border: "1px solid #262b36", borderRadius: 6, padding: "1px 6px", fontSize: 12.5 }}>
      {children}
    </code>
  );
}
function Pre({ children }: { children: React.ReactNode }) {
  return (
    <pre
      style={{
        background: "#15181f",
        border: "1px solid #20242d",
        borderRadius: 10,
        padding: 16,
        overflowX: "auto",
        fontSize: 12.5,
        lineHeight: 1.55,
        color: "#d7dde6",
      }}
    >
      {children}
    </pre>
  );
}
function Th({ children }: { children: React.ReactNode }) {
  return (
    <th style={{ textAlign: "left", padding: "8px 10px", borderBottom: "1px solid #262b36", color: "#7c8595", fontSize: 11, textTransform: "uppercase" }}>
      {children}
    </th>
  );
}
function Td({ children, mono }: { children: React.ReactNode; mono?: boolean }) {
  return (
    <td style={{ padding: "8px 10px", borderBottom: "1px solid #20242d", fontFamily: mono ? "ui-monospace, monospace" : undefined, color: "#d7dde6" }}>
      {children}
    </td>
  );
}
