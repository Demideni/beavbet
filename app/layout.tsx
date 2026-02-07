import type { Metadata } from "next";
import "./globals.css";
import { Sidebar } from "@/app/components/Sidebar";
import { Topbar } from "@/app/components/Topbar";

export const metadata: Metadata = {
  title: "BeavBet — Crypto Casino",
  description: "BeavBet lobby (MVP UI).",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body>
        <div className="min-h-screen flex">
          <Sidebar />
          <div className="flex-1 min-w-0">
            <Topbar />
            <main className="px-4 lg:px-6 py-5 lg:py-7">
              <div className="max-w-[1400px] mx-auto">
                {children}
              </div>
            </main>
          </div>
        </div>
      </body>
    </html>
  );
}
