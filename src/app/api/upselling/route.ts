import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireServerSession } from '@/lib/auth-helpers'

// GET: Dashboard-Daten + Config
export async function GET() {
  const session = await requireServerSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Config laden
    let config = await prisma.upsellConfig.findUnique({
      where: { id: 'singleton' }
    })

    if (!config) {
      config = await prisma.upsellConfig.create({
        data: { id: 'singleton' }
      })
    }

    // Alle Trigger laden
    const triggers = await prisma.upsellTrigger.findMany({
      orderBy: [
        { priority: 'desc' },
        { createdAt: 'desc' }
      ],
      take: 100
    })

    // Statistiken
    const stats = {
      total: triggers.length,
      new: triggers.filter(t => t.status === 'new').length,
      contacted: triggers.filter(t => t.status === 'contacted').length,
      converted: triggers.filter(t => t.status === 'converted').length,
      dismissed: triggers.filter(t => t.status === 'dismissed').length,
      highPriority: triggers.filter(t => t.priority === 'high' && t.status === 'new').length
    }

    // Trigger nach Typ gruppieren
    const byType = {
      users: triggers.filter(t => t.triggerType === 'users').length,
      tasks: triggers.filter(t => t.triggerType === 'tasks').length,
      api_cost: triggers.filter(t => t.triggerType === 'api_cost').length,
      storage: triggers.filter(t => t.triggerType === 'storage').length,
      feature_request: triggers.filter(t => t.triggerType === 'feature_request').length
    }

    // Conversion Rate berechnen
    const closedTriggers = triggers.filter(t => ['converted', 'dismissed'].includes(t.status))
    const conversionRate = closedTriggers.length > 0
      ? (triggers.filter(t => t.status === 'converted').length / closedTriggers.length * 100).toFixed(1)
      : '0.0'

    return NextResponse.json({
      config: {
        enabled: config.enabled,
        userThreshold: config.userThreshold,
        taskMonthlyThreshold: config.taskMonthlyThreshold,
        apiCostThreshold: config.apiCostThreshold,
        storageThreshold: config.storageThreshold,
        cooldownDays: config.cooldownDays,
        alertTelegram: config.alertTelegram,
        alertEmail: config.alertEmail
      },
      stats,
      byType,
      conversionRate: parseFloat(conversionRate),
      triggers: triggers.map(t => ({
        id: t.id,
        tenantId: t.tenantId,
        tenantName: t.tenantName,
        triggerType: t.triggerType,
        triggerValue: t.triggerValue,
        threshold: t.threshold,
        suggestedPlan: t.suggestedPlan,
        message: t.message,
        status: t.status,
        priority: t.priority,
        notes: t.notes,
        createdAt: t.createdAt,
        contactedAt: t.contactedAt,
        convertedAt: t.convertedAt
      }))
    })

  } catch (error) {
    console.error('Upselling data error:', error)
    return NextResponse.json(
      { error: 'Failed to load upselling data' },
      { status: 500 }
    )
  }
}

// PUT: Config aktualisieren
export async function PUT(req: Request) {
  const session = await requireServerSession()
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Admin required' }, { status: 403 })
  }

  try {
    const body = await req.json()

    const config = await prisma.upsellConfig.upsert({
      where: { id: 'singleton' },
      update: {
        enabled: body.enabled ?? undefined,
        userThreshold: body.userThreshold ?? undefined,
        taskMonthlyThreshold: body.taskMonthlyThreshold ?? undefined,
        apiCostThreshold: body.apiCostThreshold ?? undefined,
        storageThreshold: body.storageThreshold ?? undefined,
        cooldownDays: body.cooldownDays ?? undefined,
        alertTelegram: body.alertTelegram ?? undefined,
        alertEmail: body.alertEmail ?? undefined,
        alertEmails: body.alertEmails ?? undefined
      },
      create: {
        id: 'singleton',
        enabled: body.enabled ?? true,
        userThreshold: body.userThreshold ?? 5,
        taskMonthlyThreshold: body.taskMonthlyThreshold ?? 100,
        apiCostThreshold: body.apiCostThreshold ?? 20.0,
        storageThreshold: body.storageThreshold ?? 500,
        cooldownDays: body.cooldownDays ?? 30,
        alertTelegram: body.alertTelegram ?? true,
        alertEmail: body.alertEmail ?? false,
        alertEmails: body.alertEmails ?? []
      }
    })

    return NextResponse.json({
      success: true,
      config: {
        enabled: config.enabled,
        userThreshold: config.userThreshold,
        taskMonthlyThreshold: config.taskMonthlyThreshold,
        apiCostThreshold: config.apiCostThreshold,
        storageThreshold: config.storageThreshold,
        cooldownDays: config.cooldownDays,
        alertTelegram: config.alertTelegram,
        alertEmail: config.alertEmail
      }
    })

  } catch (error) {
    console.error('Upselling config update error:', error)
    return NextResponse.json(
      { error: 'Failed to update config' },
      { status: 500 }
    )
  }
}
