import type { Metadata } from "next";
import { Fraunces, Source_Sans_3, Geist_Mono } from "next/font/google";
import "./globals.css";

const display = Fraunces({
  variable: "--font-display",
  subsets: ["latin"],
});

const body = Source_Sans_3({
  variable: "--font-body",
  subsets: ["latin", "latin-ext"],
  weight: ["600", "700"],
});

const mono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ACAP — African Organisation for Standardisation (ARSO)",
  description:
    "ARSO Conformity Assessment Programme (ACAP). One Standard — One Test — One Certificate — Accepted Everywhere.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      translate="no"
      suppressHydrationWarning
      className={`${display.variable} ${body.variable} ${mono.variable} h-full`}
    >
      <body className="relative min-h-full" suppressHydrationWarning>
        <script
          dangerouslySetInnerHTML={{
            __html:
              'try{var v=localStorage.getItem("acap-font-size");if(v==="small"||v==="smaller"||v==="smallest")document.documentElement.dataset.fontSize=v}catch(e){}',
          }}
        />
        {children}
      </body>
    </html>
  );
}
