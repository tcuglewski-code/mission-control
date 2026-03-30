import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getSessionOrApiKey } from "@/lib/auth-utils"

// GET /api/okr/[id] — Get single objective with key results
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSessionOrApiKey(req)
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params

  const objective = await prisma.objective.findUnique({
    where: { id },
    include: {
      keyResults: {
        orderBy: { createdAt: "asc" }
      }
    }
  })

  if (!objective) {
    return NextResponse.json({ error: "Objective not found" }, { status: 404 })
  }

  // Calculate progress
  const progress = objective.keyResults.length > 0
    ? Math.round(objective.keyResults.reduce((sum, kr) => sum + kr.progress, 0) / objective.keyResults.length)
    : 0

  return NextResponse.json({ ...objective, progress })
}

// PUT /api/okr/[id] — Update objective
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSessionOrApiKey(req)
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params

  try {
    const body = await req.json()
    const { title, description, period, deadline, status, projectId, ownerId, ownerName, isArchived } = body

    const objective = await prisma.objective.update({
      where: { id },
      data: {
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description }),
        ...(period !== undefined && { period }),
        ...(deadline !== undefined && { deadline: deadline ? new Date(deadline) : null }),
        ...(status !== undefined && { status }),
        ...(projectId !== undefined && { projectId }),
        ...(ownerId !== undefined && { ownerId }),
        ...(ownerName !== undefined && { ownerName }),
        ...(isArchived !== undefined && { isArchived })
      },
      include: {
        keyResults: true
      }
    })

    return NextResponse.json(objective)
  } catch (error) {
    console.error("Failed to update objective:", error)
    return NextResponse.json(
      { error: "Failed to update objective" },
      { status: 500 }
    )
  }
}

// DELETE /api/okr/[id] — Delete objective (cascades to key results)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSessionOrApiKey(req)
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params

  try {
    await prisma.objective.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Failed to delete objective:", error)
    return NextResponse.json(
      { error: "Failed to delete objective" },
      { status: 500 }
    )
  }
}
