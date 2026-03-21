import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// POST /api/admin/update-projects - One-time fix for project status
export async function POST() {
  try {
    // Update Mobile App
    await prisma.project.update({
      where: { id: "cmmv4rsoi000481sk2jynvo68" },
      data: {
        status: "active",
        progress: 65,
        priority: "high",
      },
    });

    // Update Website
    await prisma.project.update({
      where: { id: "cmmv4rsng000281skzfkvnpm8" },
      data: {
        progress: 90,
      },
    });

    return NextResponse.json({ success: true, message: "Projects updated" });
  } catch (error) {
    console.error("[POST /api/admin/update-projects]", error);
    return NextResponse.json(
      { error: "Failed to update projects" },
      { status: 500 }
    );
  }
}
