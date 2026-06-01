'use client';

import { useRef, useState } from 'react';

// ── HTML ↔ plain-text helpers ─────────────────────────────────────────────────

export function textToHtml(text: string): string {
  if (!text.trim()) return '';
  const lines = text.split('\n');
  const out: string[] = [];
  let inUl = false;
  let inOl = false;
  for (const line of lines) {
    const bullet = line.match(/^[-*]\s+(.*)$/);
    const numbered = line.match(/^\d+\.\s+(.*)$/);
    if (bullet) {
      if (inOl) { out.push('</ol>'); inOl = false; }
      if (!inUl) { out.push('<ul>'); inUl = true; }
      out.push(`  <li>${bullet[1]}</li>`);
    } else if (numbered) {
      if (inUl) { out.push('</ul>'); inUl = false; }
      if (!inOl) { out.push('<ol>'); inOl = true; }
      out.push(`  <li>${numbered[1]}</li>`);
    } else {
      if (inUl) { out.push('</ul>'); inUl = false; }
      if (inOl) { out.push('</ol>'); inOl = false; }
      out.push(line.trim() ? `<p>${line}</p>` : '');
    }
  }
  if (inUl) out.push('</ul>');
  if (inOl) out.push('</ol>');
  return out.join('\n');
}

export function htmlToText(html: string): string {
  let t = html;
  t = t.replace(/<ol>([\s\S]*?)<\/ol>/gi, (_, c) => {
    let i = 0;
    return c.replace(/<li>([\s\S]*?)<\/li>/gi, (_: string, item: string) => `${++i}. ${item.trim()}\n`);
  });
  t = t.replace(/<ul>([\s\S]*?)<\/ul>/gi, (_, c) =>
    c.replace(/<li>([\s\S]*?)<\/li>/gi, (_: string, item: string) => `- ${item.trim()}\n`),
  );
  return t
    .replace(/<\/p>/gi, '\n')
    .replace(/<p[^>]*>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// ── Rich text editor ──────────────────────────────────────────────────────────

/**
 * A textarea with a list-insertion toolbar and a plain-text ⇄ HTML toggle.
 * State is fully controlled by the parent via {@link value}/{@link onChange}.
 */
export function RichTextEditor({ value, onChange, placeholder, rows = 6 }: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  const [htmlMode, setHtmlMode] = useState(false);
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  function toggleHtmlMode() {
    onChange(htmlMode ? htmlToText(value) : textToHtml(value));
    setHtmlMode((m) => !m);
  }

  function insertList(type: 'bullet' | 'numbered') {
    const el = bodyRef.current;
    if (!el) return;
    const { selectionStart, selectionEnd, value: v } = el;
    const before = v.slice(0, selectionStart);
    const selected = v.slice(selectionStart, selectionEnd);
    const after = v.slice(selectionEnd);

    if (selectionStart === selectionEnd) {
      const prefix = type === 'bullet' ? '- ' : '1. ';
      onChange(before + prefix + after);
      requestAnimationFrame(() => {
        el.selectionStart = el.selectionEnd = selectionStart + prefix.length;
        el.focus();
      });
      return;
    }

    const lines = selected.split('\n');
    const formatted = lines
      .map((line, i) => (type === 'bullet' ? '- ' : `${i + 1}. `) + line)
      .join('\n');
    onChange(before + formatted + after);
    requestAnimationFrame(() => {
      el.selectionStart = selectionStart;
      el.selectionEnd = selectionStart + formatted.length;
      el.focus();
    });
  }

  return (
    <div className="flex flex-col border hairline rounded-sm overflow-hidden bg-ink-950">
      {/* Toolbar */}
      <div className="flex gap-1 px-3 pt-2 pb-1 border-b hairline bg-ink-900/30">
        <button
          type="button"
          onClick={() => insertList('bullet')}
          title="Bulleted list"
          disabled={htmlMode}
          className="w-8 h-7 flex items-center justify-center border hairline text-ink-300 rounded-sm hover:border-accent hover:text-accent transition-colors disabled:opacity-30 disabled:pointer-events-none">
          <svg width="15" height="13" viewBox="0 0 15 13" fill="currentColor" aria-hidden="true">
            <circle cx="1.5" cy="1.5" r="1.5"/>
            <rect x="5" y="0.5" width="10" height="2" rx="0.5"/>
            <circle cx="1.5" cy="6.5" r="1.5"/>
            <rect x="5" y="5.5" width="10" height="2" rx="0.5"/>
            <circle cx="1.5" cy="11.5" r="1.5"/>
            <rect x="5" y="10.5" width="10" height="2" rx="0.5"/>
          </svg>
        </button>
        <button
          type="button"
          onClick={() => insertList('numbered')}
          title="Numbered list"
          disabled={htmlMode}
          className="w-8 h-7 flex items-center justify-center border hairline text-ink-300 rounded-sm hover:border-accent hover:text-accent transition-colors disabled:opacity-30 disabled:pointer-events-none">
          <svg width="15" height="13" viewBox="0 0 15 13" fill="currentColor" aria-hidden="true">
            <text x="0" y="3.5" fontSize="5.5" fontFamily="sans-serif" fontWeight="600">1.</text>
            <rect x="6" y="0.5" width="9" height="2" rx="0.5"/>
            <text x="0" y="8.5" fontSize="5.5" fontFamily="sans-serif" fontWeight="600">2.</text>
            <rect x="6" y="5.5" width="9" height="2" rx="0.5"/>
            <text x="0" y="13" fontSize="5.5" fontFamily="sans-serif" fontWeight="600">3.</text>
            <rect x="6" y="10.5" width="9" height="2" rx="0.5"/>
          </svg>
        </button>
        <div className="flex-1" />
        <button
          type="button"
          onClick={toggleHtmlMode}
          title={htmlMode ? 'Switch to plain text' : 'Switch to HTML'}
          className={`h-7 px-2 font-mono text-xs border rounded-sm transition-colors ${
            htmlMode
              ? 'border-accent text-accent bg-accent/10'
              : 'border-hairline text-ink-300 hover:border-accent hover:text-accent'
          }`}>
          {'</>'}
        </button>
      </div>
      <div className="p-4">
        <textarea
          ref={bodyRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={htmlMode ? '<p>Enter HTML…</p>' : placeholder}
          rows={rows}
          className={`w-full bg-transparent text-sm text-ink-100 leading-relaxed focus:outline-none resize-none placeholder:text-ink-600 ${htmlMode ? 'font-mono' : ''}`}
        />
      </div>
    </div>
  );
}
