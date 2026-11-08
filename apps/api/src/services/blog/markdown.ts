import { marked } from 'marked';
import sanitizeHtml from 'sanitize-html';

// Allowed HTML for blog content: structure, emphasis, lists, code, images, links, callouts (blockquote).
const ALLOWED_TAGS = [
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'p', 'br', 'hr',
  'strong', 'em', 'u', 'del',
  'ul', 'ol', 'li',
  'blockquote',
  'code', 'pre',
  'a', 'img',
  'table', 'thead', 'tbody', 'tr', 'th', 'td',
];

const ALLOWED_ATTRS: Record<string, string[]> = {
  a: ['href', 'title', 'target', 'rel'],
  img: ['src', 'alt', 'title', 'width', 'height'],
  code: ['className', 'class'],
  pre: ['className', 'class'],
  blockquote: ['class'],
  th: ['colspan', 'rowspan'],
  td: ['colspan', 'rowspan'],
};

const ALLOWED_SCHEMES = ['http', 'https', 'mailto', 'tel'];

export async function markdownToHtml(markdown: string): Promise<string> {
  if (!markdown) {
    return '';
  }

  const renderer = new marked.Renderer() as unknown as InstanceType<typeof marked.Renderer>;

  // Code blocks with language class for syntax highlighting.
  renderer.code = ({ text, lang }: { text: string; lang?: string }) => {
    const language = (lang ?? '').replace(/[^\w+-]/g, '').toLowerCase();
    const escaped = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const classAttr = language ? ` class="language-${language}"` : '';
    return `<pre><code${classAttr}>${escaped}</code></pre>\n`;
  };

  // Blockquote as callout.
  renderer.blockquote = ({ text }: { text: string }) => `<blockquote class="callout">${text}</blockquote>\n`;

  const html = await marked(markdown, {
    renderer,
    headerIds: false,
    mangle: false,
  } as unknown as Record<string, unknown>);

  return sanitizeHtml(html, {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: ALLOWED_ATTRS,
    allowedSchemes: ALLOWED_SCHEMES,
    allowedSchemesByTag: {
      img: ['http', 'https', 'data'],
    },
    disallowedTagsMode: 'discard',
  });
}

export function extractPlainText(markdown: string): string {
  return markdown
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`[^`]+`/g, ' ')
    .replace(/#+\s*/g, '')
    .replace(/[[!\]]/g, '')
    .replace(/\([^)]*\)/g, ' ')
    .replace(/[*_`~]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}
