import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getSessionOrApiKey } from "@/lib/auth-utils"

// POST /api/okr/[id]/key-results — Add key result to objective
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSessionOrApiKey(req)
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id: objectiveId } = await params

  try {
    const body = await req.json()
    const { title, metric, current, target, unit } = body

    if (!title) {
      return NextResponse.json(
        { error: "title is required" },
        { status: 400 }
      )
    }

    // Check objective exists
    const objective = await prisma.objective.findUnique({
      where: { id: objectiveId }
    })

    if (!objective) {
      return NextResponse.json(
        { error: "Objective not found" },
        { status: 404 }
      )
    }

    const targetValue = target || 100
    const currentValue = current || 0
    const progress = targetValue > 0 ? Math.round((currentValue / targetValue) * 100) : 0

    const keyResult = await prisma.keyResult.create({
      data: {
        objectiveId,
        title,
        metric,
        current: currentValue,
        target: targetValue,
        unit,
        progress: Math.min(100, Math.max(0, progress))
      }
    })

    // Update objective progress
    await updateObjectiveProgress(objectiveId)

    return NextResponse.json(keyResult, { status: 201 })
  } catch (error) {
    console.error("Failed to create key result:", error)
    return NextResponse.json(
      { error: "Failed to create key result" },
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
  } else if (avgProgress < 50) {
    // Check if deadline is approaching
    const objective = await prisma.objective.findUnique({
      where: { id: objectiveId }
    })
    if (objective?.deadline) {
      const daysUntilDeadline = Math.ceil(
        (new Date(objective.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      )
      if (daysUntilDeadline < 14 && avgProgress < 70) {
        status = "at-risk"
      }
    }
  }

  await prisma.objective.update({
    where: { id: objectiveId },
    data: { progress: avgProgress, status }
  })
}
