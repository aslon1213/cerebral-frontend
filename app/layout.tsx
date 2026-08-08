import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  // `template` lets each page set just its own name.
  title: { default: "Cerebral", template: "%s · Cerebral" },
  description: "Projects, tasks and labels",
};

/** The library is dark-only, so the browser is told as much up front. */
export const viewport = {
  colorScheme: "dark",
  themeColor: "#181921",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // Polaris used to supply the typeface and page surface from Shopify's CDN.
    // The Linear design system replaces both: the tokens and base styles live
    // in `globals.css`, and Inter is asked for by name rather than fetched at
    // build time, so no network call is needed to render the app.
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
