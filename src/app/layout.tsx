import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Providers } from "@/components/providers";
import { ToastProvider } from "@/components/ui/toast";
import { ServiceWorkerRegister } from "@/components/service-worker";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

const APP_NAME = "CT Testing";
const APP_DESCRIPTION =
  "Industrial CT Testing Management System - 66 KV Current Transformer testing and reporting";

const BASE = process.env.NEXT_PUBLIC_BASE_PATH || "";

export const metadata: Metadata = {
  title: { default: APP_NAME, template: `%s | ${APP_NAME}` },
  description: APP_DESCRIPTION,
  applicationName: APP_NAME,
  manifest: `${BASE}/manifest.json`,
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: APP_NAME,
  },
  icons: {
    icon: `${BASE}/icon.png`,
    apple: `${BASE}/icon-192.png`,
  },
};

export const viewport: Viewport = {
  themeColor: "#005b91",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`} suppressHydrationWarning>
      <body className="min-h-full bg-background font-sans text-foreground">
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('ct-theme');var d=t==='dark';document.documentElement.classList.toggle('dark',d);}catch(e){}})();`,
          }}
        />
        <Providers>
          <ToastProvider>
            <ServiceWorkerRegister />
            {children}
          </ToastProvider>
        </Providers>
      </body>
    </html>
  );
}