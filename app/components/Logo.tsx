import Image from "next/image";
import Link from "next/link";

export function Logo() {
  return (
    <Link href="/" className="flex items-center gap-3 select-none">
      <div className="relative h-10 w-10">
        <Image src="/brand/logo-mark.svg" alt="BeavBet" fill className="object-contain" priority />
      </div>
      <div className="leading-none">
        <div className="text-lg font-extrabold tracking-tight">
          <span className="text-white">BEAV</span>
          <span className="text-accent">BET</span>
        </div>
        <div className="text-[11px] text-white/55 -mt-0.5">Crypto Casino</div>
      </div>
    </Link>
  );
}
