import type { Metadata } from "next";
import { Geist_Mono, Inter, Noto_Sans_Sinhala, Noto_Sans_Tamil, Plus_Jakarta_Sans } from "next/font/google";
import { AuthProvider } from "@/lib/auth-context";
import "./globals.css";

// Body: Inter. Headings: Plus Jakarta Sans. Noto Sinhala/Tamil are fallbacks for si/ta text
// (Latin fonts have no glyphs for them) — they only download when those scripts appear.
const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const jakarta = Plus_Jakarta_Sans({ variable: "--font-jakarta", subsets: ["latin"], weight: ["600", "700", "800"] });
const notoSinhala = Noto_Sans_Sinhala({ variable: "--font-noto-sinhala", subsets: ["sinhala"], preload: false });
const notoTamil = Noto_Sans_Tamil({ variable: "--font-noto-tamil", subsets: ["tamil"], preload: false });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Uparima Support",
  description: "Uparima Support Portal",
};

// Applies the saved/OS theme before first paint to avoid a light→dark flash.
const THEME_SCRIPT = `try{var t=localStorage.getItem("support_theme");if(t==="dark"||(!t&&matchMedia("(prefers-color-scheme: dark)").matches))document.documentElement.classList.add("dark")}catch(e){}`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  const fonts = [inter, jakarta, notoSinhala, notoTamil, geistMono].map((f) => f.variable).join(" ");
  return (
    <html lang="en" suppressHydrationWarning className={`${fonts} h-full antialiased`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
