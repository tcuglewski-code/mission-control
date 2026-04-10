// Temporary debug: return actual error message
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    const users = await prisma.authUser.findMany({ take: 1, select: { id: true, username: true } })
    return NextResponse.json({ ok: true, users })
  } catch (error: any) {
    return NextResponse.json({ error: error.message, stack: error.stack?.slice(0,500) }, { status: 500 })
  }
}
