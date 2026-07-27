/**
 * B1 — shared Zod contracts (auth + API error + library sync).
 * Keep schemas here; wire routes/clients without a full monorepo yet.
 */
import { z } from 'zod';
import { AdminErrorCodes, AuthErrorCodes, BillingErrorCodes } from './errorCodes';

export const AuthCredentialsSchema = z.object({
  email: z.string().trim().email().max(320),
  password: z.string().min(8).max(256),
  name: z.string().trim().min(1).max(120).optional(),
});

export type AuthCredentials = z.infer<typeof AuthCredentialsSchema>;

const knownCodes = [
  ...Object.values(AuthErrorCodes),
  ...Object.values(BillingErrorCodes),
  ...Object.values(AdminErrorCodes),
] as [string, ...string[]];

export const ApiErrorSchema = z.object({
  error: z.string().min(1),
  code: z.enum(knownCodes).optional(),
  hint: z.string().optional(),
});

export type ApiError = z.infer<typeof ApiErrorSchema>;

export const LibrarySyncSchema = z.object({
  uploadedFiles: z.array(z.unknown()).default([]),
  glossaryEntries: z.array(z.unknown()).default([]),
  generatedCourses: z.array(z.unknown()).default([]),
});

export type LibrarySyncBody = z.infer<typeof LibrarySyncSchema>;

/** Parse credentials; returns null when invalid (route-friendly). */
export function parseAuthCredentials(body: unknown): AuthCredentials | null {
  const parsed = AuthCredentialsSchema.safeParse(body);
  return parsed.success ? parsed.data : null;
}
