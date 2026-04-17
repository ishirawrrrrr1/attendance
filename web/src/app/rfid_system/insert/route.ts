import { NextResponse } from "next/server";

import { processAttendanceScan } from "@/lib/db/queries";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const uid = searchParams.get("uid") ?? "";
  const pin = searchParams.get("pin") ?? "";

  try {
    const result = await processAttendanceScan(uid, pin);
    return new NextResponse(result.message, {
      headers: {
        "content-type": "text/plain; charset=utf-8"
      }
    });
  } catch {
    return new NextResponse("DENIED", {
      headers: {
        "content-type": "text/plain; charset=utf-8"
      }
    });
  }
}
