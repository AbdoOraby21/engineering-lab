import sanitizeHtml from 'sanitize-html';

export function sanitizeRichText(input: string): string {
  return sanitizeHtml(input, {
    allowedTags: [
      'p',
      'br',
      'strong',
      'b',
      'em',
      'i',
      'u',
      's',
      'ul',
      'ol',
      'li',
      'a',
      'code',
      'pre',
      'blockquote',
      'h2',
      'h3',
      'h4',
      'hr',
    ],
    allowedAttributes: {
      a: ['href', 'title'],
    },
    allowedSchemes: ['http', 'https', 'mailto'],
    transformTags: {
      a: (_tagName, attribs) => ({
        tagName: 'a',
        attribs: {
          href: attribs.href ?? '',
          ...(attribs.title ? { title: attribs.title } : {}),
          rel: 'noopener noreferrer nofollow',
        },
      }),
    },
  }).trim();
}

export function sanitizePlainText(input: string): string;
export function sanitizePlainText(
  input: string | null | undefined,
): string | null | undefined;
export function sanitizePlainText(
  input: string | null | undefined,
): string | null | undefined {
  if (input === null || input === undefined) {
    return input;
  }
  return sanitizeHtml(input, { allowedTags: [], allowedAttributes: {} }).trim();
}
