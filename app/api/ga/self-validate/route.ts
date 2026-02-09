import { NextResponse } from "next/server";
import { z } from "zod";
import { gaSelfValidate } from "@/lib/gaClient";

export const runtime = "nodejs";

const Body = z.object({ session_id: z.string().min(1) });

export async function POST(req: Request) {
  try {
    const { session_id } = Body.parse(await req.json());
    const data = await gaSelfValidate(session_id);
    return NextResponse.json({ ok: true, data }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? String(e) }, { status: 500 });
  }
}
