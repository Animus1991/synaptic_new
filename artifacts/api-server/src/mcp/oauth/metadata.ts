/**
 * OAuth 2.1 discovery metadata for the Synapse MCP authorization server.
 * - Protected Resource Metadata: RFC 9728
 * - Authorization Server Metadata: RFC 8414
 */
import { config } from '../../config';

export const MCP_SCOPES = [
  'courses:read',
  'library:read',
  'progress:read',
  'progress:write',
  'quiz:generate',
] as const;

export const DEFAULT_SCOPE = MCP_SCOPES.join(' ');

function base(): string {
  return config.mcpPublicUrl;
}

/** RFC 9728 — advertises which authorization server protects /mcp. */
export function protectedResourceMetadata() {
  return {
    resource: `${base()}/mcp`,
    authorization_servers: [base()],
    scopes_supported: [...MCP_SCOPES],
    bearer_methods_supported: ['header'],
    resource_documentation: `${base()}/`,
  };
}

/** URL of the protected-resource metadata (used in WWW-Authenticate). */
export function protectedResourceMetadataUrl(): string {
  return `${base()}/.well-known/oauth-protected-resource`;
}

/** RFC 8414 — authorization server metadata. */
export function authorizationServerMetadata() {
  const b = base();
  return {
    issuer: b,
    authorization_endpoint: `${b}/oauth/authorize`,
    token_endpoint: `${b}/oauth/token`,
    registration_endpoint: `${b}/oauth/register`,
    scopes_supported: [...MCP_SCOPES],
    response_types_supported: ['code'],
    response_modes_supported: ['query'],
    grant_types_supported: ['authorization_code', 'refresh_token'],
    token_endpoint_auth_methods_supported: ['none'],
    code_challenge_methods_supported: ['S256'],
  };
}

/** Keep only scopes we support; fall back to the default set. */
export function sanitizeScope(requested: string | undefined): string {
  if (!requested) return DEFAULT_SCOPE;
  const allowed = new Set<string>(MCP_SCOPES);
  const kept = requested
    .split(/\s+/)
    .map((s) => s.trim())
    .filter((s) => allowed.has(s));
  return kept.length > 0 ? kept.join(' ') : DEFAULT_SCOPE;
}
