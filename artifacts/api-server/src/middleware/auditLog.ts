import type { Request, Response, NextFunction } from 'express';
import { appendAuditLogAsync } from '../store/auditLogStore';

const AUDITED_PREFIXES = ['/v1/orgs', '/v1/teacher', '/v1/lti'];

function clientIp(req: Request): string | undefined {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') return forwarded.split(',')[0]?.trim();
  return req.socket.remoteAddress ?? undefined;
}

function orgIdFromPath(path: string): string | undefined {
  const m = path.match(/^\/v1\/orgs\/([^/]+)/);
  return m?.[1];
}

/** FERPA-oriented audit trail for mutating institution routes (Sprint L4). */
export function auditLogMiddleware(req: Request, res: Response, next: NextFunction): void {
  if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') {
    next();
    return;
  }
  const path = req.path.startsWith('/v1') ? req.path : `${req.baseUrl}${req.path}`;
  if (!AUDITED_PREFIXES.some((p) => path.startsWith(p))) {
    next();
    return;
  }

  res.on('finish', () => {
    if (res.statusCode >= 500) return;
    const account = req.account;
    void appendAuditLogAsync({
      orgId: orgIdFromPath(path),
      accountId: account?.id,
      action: `${req.method} ${path}`,
      resource: path,
      metadata: {
        status: res.statusCode,
        params: req.params,
      },
      ip: clientIp(req),
    }).catch(() => undefined);
  });

  next();
}
