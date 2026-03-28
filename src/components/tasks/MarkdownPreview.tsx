"use client";

/**
 * MarkdownPreview — einfaches Regex-Markdown-Rendering ohne externe Bibliothek
 * Unterstützt: **bold**, *italic*, `code`, ## Überschriften, - Listen, [Links](url)
 */

interface MarkdownPreviewProps {
  content: string;
  className?: string;
}

function parseMarkdown(text: string): string {
  if (!text) return "";

  // Zeilen verarbeiten
  const lines = text.split("\n");
  const htmlLines: string[] = [];
  let inList = false;

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];

    // Überschriften: ## text oder # text
    const h2Match = line.match(/^##\s+(.+)$/);
    const h1Match = line.match(/^#\s+(.+)$/);
    if (h2Match) {
      if (inList) { htmlLines.push("</ul>"); inList = false; }
      htmlLines.push(`<h2 class="text-sm font-bold text-white mt-3 mb-1">${inlineMarkdown(h2Match[1])}</h2>`);
      continue;
    }
    if (h1Match) {
      if (inList) { htmlLines.push("</ul>"); inList = false; }
      htmlLines.push(`<h1 class="text-base font-bold text-white mt-3 mb-1">${inlineMarkdown(h1Match[1])}</h1>`);
      continue;
    }

    // Listen: - item oder * item
    const listMatch = line.match(/^[-*]\s+(.+)$/);
    if (listMatch) {
      if (!inList) { htmlLines.push('<ul class="list-none space-y-0.5 my-1">'); inList = true; }
      htmlLines.push(`<li class="flex items-start gap-1.5 text-zinc-300"><span class="text-emerald-500 mt-0.5 shrink-0">•</span><span>${inlineMarkdown(listMatch[1])}</span></li>`);
      continue;
    }

    // Liste schließen wenn nötig
    if (inList && line.trim() !== "") {
      htmlLines.push("</ul>");
      inList = false;
    }

    // Leere Zeile
    if (line.trim() === "") {
      if (inList) { htmlLines.push("</ul>"); inList = false; }
      htmlLines.push('<div class="h-2"></div>');
      continue;
    }

    // Normaler Absatz
    htmlLines.push(`<p class="text-zinc-300 leading-relaxed">${inlineMarkdown(line)}</p>`);
  }

  if (inList) htmlLines.push("</ul>");

  return htmlLines.join("\n");
}

function inlineMarkdown(text: string): string {
  // Escape HTML
  text = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  // Code: `text`
  text = text.replace(/`([^`]+)`/g, '<code class="bg-zinc-800 text-emerald-300 rounded px-1 py-0.5 text-[11px] font-mono">$1</code>');

  // Bold: **text**
  text = text.replace(/\*\*([^*]+)\*\*/g, '<strong class="text-white font-semibold">$1</strong>');

  // Italic: *text*
  text = text.replace(/\*([^*]+)\*/g, '<em class="text-zinc-200 italic">$1</em>');

  // Links: [text](url)
  text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-blue-400 underline hover:text-blue-300">$1</a>');

  return text;
}

export function MarkdownPreview({ content, className = "" }: MarkdownPreviewProps) {
  if (!content) {
    return (
      <p className={`text-zinc-600 italic text-xs ${className}`}>
        Keine Beschreibung vorhanden.
      </p>
    );
  }

  return (
    <div
      className={`text-xs space-y-0.5 ${className}`}
      dangerouslySetInnerHTML={{ __html: parseMarkdown(content) }}
    />
  );
}
