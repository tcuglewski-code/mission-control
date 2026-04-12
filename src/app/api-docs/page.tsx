"use client";

import { useEffect, useState } from "react";

/**
 * /api-docs — Human-readable API documentation page for Mission Control.
 * Fetches the OpenAPI spec from /api/openapi and renders it as a structured page.
 * We avoid adding swagger-ui-react to MC to keep the bundle lean.
 */

interface PathMethod {
  tags?: string[];
  summary?: string;
  description?: string;
  parameters?: Array<{ name: string; in: string; required?: boolean; schema?: { type?: string } }>;
}

interface Spec {
  info: { title: string; version: string; description: string };
  tags?: Array<{ name: string; description: string }>;
  paths: Record<string, Record<string, PathMethod>>;
}

const METHOD_COLORS: Record<string, string> = {
  get: "bg-green-600",
  post: "bg-blue-600",
  put: "bg-yellow-600",
  patch: "bg-orange-500",
  delete: "bg-red-600",
};

export default function ApiDocsPage() {
  const [spec, setSpec] = useState<Spec | null>(null);

  useEffect(() => {
    fetch("/api/openapi")
      .then((r) => r.json())
      .then(setSpec)
      .catch(console.error);
  }, []);

  if (!spec) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-500">Loading API documentation...</p>
      </div>
    );
  }

  const tags = spec.tags ?? [];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gray-900 text-white py-6 px-6">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-2xl font-bold">{spec.info.title}</h1>
          <p className="text-gray-400 text-sm mt-1">{spec.info.description}</p>
          <div className="mt-3 flex gap-3">
            <a
              href="/api/openapi"
              target="_blank"
              className="text-xs bg-gray-700 hover:bg-gray-600 px-3 py-1.5 rounded"
            >
              OpenAPI JSON
            </a>
            <span className="text-xs text-gray-500 self-center">v{spec.info.version}</span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto py-8 px-6">
        {tags.map((tag) => (
          <section key={tag.name} className="mb-10">
            <h2 className="text-xl font-semibold border-b pb-2 mb-4">
              {tag.name}
              {tag.description && (
                <span className="text-sm font-normal text-gray-500 ml-2">
                  — {tag.description}
                </span>
              )}
            </h2>

            {Object.entries(spec.paths).map(([path, methods]) =>
              Object.entries(methods).map(([method, detail]) => {
                if (!detail.tags?.includes(tag.name)) return null;
                return (
                  <div
                    key={`${method}-${path}`}
                    className="flex items-start gap-3 mb-3 p-3 bg-white rounded shadow-sm border"
                  >
                    <span
                      className={`${METHOD_COLORS[method] ?? "bg-gray-500"} text-white text-xs font-mono px-2 py-1 rounded uppercase min-w-[60px] text-center`}
                    >
                      {method}
                    </span>
                    <div>
                      <code className="text-sm font-mono">{path}</code>
                      {detail.summary && (
                        <p className="text-sm text-gray-600 mt-0.5">{detail.summary}</p>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </section>
        ))}
      </div>
    </div>
  );
}
