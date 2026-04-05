"use client"

import { AppShell } from "@/components/layout/AppShell"
import Link from "next/link"

const PLACEHOLDER_TENANTS = [
  { id: "1", name: "Koch Aufforstung", slug: "koch-aufforstung", plan: "Professional", status: "active" },
  { id: "2", name: "Demo Tenant", slug: "demo", plan: "Starter", status: "active" },
]

export default function TenantsPage() {
  return (
    <AppShell title="Tenants" subtitle="Mandantenverwaltung">
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold text-white">Alle Tenants</h2>
          <Link
            href="/admin/tenants/new"
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium rounded-lg transition-colors"
          >
            Neuen Tenant anlegen
          </Link>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-zinc-800">
                <th className="text-left px-4 py-3 text-xs font-medium text-zinc-400 uppercase tracking-wider">Name</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-zinc-400 uppercase tracking-wider">Slug</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-zinc-400 uppercase tracking-wider">Plan</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-zinc-400 uppercase tracking-wider">Status</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-zinc-400 uppercase tracking-wider">Aktionen</th>
              </tr>
            </thead>
            <tbody>
              {PLACEHOLDER_TENANTS.map((tenant) => (
                <tr key={tenant.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
                  <td className="px-4 py-3 text-sm text-white font-medium">{tenant.name}</td>
                  <td className="px-4 py-3 text-sm text-zinc-400 font-mono">{tenant.slug}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-1 text-xs font-medium rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      {tenant.plan}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-1.5 text-sm text-emerald-400">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      {tenant.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button className="text-sm text-zinc-400 hover:text-white transition-colors">
                      Bearbeiten
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  )
}
