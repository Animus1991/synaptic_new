/**
 * MCP Streamable-HTTP transport for Synapse.
 *
 * Single endpoint `POST /mcp` speaking JSON-RPC 2.0. Authentication reuses the
 * existing Bearer-JWT `authenticate` middleware, so every tool call is scoped to
 * the signed-in account exactly like the REST API.
 *
 * For our synchronous tools we return `application/json` directly (a spec-
 * permitted alternative to SSE). `GET /mcp` returns 405 since no server-initiated
 * stream is offered yet.
 */
import { Router, type NextFunction, type Request, type Response } from 'express';
import { authenticate } from '../middleware/auth';
import { handleJsonRpcPayload } from './server';
import { protectedResourceMetadataUrl } from './oauth/metadata';
import type { McpContext } from './types';

export const mcpRouter = Router();

/**
 * RFC 9728 challenge: on a 401 from /mcp, point the client at the protected-
 * resource metadata so it can discover the authorization server and start the
 * OAuth flow. Wraps res.status so the header is added exactly when we reply 401.
 */
function mcpChallenge(_req: Request, res: Response, next: NextFunction): void {
  const originalStatus = res.status.bind(res);
  res.status = (code: number): Response => {
    if (code === 401 && !res.headersSent) {
      res.setHeader(
        'WWW-Authenticate',
        `Bearer resource_metadata="${protectedResourceMetadataUrl()}"`,
      );
    }
    return originalStatus(code);
  };
  next();
}

mcpRouter.post('/mcp', mcpChallenge, authenticate, async (req: Request, res: Response) => {
  const account = req.account;
  if (!account) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  const ctx: McpContext = { account };

  let response;
  try {
    response = await handleJsonRpcPayload(req.body, ctx);
  } catch {
    res.status(500).json({
      jsonrpc: '2.0',
      id: null,
      error: { code: -32603, message: 'Internal error' },
    });
    return;
  }

  // All-notifications payload → 202 Accepted with no body (per spec).
  if (response === null) {
    res.status(202).end();
    return;
  }

  res.json(response);
});

mcpRouter.get('/mcp', (_req: Request, res: Response) => {
  res.setHeader('Allow', 'POST');
  res.status(405).json({ error: 'Use POST for MCP JSON-RPC messages' });
});
