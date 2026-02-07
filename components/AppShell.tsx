"use client";

import { useState } from "react";
import { Sidebar } from "@/app/components/Sidebar";
import { Topbar } from "@/app/components/Topbar";
import { MobileBottomNav } from "./MobileBottomNav";
import { MobileDrawer } from "./MobileDrawer";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [menu, setMenu] = useState(false);

  return (
    <div className="min-h-screen flex">
      <Sidebar />

      <div className="flex-1">
        <Topbar />

        <main className="px-4 py-5 pb-28 md:pb-6">
          {children}
        </main>

        <MobileBottomNav onMenu={() => setMenu(true)} />
        <MobileDrawer open={menu} onClose={() => setMenu(false)} />
      </div>
    </div>
  );
}
