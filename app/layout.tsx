// app/layout.tsx
import "./globals.css";
import type { ReactNode } from "react";
import BottomNav from "@/components/BottomNav";
import PulzBootOverlay from "@/components/PulzBootOverlay";
import TopBar from "@/components/TopBar";
import DesktopSidebar from "@/components/DesktopSidebar";

export const metadata = {
  title: "Robinson",
  manifest: "/manifest.json",
  themeColor: "#000000",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black"
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ru" className="bg-black text-slate-100">
      <link rel="apple-touch-icon" href="/pwa/apple-touch-icon.png" />
      <body className="bg-black text-slate-100 antialiased">
        {/* фирменная загрузка (overlay) */}
        <PulzBootOverlay />

        <div className="pulz-animated-bg flex min-h-screen flex-col">
          {/* TOP BAR */}
          <TopBar />

          {/* КОНТЕНТ СТРАНИЦЫ */}
          <div className="mx-auto flex w-full max-w-[1400px] flex-1 flex-col lg:flex-row">
            <DesktopSidebar />
            <main className="flex w-full flex-1 flex-col px-0 pb-2 pt-2 lg:px-6 lg:pt-6">
              {children}
            </main>
          </div>

          {/* FOOTER: 3 CTA кнопки (всё в Telegram) */}
          <footer className="border-t border-slate-900/60">
            <div className="footer-cta">
              <div className="footer-cta-panel">
                <div className="footer-cta-stack">
                  <a
                    className="footer-cta-link"
                    href="https://t.me/grandfather_jack"
                    target="_blank"
                    rel="noreferrer"
                    aria-label="Интеграция в проекты — написать в Telegram"
                  >
                    <img
                      src="/cta/integration.png"
                      alt="Интеграция в проекты"
                      className="footer-cta-img"
                    />
                  </a>

                  <a
                    className="footer-cta-link"
                    href="https://t.me/grandfather_jack"
                    target="_blank"
                    rel="noreferrer"
                    aria-label="Стать аффилейтом — написать в Telegram"
                  >
                    <img
                      src="/cta/affiliate.png"
                      alt="Стать аффилейтом"
                      className="footer-cta-img"
                    />
                  </a>

                  <a
                    className="footer-cta-link"
                    href="https://t.me/grandfather_jack"
                    target="_blank"
                    rel="noreferrer"
                    aria-label="Предложения — написать в Telegram"
                  >
                    <img
                      src="/cta/offers.png"
                      alt="Предложения"
                      className="footer-cta-img"
                    />
                  </a>
                </div>
              </div>
            </div>
          </footer>

          {/* НИЖНИЙ ТАП-БАР С КОЛЕСОМ */}
          <div className="lg:hidden"><BottomNav /></div>
        </div>
      </body>
    </html>
  );
}
