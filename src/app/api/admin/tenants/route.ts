import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { slug, name, plan, adminEmail } = body

    if (!slug || !name || !adminEmail) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // TODO: Write to database when Tenant model is available in MC
    const tenant = {
      id: `tenant_${Date.now()}`,
      slug,
      name,
      plan: plan || "starter",
      adminEmail,
      createdAt: new Date().toISOString(),
    }

    return NextResponse.json({ success: true, tenant })
  } catch (error) {
    console.error("Failed to create tenant:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
