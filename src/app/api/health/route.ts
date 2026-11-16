import { NextResponse } from "next/server";

import { connectToDatabase } from "@/lib/db";

export async function GET() {
  try {
    await connectToDatabase();
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, error: "Database unavailable" }, { status: 500 });
  }
}
