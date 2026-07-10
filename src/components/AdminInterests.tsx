"use client";

export type InterestView = {
  id: string;
  fullName: string;
  email: string;
  mobile: string;
  productName: string;
  productCode: string;
  priceMinor: number;
  currency: string;
  promoCode: string | null;
  promoDiscountPercent: number | null;
  createdAt: string;
};

function formatCurrency(minor: number, currency: string) {
  const sym = currency === "SGD" ? "S$" : currency + " ";
  return sym + (minor / 100).toFixed(2);
}

export default function AdminInterests({ interests }: { interests: InterestView[] }) {
  return (
    <div style={{ background: "#11151f", border: "1px solid #242d3e", borderRadius: 18, overflow: "hidden" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <thead>
          <tr>
            <th style={th}>Name</th>
            <th style={th}>Email</th>
            <th style={th}>Mobile</th>
            <th style={th}>Product</th>
            <th style={th}>Code</th>
            <th style={th}>Price</th>
            <th style={th}>Promo Code</th>
            <th style={th}>Created</th>
          </tr>
        </thead>
        <tbody>
          {interests.map((item) => (
            <tr key={item.id} style={row}>
              <td style={td}>{item.fullName}</td>
              <td style={td}>{item.email}</td>
              <td style={td}>{item.mobile}</td>
              <td style={td}>{item.productName}</td>
              <td style={td}>{item.productCode}</td>
              <td style={td}>{formatCurrency(item.priceMinor, item.currency)}</td>
              <td style={td}>{item.promoCode ? `${item.promoCode} (${item.promoDiscountPercent ?? 0}%)` : "—"}</td>
              <td style={td}>{item.createdAt}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const th: React.CSSProperties = {
  textAlign: "left",
  padding: "12px 14px",
  borderBottom: "1px solid #242d3e",
  color: "#9aa3b2",
};

const td: React.CSSProperties = {
  padding: "12px 14px",
  borderBottom: "1px solid #181c24",
};

const row: React.CSSProperties = {
  background: "#0f1115",
};
