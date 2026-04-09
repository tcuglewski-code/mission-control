"use client";

import { WidgetShell } from "./WidgetShell";
import { CreditCard, ExternalLink } from "lucide-react";
import Link from "next/link";

export function ZipayoWidget() {
  return (
    <WidgetShell title="Zipayo — Launch Status" icon={<CreditCard className="w-4 h-4" />}>
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
            Pre-Launch
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-xs text-muted-foreground">Merchants</p>
            <p className="text-lg font-bold">0</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">MRR</p>
            <p className="text-lg font-bold">€0</p>
          </div>
        </div>

        <Link
          href="/zipayo"
          className="flex items-center gap-1.5 text-sm text-blue-600 dark:text-blue-400 hover:underline mt-2"
        >
          <ExternalLink className="w-3 h-3" />
          Zipayo Dashboard
        </Link>
      </div>
    </WidgetShell>
  );
}
