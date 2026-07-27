/**
 * B1 foundation — shared error codes (no full monorepo yet).
 * Import from server/client via relative path or future workspace alias.
 */
export const AuthErrorCodes = {
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  EMAIL_NOT_VERIFIED: 'EMAIL_NOT_VERIFIED',
  SESSION_NOT_FOUND: 'SESSION_NOT_FOUND',
  INVALID_REFRESH: 'INVALID_REFRESH',
} as const;

export const BillingErrorCodes = {
  CHECKOUT_UNAVAILABLE: 'CHECKOUT_UNAVAILABLE',
  WEBHOOK_INVALID: 'WEBHOOK_INVALID',
  PLAN_LIMIT: 'PLAN_LIMIT',
} as const;

export const AdminErrorCodes = {
  FORBIDDEN: 'ADMIN_FORBIDDEN',
  MISSING_SECRET: 'ADMIN_MISSING_SECRET',
} as const;

export type AuthErrorCode = (typeof AuthErrorCodes)[keyof typeof AuthErrorCodes];
export type BillingErrorCode = (typeof BillingErrorCodes)[keyof typeof BillingErrorCodes];
export type AdminErrorCode = (typeof AdminErrorCodes)[keyof typeof AdminErrorCodes];
