/**
 * MCP Streamable-HTTP transport for Synapse.
 *
 * POST /mcp speaks JSON-RPC 2.0. When the client Accepts text/event-stream
 * (or generate_quiz with stream:true), responses are delivered as SSE frames
 * (MCP-01) while remaining JSON for classic clients.
 */
import { Router, type NextFunction, type Request, type Response } from 'express';
import { authenticate } from '../middleware/auth';
import { handleJsonRpcPayload } from './server';
import { protectedResourceMetadataUrl } from './oauth/metadata';
import type { McpContext } from './types';
import {
  beginMcpSse,
  endMcpSse,
  wantsMcpSse,
  writeMcpSseMessage,
  writeMcpSseProgress,
} from './sse';

export const mcpRouter = Router();

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

function toolCallMeta(body: unknown): {
  name?: string;
  progressToken?: string | number;
  stream?: boolean;
} {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return {};
  const msg = body as {
    method?: string;
    params?: {
      name?: string;
      arguments?: { stream?: unknown };
      _meta?: { progressToken?: string | number };
    };
  };
  if (msg.method !== 'tools/call') return {};
  return {
    name: typeof msg.params?.name === 'string' ? msg.params.name : undefined,
    progressToken: msg.params?._meta?.progressToken,
    stream: msg.params?.arguments?.stream === true,
  };
}

mcpRouter.post('/mcp', mcpChallenge, authenticate, async (req: Request, res: Response) => {
  const account = req.account;
  if (!account) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  const ctx: McpContext = { account };
  const useSse = wantsMcpSse(req);
  const meta = toolCallMeta(req.body);

  if (useSse) {
    beginMcpSse(res);
    const token = meta.progressToken ?? `mcp-${Date.now()}`;
    if (meta.name === 'generate_quiz') {
      writeMcpSseProgress(res, token, 0, 100, 'Grounding quiz in library…');
    }
    try {
      if (meta.name === 'generate_quiz') {
        writeMcpSseProgress(res, token, 40, 100, 'Calling upstream LLM…');
      }
      const response = await handleJsonRpcPayload(req.body, ctx);
      if (meta.name === 'generate_quiz') {
        writeMcpSseProgress(res, token, 90, 100, 'Formatting questions…');
      }
      if (response === null) {
        endMcpSse(res);
        return;
      }
      if (Array.isArray(response)) {
        for (const item of response) writeMcpSseMessage(res, item);
      } else {
        writeMcpSseMessage(res, response);
      }
      if (meta.name === 'generate_quiz') {
        writeMcpSseProgress(res, token, 100, 100, 'Done');
      }
      endMcpSse(res);
    } catch {
      writeMcpSseMessage(res, {
        jsonrpc: '2.0',
        id: null,
        error: { code: -32603, message: 'Internal error' },
      });
      endMcpSse(res);
    }
    return;
  }

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

  if (response === null) {
    res.status(202).end();
    return;
  }

  res.json(response);
});

mcpRouter.get('/mcp', (_req: Request, res: Response) => {
  res.setHeader('Allow', 'POST');
  // SSE wake / resume is optional; clients should POST with Accept: text/event-stream.
  res.status(405).json({ error: 'Use POST for MCP JSON-RPC messages (Accept: text/event-stream for SSE)' });
});
