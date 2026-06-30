import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Cinnamoroll × Aleta — Gift a Card",
  description:
    "Give the prettiest way to pay. A collectible Cinnamoroll Visa Platinum gift card, paid with Visa or Mastercard via Aleta Planet.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#FBF5F8",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
