import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getSessionOrApiKey } from "@/lib/api-auth"

// GET /api/okr — List all objectives with key results
export async function GET(req: NextRequest) {
  const session = await getSessionOrApiKey(req)
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const period = searchParams.get("period")
  const projectId = searchParams.get("projectId")
  const status = searchParams.get("status")
  const includeArchived = searchParams.get("archived") === "true"

  const where: any = {}
  
  if (!includeArchived) {
    where.isArchived = false
  }
  
  if (period) {
    where.period = period
  }
  
  if (projectId) {
    where.projectId = projectId
  }
  
  if (status) {
    where.status = status
  }

  const objectives = await prisma.objective.findMany({
    where,
    include: {
      keyResults: {
        orderBy: { createdAt: "asc" }
      }
    },
    orderBy: [
      { period: "desc" },
      { createdAt: "desc" }
    ]
  })

  // Calculate objective progress from key results
  const objectivesWithProgress = objectives.map(obj => {
    if (obj.keyResults.length === 0) {
      return { ...obj, progress: 0 }
    }
    const avgProgress = Math.round(
      obj.keyResults.reduce((sum, kr) => sum + kr.progress, 0) / obj.keyResults.length
    )
    return { ...obj, progress: avgProgress }
  })

  return NextResponse.json(objectivesWithProgress)
}

// POST /api/okr — Create new objective
export async function POST(req: NextRequest) {
  const session = await getSessionOrApiKey(req)
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { title, description, period, deadline, status, projectId, ownerId, ownerName, keyResults } = body

    if (!title || !period) {
      return NextResponse.json(
        { error: "title and period are required" },
        { status: 400 }
      )
    }

    // Create objective with optional key results
    const objective = await prisma.objective.create({
      data: {
        title,
        description,
        period,
        deadline: deadline ? new Date(deadline) : null,
        status: status || "on-track",
        projectId,
        ownerId,
        ownerName,
        keyResults: keyResults ? {
          create: keyResults.map((kr: any) => ({
            title: kr.title,
            metric: kr.metric,
            current: kr.current || 0,
            target: kr.target || 100,
            unit: kr.unit,
            progress: kr.target ? Math.round((kr.current || 0) / kr.target * 100) : 0
          }))
        } : undefined
      },
      include: {
        keyResults: true
      }
    })

    return NextResponse.json(objective, { status: 201 })
  } catch (error) {
    console.error("Failed to create objective:", error)
    return NextResponse.json(
      { error: "Failed to create objective" },
      { status: 500 }
    )
  }
}
