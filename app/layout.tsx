import type { Metadata } from "next";
import "./globals.css";
import { Sidebar } from "@/app/components/Sidebar";
import { Topbar } from "@/app/components/Topbar";
import { MobileNav } from "@/app/components/MobileNav";
import RefCapture from "@/app/components/RefCapture";
import { Suspense } from "react";
import DepositBoostToast from "@/components/DepositBoostToast";


export const metadata: Metadata = {
  title: "BeavBet — Crypto Casino",
  description: "BeavBet lobby (MVP UI).",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body>
        {/* RefCapture uses useSearchParams(), so it must be wrapped in Suspense */}
        <Suspense fallback={null}>
          <RefCapture />
        </Suspense>
        <div className="min-h-screen flex">
          <Sidebar />
          <div className="flex-1 min-w-0">
            <Topbar />
            {/* leave space for bottom nav on mobile */}
            <main className="px-4 lg:px-6 py-4 lg:py-7 pb-24 md:pb-6">
              <div className="max-w-[1400px] mx-auto">
                {children}
              </div>
            </main>
          </div>
        </div>

        {/* Deposit boost toast */}
        <DepositBoostToast minutes={30} percent={170} />

        {/* Mobile bottom tab bar (matches the reference mobile UI) */}
        <MobileNav />
      </body>
    </html>
  );
}
