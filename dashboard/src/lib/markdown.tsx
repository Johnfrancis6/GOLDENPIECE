import type { ReactNode } from 'react';

/**
 * The small Markdown subset of `ref.legal_texts` (headings #/##, paragraphs, "- " lists, **bold**), rendered as
 * React elements (no HTML injection). `#` becomes h2 (the page has its own h1), `##` h3.
 */
export function markdown(md: string): ReactNode[] {
  const out: ReactNode[] = [];
  const blocks = md.replace(/\r\n/g, '\n').split(/\n{2,}/);
  blocks.forEach((b, i) => {
    const lines = b.split('\n').filter((l) => l.trim() !== '');
    if (!lines.length) return;
    if (lines.every((l) => /^\s*[-*] /.test(l))) {
      out.push(<ul key={i}>{lines.map((l, j) => <li key={j}>{inline(l.replace(/^\s*[-*] /, ''))}</li>)}</ul>);
      return;
    }
    const h = /^(#{1,3}) (.*)$/.exec(lines[0]);
    if (h) {
      out.push(h[1].length === 1 ? <h2 key={`${i}h`}>{inline(h[2])}</h2> : <h3 key={`${i}h`}>{inline(h[2])}</h3>);
      if (lines.length > 1) out.push(<p key={i}>{inline(lines.slice(1).join(' '))}</p>);
      return;
    }
    out.push(<p key={i}>{inline(lines.join(' '))}</p>);
  });
  return out;
}

function inline(s: string): ReactNode[] {
  return s.split(/(\*\*[^*]+\*\*)/g).filter(Boolean).map((part, i) => (
    part.startsWith('**') && part.endsWith('**') ? <strong key={i}>{part.slice(2, -2)}</strong> : part
  ));
}
