/**
 * Decodes a JWT payload (middle segment) without verifying the signature.
 * Used for password set/reset links where email and login_type are embedded in the token.
 */
export type PasswordFlowTokenPayload = {
  email?: string;
  userId?: number;
  login_type?: string;
  iat?: number;
  exp?: number;
  loginUserType?:string
};

export function decodeJwtPayload<T extends Record<string, unknown> = PasswordFlowTokenPayload>(
  token: string
): T | null {
  try {
    const segments = token.trim().split(".");
    if (segments.length < 2) return null;
    const base64Url = segments[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
    const json = atob(padded);
    return JSON.parse(json) as T;
  } catch {
    return null;
  }
}
