import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    // Quick DB check
    const count = await prisma.task.count();
    return NextResponse.json({
      status: "ok",
      tasks: count,
      ts: new Date().toISOString(),
      version: "loop4-c248f8e",
    });
  } catch (error) {
    return NextResponse.json({
      status: "error",
      error: String(error),
      ts: new Date().toISOString(),
      version: "loop4-c248f8e",
    }, { status: 500 });
  }
}
