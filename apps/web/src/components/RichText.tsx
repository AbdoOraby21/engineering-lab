import { useMemo } from 'react';

const ALLOWED_TAGS = new Set([
  'P', 'BR', 'H2', 'H3', 'H4', 'UL', 'OL', 'LI', 'STRONG', 'EM', 'B', 'I', 'U', 'A', 'SPAN', 'BLOCKQUOTE', 'IMG',
]);
const ALLOWED_ATTRS: Record<string, string[]> = {
  A: ['href', 'target'],
  IMG: ['src', 'alt'],
};

function sanitize(html: string): string {
  if (typeof DOMParser === 'undefined') return '';
  const document = new DOMParser().parseFromString(html, 'text/html');
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT);
  const toRemove: Element[] = [];
  while (walker.nextNode()) {
    const node = walker.currentNode as Element;
    if (!ALLOWED_TAGS.has(node.tagName)) {
      toRemove.push(node);
      continue;
    }
    const allowed = ALLOWED_ATTRS[node.tagName] ?? [];
    for (const attr of Array.from(node.attributes)) {
      const name = attr.name.toLowerCase();
      if (!allowed.includes(name)) {
        node.removeAttribute(attr.name);
      } else if (name === 'href') {
        const value = attr.value.trim();
        if (!/^(https?:\/\/|\/)/i.test(value)) node.removeAttribute(attr.name);
        if (value.startsWith('/')) node.setAttribute('target', '_self');
        else node.setAttribute('target', '_blank');
      } else if (name === 'src') {
        if (!/^(https?:\/\/|\/)/i.test(attr.value.trim())) node.removeAttribute(attr.name);
      }
    }
  }
  for (const node of toRemove) node.remove();
  return document.body.innerHTML;
}

export default function RichText({ html, className }: { html: string; className?: string }) {
  const safe = useMemo(() => sanitize(html), [html]);
  return (
    <div
      className={`rich-text leading-8 text-muted ${className ?? ''}`}
      dangerouslySetInnerHTML={{ __html: safe }}
    />
  );
}
