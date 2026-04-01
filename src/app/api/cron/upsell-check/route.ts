import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyCronAuth } from '@/lib/cron-auth'
import { logActivity } from '@/lib/audit'

// Cron: Täglich um 10:00 UTC — Upselling-Trigger prüfen
// 0 10 * * *

interface TriggerResult {
  tenantId: string
  tenantName: string
  triggerType: string
  triggerValue: number
  threshold: number
  suggestedPlan: string
  message: string
  priority: string
}

export async function GET(req: Request) {
  const authResult = verifyCronAuth(req)
  if (!authResult.authorized) {
    return NextResponse.json({ error: authResult.reason }, { status: 401 })
  }

  try {
    // 1. Config laden (oder Default erstellen)
    let config = await prisma.upsellConfig.findUnique({
      where: { id: 'singleton' }
    })

    if (!config) {
      config = await prisma.upsellConfig.create({
        data: { id: 'singleton' }
      })
    }

    if (!config.enabled) {
      return NextResponse.json({
        success: true,
        message: 'Upselling checks disabled',
        triggersFound: 0
      })
    }

    const triggers: TriggerResult[] = []
    const now = new Date()
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    const cooldownDate = new Date(now.getTime() - config.cooldownDays * 24 * 60 * 60 * 1000)

    // 2. Projekte als "Tenants" durchgehen
    const projects = await prisma.project.findMany({
      where: { archived: false },
      include: {
        members: true,
        tasks: {
          where: { createdAt: { gte: monthAgo } }
        }
      }
    })

    for (const project of projects) {
      // Prüfen ob bereits ein Trigger für diesen Tenant im Cooldown existiert
      const recentTrigger = await prisma.upsellTrigger.findFirst({
        where: {
          tenantId: project.id,
          createdAt: { gte: cooldownDate },
          status: { in: ['new', 'contacted'] }
        }
      })

      if (recentTrigger) continue // Cooldown aktiv

      // Trigger 1: Nutzer-Schwellwert
      const userCount = project.members.length
      if (userCount >= config.userThreshold) {
        triggers.push({
          tenantId: project.id,
          tenantName: project.name,
          triggerType: 'users',
          triggerValue: userCount,
          threshold: config.userThreshold,
          suggestedPlan: 'pro',
          message: `Projekt "${project.name}" hat ${userCount} Nutzer (Schwelle: ${config.userThreshold}). Pro-Plan für erweiterte Team-Features empfehlen.`,
          priority: userCount >= config.userThreshold * 2 ? 'high' : 'medium'
        })
      }

      // Trigger 2: Tasks pro Monat
      const taskCount = project.tasks.length
      if (taskCount >= config.taskMonthlyThreshold) {
        triggers.push({
          tenantId: project.id,
          tenantName: project.name,
          triggerType: 'tasks',
          triggerValue: taskCount,
          threshold: config.taskMonthlyThreshold,
          suggestedPlan: 'pro',
          message: `Projekt "${project.name}" hat ${taskCount} Tasks im letzten Monat (Schwelle: ${config.taskMonthlyThreshold}). Pro-Plan für unbegrenzte Tasks empfehlen.`,
          priority: taskCount >= config.taskMonthlyThreshold * 1.5 ? 'high' : 'medium'
        })
      }
    }

    // Trigger 3: API-Kosten (global über alle Projekte)
    const monthlyApiCost = await prisma.aiUsage.aggregate({
      where: { createdAt: { gte: monthAgo } },
      _sum: { costUsd: true }
    })

    const totalApiCost = monthlyApiCost._sum.costUsd || 0
    if (totalApiCost >= config.apiCostThreshold) {
      // Prüfen ob bereits ein API-Kosten-Trigger im Cooldown existiert
      const recentApiTrigger = await prisma.upsellTrigger.findFirst({
        where: {
          triggerType: 'api_cost',
          createdAt: { gte: cooldownDate },
          status: { in: ['new', 'contacted'] }
        }
      })

      if (!recentApiTrigger) {
        triggers.push({
          tenantId: 'global',
          tenantName: 'Gesamtplattform',
          triggerType: 'api_cost',
          triggerValue: totalApiCost,
          threshold: config.apiCostThreshold,
          suggestedPlan: 'enterprise',
          message: `Monatliche KI-Kosten: $${totalApiCost.toFixed(2)} (Schwelle: $${config.apiCostThreshold}). Enterprise-Plan für dedizierte Ressourcen anbieten.`,
          priority: totalApiCost >= config.apiCostThreshold * 2 ? 'high' : 'medium'
        })
      }
    }

    // Trigger 4: Feature-Anfragen in Tickets
    const featureTickets = await prisma.ticket.findMany({
      where: {
        category: 'feature',
        status: { not: 'closed' },
        createdAt: { gte: monthAgo }
      }
    })

    // Gruppieren nach Projekt
    const featureRequestsByProject = new Map<string, number>()
    for (const ticket of featureTickets) {
      if (ticket.projectId) {
        const count = featureRequestsByProject.get(ticket.projectId) || 0
        featureRequestsByProject.set(ticket.projectId, count + 1)
      }
    }

    for (const [projectId, count] of featureRequestsByProject) {
      if (count >= 3) { // Ab 3 Feature-Requests
        const project = projects.find(p => p.id === projectId)
        if (!project) continue

        // Cooldown-Check
        const recentFeatureTrigger = await prisma.upsellTrigger.findFirst({
          where: {
            tenantId: projectId,
            triggerType: 'feature_request',
            createdAt: { gte: cooldownDate },
            status: { in: ['new', 'contacted'] }
          }
        })

        if (!recentFeatureTrigger) {
          triggers.push({
            tenantId: projectId,
            tenantName: project.name,
            triggerType: 'feature_request',
            triggerValue: count,
            threshold: 3,
            suggestedPlan: 'custom',
            message: `Projekt "${project.name}" hat ${count} offene Feature-Anfragen. Custom-Development oder Module-Upsell anbieten.`,
            priority: count >= 5 ? 'high' : 'medium'
          })
        }
      }
    }

    // 3. Trigger in DB speichern
    const createdTriggers = []
    for (const trigger of triggers) {
      const created = await prisma.upsellTrigger.create({
        data: {
          tenantId: trigger.tenantId,
          tenantName: trigger.tenantName,
          triggerType: trigger.triggerType,
          triggerValue: trigger.triggerValue,
          threshold: trigger.threshold,
          suggestedPlan: trigger.suggestedPlan,
          message: trigger.message,
          priority: trigger.priority
        }
      })
      createdTriggers.push(created)
    }

    // 4. Telegram-Alert (wenn aktiviert und neue Trigger vorhanden)
    if (config.alertTelegram && createdTriggers.length > 0) {
      const telegramBotToken = process.env.TELEGRAM_BOT_TOKEN
      const telegramChatId = process.env.TELEGRAM_CHAT_ID

      if (telegramBotToken && telegramChatId) {
        const highPrioCount = createdTriggers.filter(t => t.priority === 'high').length
        const mediumPrioCount = createdTriggers.filter(t => t.priority === 'medium').length

        const message = `🎯 **Upselling Alert**

${highPrioCount > 0 ? `🔴 **${highPrioCount} High-Priority** Trigger` : ''}
${mediumPrioCount > 0 ? `🟡 **${mediumPrioCount} Medium-Priority** Trigger` : ''}

${createdTriggers.slice(0, 5).map(t => `• ${t.tenantName}: ${t.triggerType} (${t.suggestedPlan})`).join('\n')}

👉 [Dashboard öffnen](${process.env.NEXTAUTH_URL}/admin/upselling)`

        try {
          await fetch(`https://api.telegram.org/bot${telegramBotToken}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: telegramChatId,
              text: message,
              parse_mode: 'Markdown',
              disable_web_page_preview: true
            })
          })
        } catch (telegramError) {
          console.error('Telegram alert failed:', telegramError)
        }
      }
    }

    // 5. Audit Log
    await logActivity({
      userId: 'system',
      userEmail: 'cron@mission-control.ai',
      action: 'UPSELL_CHECK_RUN',
      resource: 'cron',
      resourceId: 'upsell-check',
      details: {
        triggersFound: createdTriggers.length,
        triggerTypes: createdTriggers.map(t => t.triggerType)
      }
    })

    return NextResponse.json({
      success: true,
      triggersFound: createdTriggers.length,
      triggers: createdTriggers.map(t => ({
        id: t.id,
        tenant: t.tenantName,
        type: t.triggerType,
        plan: t.suggestedPlan,
        priority: t.priority
      }))
    })

  } catch (error) {
    console.error('Upsell check error:', error)
    return NextResponse.json(
      { error: 'Upsell check failed', details: String(error) },
      { status: 500 }
    )
  }
}
