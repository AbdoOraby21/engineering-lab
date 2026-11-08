import type { Request, RequestHandler, Response } from 'express';
import { gzipSync, deflateSync } from 'node:zlib';

const MIN_COMPRESS_BYTES = 1024;

function encoding(req: Request): 'gzip' | 'deflate' | null {
  const accept = (req.headers['accept-encoding'] as string | undefined) ?? '';
  for (const part of accept.split(',')) {
    const token = (part.trim().split(';')[0] ?? '').trim();
    if (token === 'gzip') return 'gzip';
    if (token === 'deflate') return 'deflate';
  }
  return null;
}

function isCompressible(res: Response): boolean {
  const contentType = res.getHeader('content-type') as string | undefined;
  if (!contentType) return false;
  return (
    contentType.startsWith('text/') ||
    contentType.includes('application/json') ||
    contentType.includes('application/javascript') ||
    contentType.includes('image/svg+xml') ||
    contentType.includes('application/xml')
  );
}

export function compression(): RequestHandler {
  return (req, res, next) => {
    const enc = encoding(req);
    if (!enc) {
      next();
      return;
    }

    const originalSend = res.send.bind(res);
    res.send = function (this: Response, body: unknown): Response {
      const chunk: Buffer =
        Buffer.isBuffer(body) ? body : Buffer.from(String(body ?? ''));

      if (isCompressible(this) && chunk.length >= MIN_COMPRESS_BYTES) {
        const compressed = enc === 'gzip' ? gzipSync(chunk) : deflateSync(chunk);
        this.setHeader('content-encoding', enc);
        this.setHeader('content-length', String(compressed.length));
        body = compressed;
      }

      this.setHeader('vary', 'accept-encoding');
      return originalSend(body);
    };

    next();
  };
}
