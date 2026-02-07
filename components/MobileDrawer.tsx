"use client";

import Link from "next/link";

export function MobileDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] md:hidden">
      <div
        className="absolute inset-0 bg-black/60"
        onClick={onClose}
      />

      <div className="absolute left-0 top-0 bottom-0 w-[85%] max-w-[360px] bg-bg border-r border-white/10 p-4 overflow-y-auto">
        <div className="font-extrabold text-xl mb-4">🦫 BeavBet</div>

        <div className="space-y-2">
          <Row href="/casino" label="Казино" onClose={onClose}/>
          <Row href="/sport" label="Sports" onClose={onClose}/>
          <Row href="/promos" label="Акции" onClose={onClose}/>
          <Row href="/vip" label="VIP клуб" onClose={onClose}/>
          <Row href="/support" label="Поддержка" onClose={onClose}/>
        </div>
      </div>
    </div>
  );
}

function Row({ href, label, onClose }:{
  href:string, label:string, onClose:()=>void
}) {
  return (
    <Link
      href={href}
      onClick={onClose}
      className="block px-3 py-3 rounded-xl hover:bg-white/5 text-white/80"
    >
      {label}
    </Link>
  );
}
