import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getSessionOrApiKey } from "@/lib/auth-utils"

// PUT /api/okr/key-results/[krId] — Update key result
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ krId: string }> }
) {
  const session = await getSessionOrApiKey(req)
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { krId } = await params

  try {
    const body = await req.json()
    const { title, metric, current, target, unit } = body

    // Get existing key result
    const existing = await prisma.keyResult.findUnique({
      where: { id: krId }
    })

    if (!existing) {
      return NextResponse.json(
        { error: "Key result not found" },
        { status: 404 }
      )
    }

    // Calculate new progress
    const newTarget = target !== undefined ? target : existing.target
    const newCurrent = current !== undefined ? current : existing.current
    const progress = newTarget > 0 ? Math.round((newCurrent / newTarget) * 100) : 0

    const keyResult = await prisma.keyResult.update({
      where: { id: krId },
      data: {
        ...(title !== undefined && { title }),
        ...(metric !== undefined && { metric }),
        ...(current !== undefined && { current }),
        ...(target !== undefined && { target }),
        ...(unit !== undefined && { unit }),
        progress: Math.min(100, Math.max(0, progress))
      }
    })

    // Update objective progress
    await updateObjectiveProgress(existing.objectiveId)

    return NextResponse.json(keyResult)
  } catch (error) {
    console.error("Failed to update key result:", error)
    return NextResponse.json(
      { error: "Failed to update key result" },
      { status: 500 }
    )
  }
}

// DELETE /api/okr/key-results/[krId] — Delete key result
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ krId: string }> }
) {
  const session = await getSessionOrApiKey(req)
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { krId } = await params

  try {
    const existing = await prisma.keyResult.findUnique({
      where: { id: krId }
    })

    if (!existing) {
      return NextResponse.json(
        { error: "Key result not found" },
        { status: 404 }
      )
    }

    await prisma.keyResult.delete({
      where: { id: krId }
    })

    // Update objective progress
    await updateObjectiveProgress(existing.objectiveId)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Failed to delete key result:", error)
    return NextResponse.json(
      { error: "Failed to delete key result" },
      { status: 500 }
    )
  }
}

async function updateObjectiveProgress(objectiveId: string) {
  const keyResults = await prisma.keyResult.findMany({
    where: { objectiveId }
  })

  if (keyResults.length === 0) {
    await prisma.objective.update({
      where: { id: objectiveId },
      data: { progress: 0 }
    })
    return
  }

  const avgProgress = Math.round(
    keyResults.reduce((sum, kr) => sum + kr.progress, 0) / keyResults.length
  )

  // Auto-update status based on progress
  let status = "on-track"
  if (avgProgress >= 100) {
    status = "completed"
  } else if (avgProgress < 30) {
    status = "at-risk"
  }

  await prisma.objective.update({
    where: { id: objectiveId },
    data: { progress: avgProgress, status }
  })
}
