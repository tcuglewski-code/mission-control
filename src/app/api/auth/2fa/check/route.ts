import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  return NextResponse.json({
    error: 'AMADEUS_DEBUG_V5',
    ts: Date.now(),
    env_db: !!process.env.DATABASE_URL,
    env_url: process.env.DATABASE_URL?.slice(0, 30)
  }, { status: 500 })
}

export async function GET() {
  return NextResponse.json({ version: 'AMADEUS_DEBUG_V5_GET', ts: Date.now() })
}
