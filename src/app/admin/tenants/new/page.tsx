"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { AppShell } from "@/components/layout/AppShell"

export default function NewTenantPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ slug: "", name: "", plan: "starter", adminEmail: "" })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch("/api/admin/tenants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      if (res.ok) router.push("/admin/tenants")
    } catch (err) {
      console.error("Failed to create tenant:", err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <AppShell title="Neuer Tenant" subtitle="Mandant anlegen">
      <div className="max-w-lg mx-auto">
        <form onSubmit={handleSubmit} className="space-y-6 bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1">Slug</label>
            <input type="text" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })}
              className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:border-emerald-500" placeholder="mein-unternehmen" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1">Name</label>
            <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:border-emerald-500" placeholder="Mein Unternehmen GmbH" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1">Plan</label>
            <select value={form.plan} onChange={(e) => setForm({ ...form, plan: e.target.value })}
              className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:border-emerald-500">
              <option value="starter">Starter (49€/Monat)</option>
              <option value="professional">Professional (99€/Monat)</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1">Admin E-Mail</label>
            <input type="email" value={form.adminEmail} onChange={(e) => setForm({ ...form, adminEmail: e.target.value })}
              className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:border-emerald-500" placeholder="admin@unternehmen.de" required />
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={() => router.back()}
              className="flex-1 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm font-medium rounded-lg transition-colors">Abbrechen</button>
            <button type="submit" disabled={loading}
              className="flex-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors">
              {loading ? "Erstelle..." : "Tenant anlegen"}
            </button>
          </div>
        </form>
      </div>
    </AppShell>
  )
}
